# ಸKala²

Project-management workbench with three workspaces (Office, Studio, Personal), built as a
standalone Node.js app on Next.js 16 (App Router), React 19 and Tailwind CSS v4.

## Getting started

Requires Node.js 20.9+ and pnpm.

```bash
pnpm install
pnpm dev            # http://localhost:3000 (set PORT to change it)
```

| Script           | What it does                                      |
| ---------------- | ------------------------------------------------- |
| `pnpm dev`       | Development server with hot reload                |
| `pnpm build`     | Production build (prerenders every page)          |
| `pnpm start`     | Serve the production build (`PORT`, default 3000) |
| `pnpm typecheck` | TypeScript check with no emit                     |
| `pnpm format`    | Format with oxfmt                                 |

Copy `.env.example` to `.env.local` (or `.env`) and fill in at least the Supabase values:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.
Apply every file in `supabase/migrations/` to the project first (see `supabase/README.md`).

## Accounts

Every page requires a signed-in user; `src/proxy.ts` redirects signed-out visitors to
`/login` and answers API calls with 401. **Create account** on `/login` calls
`POST /api/auth/signup`, which uses the service-role key to create an already-confirmed
user, then signs in. On first visit to each workspace the app creates the matching
`workspaces` row (via the `create_workspace` RPC) for that user.

## Mail and connected accounts

Every user connects their **own** accounts; nothing is shared between users. Sign-ins are
stored per user in the `user_connections` table (server-only, encrypted with
`OAUTH_TOKEN_ENCRYPTION_KEY`). Until migration `202611050004` is run they fall back to
encrypted files in `.data/`, which only suits local development.

| Workspace | Mailbox options (one at a time) |
| --------- | ------------------------------- |
| Office    | Hostinger Mail or Gmail         |
| Studio    | Gmail                           |
| Personal  | Gmail                           |

Outlook support is built but switched off; re-enable it in `src/lib/mail/providers.ts`.

Users connect a mailbox in **Integrations**. Hostinger asks for the mailbox address and
password (checked by signing in; the IMAP/SMTP servers are fixed to Hostinger's,
`HOSTINGER_*_HOST/PORT`). Gmail uses Google sign-in.

### One-time setup for the deployer

**Google (Gmail + YouTube)**, one OAuth client for both:

1. In [Google Cloud Console](https://console.cloud.google.com/), enable **Gmail API** and
   **YouTube Data API v3**.
2. Under **Google Auth Platform → Clients**, create a **Web application** client with the
   redirect URI `http://localhost:3000/api/oauth/google/callback` (and
   `https://<your-domain>/api/oauth/google/callback` once deployed).
3. Under **Audience**, add test users, or publish the app. Unverified apps show a warning
   and are capped at 100 users; Gmail access is a "restricted" scope, so public use needs
   Google verification including a security assessment.
4. Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

**Microsoft (Outlook, currently switched off)**: register a multi-tenant app in Microsoft Entra with the **Web**
redirect URI `http://localhost:3000/api/oauth/outlook/callback` (and the deployed one), the
delegated Graph permissions `User.Read`, `Mail.ReadWrite`, `Mail.Send`, `offline_access`,
and set `OUTLOOK_CLIENT_ID` / `OUTLOOK_CLIENT_SECRET` / `OUTLOOK_TENANT_ID=common`.

Deployed, also set `SITE_URL=https://<your-domain>` so the redirect URIs match.

### YouTube (Watch Later)

The Personal dashboard shows the videos of a YouTube playlist each user picks. YouTube does
not let apps read its built-in "Watch later" list, so save videos to a normal playlist
(for example "Later") instead. Only the read-only `youtube.readonly` scope is requested.

## Reminders (push notifications)

Reminders reach the browser or installed app even when ಸKala² is closed:

- 10 minutes before a meeting (everyone in the workspace),
- 1 hour before a task's deadline (workspace members and people tagged on it),
- at 10:15 in each user's time zone, the tasks due that day.

Each device opts in from the bell → **Turn on reminders** (on iPhone/iPad, add ಸKala² to
the Home Screen first). Every reminder also appears in the bell.

Setup once:

1. Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` and `CRON_SECRET`.
2. Run migration `202611050005_push_reminders.sql`.
3. Put your domain and `CRON_SECRET` into `supabase/reminders-cron.sql` and run it in the
   Supabase SQL editor. It calls `/api/cron/reminders` every minute with pg_cron (Vercel's
   Hobby plan only allows daily crons).

## Notes and mail

- **Notes** (`/[space]/notes`, every workspace): private pages with a slash-command editor —
  type `/` for to-dos, headings, lists, quote, code, callout, divider, today's date, colored
  text (`/yellowtext`, `/redtext`, …) and highlights (`/highlight`, …); markdown shortcuts
  (`[] `, `- `, `1. `, `# `, `> `) work too. Each meeting can open its own linked note
  (calendar → meeting → Notes), listed under Notes → Meetings. Notes can be filed under a
  project (grouped and filtered by project; each project page lists its notes) and shared
  with collaborators, who edit together live: changes merge paragraph by paragraph over a
  private Supabase Realtime channel, with presence (who is here, where they are typing).
  Needs `202611070001_notes.sql` and `202611080001_notes_projects_collaboration.sql`.
- **Mail** (Inbox page and the dashboard Mail card): search and date filters (today, last 7 /
  30 days, custom range) run on the mail server; the list pages through the whole folder as
  you scroll. Compose has a formatting toolbar, Cc, and attachments up to 4 MB per message
  (3 MB for Outlook).

## Appearance

ಸKala² has two intentional themes, both defined as CSS variables in `src/app/globals.css`
and exposed to Tailwind as `bg-primary`, `text-ink-2`, `border-line` and so on:

- **Light**: lavender-grey sidebar (`#E4E4F1`), white cards on `#F3F4F8`, deep indigo
  signature (`#423A8E`) supported by turquoise (`#00CCCD`).
- **Dark**: black canvas, charcoal sidebar and cards (`#191C24`), bright yellow signature
  (`#FFC107`, with near-black text on yellow fills) and bright accent colors and vivid semantic colors.

`primary` is the signature color (buttons, active states; `text-primary-ink` for links),
`accent` the complementary highlight (meetings, live timers: turquoise / blue), and every
`*-ink` token is the text-safe shade of its color. Use tokens, never hex values, in
components: dark mode swaps the variable values under `html.dark`. Light, dark or system
theme is chosen from the header toggle, the account menu or Settings → Appearance (stored
per browser, synced across tabs; System follows the device). The wordmark is tinted from
`--logo` with a CSS mask, so it is indigo in light mode and white in dark mode. The UI uses Inter with a named type scale
(`text-2xs` 11 → `text-2xl` 24, each with its line height and letter spacing, set in
`globals.css`); the To Do list uses Shantell Sans (`font-handwritten`). Page changes
crossfade with React `<ViewTransition>`. On desktop the sidebar
collapses to an icon rail (remembered per browser). Logo and icons are in `public/brand/`, made from the
originals in `src/assets/`. Motion respects `prefers-reduced-motion`.

## Routes

`[space]` is one of `office`, `studio` or `personal`. Any other value returns 404.

| URL                            | Page                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------ |
| `/`                            | Redirects to `/office`                                                         |
| `/login`                       | Sign in / create account (Supabase Auth)                                       |
| `/[space]`                     | Home dashboard: to-dos, calendar, notes, mail, plan                            |
| `/[space]/tasks`               | My Tasks                                                                       |
| `/[space]/inbox`               | Unified inbox                                                                  |
| `/[space]/calendar`            | Day / week / month calendar with previous/next/today; click an item to edit it |
| `/[space]/time`                | Time Management: tracked time charts and time log                              |
| `/[space]/expenses`            | Reimbursements (Office) or Income & Expenses                                   |
| `/[space]/projects`            | All projects                                                                   |
| `/[space]/projects/[project]`  | One project, e.g. `/office/projects/website-revamp`                            |
| `/[space]/integrations`        | Integrations                                                                   |
| `/[space]/settings`            | Workspace settings                                                             |
| `/api/health`                  | `GET` JSON liveness probe (public)                                             |
| `/api/auth/signup`             | `POST` create a confirmed account (public)                                     |
| `/api/mail`                    | `GET` your mailbox status per workspace                                        |
| `/api/mail/[space]`            | `GET ?folder=inbox\|sent` list · `POST` send                                   |
| `/api/mail/[space]/message`    | `GET ?folder=&id=` one message with body                                       |
| `/api/mail/[space]/connection` | `POST` connect Hostinger · `DELETE` disconnect your mailbox                    |
| `/api/oauth/outlook/*`         | Outlook sign-in: `connect?space=`, `callback`                                  |
| `/api/youtube`                 | `GET` status + videos · `POST` choose playlist · `DELETE` disconnect           |
| `/api/youtube/playlists`       | `GET` the signed-in user's YouTube playlists                                   |
| `/api/oauth/google/*`          | Google sign-in for Gmail and YouTube: `connect?purpose=`, `callback`           |
| `/manifest.webmanifest`        | PWA manifest                                                                   |

## File structure

```
src/
├── app/                              # Routes (Next.js App Router)
│   ├── layout.tsx                    # <html>, font, metadata, service worker
│   ├── page.tsx                      # /  → redirect to /office
│   ├── not-found.tsx                 # 404 page
│   ├── globals.css                   # Tailwind import + shared component classes
│   ├── manifest.ts                   # /manifest.webmanifest
│   ├── login/page.tsx                # /login
│   ├── api/health/route.ts           # /api/health
│   └── (workspace)/                  # Route group (not part of the URL)
│       ├── layout.tsx                # Mounts the client state provider
│       └── [space]/
│           ├── layout.tsx            # Validates workspace, renders sidebar + header
│           ├── page.tsx              # /[space]
│           ├── tasks/ inbox/ calendar/ time/ expenses/ integrations/ settings/
│           └── projects/
│               ├── page.tsx
│               └── [project]/page.tsx
├── components/
│   ├── shell/                        # Sidebar, header, workspace switcher, notifications
│   ├── dashboard/                    # Home widgets (task list, day note, mail, plan, activity)
│   ├── calendar/ tasks/ expenses/ time/  # Interactive feature views (client components)
│   ├── charts/ people/               # Dependency-free charts · tag-people picker
│   ├── inbox/ integrations/ settings/ mail/       # Live mail + settings (client components)
│   ├── projects/                     # Static views (server components)
│   ├── ui/                           # Small shared primitives
│   └── pwa-register.tsx
├── data/workspaces.ts                # Static config for the three workspaces
├── lib/
│   ├── routes.ts                     # URL builders + sidebar nav (single source of truth)
│   ├── workspace.ts                  # resolveWorkspace(): [space] param → data or 404
│   ├── format.ts                     # Formatting helpers
│   ├── mail/                         # Server-only mail: Hostinger IMAP/SMTP, Outlook Graph, token store
│   └── supabase/                     # Supabase clients: browser, server, admin (service role)
├── state/workbench-store.tsx         # Supabase-backed React context store
├── proxy.ts                          # Auth guard: redirects signed-out users to /login
└── types/workbench.ts                # Shared domain types
supabase/                             # SQL migrations for the Supabase project
public/                               # Icons and service worker
```

## Data

Everything is stored in Supabase: projects, tasks, meetings, daily notes, plan items,
expenses, time entries and notifications, scoped to workspaces with row-level security.
`src/state/workbench-store.tsx` loads a workspace when you open it and writes changes
straight to the database. `src/data/workspaces.ts` only holds static per-workspace
config (label, task prefix, mail provider). Only the expense currency preference is kept
in the browser (`localStorage`), since the schema has no column for it.

**Collaboration.** Tag people on a project (project page) or a task (task editor). They
see it on their own dashboard in the same space (your Office items appear in their
Office), can update it, add tasks to a shared project and log time on it, and get a
notification. Time on a shared task is stored in the owner's workspace, so everyone on
the task sees the total. People are found by name or email through the `search_people`
database function. When creating a project you can also share it with everyone on your
email domain (e.g. `@cfoverseglobal.com`), including people who sign up later; free mail
domains such as gmail.com can't be shared with. Signup doesn't verify email addresses, so
anyone who registers an address on your domain gets these projects.

**Time.** Tasks carry an optional estimate. Time is recorded with the timer (▷ on a task)
or logged by hand in the task editor or on the Time Management page, and compared with
the estimate there.

## Adding a page

1. Add the URL to `src/lib/routes.ts` so the sidebar and header title pick it up.
2. Create `src/app/(workspace)/[space]/<name>/page.tsx`.
3. Put the UI in `src/components/<feature>/`. Use a client component with
   `useWorkspace()` if the page needs shared state. Otherwise use a server
   component that receives the workspace from `resolveWorkspace(params)`.
