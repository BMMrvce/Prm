# Workbench

Standalone Next.js 16 (App Router) + React 19 + Tailwind CSS v4 app, run with Node.js and
pnpm. See `README.md` for routes, file structure and scripts.

- Routes live in `src/app/`. Workspace pages sit under `src/app/(workspace)/[space]/`.
  Every workspace URL and sidebar entry is built in `src/lib/routes.ts`. Update it
  whenever you add or rename a route.
- `[space]` and `[project]` use `generateStaticParams` with `dynamicParams = false`, so
  every page prerenders and unknown slugs return 404. Keep pages static.
- Shared, mutable UI state goes through `useWorkspace()` / `useToast()` from
  `src/state/workbench-store.tsx` (localStorage-backed). Pages that only display seed
  data stay server components and take the workspace from `resolveWorkspace(params)`.
- Use Tailwind utilities in JSX. Keep `globals.css` for the Tailwind import and the
  shared `neo-*` / `workbench-scale` classes.
- Server-only secrets (see `.env.example`) must never use the `NEXT_PUBLIC_` prefix.
- Before finishing a change, run `pnpm typecheck` and `pnpm build`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
