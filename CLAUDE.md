# Resume Agent — Project Context for Claude

This repo is a multi-agent Claude Code workflow for resume tailoring and automated Gmail job scanning.

## Key Paths

- **Repo root:** `~/resume-agent/` (wherever you cloned it)
- **Master resume:** `~/resume-agent/master-resume.md` — the single source of truth; never invent anything not in here
- **Job description scratch file:** `~/resume-agent/job-description.md` — overwritten each run
- **Agent prompts:** `~/resume-agent/prompts/`
- **Build script:** `~/resume-agent/build/build-resume.sh`
- **Outputs folder:** `~/Desktop/Resume Outputs/` — where PDFs and DOCX files land

## Workflow Overview

Three chained agents, run in sequence:

1. **Fit Agent** (`prompts/01-fit-agent.md`) — scores the role 1–10 against the master resume. If score < 7, stop.
2. **Tailoring Agent** (`prompts/02-tailoring-agent.md`) — rewrites the resume for the target role without inventing experience.
3. **Proofread Agent** (`prompts/03-proofread-agent.md`) — checks every claim against master-resume.md, removes AI tells, produces the final clean version.
4. **Build script** — extracts the `## Final Resume` section from `03-final-resume-review.md` and produces PDF + DOCX.

## Slash Commands

- `/tailor` — manual single-job workflow with approval gate between fit analysis and tailoring
- `/job-hunt` — automated Gmail scanning; processes all unread Indeed/LinkedIn job alert threads, labels them `Tailor/Processed` when done

## Hard Rules (never violate these)

- Every claim in a tailored resume must trace back to `master-resume.md`. Nothing invented.
- No metrics that aren't in the master resume.
- Fit threshold for auto-tailoring: 7/10 or higher.
- The proofread agent writes to `03-final-resume-review.md`; the build script reads only the `## Final Resume` section from that file.
- Output files (`01-fit-analysis.md`, `02-tailored-resume.md`, `03-final-resume-review.md`) are overwritten each run by design.

## Intermediate Output Files

| File | Written by | Contents |
|------|-----------|----------|
| `~/Desktop/Resume Outputs/01-fit-analysis.md` | Fit agent | Score, verdict, alignment breakdown, positioning strategy |
| `~/Desktop/Resume Outputs/02-tailored-resume.md` | Tailoring agent | Tailored resume draft + tailoring notes appendix |
| `~/Desktop/Resume Outputs/03-final-resume-review.md` | Proofread agent | Review notes + `## Final Resume` section (what the build script reads) |

## Build Script Env Vars

| Var | Default | Purpose |
|-----|---------|---------|
| `JOB_NAME` | `final-resume` | Output filename stem (e.g. `"Jane Smith - PM - Google"`) |
| `RESUME_SOURCE` | `~/Desktop/Resume Outputs/03-final-resume-review.md` | Override input file |
| `RESUME_OUTPUT` | `~/Desktop/Resume Outputs/$JOB_NAME.docx` | Override DOCX output path |
