# Resume Agent

A multi-agent Claude Code workflow that tailors your resume to job descriptions and automatically scans your Gmail for new job postings every morning.

---

## What It Does

**Manual mode (`/tailor`):** Paste a job description, get a fit analysis, then a tailored + proofread resume as PDF and DOCX — without inventing anything not in your master resume.

**Automated mode (`/job-hunt`):** Scans Gmail for unread Indeed and LinkedIn job alert emails, fetches the full job description from each posting URL, runs fit analysis on every listing, and generates tailored resumes for any role that scores 7/10 or higher — all without touching your keyboard.

---

## How It Works

```
master-resume.md  ──►  Fit Agent  ──►  score < 7: skip
                                   └──►  score ≥ 7: Tailoring Agent  ──►  Proofread Agent  ──►  PDF + DOCX
```

Three chained AI agents, each with a single responsibility:

| Agent | File | Job |
|---|---|---|
| Fit Analysis | `prompts/01-fit-agent.md` | Scores the role 1–10, identifies direct/transferable/missing matches, recommends proceed or skip |
| Tailoring | `prompts/02-tailoring-agent.md` | Rewrites your resume for the target role without inventing experience |
| Proofread | `prompts/03-proofread-agent.md` | Checks truthfulness, removes AI tells, fixes grammar, produces the final clean version |
| Gmail Parser | `prompts/04-gmail-agent.md` | Extracts job listings from Indeed/LinkedIn alert emails |

---

## Repo Structure

```
resume-agent/
├── prompts/                        # Agent instruction files
│   ├── 01-fit-agent.md
│   ├── 02-tailoring-agent.md
│   ├── 03-proofread-agent.md
│   ├── 04-gmail-agent.md
│   └── workflow.md
├── build/                          # PDF + DOCX generation
│   ├── build-resume.sh             # Orchestrates pandoc + Chrome + Node
│   └── generate-docx.js           # Two-column sidebar DOCX via docx npm package
├── assets/
│   ├── resume.css                  # PDF layout styles
│   └── reference.docx             # DOCX style reference
├── commands/                       # Claude Code slash commands (install to ~/.claude/commands/)
│   ├── tailor.md                   # /tailor — manual single-job workflow
│   └── job-hunt.md                 # /job-hunt — automated Gmail scanning workflow
├── launchagent/
│   └── dev.stack3.job-hunt.plist   # macOS LaunchAgent for daily 8am runs
├── master-resume.template.md       # Template — copy to master-resume.md and fill in
└── .gitignore                      # Excludes master-resume.md, outputs, and binaries
```

---

## Requirements

- [Claude Code](https://claude.ai/code) with a claude.ai Gmail MCP connector configured
- [pandoc](https://pandoc.org/installing.html) — `brew install pandoc`
- [Google Chrome](https://www.google.com/chrome/) — used for headless PDF generation
- [Node.js](https://nodejs.org/) + npm
- `docx` npm package installed globally: `npm install -g docx`

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/jonathan-stack3/resume-agent.git
cd resume-agent
```

### 2. Create your master resume

```bash
cp master-resume.template.md master-resume.md
```

Open `master-resume.md` and fill in your real work history, skills, and certifications. This file is gitignored — it never leaves your machine.

### 3. Update hardcoded paths

Search the repo for `/Users/stack3/` and replace with your home directory path:

```bash
grep -r "stack3" . --include="*.md" --include="*.sh" --include="*.js" --include="*.plist" -l
```

Key files to update: `build/build-resume.sh`, `build/generate-docx.js`, `commands/tailor.md`, `commands/job-hunt.md`, `launchagent/dev.stack3.job-hunt.plist`.

### 4. Install the Claude Code slash commands

```bash
mkdir -p ~/.claude/commands
cp commands/tailor.md ~/.claude/commands/tailor.md
cp commands/job-hunt.md ~/.claude/commands/job-hunt.md
```

### 5. Create the output folder

```bash
mkdir -p ~/Desktop/Resume\ Outputs
```

### 6. Connect Gmail in Claude Code

In claude.ai, go to **Settings → Integrations** and connect your Gmail account. The `/job-hunt` command uses the Gmail MCP connector to search and label threads.

### 7. (Optional) Set up daily automation

The LaunchAgent runs `/job-hunt` every morning at 8am:

```bash
# Update the username path in the plist first
cp launchagent/dev.stack3.job-hunt.plist ~/Library/LaunchAgents/dev.yourname.job-hunt.plist
# Edit the plist to replace /Users/stack3 with your actual home directory
launchctl load ~/Library/LaunchAgents/dev.yourname.job-hunt.plist
```

---

## Usage

### Manual: tailor a single job

In Claude Code:
```
/tailor
```
Paste the job description when prompted. The workflow runs fit analysis → asks for approval → tailors and proofreads → builds PDF + DOCX.

Or pass the JD directly:
```
/tailor [paste full job description here]
```

### Automated: scan Gmail for jobs

```
/job-hunt
```

Searches Gmail for unread Indeed and LinkedIn job alert emails, processes up to 10 job listings per run, and saves tailored resumes to `~/Desktop/Resume Outputs/` named `Your Name - Job Title - Company.pdf`.

Jobs that score below 7/10 are skipped. Processed email threads are labeled `Tailor/Processed` in Gmail so they're never re-evaluated.

---

## Output Files

All outputs land in `~/Desktop/Resume Outputs/` (gitignored):

| File | Description |
|---|---|
| `01-fit-analysis.md` | Fit score, verdict, alignment breakdown |
| `02-tailored-resume.md` | Tailored resume draft with tailoring notes |
| `03-final-resume-review.md` | Proofread notes + final clean resume |
| `Your Name - Title - Company.pdf` | Final PDF (two-column sidebar layout) |
| `Your Name - Title - Company.docx` | Final DOCX (two-column sidebar layout) |

---

## Configuration

**Fit threshold** (`commands/job-hunt.md`): Change the `7/10` threshold to adjust how selective the automated workflow is.

**Batch size** (`commands/job-hunt.md`): Default is 10 job listings per run. Change `10` in the cap rule.

**Gmail label** (`commands/job-hunt.md`): Default tracking label is `Tailor/Processed`. Update to match your Gmail label scheme.

**Output directory** (`build/build-resume.sh`): Change `OUT_DIR` to save resumes somewhere other than `~/Desktop/Resume Outputs/`.

---

## Hard Rules (Built Into the Agents)

- Never invent experience not in `master-resume.md`
- Never skip the fit score check — no resume is built below the threshold
- No AI-tell phrases in the final output (banned list in `prompts/02-tailoring-agent.md`)
- Metrics in the resume must come from the master resume — no fabricated numbers

---

## License

MIT
