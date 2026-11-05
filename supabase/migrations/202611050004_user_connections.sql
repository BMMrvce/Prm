-- Per-user connected accounts: one mailbox per workspace (Hostinger, Gmail or Outlook) and
-- the YouTube playlist. `secret` holds the OAuth tokens or mail password, encrypted by the
-- app (AES-256-GCM, OAUTH_TOKEN_ENCRYPTION_KEY) before it is written.

create table public.user_connections (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null check (key in ('mail:office', 'mail:studio', 'mail:personal', 'youtube')),
  provider text not null check (provider in ('hostinger', 'gmail', 'outlook', 'youtube')),
  account text not null default '',
  secret text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, key),
  constraint user_connections_provider_fits check (
    (key = 'mail:office' and provider in ('hostinger', 'gmail', 'outlook'))
    or (key = 'mail:studio' and provider in ('gmail', 'outlook'))
    or (key = 'mail:personal' and provider = 'gmail')
    or (key = 'youtube' and provider = 'youtube')
  )
);

create trigger user_connections_updated_at before update on public.user_connections
for each row execute function public.touch_updated_at();

-- Row level security with no policies: browsers can never read or write this table.
-- Only the server's service-role client does, after checking who is signed in.
alter table public.user_connections enable row level security;
revoke all on public.user_connections from anon, authenticated;
