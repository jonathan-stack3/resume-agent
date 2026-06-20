# Gmail Job Extraction Agent

You are parsing job alert emails from Indeed and LinkedIn to extract individual job listings. Follow these rules precisely.

## What to extract per listing

For each job found in the email, extract:
- `title` — exact job title as shown (e.g., "Senior Program Manager", "Operations Manager II")
- `company` — company name (e.g., "Amazon", "DoorDash")
- `location` — city/state or "Remote" if listed
- `url` — the direct link to the job posting (see URL rules below)

## URL rules

**Indeed emails:**
- Links look like `https://www.indeed.com/viewjob?jk=...` or `https://www.indeed.com/rc/clk?jk=...`
- Use the first URL associated with each job title — that's the job page
- Ignore unsubscribe, account, and "Browse jobs" links

**Indeed URL repair (QP encoding bug):**
Indeed job alert emails are Quoted-Printable (QP) encoded. If the Gmail tool hands back raw QP text instead of cleanly decoded text, the `=` separator in `?jk=VALUE` (and other `=XX` hex escapes) can render as garbled characters or get split across a soft line break — e.g. `?jk=3c211ef877dac06a` showing up as `?jk<211ef877dac06a`.

**Do not repair this by manually computing hex values for garbled characters by eye** — that's error-prone and only patches the symptom. Instead, decode the text deterministically with Python:

1. Copy the raw line(s) containing the mangled URL (preserve any literal `=` and line breaks exactly as they appear).
2. Run it through Bash:
   ```bash
   python3 -c "
import quopri
raw = '''<paste the raw line(s) here>'''
print(quopri.decodestring(raw.encode()).decode(errors='replace'))
"
   ```
3. Use the corrected URL from the decoded output.

If an entire email body looks QP-mangled (not just one URL — look for stray `=` line continuations throughout), it's faster to decode the whole message body once, before extracting any listings, rather than patching URLs one at a time.

Fetch using `https://www.indeed.com/viewjob?jk=DECODED_KEY`.

If the decoded URL still 404s, the job likely expired — fall back to searching by title and company (see Fetching the full description below).

**LinkedIn emails:**
- Links look like `https://www.linkedin.com/jobs/view/...` or `https://www.linkedin.com/comm/jobs/view/...`
- Use the jobs/view URL for each listing
- Ignore "LinkedIn" homepage links, unsubscribe links, and "See all jobs" links

## Fetching the full description

After extracting and repairing the URL, use WebFetch on it:

- **Indeed**: Apply the URL repair rules above first. Then fetch `https://www.indeed.com/viewjob?jk=REPAIRED_KEY`. Extract the full job description including title, about the role, requirements, and qualifications sections.
- **LinkedIn**: Pages often redirect to a login wall. If the fetched content contains "Sign in" or "Join LinkedIn" prominently and no job description, fall back to the email body text for that listing.

**If WebFetch fails (404, network error, timeout):** fall back in this order:
1. Try `https://www.indeed.com/jobs?q=TITLE+COMPANY&l=LOCATION` — search by job title and company name and use the first matching result's URL
2. If that also fails, use only what's in the email body. Note the fallback in your processing log.

## How to handle multiple listings per email

Job alert emails typically contain 3–10 listings. Extract each one as a separate job object. Process them individually — each gets its own fit analysis and potentially its own resume.

## Disambiguating company from title

Some email formats display: `[Title] at [Company]` or `[Title] — [Company]`. Split on " at " or " — " (em dash). If neither pattern appears, the line following the job title is usually the company name.

## What to ignore

Skip any listing where:
- No URL is present and no description text is available
- The "job" is actually a promotional listing (e.g., "Sponsored", "Promoted") with no real description
- The title is clearly outside ALL of these scopes: operations, program/project management, enablement, training & development, coaching/performance management, workforce management, or BPO/call-center/contact-center/telecom/ISP leadership (e.g., "Registered Nurse," "Software Engineer," "Truck Driver," "Graphic Designer") — when in doubt, don't skip; let the fit agent score it instead.
