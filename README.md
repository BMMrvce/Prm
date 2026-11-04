# Workbench

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

Copy `.env.example` to `.env.local` only when you connect Supabase or mail/OAuth
integrations. The app runs without any environment variables.

## Routes

`[space]` is one of `office`, `studio` or `personal`. Any other value returns 404.

| URL                           | Page                                                |
| ----------------------------- | --------------------------------------------------- |
| `/`                           | Redirects to `/office`                              |
| `/login`                      | Sign-in screen (UI only, not wired to auth yet)     |
| `/[space]`                    | Home dashboard: to-dos, calendar, notes, mail, plan |
| `/[space]/tasks`              | My Tasks                                            |
| `/[space]/inbox`              | Unified inbox                                       |
| `/[space]/calendar`           | Week/day calendar                                   |
| `/[space]/expenses`           | Reimbursements (Office) or Expenses                 |
| `/[space]/projects`           | All projects                                        |
| `/[space]/projects/[project]` | One project, e.g. `/office/projects/website-revamp` |
| `/[space]/integrations`       | Integrations                                        |
| `/[space]/settings`           | Workspace settings                                  |
| `/api/health`                 | `GET` JSON liveness probe                           |
| `/manifest.webmanifest`       | PWA manifest                                        |

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
│           ├── tasks/ inbox/ calendar/ expenses/ integrations/ settings/
│           └── projects/
│               ├── page.tsx
│               └── [project]/page.tsx
├── components/
│   ├── shell/                        # Sidebar, header, workspace switcher, notifications
│   ├── dashboard/                    # Home widgets (task list, day note, mail, plan, activity)
│   ├── calendar/ tasks/ expenses/    # Interactive feature views (client components)
│   ├── inbox/ projects/ integrations/ settings/   # Static views (server components)
│   ├── ui/                           # Small shared primitives
│   └── pwa-register.tsx
├── data/workspaces.ts                # Seed data for the three workspaces
├── lib/
│   ├── routes.ts                     # URL builders + sidebar nav (single source of truth)
│   ├── workspace.ts                  # resolveWorkspace(): [space] param → data or 404
│   ├── format.ts                     # Formatting helpers
│   └── supabase/                     # Supabase clients (for when a backend is connected)
├── state/workbench-store.tsx         # React context store + localStorage persistence
└── types/workbench.ts                # Shared domain types
supabase/                             # SQL migrations and seed for a future Supabase backend
public/                               # Icons and service worker
```

## Data

There is no server-side database yet. Workspace content comes from `src/data/workspaces.ts`.
Tasks, calendar entries and expenses you add are kept in the browser's `localStorage`
through `src/state/workbench-store.tsx`, so they persist per browser but are not shared
between devices or users. `supabase/` contains the schema for moving this to a real
backend. See `supabase/README.md`.

## Adding a page

1. Add the URL to `src/lib/routes.ts` so the sidebar and header title pick it up.
2. Create `src/app/(workspace)/[space]/<name>/page.tsx`.
3. Put the UI in `src/components/<feature>/`. Use a client component with
   `useWorkspace()` if the page needs shared state. Otherwise use a server
   component that receives the workspace from `resolveWorkspace(params)`.
