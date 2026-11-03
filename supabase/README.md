# Workbench Supabase setup

These scripts are ready to apply when you connect a Supabase project.

## Apply the database

1. Install the Supabase CLI and authenticate.
2. Link the repository: `supabase link --project-ref <project-ref>`.
3. Apply migrations: `supabase db push`.
4. Create a test user in **Authentication → Users**.
5. Replace the placeholder UUID in `seed.sql`, then run `supabase db reset`
   locally or paste the seed into the SQL editor for a hosted development project.

The migrations create:

- workspace-scoped projects, columns, tasks, labels, comments, meetings, plans,
  notes, reminders, notifications, activity, attachments, integrations,
  reimbursements, and personal/studio expenses;
- RLS on every application table with Owner/Admin/Member/Guest boundaries;
- a transactional `create_workspace` RPC;
- sequential workspace task IDs such as `WR-24`;
- a database constraint allowing one active timer per user;
- Realtime publication for collaborative records;
- a private `workbench-attachments` Storage bucket and path-based policies.

## Application environment

Copy `.env.example` to `.env.local` and set the public project values. Never put
the service-role key in a public variable or browser code.

For Google login, enable Google under **Authentication → Providers** and add the
callback URL shown by Supabase. Email/password and magic-link login use the same
Supabase Auth project.

## Server-only integration secrets

Gmail, Google Calendar, Slack, and GitHub OAuth callbacks must run in server
route handlers. Store provider secrets and the 32-byte token-encryption key only
as server environment variables. OAuth tokens must be encrypted with
AES-256-GCM before writing `integrations`; the schema stores ciphertext, IV, and
authentication tag separately.

Cron handlers should authenticate Vercel Cron requests, claim reminder rows
atomically, and use `reminders.idempotency_key` to prevent duplicate delivery.
