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
node -e 'console.log(require("bcryptjs").hashSync(process.argv[1], 10).replace(/\$/g, "\\$"))' "your-password"   # -> ADMIN_PASSWORD_HASH
```

> **Why the `\$` escaping:** bcrypt hashes are full of `$`-delimited segments
> (`$2b$10$...`). Next.js's `.env` loader expands unescaped `$word` as a
> reference to another env var — see "Referencing Other Variables" in
> `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md` — so
> a raw hash gets silently truncated. The command above pre-escapes it.

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

```
POST /api/ingest
Authorization: Bearer <INGEST_API_KEY>
Content-Type: application/json

{
  "type": "EMAIL" | "NEWS" | "PORTFOLIO",
  "date": "2026-09-03",   // optional, defaults to today (UTC)
  "payload": { ... }       // shape depends on type, see src/lib/digest-types.ts
}
```

Re-posting the same `type` + `date` overwrites that day's digest (upsert), so the agent
can safely retry or re-run.

> **"Today" is the UTC calendar date** (see [`src/lib/date.ts`](src/lib/date.ts)), not
> your local date — the dashboard looks up the digest for `date` omitted = today in UTC.
> For a US-timezone agent run once each morning this is never actually ambiguous, but if
> you ever schedule the agent close to UTC midnight, pass `date` explicitly rather than
> relying on the default.

Payload shapes (see [`src/lib/digest-types.ts`](src/lib/digest-types.ts)):

- **EMAIL**: `{ items: [{ from, subject, snippet, link?, priority? }] }`
- **NEWS**: `{ items: [{ title, source, url, summary }] }`
- **PORTFOLIO**: `{ totalValue, dayChange, dayChangePercent, holdings: [{ ticker, shares, price, value, dayChangePercent }] }`

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

Note: the TickTick integration is written against their public Open API docs but hasn't
been exercised against a live app registration yet — double check response shapes in
[`src/lib/ticktick.ts`](src/lib/ticktick.ts) once you have real credentials, and adjust the
`status`/priority field mapping if TickTick's actual payloads differ.

## Local development

```bash
cp .env.example .env.local   # fill in the values from steps above
npm install
npx prisma migrate dev
npm run dev
```

## Deploying to Vercel

1. Push this repo to GitHub, import it into Vercel.
2. Set all the env vars from `.env.example` in the Vercel project settings.
3. Update `GOOGLE_REDIRECT_URI` / `TICKTICK_REDIRECT_URI` (and the redirect URIs
   registered with Google/TickTick) to point at your production domain.
4. Deploy. Run `npx prisma migrate deploy` against the production `DATABASE_URL` (or wire
   it into the build command) to apply the schema.
