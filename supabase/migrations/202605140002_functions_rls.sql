-- Security helpers, lifecycle functions, RLS, Realtime, and Storage.

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();
create trigger workspaces_updated_at before update on public.workspaces
for each row execute function public.touch_updated_at();
create trigger projects_updated_at before update on public.projects
for each row execute function public.touch_updated_at();
create trigger tasks_updated_at before update on public.tasks
for each row execute function public.touch_updated_at();
create trigger time_entries_updated_at before update on public.time_entries
for each row execute function public.touch_updated_at();
create trigger meetings_updated_at before update on public.meetings
for each row execute function public.touch_updated_at();
create trigger daily_notes_updated_at before update on public.daily_notes
for each row execute function public.touch_updated_at();
create trigger integrations_updated_at before update on public.integrations
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = target_workspace
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function public.has_workspace_role(target_workspace uuid, allowed_roles public.workspace_role[])
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = target_workspace
      and user_id = auth.uid()
      and status = 'active'
      and role = any(allowed_roles)
  );
$$;

revoke all on function public.is_workspace_member(uuid) from public;
revoke all on function public.has_workspace_role(uuid, public.workspace_role[]) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.has_workspace_role(uuid, public.workspace_role[]) to authenticated;

create or replace function public.create_workspace(workspace_name text, workspace_slug text, prefix text default 'WR')
returns public.workspaces
language plpgsql
security definer set search_path = ''
as $$
declare
  created public.workspaces;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if char_length(trim(workspace_name)) not between 2 and 80 then raise exception 'Invalid workspace name'; end if;
  if workspace_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then raise exception 'Invalid workspace slug'; end if;
  if upper(prefix) !~ '^[A-Z0-9]{2,6}$' then raise exception 'Invalid task prefix'; end if;

  insert into public.workspaces (name, slug, task_prefix, created_by)
  values (trim(workspace_name), workspace_slug, upper(prefix), auth.uid())
  returning * into created;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (created.id, auth.uid(), 'owner');

  insert into public.notification_preferences (workspace_id, user_id)
  values (created.id, auth.uid());

  return created;
end;
$$;

revoke all on function public.create_workspace(text, text, text) from public;
grant execute on function public.create_workspace(text, text, text) to authenticated;

create or replace function public.assign_task_number()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.workspaces
  set next_task_number = next_task_number + 1
  where id = new.workspace_id
  returning next_task_number - 1 into new.task_number;
  return new;
end;
$$;

create trigger before_task_insert
before insert on public.tasks
for each row when (new.task_number is null)
execute function public.assign_task_number();

create or replace function public.validate_project_workspace()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (
    select 1 from public.projects p
    where p.id = new.project_id and p.workspace_id = new.workspace_id
  ) then
    raise exception 'Project does not belong to workspace';
  end if;
  if new.column_id is not null and not exists (
    select 1 from public.project_columns c
    where c.id = new.column_id and c.project_id = new.project_id and c.workspace_id = new.workspace_id
  ) then
    raise exception 'Column does not belong to project';
  end if;
  return new;
end;
$$;

create trigger validate_task_tenant
before insert or update of workspace_id, project_id, column_id on public.tasks
for each row execute function public.validate_project_workspace();

create or replace function public.sync_task_completion()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.state = 'completed' and old.state is distinct from 'completed' then
    new.completed_at = coalesce(new.completed_at, now());
  elsif new.state <> 'completed' then
    new.completed_at = null;
  end if;
  return new;
end;
$$;

create trigger sync_task_completion_time
before update of state on public.tasks
for each row execute function public.sync_task_completion();

-- Enable RLS on every tenant or user table.
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invitations enable row level security;
alter table public.projects enable row level security;
alter table public.project_columns enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignees enable row level security;
alter table public.labels enable row level security;
alter table public.task_labels enable row level security;
alter table public.comments enable row level security;
alter table public.time_entries enable row level security;
alter table public.meetings enable row level security;
alter table public.daily_notes enable row level security;
alter table public.plan_items enable row level security;
alter table public.reminders enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_events enable row level security;
alter table public.attachments enable row level security;
alter table public.external_links enable row level security;
alter table public.integrations enable row level security;
alter table public.notification_preferences enable row level security;

create policy "profiles self read" on public.profiles for select to authenticated
using (id = auth.uid());
create policy "profiles workspace peers read" on public.profiles for select to authenticated
using (exists (
  select 1 from public.workspace_members mine
  join public.workspace_members theirs on theirs.workspace_id = mine.workspace_id
  where mine.user_id = auth.uid() and mine.status = 'active' and theirs.user_id = profiles.id and theirs.status = 'active'
));
create policy "profiles self update" on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

create policy "workspaces members read" on public.workspaces for select to authenticated
using (public.is_workspace_member(id));
create policy "workspaces managers update" on public.workspaces for update to authenticated
using (public.has_workspace_role(id, array['owner','admin']::public.workspace_role[]))
with check (public.has_workspace_role(id, array['owner','admin']::public.workspace_role[]));
create policy "workspaces owners delete" on public.workspaces for delete to authenticated
using (public.has_workspace_role(id, array['owner']::public.workspace_role[]));

create policy "members tenant read" on public.workspace_members for select to authenticated
using (public.is_workspace_member(workspace_id));
create policy "members managers insert" on public.workspace_members for insert to authenticated
with check (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));
create policy "members managers update" on public.workspace_members for update to authenticated
using (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]))
with check (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));
create policy "members managers delete" on public.workspace_members for delete to authenticated
using (
  public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[])
  and not (user_id = auth.uid() and role = 'owner')
);

create policy "invitations managers all" on public.workspace_invitations for all to authenticated
using (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]))
with check (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));

-- Reusable policy pattern for normal workspace records.
create policy "projects members read" on public.projects for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "projects members create" on public.projects for insert to authenticated with check (public.has_workspace_role(workspace_id, array['owner','admin','member']::public.workspace_role[]) and created_by = auth.uid());
create policy "projects members update" on public.projects for update to authenticated using (public.has_workspace_role(workspace_id, array['owner','admin','member']::public.workspace_role[])) with check (public.has_workspace_role(workspace_id, array['owner','admin','member']::public.workspace_role[]));
create policy "projects managers delete" on public.projects for delete to authenticated using (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));

create policy "columns members read" on public.project_columns for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "columns members write" on public.project_columns for all to authenticated using (public.has_workspace_role(workspace_id, array['owner','admin','member']::public.workspace_role[])) with check (public.has_workspace_role(workspace_id, array['owner','admin','member']::public.workspace_role[]));

create policy "tasks members read" on public.tasks for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "tasks members create" on public.tasks for insert to authenticated with check (public.has_workspace_role(workspace_id, array['owner','admin','member']::public.workspace_role[]) and creator_id = auth.uid());
create policy "tasks members update" on public.tasks for update to authenticated using (public.has_workspace_role(workspace_id, array['owner','admin','member']::public.workspace_role[])) with check (public.has_workspace_role(workspace_id, array['owner','admin','member']::public.workspace_role[]));
create policy "tasks managers delete" on public.tasks for delete to authenticated using (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]) or creator_id = auth.uid());

create policy "assignees members read" on public.task_assignees for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "assignees members write" on public.task_assignees for all to authenticated using (public.has_workspace_role(workspace_id, array['owner','admin','member']::public.workspace_role[])) with check (public.has_workspace_role(workspace_id, array['owner','admin','member']::public.workspace_role[]));
create policy "labels members read" on public.labels for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "labels members write" on public.labels for all to authenticated using (public.has_workspace_role(workspace_id, array['owner','admin','member']::public.workspace_role[])) with check (public.has_workspace_role(workspace_id, array['owner','admin','member']::public.workspace_role[]));
create policy "task labels members read" on public.task_labels for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "task labels members write" on public.task_labels for all to authenticated using (public.has_workspace_role(workspace_id, array['owner','admin','member']::public.workspace_role[])) with check (public.has_workspace_role(workspace_id, array['owner','admin','member']::public.workspace_role[]));

create policy "comments members read" on public.comments for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "comments members create" on public.comments for insert to authenticated with check (public.has_workspace_role(workspace_id, array['owner','admin','member','guest']::public.workspace_role[]) and author_id = auth.uid());
create policy "comments author update" on public.comments for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid() and public.is_workspace_member(workspace_id));
create policy "comments author delete" on public.comments for delete to authenticated using (author_id = auth.uid() or public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));

create policy "time entries own read" on public.time_entries for select to authenticated using (user_id = auth.uid() or public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));
create policy "time entries own create" on public.time_entries for insert to authenticated with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));
create policy "time entries own update" on public.time_entries for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));
create policy "time entries own delete" on public.time_entries for delete to authenticated using (user_id = auth.uid() or public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));

create policy "meetings members read" on public.meetings for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "meetings members create" on public.meetings for insert to authenticated with check (public.has_workspace_role(workspace_id, array['owner','admin','member']::public.workspace_role[]) and created_by = auth.uid());
create policy "meetings members update" on public.meetings for update to authenticated using (created_by = auth.uid() or public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[])) with check (public.is_workspace_member(workspace_id));
create policy "meetings members delete" on public.meetings for delete to authenticated using (created_by = auth.uid() or public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));

create policy "notes own all" on public.daily_notes for all to authenticated using (user_id = auth.uid() and public.is_workspace_member(workspace_id)) with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));
create policy "plan own all" on public.plan_items for all to authenticated using (user_id = auth.uid() and public.is_workspace_member(workspace_id)) with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));
create policy "reminders own all" on public.reminders for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));
create policy "notifications own read" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notifications own update" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "activity members read" on public.activity_events for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "attachments members read" on public.attachments for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "attachments members create" on public.attachments for insert to authenticated with check (uploaded_by = auth.uid() and public.is_workspace_member(workspace_id));
create policy "attachments owner delete" on public.attachments for delete to authenticated using (uploaded_by = auth.uid() or public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));
create policy "links members read" on public.external_links for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "links members write" on public.external_links for all to authenticated using (created_by = auth.uid() or public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[])) with check (created_by = auth.uid() and public.is_workspace_member(workspace_id));
create policy "integrations managers read" on public.integrations for select to authenticated using (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));
create policy "preferences own all" on public.notification_preferences for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

-- Realtime tables used by the dashboard and collaboration surfaces.
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.activity_events;
alter publication supabase_realtime add table public.time_entries;
alter table public.tasks replica identity full;
alter table public.comments replica identity full;
alter table public.time_entries replica identity full;

insert into storage.buckets (id, name, public, file_size_limit)
values ('workbench-attachments', 'workbench-attachments', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

-- Object paths must be: <workspace_uuid>/<task_uuid>/<random>-<filename>.
create policy "attachment members read"
on storage.objects for select to authenticated
using (
  bucket_id = 'workbench-attachments'
  and public.is_workspace_member((storage.foldername(name))[1]::uuid)
);

create policy "attachment members upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'workbench-attachments'
  and public.has_workspace_role((storage.foldername(name))[1]::uuid, array['owner','admin','member']::public.workspace_role[])
);

create policy "attachment uploader delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'workbench-attachments'
  and owner_id = auth.uid()::text
);
