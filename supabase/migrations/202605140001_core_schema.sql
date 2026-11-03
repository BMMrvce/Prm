-- Workbench core schema
-- Run with `supabase db push` after linking a project, or paste into the
-- Supabase SQL editor. This migration is intentionally self-contained.

create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.workspace_role as enum ('owner', 'admin', 'member', 'guest');
create type public.member_status as enum ('active', 'invited', 'suspended');
create type public.project_status as enum ('planned', 'active', 'paused', 'completed', 'archived');
create type public.task_priority as enum ('none', 'low', 'medium', 'high', 'urgent');
create type public.task_state as enum ('open', 'completed', 'cancelled');
create type public.timer_state as enum ('running', 'paused', 'stopped');
create type public.notification_channel as enum ('in_app', 'email', 'slack');
create type public.integration_provider as enum ('google', 'gmail', 'slack', 'github');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  timezone text not null default 'UTC',
  locale text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_by uuid not null references public.profiles(id),
  task_prefix text not null default 'WR' check (task_prefix ~ '^[A-Z0-9]{2,6}$'),
  next_task_number bigint not null default 1 check (next_task_number > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.workspace_role not null default 'member',
  status public.member_status not null default 'active',
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email citext not null,
  role public.workspace_role not null default 'member',
  token_hash text not null unique,
  invited_by uuid not null references public.profiles(id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workspace_id, email)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  slug text not null,
  description text,
  color text not null default '#4338ca' check (color ~ '^#[0-9a-fA-F]{6}$'),
  status public.project_status not null default 'active',
  lead_id uuid references public.profiles(id) on delete set null,
  start_date date,
  target_date date,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, slug),
  constraint valid_project_dates check (target_date is null or start_date is null or target_date >= start_date)
);

create table public.project_columns (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  color text not null default '#94a3b8',
  position numeric(20, 10) not null,
  category text not null default 'unstarted' check (category in ('backlog', 'unstarted', 'started', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  unique (project_id, position)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  column_id uuid references public.project_columns(id) on delete set null,
  task_number bigint not null,
  title text not null check (char_length(title) between 1 and 300),
  description jsonb not null default '{}'::jsonb,
  state public.task_state not null default 'open',
  priority public.task_priority not null default 'none',
  parent_task_id uuid references public.tasks(id) on delete cascade,
  creator_id uuid not null references public.profiles(id),
  start_at timestamptz,
  due_at timestamptz,
  estimate_minutes integer check (estimate_minutes is null or estimate_minutes >= 0),
  position numeric(20, 10) not null default 1000,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, task_number),
  constraint valid_task_dates check (due_at is null or start_at is null or due_at >= start_at)
);

create index tasks_workspace_project_idx on public.tasks(workspace_id, project_id);
create index tasks_due_at_idx on public.tasks(workspace_id, due_at) where state = 'open';
create index tasks_parent_idx on public.tasks(parent_task_id) where parent_task_id is not null;

create table public.task_assignees (
  task_id uuid not null references public.tasks(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (task_id, user_id)
);

create table public.labels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  color text not null default '#64748b',
  created_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create table public.task_labels (
  task_id uuid not null references public.tasks(id) on delete cascade,
  label_id uuid not null references public.labels(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  primary key (task_id, label_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  body jsonb not null,
  edited_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  state public.timer_state not null default 'stopped',
  description text,
  started_at timestamptz not null,
  paused_at timestamptz,
  ended_at timestamptz,
  accumulated_seconds integer not null default 0 check (accumulated_seconds >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_time_entry check (ended_at is null or ended_at >= started_at)
);

-- Database-level guarantee: one active timer per user across all workspaces.
create unique index one_active_timer_per_user
  on public.time_entries(user_id)
  where state in ('running', 'paused') and ended_at is null;

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text,
  meeting_url text,
  external_provider public.integration_provider,
  external_id text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_meeting_dates check (ends_at > starts_at),
  unique nulls not distinct (workspace_id, external_provider, external_id)
);

create table public.daily_notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  note_date date not null default current_date,
  content text not null default '',
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id, note_date)
);

create table public.plan_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_date date not null default current_date,
  title text not null,
  task_id uuid references public.tasks(id) on delete set null,
  position numeric(20, 10) not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id, plan_date, position)
);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  meeting_id uuid references public.meetings(id) on delete cascade,
  remind_at timestamptz not null,
  channels public.notification_channel[] not null default '{in_app}',
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'snoozed', 'dismissed', 'failed')),
  idempotency_key text not null unique,
  snoozed_until timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint reminder_target check (num_nonnulls(task_id, meeting_id) = 1)
);

create index reminders_delivery_idx on public.reminders(remind_at)
  where status = 'pending';

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_unread_idx on public.notifications(user_id, created_at desc)
  where read_at is null;

create table public.activity_events (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_workspace_created_idx on public.activity_events(workspace_id, created_at desc);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id),
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 52428800),
  created_at timestamptz not null default now()
);

create table public.external_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  provider public.integration_provider,
  url text not null,
  title text not null,
  external_id text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- Provider tokens are encrypted before storage by server-side functions.
-- Never write them from a browser client.
create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  connected_by uuid not null references public.profiles(id),
  provider public.integration_provider not null,
  provider_account_id text not null,
  encrypted_access_token bytea not null,
  encrypted_refresh_token bytea,
  token_iv bytea not null,
  token_auth_tag bytea not null,
  scopes text[] not null default '{}',
  expires_at timestamptz,
  status text not null default 'active' check (status in ('active', 'expired', 'revoked', 'error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, provider, provider_account_id)
);

create table public.notification_preferences (
  user_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  in_app boolean not null default true,
  email boolean not null default true,
  slack boolean not null default false,
  task_updates boolean not null default true,
  mentions boolean not null default true,
  reminders boolean not null default true,
  quiet_hours_start time,
  quiet_hours_end time,
  primary key (user_id, workspace_id)
);
