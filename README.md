# Personal Dashboard

A private, password-gated morning-brief dashboard. One page, two kinds of data:

- **Live-synced** — fetched fresh on every page load, never cached: Google Calendar
  (supports multiple calendars at once) and TickTick tasks (due today or overdue). These
  always reflect current state, so they're only shown when viewing today.
- **Agent-pushed** — top emails, tech sector news, and a portfolio snapshot, POSTed once
  daily to `/api/ingest` by a scheduled agent. Stored per-day, so a date picker on the
  dashboard lets you browse any past day's digest.

## Stack

Next.js (App Router) + Prisma + Postgres, deployed on Vercel. UI kit is shadcn/ui (Base UI
primitives, Nova preset) with Fraunces for headings over Geist Sans for body text. No
mobile app yet — web-first, React Native is a possible follow-up.

## Setup

See [SETUP.md](SETUP.md) for the full walkthrough — database, auth secrets, the ingest
API contract, Google Calendar and TickTick OAuth setup, local development, and deploying
to Vercel.

## Project structure

```
src/
  app/
    page.tsx                     dashboard (server component, reads DB + live APIs)
    login/page.tsx                password gate
    api/
      ingest/route.ts             agent push endpoint (email/news/portfolio)
      calendar/route.ts           JSON endpoint for calendar events
      tasks/route.ts              JSON endpoint for open tasks
      auth/{login,logout}/        session cookie management
      integrations/
        google/{connect,callback,calendars} Google OAuth flow + calendar listing
        ticktick/{connect,callback} TickTick OAuth flow
  components/
    dashboard/                     card UI for each widget, including the date picker
    ui/                            shadcn/ui primitives (button, card, input, badge)
  lib/
    db.ts                         Prisma client singleton
    auth.ts                       session cookie sign/verify
    google.ts                     Calendar OAuth + fetch
    ticktick.ts                   TickTick OAuth + fetch
    digest-types.ts               payload contracts for /api/ingest
    date.ts                        UTC "today" helpers (Digest.date key)
  proxy.ts                        route protection (Next.js 16's middleware convention)
prisma/schema.prisma               OAuthCredential + Digest models
```
