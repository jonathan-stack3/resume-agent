---
description: Scan Gmail for all unprocessed Indeed/LinkedIn job postings (no cap), auto-run fit analysis, and generate tailored resumes for strong matches (7+/10).
argument-hint: no arguments needed — just run /job-hunt
---

# /job-hunt — Automated Job Scanning Workflow

Scan Gmail for unprocessed job alert emails, run each listing through the full tailor pipeline, and save named resume files for every strong match.

## Paths

- Workflow root: `~/resume-agent/`
- Master resume: `~/resume-agent/master-resume.md`
- Job description scratch file: `~/resume-agent/job-description.md`
- Outputs folder: `~/Desktop/Resume Outputs/`
- Agent prompts: `~/resume-agent/prompts/`
- Build script: `~/resume-agent/build/build-resume.sh`

## Rules

- **Fit threshold**: auto-proceed to tailoring only if fit score is **7/10 or higher**. Skip anything lower.
- **Cap**: none — process all unique job listings found across all unprocessed threads.
- **Tracking label**: `Tailor/Processed` — apply this Gmail label to each thread after all its listings have been evaluated (pass or skip). Never re-process a labeled thread.
- **No approval gate**: this workflow is fully automated. Do not stop to ask the user for approval between fit analysis and tailoring.
- **Intermediate files are reused**: `01-fit-analysis.md`, `02-tailored-resume.md`, and `03-final-resume-review.md` get overwritten for each listing. Only the final `.pdf` and `.docx` files are uniquely named.
- **Output naming**: `Jonathan Johnson - [Title] - [Company].pdf` and `.docx` saved in the Outputs folder.

## Step 1 — Ensure the tracking label exists

Use `mcp__claude_ai_Gmail__list_labels` to check whether a label named `Tailor/Processed` already exists.

If it does not exist: use `mcp__claude_ai_Gmail__create_label` to create it. Use these settings:
- `name`: `Tailor/Processed`
- `messageListVisibility`: `show`
- `labelListVisibility`: `labelShow`

Record the label ID — you will need it in Step 4 and Step 7.

## Step 2 — Search Gmail for unprocessed job emails

Use `mcp__claude_ai_Gmail__search_threads` with this query:

```
(from:indeed.com OR from:linkedin.com) -label:Tailor/Processed
```

Fetch up to 50 threads per page. If more threads exist, paginate until all unprocessed threads are retrieved.

If zero threads are returned: tell the user "No new job alert emails found. All threads are already labeled Tailor/Processed or no Indeed/LinkedIn emails exist." Stop.

## Step 3 — Extract job listings from each thread

Read `~/resume-agent/prompts/04-gmail-agent.md` for extraction rules.

For each thread (in order, newest first):
1. Use `mcp__claude_ai_Gmail__get_thread` to retrieve the full thread content.
2. Look at the most recent message in the thread.
3. Apply the extraction rules from `04-gmail-agent.md` to pull out individual job listings (title, company, location, url).
4. Add each listing to your working queue.

Keep track of which thread each listing came from — you need this for labeling in Step 7.

### 3a — Dedup the queue (same run)

The same listing often shows up in multiple emails (e.g. both an Indeed and a LinkedIn alert, or a re-sent digest). Before processing anything, collapse the queue:

1. Normalize each listing's title and company: lowercase, trim whitespace, strip punctuation.
2. A listing is a duplicate of an earlier one in the queue if either matches:
   - Exact URL match, OR
   - Normalized title + normalized company match
3. Keep only the first occurrence of each duplicate group. Drop the rest from the queue (no need to log these individually — just note the count removed).

## Step 4 — Process each job listing

For each listing remaining in the queue, execute the following sub-steps in order.

### 4a-pre — Cross-run dedup check

Check `~/resume-agent/processed-listings.log` (create it if it doesn't exist — empty file is fine) for a prior entry matching this listing:

- Exact URL match, OR
- Normalized title + normalized company match (same normalization as Step 3a)

**If a match is found**: skip this listing — do not run fit analysis or any downstream step. Log it as `⏭ DUPLICATE` with a reference to the prior date/score from the log entry. Append a new line to `processed-listings.log` for this occurrence too (so repeated re-sends are visible in the trail), then move to the next listing.

**If no match**: continue to 4a.

### 4a — Fetch the full job description

Use WebFetch on the listing's URL.

- If successful and the page contains a real job description: use that text as the job description.
- If the page is a login wall (LinkedIn common) or returns an error: fall back to the description text extracted from the email body.
- Either way, note the source ("fetched from URL" or "from email body") in your processing log.

Write the job description to `~/resume-agent/job-description.md` using this format:

```markdown
# Job Description

**Title:** [title]
**Company:** [company]
**Location:** [location]
**Source:** [URL or "email body fallback"]

---

[full description text]
```

### 4b — Run fit analysis

Read:
1. `~/resume-agent/prompts/01-fit-agent.md`
2. `~/resume-agent/master-resume.md`
3. `~/resume-agent/job-description.md`

Follow the fit agent prompt's instructions exactly. Write the full analysis to `~/Desktop/Resume Outputs/01-fit-analysis.md`.

Extract the fit score (X/10) from the analysis you just wrote.

### 4c — Branch on score

**If score < 7**: log this listing as SKIPPED with the score and a one-line reason. Move to the next listing.

**If score >= 7**: continue to 4d.

### 4d — Run tailoring agent

Read:
1. `~/resume-agent/prompts/02-tailoring-agent.md`
2. `~/resume-agent/master-resume.md`
3. `~/resume-agent/job-description.md`
4. `~/Desktop/Resume Outputs/01-fit-analysis.md`

Follow the tailoring prompt's instructions exactly. Write the tailored resume to `~/Desktop/Resume Outputs/02-tailored-resume.md`.

### 4e — Run proofread agent

Read:
1. `~/resume-agent/prompts/03-proofread-agent.md`
2. `~/Desktop/Resume Outputs/02-tailored-resume.md`
3. `~/resume-agent/job-description.md`
4. `~/resume-agent/master-resume.md`

Follow the proofread prompt's instructions exactly. Write the review + final polished resume to `~/Desktop/Resume Outputs/03-final-resume-review.md`.

### 4f — Build the resume files

Construct the output name stem: `Jonathan Johnson - [title] - [company]`
Strip any characters that are invalid in filenames ( `/`, `:`, `"`, `?`, `*` ) — replace with a space.

Run the build script via Bash with the `JOB_NAME` env var set:

```bash
JOB_NAME="Jonathan Johnson - [title] - [company]" ~/resume-agent/build/build-resume.sh
```

If the build script exits with an error: log the error for this listing, mark it FAILED, and move on to the next listing. Do not stop the entire run.

On success: record the output paths in your processing log:
- `~/Desktop/Resume Outputs/Jonathan Johnson - [title] - [company].pdf`
- `~/Desktop/Resume Outputs/Jonathan Johnson - [title] - [company].docx`

### 4g — Append to the dedup log

Regardless of outcome (tailored, skipped, or failed), append one line to `~/resume-agent/processed-listings.log`:

```
[date] | [title] | [company] | [url] | [score]/10 | [result: TAILORED / SKIPPED / FAILED]
```

This is what Step 4a-pre checks on future runs — every listing must get a line here exactly once per occurrence.

## Step 5 — Repeat for all listings

Continue through Step 4 for each listing in the queue until all are processed.

## Step 6 — Show a live status line per listing

After processing each listing (pass, skip, fail, or duplicate), output a brief one-line status to the chat so the user can see progress:

```
[✓ TAILORED ] Senior Program Manager — Amazon | 8/10
[— SKIPPED  ] Customer Support Rep — Telecom Co | 5/10 (below threshold)
[✗ FAILED   ] Operations Director — Acme Corp | 7/10 (build error: ...)
[⏭ DUPLICATE] Enablement Manager — Concentrix | already processed 2026-06-15, 8/10
```

## Step 7 — Apply the tracking label

After all listings from a given thread have been evaluated (regardless of pass/skip/fail), apply the `Tailor/Processed` label to that thread using `mcp__claude_ai_Gmail__label_thread`.

Do this for every thread whose listings were fully evaluated, even if all were skipped.

## Step 8 — Final summary

Display a summary table:

```
Job Hunt Complete — [date]
──────────────────────────────────────────────────────
 #  Title                        Company        Score  Result
──────────────────────────────────────────────────────
 1  Senior Program Manager       Amazon          8/10  ✓ Resume saved
 2  Customer Support Rep         Telecom Co      5/10  — Skipped
 3  Enablement Manager           Concentrix      8/10  ⏭ Duplicate (first seen 2026-06-15)
 ...
──────────────────────────────────────────────────────
Resumes generated: X  |  Skipped: Y  |  Duplicates: D  |  In-run dupes removed: Q  |  Emails labeled: Z
```

Then list the full paths of all generated resume files so the user can find them quickly.

## Hard rules (do not violate)

- Never invent experience not in `master-resume.md`.
- Never process a thread already labeled `Tailor/Processed`.
- Never skip the per-listing score check — no resume is built below 7/10.
- If a listing errors at any step, log it and move on — do not abort the entire run.
- Never re-run fit analysis or tailoring for a listing already present in `processed-listings.log` (by URL or by normalized title+company) — log it as a duplicate instead.
- Every listing, including duplicates, gets exactly one line appended to `processed-listings.log` per occurrence.
- Do not ask the user for confirmation or approval at any point during the run.
