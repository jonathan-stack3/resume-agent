#!/usr/bin/env bash
# build-resume.sh — extract the Final Resume from ~/Desktop/Resume Outputs/03-final-resume-review.md
# and produce final-resume.docx (single column) + final-resume.pdf (2-column sidebar layout).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$HOME/Desktop/Resume Outputs"
SOURCE="${RESUME_SOURCE:-$OUT_DIR/03-final-resume-review.md}"
WORK_MD_FLAT="$OUT_DIR/_final-resume-flat.md"   # single-column source (for DOCX)
WORK_MD_2COL="$OUT_DIR/_final-resume-2col.md"   # 2-column wrapped source (for PDF)
WORK_HTML="$OUT_DIR/_final-resume.html"
# JOB_NAME env var sets the output filename stem (e.g. "Jonathan Johnson - PM - Amazon")
_STEM="${JOB_NAME:-final-resume}"
OUT_DOCX="${RESUME_OUTPUT:-$OUT_DIR/${_STEM}.docx}"
OUT_PDF="$OUT_DIR/${_STEM}.pdf"
CSS="$ROOT/assets/resume.css"
REF_DOCX="$ROOT/assets/reference.docx"
# Locate Chrome — macOS app bundle first, then common Linux locations
if [[ -x "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]]; then
  CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
elif command -v google-chrome &>/dev/null; then
  CHROME="google-chrome"
elif command -v chromium-browser &>/dev/null; then
  CHROME="chromium-browser"
elif command -v chromium &>/dev/null; then
  CHROME="chromium"
else
  CHROME=""
fi

[[ -d "$OUT_DIR" ]] || mkdir -p "$OUT_DIR"

if [[ ! -f "$SOURCE" ]]; then
  echo "error: $SOURCE not found. Run the proofread agent first." >&2
  exit 1
fi

PANDOC_FORMAT="markdown-fancy_lists"

# ---- Step 1: extract just the Final Resume section ----
awk '
  /^## Final Resume[[:space:]]*$/ { found=1; next }
  found { print }
' "$SOURCE" > "$WORK_MD_FLAT"

if [[ ! -s "$WORK_MD_FLAT" ]]; then
  echo "error: no '## Final Resume' section found in $SOURCE" >&2
  exit 1
fi

# Escape (NNN) phone-number parens so pandoc doesn't parse them as list markers
# sed -i syntax differs: macOS requires '' after -i, GNU sed does not
if sed --version 2>/dev/null | grep -q GNU; then
  sed -E -i 's/\(([0-9]{3})\)/\\(\1\\)/g' "$WORK_MD_FLAT"
else
  sed -E -i '' 's/\(([0-9]{3})\)/\\(\1\\)/g' "$WORK_MD_FLAT"
fi

# ---- Step 2: build the 2-column markdown for HTML/PDF ----
# Split the flat markdown into header / left / right and wrap with HTML divs.
# LEFT  column sections: PROFESSIONAL SUMMARY, WORK EXPERIENCE
# RIGHT column sections: Contact, SKILLS, CERTIFICATIONS, EDUCATION
HEADER=$(awk '/^## / { exit } { print }' "$WORK_MD_FLAT")

LEFT=$(awk '
  BEGIN { include = 0 }
  /^## (PROFESSIONAL SUMMARY|WORK EXPERIENCE)[[:space:]]*$/ { include = 1; print; next }
  /^## / { include = 0; next }
  include { print }
' "$WORK_MD_FLAT")

RIGHT=$(awk '
  BEGIN { include = 0 }
  /^## (Contact|SKILLS|CERTIFICATIONS|EDUCATION)[[:space:]]*$/ { include = 1; print; next }
  /^## / { include = 0; next }
  include { print }
' "$WORK_MD_FLAT")

{
  echo '<div class="resume-cols">'
  echo '<div class="col-side">'
  echo ''
  echo "$RIGHT"
  echo ''
  echo '</div>'
  echo '<div class="col-main">'
  echo ''
  echo "$HEADER"
  echo ''
  echo "$LEFT"
  echo ''
  echo '</div>'
  echo '</div>'
} > "$WORK_MD_2COL"

# ---- Step 3: DOCX (2-column sidebar via docx@9.6.1 + Node) ----
NODE_PATH="$(npm root -g)" RESUME_SOURCE="$SOURCE" RESUME_OUTPUT="$OUT_DOCX" node "$ROOT/build/generate-docx.js"

# ---- Step 4: HTML (2-column, pandoc passes raw HTML divs through) ----
pandoc "$WORK_MD_2COL" \
  -f "$PANDOC_FORMAT" \
  --standalone \
  --css="$CSS" \
  --embed-resources \
  --variable=pagetitle:"Resume" \
  -o "$WORK_HTML"

# ---- Step 5: PDF via Chrome headless ----
if [[ -z "$CHROME" ]]; then
  echo "error: Chrome not found. Install Google Chrome or Chromium and ensure it's in PATH." >&2
  exit 1
fi

"$CHROME" \
  --headless=new \
  --disable-gpu \
  --no-pdf-header-footer \
  --print-to-pdf="$OUT_PDF" \
  "file://$WORK_HTML" \
  >/dev/null 2>&1

# Clean intermediates
rm -f "$WORK_MD_FLAT" "$WORK_MD_2COL" "$WORK_HTML"

echo "wrote: $OUT_PDF"
