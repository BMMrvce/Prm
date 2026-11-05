# Workbench

Standalone Next.js 16 (App Router) + React 19 + Tailwind CSS v4 app, run with Node.js and
pnpm. See `README.md` for routes, file structure and scripts.

- Routes live in `src/app/`. Workspace pages sit under `src/app/(workspace)/[space]/`.
  Every workspace URL and sidebar entry is built in `src/lib/routes.ts`. Update it
  whenever you add or rename a route.
- `[space]` prerenders `office`, `studio` and `personal`; other values 404 in
  `resolveWorkspace()`. `[project]` renders on demand because projects live in the database.
- All data lives in Supabase. Read and write it through `useWorkspace()` / `useToast()` from
  `src/state/workbench-store.tsx`, which talks to Supabase from the browser under RLS.
  There is no seed data; `src/data/workspaces.ts` only holds static per-workspace config.
- Items shared with a user (tagged on a project or task) load into the same space as the
  owner's workspace, matched by workspace slug prefix (`office-…`). Tasks carry their own
  `workspaceId`; write them, and their time entries, to that workspace, not the viewer's.
- `src/proxy.ts` requires a session for every route except `/login`, `/api/auth/*` and
  `/api/health`. New public routes must be added to its `PUBLIC_PATHS`.
- Use Tailwind utilities in JSX. Keep `globals.css` for the Tailwind import and the
  shared `neo-*` / `workbench-scale` classes.
- Server-only secrets (see `.env.example`) must never use the `NEXT_PUBLIC_` prefix.
- Connected accounts (mailboxes, YouTube) are per user: read and write them only through
  `src/lib/connections.ts` from route handlers, after `currentUserId()`.
- Before finishing a change, run `pnpm typecheck` and `pnpm build`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
