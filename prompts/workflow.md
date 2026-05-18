# Resume Tailoring Workflow

A repeatable, honest workflow for tailoring your resume to a specific job. Three agents, one source of truth, no fabrications. Outputs land on your Desktop as PDF + DOCX.

## File Map

```text
~/resume-agent/                       ← program (lives in your home folder)
  master-resume.md                    ← source of truth (keep this BIG)
  job-description.md                  ← overwritten each /tailor run
  assets/
    resume.css                        ← PDF styling
    reference.docx                    ← DOCX style template
  build/
    build-resume.sh                   ← markdown → PDF + DOCX
  prompts/
    01-fit-agent.md
    02-tailoring-agent.md
    03-proofread-agent.md
    workflow.md                       ← this file

~/Desktop/Resume Outputs/             ← outputs (on Desktop for easy access)
  01-fit-analysis.md                  ← fit verdict + alignment breakdown
  02-tailored-resume.md               ← tailored draft + tailoring notes
  03-final-resume-review.md           ← proofread review + final markdown
  final-resume.pdf                    ← polished PDF (submit this)
  final-resume.docx                   ← editable DOCX (submit this)
```

## One-Time Setup

1. Fill out `master-resume.md` completely. Treat it as a personal database, not a 1-page resume. Include every role, every accomplishment, every tool, every project, every quantified win. The bigger this file, the better the tailored output.

## Per-Job Workflow (One Command)

In Claude Code, run:

```
/tailor [paste full job description here]
```

Or just `/tailor` alone — Claude will ask you to paste the JD.

What happens:

1. JD is saved to `~/resume-agent/job-description.md`
2. **Fit Analysis** runs → `~/Desktop/Resume Outputs/01-fit-analysis.md`
3. Claude shows you the verdict and asks: **"Approve and continue to tailoring + proofread?"**
4. If you approve, **Tailoring** runs → `02-tailored-resume.md`
5. **Proofread** runs → `03-final-resume-review.md`
6. **Build** runs → `final-resume.pdf` + `final-resume.docx`
7. Claude posts a summary in chat pointing you to the files.

If the fit analysis returns **No**, Claude stops at step 3 and recommends you skip the role.

## Principles

- **One source of truth.** Every claim traces back to `master-resume.md`. Nothing gets invented.
- **Fit gate before tailoring.** No point polishing a resume for a role you shouldn't apply to.
- **Honest framing of partial matches.** Transferable experience is real, but it's labeled as transferable, not pretended as direct.
- **Proofread separately.** A second pass catches AI tells, repetition, and unsupported claims.
- **Reusable.** Each new run only changes `job-description.md` and the files in `~/Desktop/Resume Outputs/`.

## Maintenance

- Update `master-resume.md` regularly as you gain experience or remember accomplishments worth logging.
- If a job is a great fit but the master resume is missing supporting evidence, add the evidence to the master resume FIRST, then re-run. Never shortcut by inventing.
- Want different PDF fonts/spacing? Edit `~/resume-agent/assets/resume.css`.
- Want different DOCX styling? Open `~/resume-agent/assets/reference.docx` in Word, modify the Heading 1, Heading 2, Normal, and List Bullet styles, save. Next `/tailor` run will use the new styles.
