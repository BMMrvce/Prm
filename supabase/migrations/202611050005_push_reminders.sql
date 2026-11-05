-- Push reminders: each browser or installed app that turned on notifications, and which
-- reminders were already sent so the every-minute job never repeats one.
-- Both tables are server-only (RLS on, no policies); the app writes them with the
-- service-role key after checking who is signed in.

create table public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index push_subscriptions_user_idx on public.push_subscriptions(user_id);

create table public.reminder_deliveries (
  user_id uuid not null references auth.users(id) on delete cascade,
  -- e.g. meeting:<id>:<starts_at>, due:<id>:<due_at>, digest:<YYYY-MM-DD>
  key text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.push_subscriptions enable row level security;
alter table public.reminder_deliveries enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
revoke all on public.reminder_deliveries from anon, authenticated;

-- Reminders are sent at local times (10:15 digest), so keep each user's time zone current.
create index if not exists profiles_timezone_idx on public.profiles(timezone);
