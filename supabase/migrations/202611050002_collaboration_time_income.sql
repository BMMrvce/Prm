-- Collaboration (tag people on projects and tasks), time logging on shared tasks and
-- income entries. Paste into the Supabase SQL editor after the earlier migrations.

-- People tagged on a project see the project and all of its tasks.
create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  added_by uuid references public.profiles(id) on delete set null,
  added_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index project_members_user_idx on public.project_members(user_id);
create index task_assignees_user_idx on public.task_assignees(user_id);

-- Tags must carry the workspace of the item they point at: access checks rely on it.
create or replace function public.validate_project_member()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.projects p
    where p.id = new.project_id and p.workspace_id = new.workspace_id
  ) then
    raise exception 'Project does not belong to workspace';
  end if;
  return new;
end;
$$;

create or replace function public.validate_task_assignee()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.tasks t
    where t.id = new.task_id and t.workspace_id = new.workspace_id
  ) then
    raise exception 'Task does not belong to workspace';
  end if;
  return new;
end;
$$;

create trigger validate_project_member_workspace
before insert or update on public.project_members
for each row execute function public.validate_project_member();

create trigger validate_task_assignee_workspace
before insert or update on public.task_assignees
for each row execute function public.validate_task_assignee();

create or replace function public.is_project_member(target_project uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.project_members
    where project_id = target_project and user_id = auth.uid()
  );
$$;

/** Workspace members, people tagged on the task and people tagged on its project. */
create or replace function public.can_access_task(target_task uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.tasks t
    where t.id = target_task
      and (
        public.is_workspace_member(t.workspace_id)
        or exists (
          select 1 from public.task_assignees a
          where a.task_id = t.id and a.user_id = auth.uid()
        )
        or public.is_project_member(t.project_id)
      )
  );
$$;

create or replace function public.can_see_project(target_project uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select public.is_project_member(target_project)
    or exists (
      select 1 from public.task_assignees a
      join public.tasks t on t.id = a.task_id
      where t.project_id = target_project and a.user_id = auth.uid()
    );
$$;

create or replace function public.collaborates_in(target_workspace uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.project_members
    where workspace_id = target_workspace and user_id = auth.uid()
  )
  or exists (
    select 1 from public.task_assignees
    where workspace_id = target_workspace and user_id = auth.uid()
  );
$$;

revoke all on function public.is_project_member(uuid) from public;
revoke all on function public.can_access_task(uuid) from public;
revoke all on function public.can_see_project(uuid) from public;
revoke all on function public.collaborates_in(uuid) from public;
grant execute on function public.is_project_member(uuid) to authenticated;
grant execute on function public.can_access_task(uuid) to authenticated;
grant execute on function public.can_see_project(uuid) to authenticated;
grant execute on function public.collaborates_in(uuid) to authenticated;

-- Find someone to tag by name or email (at least 3 characters, 8 results).
create or replace function public.search_people(term text)
returns table (id uuid, full_name text, email text)
language sql
stable
security definer set search_path = ''
as $$
  select p.id, p.full_name, u.email::text
  from public.profiles p
  join auth.users u on u.id = p.id
  where auth.uid() is not null
    and char_length(trim(term)) >= 3
    and p.id <> auth.uid()
    and (
      u.email ilike replace(replace(trim(term), '%', ''), '_', '\_') || '%'
      or p.full_name ilike '%' || replace(replace(trim(term), '%', ''), '_', '\_') || '%'
    )
  order by p.full_name nulls last
  limit 8;
$$;

revoke all on function public.search_people(text) from public;
grant execute on function public.search_people(text) to authenticated;

-- Tell people when they are tagged.
create or replace function public.tag_actor()
returns text
language sql
stable
security definer set search_path = ''
as $$
  select coalesce((select full_name from public.profiles where id = auth.uid()), 'Someone');
$$;

create or replace function public.notify_project_member()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.user_id is distinct from auth.uid() then
    insert into public.notifications (workspace_id, user_id, type, title, body, data)
    select new.workspace_id, new.user_id, 'project_shared',
      public.tag_actor() || ' added you to a project',
      'Project “' || p.name || '”',
      jsonb_build_object('project_id', p.id)
    from public.projects p where p.id = new.project_id;
  end if;
  return new;
end;
$$;

create or replace function public.notify_task_assignee()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.user_id is distinct from auth.uid() then
    insert into public.notifications (workspace_id, user_id, type, title, body, data)
    select new.workspace_id, new.user_id, 'task_assigned',
      public.tag_actor() || ' tagged you on a task',
      w.task_prefix || '-' || t.task_number || ' “' || t.title || '”',
      jsonb_build_object('task_id', t.id)
    from public.tasks t join public.workspaces w on w.id = t.workspace_id
    where t.id = new.task_id;
  end if;
  return new;
end;
$$;

revoke all on function public.tag_actor() from public;

create trigger notify_project_member
after insert on public.project_members
for each row execute function public.notify_project_member();

create trigger notify_task_assignee
after insert on public.task_assignees
for each row execute function public.notify_task_assignee();

alter table public.project_members enable row level security;

create policy "project members read" on public.project_members for select to authenticated
using (
  user_id = auth.uid()
  or public.is_workspace_member(workspace_id)
  or public.is_project_member(project_id)
);
create policy "project members managed by workspace" on public.project_members for insert to authenticated
with check (
  public.has_workspace_role(workspace_id, array['owner','admin','member']::public.workspace_role[])
  and added_by = auth.uid()
);
create policy "project members removed by workspace or self" on public.project_members for delete to authenticated
using (
  user_id = auth.uid()
  or public.has_workspace_role(workspace_id, array['owner','admin','member']::public.workspace_role[])
);

-- Collaborators read the shared workspace's name, its projects, tasks and tags.
create policy "workspaces collaborators read" on public.workspaces for select to authenticated
using (public.collaborates_in(id));

create policy "projects collaborators read" on public.projects for select to authenticated
using (public.can_see_project(id));

create policy "tasks collaborators read" on public.tasks for select to authenticated
using (public.is_project_member(project_id) or public.can_access_task(id));
create policy "tasks collaborators update" on public.tasks for update to authenticated
using (public.can_access_task(id))
with check (public.can_access_task(id) and public.can_see_project(project_id));
create policy "tasks project members create" on public.tasks for insert to authenticated
with check (public.is_project_member(project_id) and creator_id = auth.uid());

create policy "assignees collaborators read" on public.task_assignees for select to authenticated
using (user_id = auth.uid() or public.can_access_task(task_id));
create policy "assignees remove self" on public.task_assignees for delete to authenticated
using (user_id = auth.uid());

-- Everyone signed in can read names, so tags and shared items show who they belong to.
create policy "profiles signed in read" on public.profiles for select to authenticated
using (true);

-- Time on a task is logged in the task's workspace and visible to everyone on the task.
create policy "time entries task read" on public.time_entries for select to authenticated
using (task_id is not null and public.can_access_task(task_id));
create policy "time entries task create" on public.time_entries for insert to authenticated
with check (
  user_id = auth.uid()
  and task_id is not null
  and public.can_access_task(task_id)
  and workspace_id = (select t.workspace_id from public.tasks t where t.id = task_id)
);
create policy "time entries task update" on public.time_entries for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid() and task_id is not null and public.can_access_task(task_id));

-- Studio and Personal track income as well as expenses.
alter table public.expense_entries drop constraint if exists expense_entries_kind_check;
alter table public.expense_entries
  add constraint expense_entries_kind_check check (kind in ('reimbursement', 'expense', 'income'));

alter publication supabase_realtime add table public.project_members;
