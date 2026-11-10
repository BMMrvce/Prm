# ಸKala² Supabase setup

These scripts are ready to apply when you connect a Supabase project.

## Apply the database

1. Install the Supabase CLI and authenticate.
2. Link the repository: `supabase link --project-ref <project-ref>`.
3. Apply migrations: `supabase db push`, or paste each file in `migrations/` into the
   SQL editor in order.
4. Create an account from the app's `/login` page. There is no seed data; each user's
   Office, Studio and Personal workspaces are created on first visit.

The migrations create:

- workspace-scoped projects, columns, tasks, labels, comments, meetings, plans,
  notes, reminders, notifications, activity, attachments, integrations,
  reimbursements, and personal/studio income and expenses;
- RLS on every application table with Owner/Admin/Member/Guest boundaries;
- a transactional `create_workspace` RPC;
- sequential workspace task IDs such as `WR-24`;
- a database constraint allowing one active timer per user;
- Realtime publication for collaborative records;
- a private `workbench-attachments` Storage bucket and path-based policies;
- `project_members` and tagging rules: people tagged on a project or task can read and
  update it, add tasks to shared projects and log time on them, and are notified;
- a `search_people` function to find someone to tag by name or email prefix;
- income entries (`expense_entries.kind = 'income'`) for Studio and Personal;
- `projects.shared_domain`: share a project with every account on the creator's email
  domain (never a free mail domain), with a notification to each of them;
- `user_connections`: each user's connected mailboxes and YouTube sign-in, encrypted by the
  app and readable only with the service-role key;
- `push_subscriptions` and `reminder_deliveries`: devices that receive reminders and the
  reminders already sent (server-only);
- `notes` (`202611070001_notes.sql`): private rich-text notes per user and workspace,
  optionally linked to a meeting (one note per person per meeting; deleting the meeting
  keeps the note, unlinked). Until it is applied, the Notes page shows how to apply it;
- notes projects and collaboration (`202611080001_notes_projects_collaboration.sql`):
  `notes.project_id`, `note_members` (people a note is shared with; they read and edit it,
  only the owner shares, files or deletes it), a "shared a note with you" notification,
  `notes` in the Realtime publication, and Realtime Authorization policies so only a note's
  owner and collaborators can join its live channel `note:<id>`.

Run `202611050002_collaboration_time_income.sql`, `202611050003_domain_sharing.sql` and
`202611050004_user_connections.sql`, `202611050005_push_reminders.sql`,
`202611070001_notes.sql` and `202611080001_notes_projects_collaboration.sql` after the
earlier files, in that order. Live note editing uses private Realtime channels: in the
Supabase dashboard keep Realtime enabled (Project Settings → Realtime). Then fill in and run `reminders-cron.sql` to schedule reminders. Until it is
applied the app still works, but tagging, domain sharing and income entries show a message
asking for them.

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
