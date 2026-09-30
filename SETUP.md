# Setup Guide

Full walkthrough for getting this running, from a fresh clone to deployed on Vercel.
For a project overview, see [README.md](README.md).

## 1. Database

Create a Postgres database — [Neon](https://neon.tech) works well and is what Vercel's
own Postgres integration uses under the hood. Grab the connection string (use the pooled
one if offered) and set it as `DATABASE_URL`.

> **If you use a pooled connection string** (Neon's `-pooler` host, or anything routed
> through PgBouncer): append `&pgbouncer=true` to `DATABASE_URL`. Without it, Prisma's
> prepared statements can collide across pooled connections and queries fail with
> `prepared statement "sN" already exists` — hit this locally against `npx prisma dev`'s
> proxy while building this project.

Then run the initial migration:

```bash
npx prisma migrate dev --name init
```

## 2. Auth secrets

The dashboard is protected by a single shared password (session cookie, signed with
`AUTH_SECRET`). Generate both:

```bash
openssl rand -base64 32   # -> AUTH_SECRET
node -e 'console.log(require("bcryptjs").hashSync(process.argv[1], 10))' "your-password"   # -> ADMIN_PASSWORD_HASH
```

> **Escaping `$` depends on *where* you're setting this — read this carefully, it's easy
> to get backwards.** bcrypt hashes are full of `$`-delimited segments (`$2b$10$...`).
> Next.js's env loader expands unescaped `$word` as a reference to another env var (see
> "Referencing Other Variables" in
> `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`) — but only
> when it's actually parsing a `.env*` **file**. Confirmed empirically (not just from the
> docs) that this expansion pass runs whenever any `.env*` file exists in the project
> directory, even for values that arrive as real OS environment variables — so:
>
> - **In `.env.local`** (local dev): escape every `$` as `\$`, e.g.
>   `\$2b\$10\$abc...`. The command above gives you the raw hash — add the backslashes
>   yourself, or generate it pre-escaped with:
>   `node -e 'console.log(require("bcryptjs").hashSync(process.argv[1], 10).replace(/\$/g, "\\$"))' "your-password"`
> - **In the Vercel dashboard** (or any host that injects env vars directly, with no
>   `.env*` file ever present in the deployed source — which is the case here since
>   `.env*` is gitignored): paste the **raw, unescaped** hash exactly as the first
>   command outputs it. Escaping it there will break login, since there's no `.env`
>   parser running to un-escape it back.

> **Passkey login is a planned follow-up.** The current password gate is intentionally
> minimal so a WebAuthn/passkey flow (via `@simplewebauthn/server`) can be layered on
> without reworking the session model — it would add its own `/api/auth/passkey/*`
> routes and a small credentials table, and still issue the same session cookie on success.

## 3. Ingest API key

The daily agent authenticates to `/api/ingest` with a bearer token:

```bash
openssl rand -hex 32   # -> INGEST_API_KEY
```

### Ingest contract

Two kinds of post, both to the same endpoint with the same bearer token. The zod
schemas in [`src/lib/digest-types.ts`](src/lib/digest-types.ts) are the source of truth.

```
POST /api/ingest
Authorization: Bearer <INGEST_API_KEY>
Content-Type: application/json
```

**Daily briefing** (`kind` may be omitted; it defaults to `"briefing"`):

```jsonc
{
  "kind": "briefing",
  "date": "2026-09-29",        // optional, defaults to today in DASHBOARD_TIMEZONE
  "payload": {
    "headline": [               // optional; the opening sentence, as colored segments
      { "text": "Recruiter reply is due Thursday", "tone": "action" },
      { "text": ". In the news, " },
      { "text": "open-weight models closed in on agentic coding", "tone": "aiLlm" }
    ],
    "topics": {
      "aiLlm": [NewsItem], "softwareEngineering": [NewsItem], "spaceDefense": [NewsItem],
      "markets": [MarketsItem], "healthFitness": [NewsItem], "sports": [NewsItem]
    },
    "emailAttention": [EmailAttentionItem]   // [] when nothing needs you; don't omit
  }
}
```

```jsonc
// NewsItem
{
  "title": "...", "source": "...", "url": "...",
  "summary": "1-2 sentences",           // shown as a one-liner, expanded on click
  "whyItMatters": "...",
  "tldr": "12 words max",               // optional; the line you scan. Falls back to title
  "priority": 1                         // optional; 1 = must know, 2 = normal (default), 3 = low
}
// MarketsItem = NewsItem + { "ticker": "PLTR", "move": "+2.1%" }   // move optional; "+" up, "-" down

// EmailAttentionItem
{
  "sender": "...", "subject": "...",
  "whyItMatters": "what the email says / why it needs you",   // shown in full
  "nextAction": "the call to action",
  "dueAt": "2026-10-01",                // optional; drives the countdown (orange within 2 days)
  "category": "Career",                 // optional
  "summary": "...",                     // optional; replaces whyItMatters on the card
  "deadline": "End of week"             // optional free text, only used without dueAt
}
```

`headline` tones: `"action"` (orange), `"weekend"` (gold), or a topic key (that
topic's color). If you leave `headline` out the page writes a plain one from the counts.

Prompting notes for the agent, since the visual cues come from these fields:

- At most **3** items across the whole day should be `priority: 1`. More than that
  and "Must know" stops meaning anything.
- `tldr` is a takeaway, not a shortened headline: "PLTR defense contracts extended into
  next fiscal year", not "Palantir news".
- Use `dueAt` whenever an email has a real deadline; the countdown only works with it.

**Weekend briefing** (promotions + curated readings). These come from two separate
automations, so each post sends only its own section:

```jsonc
{
  "kind": "weekend",
  "date": "2026-10-03",                 // optional; any day of the weekend or the Friday
                                        // before. Normalized to that Saturday.
  "visibleUntil": "2026-10-04T23:59:59-04:00",  // optional; defaults to end of Sunday
  "payload": {
    // Deal scout sends only this:
    "promotions": [
      { "merchant": "On", "offer": "45% off", "detail": "Roger Advantage · $150 → $82",
        "code": "…", "url": "…", "expiresAt": "2026-10-05" }   // detail/code/url/expiresAt optional
    ],
    // Reading brief sends only this:
    "readings": [
      { "title": "…", "source": "arXiv", "url": "…", "minutes": 25, "type": "preprint",
        "why": "why it was picked" }     // type: paper | preprint | report | analysis | industry
    ]
  }
}
```

A section that's left out is kept as it was; a section that's sent (even `[]`)
replaces that section for the weekend. At least one of the two must be present.
The weekend briefing shows on the dashboard from Saturday until `visibleUntil`, and
expired deals (past `expiresAt`) are hidden automatically.

Re-posting the same day (briefing) or the same weekend section overwrites it, so the
automations can safely retry.

> **"Today" is the calendar date in `DASHBOARD_TIMEZONE`** (default
> `America/Indiana/Indianapolis`, see [`src/lib/time.ts`](src/lib/time.ts)). Before
> this it was the UTC date, which rolled over at 8pm Eastern.

### Retention

Nothing is kept longer than 30 days. A Vercel cron (`vercel.json`) calls
`/api/cron/retention` nightly and deletes older briefings, weekend briefings and
done/dismissed marks. Set `CRON_SECRET` in Vercel; the route rejects calls without
it. The pages also refuse to show anything outside the window, so a missed cron run
never surfaces old data.

## 4. Google Calendar

1. Create an OAuth client at the [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   (type: Web application). Enable the Calendar API for the project.
2. Add an authorized redirect URI matching `GOOGLE_REDIRECT_URI` (e.g.
   `http://localhost:3000/api/integrations/google/callback` locally, or your production
   URL once deployed).
3. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`.
4. Visit `/api/integrations/google/connect` while logged in to authorize — it stores the
   token in the `OAuthCredential` table and refreshes it automatically after that.
5. By default only your primary calendar is shown. To pull from specific calendars
   instead (e.g. one from "My calendars" and one from "Other calendars" — the API
   doesn't distinguish the two groupings, both are just calendar IDs), visit
   `GET /api/integrations/google/calendars` while logged in to list every calendar
   you can read with its ID, then set `GOOGLE_CALENDAR_IDS` to a comma-separated list
   of the ones you want (e.g. `primary,abcd1234@group.calendar.google.com`).

## 5. TickTick

1. Register an app at the [TickTick developer portal](https://developer.ticktick.com/manage).
2. Set its redirect URI to match `TICKTICK_REDIRECT_URI`.
3. Set `TICKTICK_CLIENT_ID`, `TICKTICK_CLIENT_SECRET`, `TICKTICK_REDIRECT_URI`.
4. Visit `/api/integrations/ticktick/connect` while logged in to authorize.

The dashboard writes back to TickTick: checking a task calls
`POST /open/v1/project/{projectId}/task/{taskId}/complete`, and the quick-add box calls
`POST /open/v1/task` (no projectId, so it lands in the Inbox, due today). Both need the
`tasks:write` scope, which the connect flow already requests.

Note: the TickTick integration is written against their public Open API docs but hasn't
been exercised against a live app registration yet — double check response shapes in
[`src/lib/ticktick.ts`](src/lib/ticktick.ts) once you have real credentials, and adjust the
`status`/priority field mapping if TickTick's actual payloads differ.

## Local development

```bash
cp .env.example .env.local   # fill in the values from steps above
npm install
npx prisma migrate dev       # applies prisma/migrations, including WeekendBriefing + ItemMark
npm run dev
```

## Deploying to Vercel

1. Push this repo to GitHub, import it into Vercel.
2. Set all the env vars from `.env.example` in the Vercel project settings.
3. Update `GOOGLE_REDIRECT_URI` / `TICKTICK_REDIRECT_URI` (and the redirect URIs
   registered with Google/TickTick) to point at your production domain.
4. Deploy. Run `npx prisma migrate deploy` against the production `DATABASE_URL` (or wire
   it into the build command) to apply the schema.
