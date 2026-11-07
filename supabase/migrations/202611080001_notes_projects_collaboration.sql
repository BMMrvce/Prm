-- Notes: a project per note, and collaborators who can read and edit it in real time.
-- Run after 202611070001_notes.sql. Additive: one new column, one new table, helper
-- functions, policies and a trigger; the private-note policy is replaced by split ones.

-- 1. Categorize by project (optional; deleting the project keeps the note).
alter table public.notes
  add column if not exists project_id uuid references public.projects(id) on delete set null;
create index if not exists notes_project_idx on public.notes (project_id);

-- 2. Collaborators: people a note is shared with.
create table if not exists public.note_members (
  note_id uuid not null references public.notes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  added_by uuid references public.profiles(id) on delete set null,
  added_at timestamptz not null default now(),
  primary key (note_id, user_id)
);
create index if not exists note_members_user_idx on public.note_members (user_id);

-- Access checks as security-definer functions, so the notes and note_members policies can
-- refer to each other without recursing.
create or replace function public.owns_note(target_note uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.notes n
    where n.id = target_note and n.user_id = auth.uid()
      and public.is_workspace_member(n.workspace_id)
  );
$$;

create or replace function public.is_note_member(target_note uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.note_members
    where note_id = target_note and user_id = auth.uid()
  );
$$;

create or replace function public.can_access_note(target_note uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select public.owns_note(target_note) or public.is_note_member(target_note);
$$;

grant execute on function public.owns_note(uuid) to authenticated;
grant execute on function public.is_note_member(uuid) to authenticated;
grant execute on function public.can_access_note(uuid) to authenticated;

-- 3. Notes policies: the owner does everything; collaborators read and edit.
drop policy if exists "notes owner all" on public.notes;
drop policy if exists "notes read" on public.notes;
drop policy if exists "notes create" on public.notes;
drop policy if exists "notes edit" on public.notes;
drop policy if exists "notes delete" on public.notes;

create policy "notes read" on public.notes for select to authenticated
  using (
    (user_id = auth.uid() and public.is_workspace_member(workspace_id))
    or public.is_note_member(id)
  );
create policy "notes create" on public.notes for insert to authenticated
  with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));
create policy "notes edit" on public.notes for update to authenticated
  using (
    (user_id = auth.uid() and public.is_workspace_member(workspace_id))
    or public.is_note_member(id)
  )
  with check (
    (user_id = auth.uid() and public.is_workspace_member(workspace_id))
    or public.is_note_member(id)
  );
create policy "notes delete" on public.notes for delete to authenticated
  using (user_id = auth.uid() and public.is_workspace_member(workspace_id));

-- Collaborators may change the text, title and pin, but not who owns it or where it lives.
create or replace function public.guard_note_update()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if old.user_id is distinct from auth.uid() and (
    new.user_id is distinct from old.user_id
    or new.workspace_id is distinct from old.workspace_id
    or new.project_id is distinct from old.project_id
    or new.meeting_id is distinct from old.meeting_id
  ) then
    raise exception 'Only the note owner can move it';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_note_update on public.notes;
create trigger guard_note_update before update on public.notes
for each row execute function public.guard_note_update();

-- 4. note_members policies.
alter table public.note_members enable row level security;

drop policy if exists "note members read" on public.note_members;
drop policy if exists "note members add" on public.note_members;
drop policy if exists "note members remove" on public.note_members;

create policy "note members read" on public.note_members for select to authenticated
  using (user_id = auth.uid() or public.can_access_note(note_id));
create policy "note members add" on public.note_members for insert to authenticated
  with check (public.owns_note(note_id) and added_by = auth.uid() and user_id <> auth.uid());
-- The owner removes anyone; a collaborator can leave.
create policy "note members remove" on public.note_members for delete to authenticated
  using (user_id = auth.uid() or public.owns_note(note_id));

grant select, insert, delete on public.note_members to authenticated;

-- Collaborators can read the name and slug of the workspace a shared note lives in, so the
-- app files it under the right space (Office / Studio / Personal).
create or replace function public.has_note_in(target_workspace uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.note_members m
    join public.notes n on n.id = m.note_id
    where m.user_id = auth.uid() and n.workspace_id = target_workspace
  );
$$;

grant execute on function public.has_note_in(uuid) to authenticated;

drop policy if exists "workspaces note collaborators read" on public.workspaces;
create policy "workspaces note collaborators read" on public.workspaces for select to authenticated
  using (public.has_note_in(id));

-- 5. Tell people when a note is shared with them.
create or replace function public.notify_note_member()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.user_id is distinct from auth.uid() then
    insert into public.notifications (workspace_id, user_id, type, title, body, data)
    select n.workspace_id, new.user_id, 'note_shared',
      public.tag_actor() || ' shared a note with you',
      '“' || coalesce(nullif(n.title, ''), 'Untitled') || '”',
      jsonb_build_object('note_id', n.id)
    from public.notes n where n.id = new.note_id;
  end if;
  return new;
end;
$$;

drop trigger if exists notify_note_member on public.note_members;
create trigger notify_note_member after insert on public.note_members
for each row execute function public.notify_note_member();

-- 6. Real time: saved changes stream to everyone on the note …
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notes'
  ) then
    alter publication supabase_realtime add table public.notes;
  end if;
end;
$$;

-- … and live typing goes over private broadcast channels named `note:<id>`, which only the
-- note's owner and collaborators may join (Realtime Authorization).
create or replace function public.can_join_note_topic(topic text)
returns boolean
language plpgsql
stable
security definer set search_path = ''
as $$
begin
  -- Only well-formed `note:<uuid>` topics; anything else is simply refused.
  if topic !~ '^note:[0-9a-fA-F-]{36}$' then
    return false;
  end if;
  return public.can_access_note(substring(topic from 6)::uuid);
end;
$$;

grant execute on function public.can_join_note_topic(text) to authenticated;

do $$
begin
  if to_regclass('realtime.messages') is not null then
    drop policy if exists "note collaborators receive" on realtime.messages;
    drop policy if exists "note collaborators send" on realtime.messages;
    create policy "note collaborators receive" on realtime.messages for select to authenticated
      using (public.can_join_note_topic(realtime.topic()));
    create policy "note collaborators send" on realtime.messages for insert to authenticated
      with check (public.can_join_note_topic(realtime.topic()));
  end if;
end;
$$;
