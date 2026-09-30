# Personal Dashboard

A private, password-gated morning-brief dashboard, installable as a PWA. Dark only.

- **Live-synced**, fetched on every load and shown only for today: Google Calendar
  (as a timeline) and TickTick tasks (due today or overdue). Tasks are two-way:
  checking one completes it in TickTick, and the quick-add box creates one.
- **Agent-pushed daily briefing**: topic news (AI/LLMs, engineering, space & defense,
  markets, health & fitness, sports) plus the emails that need you, POSTed to
  `/api/ingest` each morning. Items carry a priority, a scan-able `tldr` and an
  optional colored headline, which drive the visual cues.
- **Agent-pushed weekend briefing**: promotions and curated readings, posted once a
  week and shown from Saturday through Sunday night.
- **30-day retention**: a nightly cron deletes anything older; the History tab shows
  the window as a calendar.

Visual cue system: orange means you need to act (email deadlines, overdue tasks) and
is used for nothing else; each topic has a fixed color and two-letter badge; gold is
weekend deals; cream "paper" cards are reading.

## Stack

Next.js (App Router) + Prisma + Postgres, deployed on Vercel. UI kit is shadcn/ui (Base UI
primitives, Nova preset) for the login screen; the dashboard is Tailwind v4 with IBM Plex Sans,
Plex Mono for numbers and Plex Serif for reading titles. No
mobile app yet — web-first, React Native is a possible follow-up.

## Setup

See [SETUP.md](SETUP.md) for the full walkthrough — database, auth secrets, the ingest
API contract, Google Calendar and TickTick OAuth setup, local development, and deploying
to Vercel.

## Project structure

```
src/
  app/
    page.tsx                     Today (server component, reads DB + live APIs)
    briefing/page.tsx            full briefing, filterable by topic (phone "Briefing" tab)
    history/page.tsx             last 30 days as a calendar
    actions.ts                   server actions: mark email/deal/reading, complete/add task
    manifest.ts, icon.svg        PWA manifest + icon
    login/page.tsx               password gate
    api/
      ingest/route.ts            agent push endpoint (kind: briefing | weekend)
      cron/retention/route.ts    nightly 30-day sweep (Vercel Cron, CRON_SECRET)
      calendar/route.ts          JSON endpoint for calendar events
      tasks/route.ts             JSON endpoint for open tasks
      auth/{login,logout}/       session cookie management
      integrations/              Google + TickTick OAuth flows
  components/dashboard/
    TopBar.tsx                   brand, 7-day strip (dots: briefing, gold: weekend)
    Headline.tsx                 date + colored one-sentence synthesis
    GlanceTiles.tsx              at-a-glance numbers
    ScheduleTimeline.tsx         calendar as a horizontal timeline with a live "now" line
    WeekendBriefing.tsx          deals + reading (weekends only)
    NeedsYou.tsx                 flagged emails: countdown, summary, call to action
    TasksPanel.tsx               TickTick tasks, complete + quick add
    Stories.tsx                  Must know cards, By topic rows, Briefing browser
    MobileNav.tsx                phone tab bar
  lib/
    digest-types.ts              ingest contract (zod schemas + inferred types)
    time.ts                      DASHBOARD_TIMEZONE-aware day keys and formatting
    data.ts                      DB reads (briefing, weekend, marks, history)
    view.ts                      payload -> view models; all cue rules live here
    load-day.ts                  everything one page needs for a day
    topics.ts                    fixed topic colors/badges
    google.ts, ticktick.ts       integrations
  proxy.ts                       route protection (Next.js 16's middleware convention)
prisma/schema.prisma             OAuthCredential, Briefing, WeekendBriefing, ItemMark
vercel.json                      cron schedule
```
