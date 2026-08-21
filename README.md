# RoboCup Junior Queensland — Landing Page

A linktree-style hub for anyone wanting to discover RoboCup Junior in Queensland:
what it is, upcoming events, volunteering, team registration and the events calendar.

**Live site:** https://margauxmedwards.github.io/robocup-qld/

## How it works

- Single static `index.html`, deployed via GitHub Pages from the `main` branch root.
  There is no build step for the page itself.
- Upcoming events are fetched client-side from the daily-refreshed feeds published by
  [rcja-calendar](https://github.com/margauxmedwards/rcja-calendar)
  (`.../rcja-calendar/data/qld-events.json` + `nat-events.json`, deduplicated by event id).
- The "RCJQ in the media" section reads `data/social-posts.json`, rebuilt daily by the
  **Refresh social feed** workflow — see below.
- Branding (navy `#192f59` / green `#9dbd38`, hero image) matches the calendar site.

## RCJQ in the media (social feed)

Facebook, Instagram and LinkedIn all put post content behind a login wall, so none of
them can be read from the browser. Instead `.github/workflows/social-feed.yml` runs
`scripts/fetch-social.mjs` on a daily schedule (and on demand via *Run workflow*),
which writes `data/social-posts.json` and commits it. The page just reads that file.

### Setting it up

Add these under **Settings → Secrets and variables → Actions**. Each platform is
independent — configure only what you have, and the rest are simply skipped.

| Secret | For | Where it comes from |
| --- | --- | --- |
| `FB_PAGE_ID`, `FB_PAGE_TOKEN` | Facebook | Meta app with `pages_read_engagement`, then a long-lived page token |
| `IG_USER_ID`, `IG_TOKEN` | Instagram | Instagram business/creator account linked to the page, same Meta app |
| `LINKEDIN_ORG_URN`, `LINKEDIN_TOKEN` | LinkedIn | Needs Marketing Developer Platform approval — optional, see below |

Until the secrets exist the section falls back to links to the three profiles, so the
page never looks broken.

### LinkedIn without API access

LinkedIn's organisation API needs Marketing Developer Platform approval, which may not
be granted. Without it, add posts by hand to `data/linkedin-posts.json` — the file
documents its own format — and they appear alongside the automated ones. If a LinkedIn
token is configured it takes precedence and the manual list is only a fallback.

### Behaviour worth knowing

- A platform that is unconfigured or failing **keeps its previously published posts**,
  so an expired token shows stale cards rather than emptying the section. Failures are
  recorded in the feed's `notes` and in the workflow run summary.
- Post images are **mirrored into `data/social-images/`** rather than hotlinked, because
  Facebook and Instagram CDN URLs are signed and expire. Images no longer referenced are
  pruned automatically.
- Meta retires Graph API versions after roughly two years. If the workflow starts
  failing on the API version, set a `GRAPH_VERSION` env var on the workflow step rather
  than editing the script.

To run it locally: `node scripts/fetch-social.mjs` (Node 18+), with whichever of the
above variables you have set in your environment.

## Key links wired into the page

- QLD events calendar: https://margauxmedwards.github.io/rcja-calendar/QLD/
- Volunteer form (Microsoft Forms) — see the "Volunteer with us" button in `index.html`
- Team registration: https://enter.robocupjunior.org.au/
- Mailing list: https://mailchi.mp/robocupjunior/htymhq5v1u
- Official RCJQ page: https://www.robocupjunior.org.au/challenge-regions/qld/
