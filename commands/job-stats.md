---
description: Pull job application stats from Notion and show a weekly performance summary.
argument-hint: no arguments needed — just run /job-stats
---

# /job-stats — Weekly Job Hunt Stats

Query the Notion Job Applications database and produce a clear performance summary.

## Notion

- Data source ID: `b6e07907-bd13-4b3a-8a7a-916a4b97518b`

## Steps

### 1 — Fetch all records

Use `mcp__claude_ai_Notion__notion-search` or fetch the database directly to retrieve all pages from the Job Applications database.

### 2 — Calculate stats

Compute the following:

**Pipeline overview**
- Total applications
- By status: Applied, Resume Ready, Interview, Offer, Rejected, Cold
- Active (Applied + Resume Ready + Interview + Final Round)

**Response rate**
- Response rate = (Rejected + Interview + Offer) / Total × 100
- Average fit score across all tailored applications (where Fit Score is set)
- Average fit score of applications that got a response vs. those that didn't

**By source**
- Breakdown of applications by Source (LinkedIn, Indeed, Direct, Other)
- Response rate per source

**By time**
- Applications in the last 7 days
- Applications in the last 30 days
- Average Response Days for applications that got a response

**Top companies**
- Any companies with multiple applications
- Any patterns worth noting (e.g. consistent rejections from a certain type of company)

### 3 — Display the summary

Format it clearly:

```
Job Hunt Stats — [date]
════════════════════════════════════════

PIPELINE
  Total applications:     XX
  Active (in play):       XX
  Resume Ready:           XX
  Applied:                XX
  Interview:              XX
  Offers:                 XX
  Rejected:               XX

PERFORMANCE
  Response rate:          XX%
  Avg fit score:          X.X / 10
  Avg days to response:   XX days

THIS WEEK
  New applications:       XX
  Responses received:     XX

BY SOURCE
  LinkedIn:    XX apps  |  XX% response
  Indeed:      XX apps  |  XX% response
  Direct:      XX apps  |  XX% response

INSIGHTS
  [2-3 plain-language observations about patterns in the data]
```

### 4 — Recommendations

Based on the data, give 2-3 specific, actionable suggestions. Examples:
- "Your LinkedIn applications have a higher response rate than Indeed — consider focusing there"
- "Your average fit score on rejected applications is 7.2 vs 8.5 on interviews — consider raising your threshold to 8"
- "You have X resumes in 'Resume Ready' status — these are built but not submitted yet"
