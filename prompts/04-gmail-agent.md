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
Indeed job alert emails use Quoted-Printable encoding. The `=` separator in `?jk=VALUE` gets consumed by the QP decoder along with the first two hex chars of the job key, producing a garbled character. For example, `?jk=3c211ef877dac06a` becomes `?jk<211ef877dac06a` in the extracted email text.

When you see a URL where `jk` is followed immediately by a non-`=` character, repair it:
1. Take the character immediately after `jk` (e.g. `<`, `\`, `M`, `Y`, `w`)
2. Convert it to its two-digit hex value (e.g. `<` → `3c`, `M` → `4d`, `w` → `77`)
3. Reconstruct the URL as `?jk=HEX + remaining_chars`

Example repairs:
- `?jk<211ef877dac06a` → `?jk=3c211ef877dac06a`
- `?jkM8157ac943ed3da` → `?jk=4d8157ac943ed3da`
- `?jkYbaa37f3d50a8bb` → `?jk=59baa37f3d50a8bb`
- `?jkw1cd8c674e67c81` → `?jk=771cd8c674e67c81`

Then fetch using `https://www.indeed.com/viewjob?jk=REPAIRED_KEY`.

If the first char after `jk` is a hex digit (0-9, a-f), the key may be intact but truncated by a QP soft line break. Try the key as-is first. If that 404s, prepend the hex value of that digit (e.g. `4` → `34`) and try again.

If both attempts 404, the job likely expired — fall back to searching by title and company (see Fetching the full description below).

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
- The title is clearly not a management/operations/program management role (these are not a match for this resume)
