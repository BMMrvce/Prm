-- Development-only starter data.
-- Create a user through Supabase Auth first, then run this script with the
-- user's UUID substituted for 00000000-0000-0000-0000-000000000001.

do $$
declare
  user_id uuid := '00000000-0000-0000-0000-000000000001';
  workspace public.workspaces;
  v_project_id uuid;
  backlog_id uuid;
  progress_id uuid;
begin
  if not exists (select 1 from public.profiles where id = user_id) then
    raise notice 'Seed skipped: replace user_id with an existing auth user UUID.';
    return;
  end if;

  insert into public.workspaces (name, slug, task_prefix, created_by)
  values ('Acme Studio', 'acme-studio', 'WR', user_id)
  on conflict (slug) do update set name = excluded.name
  returning * into workspace;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (workspace.id, user_id, 'owner')
  on conflict do nothing;

  insert into public.projects (workspace_id, name, slug, description, color, created_by)
  values (workspace.id, 'Workbench', 'workbench', 'A calmer home for focused teamwork.', '#4338ca', user_id)
  on conflict (workspace_id, slug) do update set description = excluded.description
  returning id into v_project_id;

  insert into public.project_columns (project_id, workspace_id, name, position, category)
  values (v_project_id, workspace.id, 'Backlog', 1000, 'backlog')
  on conflict (project_id, position) do update set name = excluded.name
  returning id into backlog_id;

  insert into public.project_columns (project_id, workspace_id, name, position, category, color)
  values (v_project_id, workspace.id, 'In progress', 2000, 'started', '#4338ca')
  on conflict (project_id, position) do update set name = excluded.name
  returning id into progress_id;

  if not exists (select 1 from public.tasks where project_id = v_project_id) then
    insert into public.tasks (workspace_id, project_id, column_id, task_number, title, priority, creator_id, due_at, position)
    values
      (workspace.id, v_project_id, progress_id, 24, 'Finalize onboarding flow', 'high', user_id, now() + interval '4 hours', 1000),
      (workspace.id, v_project_id, backlog_id, 31, 'Review mobile navigation', 'medium', user_id, now() + interval '1 day', 2000);
    update public.workspaces set next_task_number = 32 where id = workspace.id;
  end if;
end $$;
