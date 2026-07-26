# RoboCup Junior Queensland — Landing Page

A linktree-style hub for anyone wanting to discover RoboCup Junior in Queensland:
what it is, upcoming events, volunteering, team registration and the events calendar.

**Live site:** https://margauxmedwards.github.io/robocup-qld/

## How it works

- Single static `index.html`, deployed via GitHub Pages from the `main` branch root.
- Upcoming events are fetched client-side from the daily-refreshed feeds published by
  [rcja-calendar](https://github.com/margauxmedwards/rcja-calendar)
  (`.../rcja-calendar/data/qld-events.json` + `nat-events.json`, deduplicated by event id),
  so this page needs no build step or workflow of its own.
- Branding (navy `#192f59` / green `#9dbd38`, hero image) matches the calendar site.

## Key links wired into the page

- QLD events calendar: https://margauxmedwards.github.io/rcja-calendar/QLD/
- Volunteer form (Microsoft Forms) — see the "Volunteer with us" button in `index.html`
- Team registration: https://enter.robocupjunior.org.au/
- Mailing list: https://mailchi.mp/robocupjunior/htymhq5v1u
- Official RCJQ page: https://www.robocupjunior.org.au/challenge-regions/qld/
