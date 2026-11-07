-- Notes: rich-text pages per user and workspace, optionally linked to a meeting.
-- Additive only: a new table, its indexes, trigger and policies. Nothing existing changes.

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- The meeting these notes belong to; deleting the meeting keeps the note, unlinked.
  meeting_id uuid references public.meetings(id) on delete set null,
  title text not null default '' check (char_length(title) <= 300),
  -- Sanitized HTML from the Notes editor.
  content text not null default '' check (octet_length(content) <= 500000),
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One note per person per meeting.
create unique index if not exists notes_one_per_meeting
  on public.notes (user_id, meeting_id) where meeting_id is not null;
create index if not exists notes_workspace_recent
  on public.notes (workspace_id, user_id, updated_at desc);

drop trigger if exists notes_updated_at on public.notes;
create trigger notes_updated_at before update on public.notes
for each row execute function public.touch_updated_at();

alter table public.notes enable row level security;

-- Private, like Day Note: only you, and only in workspaces you belong to.
drop policy if exists "notes owner all" on public.notes;
create policy "notes owner all" on public.notes for all to authenticated
  using (user_id = auth.uid() and public.is_workspace_member(workspace_id))
  with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

grant select, insert, update, delete on public.notes to authenticated;
