---
description: Tailor Jonathan's resume to a job description. Runs fit analysis first; on approval, auto-runs tailoring and proofread.
argument-hint: paste the full job description after /tailor
---

# /tailor — Resume Tailoring Workflow

The user wants to tailor their resume to a job description. Execute this workflow:

## Paths

- Workflow root: `~/resume-agent/`
- Master resume: `~/resume-agent/master-resume.md`
- Job description target: `~/resume-agent/job-description.md`
- Outputs folder (lives on Desktop for easy access): `~/Desktop/Resume Outputs/`
- Agent prompts: `~/resume-agent/prompts/`

## Step 1 — Capture the Job Description

The job description was passed as arguments: `$ARGUMENTS`

- If `$ARGUMENTS` is empty: ask the user to paste the full job description into this chat. Wait for their next message. When they paste it, treat that message as the job description.
- Once you have the JD text, write it to `~/resume-agent/job-description.md`, overwriting the file. Wrap the content in a minimal header so the file is self-describing:

```markdown
# Job Description

[the raw JD text the user provided]
```

Don't ask the user to clean up the JD — paste it raw.

## Step 2 — Run the Fit Analysis Agent

Read all three:
1. `~/resume-agent/prompts/01-fit-agent.md`
2. `~/resume-agent/master-resume.md`
3. `~/resume-agent/job-description.md`

Follow the fit agent prompt's instructions exactly. Write the full analysis to `~/Desktop/Resume Outputs/01-fit-analysis.md`.

## Step 3 — Show the Verdict and Ask for Approval

After writing the fit analysis, display to the user (in chat, not just the file):

- The fit score (X/10)
- The Yes / Maybe / No verdict
- The one-line read
- The top 2–3 direct matches
- The top 2–3 missing requirements
- The recommendation

Then ask plainly: **"Approve and continue to tailoring + proofread? (yes / no)"**

Stop. Wait for the user's next message.

## Step 4 — Branch on Approval

- If the fit agent's verdict was **No** OR the user says no/decline/stop: do NOT run the tailoring or proofread agents. Acknowledge and stop. The full analysis is in `~/Desktop/Resume Outputs/01-fit-analysis.md` for their reference.
- If the user approves (yes / sure / go / proceed / etc.): continue to Step 5.

## Step 5 — Run the Tailoring Agent

Read:
1. `~/resume-agent/prompts/02-tailoring-agent.md`
2. `~/resume-agent/master-resume.md`
3. `~/resume-agent/job-description.md`
4. `~/Desktop/Resume Outputs/01-fit-analysis.md`

Follow the tailoring prompt's instructions exactly. The output must mirror the master resume's structure (section names, job-block format, grouped skills). Write the tailored resume to `~/Desktop/Resume Outputs/02-tailored-resume.md`.

## Step 6 — Run the Proofread Agent

Read:
1. `~/resume-agent/prompts/03-proofread-agent.md`
2. `~/Desktop/Resume Outputs/02-tailored-resume.md`
3. `~/resume-agent/job-description.md`
4. `~/resume-agent/master-resume.md`

Follow the proofread prompt's instructions exactly. Write the review + final polished resume to `~/Desktop/Resume Outputs/03-final-resume-review.md`.

## Step 7 — Build PDF and DOCX

Run the build script via Bash:

```
~/resume-agent/build/build-resume.sh
```

This extracts the **Final Resume** section from `03-final-resume-review.md` and produces:
- `~/Desktop/Resume Outputs/final-resume.docx`
- `~/Desktop/Resume Outputs/final-resume.pdf`

If the build script errors (e.g. "no '## Final Resume' section found"), the proofread agent's output is malformed — surface the error and stop. Do not proceed.

## Step 8 — Hand Off the Final Product

Tell the user:

- The final resume is delivered as **`~/Desktop/Resume Outputs/final-resume.pdf`** and **`~/Desktop/Resume Outputs/final-resume.docx`** (the markdown review is in `~/Desktop/Resume Outputs/03-final-resume-review.md` for reference).
- Briefly list (3–5 bullets) the most important changes the proofread agent made or risks it flagged.
- Mention any **Risk Areas / Claims to Verify** the user should double-check before submitting.

Do NOT paste the entire final resume into chat unless the user asks — keep the chat summary tight, point them to the files.

## Hard Rules

- Never invent experience that isn't in `master-resume.md`.
- Never skip the approval gate between Step 3 and Step 5.
- If the fit verdict is No, do not tailor regardless of what the user says afterward — push back and recommend they redirect to a better-fit role. Only proceed if they explicitly override after hearing the recommendation.
- All four output files (`job-description.md`, `01-fit-analysis.md`, `02-tailored-resume.md`, `03-final-resume-review.md`) get overwritten each run. That's by design — one job at a time.
