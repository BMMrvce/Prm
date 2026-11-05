-- Share a project with everyone whose email is on the creator's domain, e.g. every
-- @cfoverseglobal.com account, including people who sign up later.
-- Run after 202611050002_collaboration_time_income.sql.

alter table public.projects
  add column shared_domain text
  check (shared_domain is null or shared_domain ~ '^[a-z0-9-]+(\.[a-z0-9-]+)+$');

create index projects_shared_domain_idx on public.projects(shared_domain)
  where shared_domain is not null;

create or replace function public.my_email_domain()
returns text
language sql
stable
security definer set search_path = ''
as $$
  select lower(split_part(email, '@', 2)) from auth.users where id = auth.uid();
$$;

-- Free mail providers are not organisations: sharing with them would mean everyone.
create or replace function public.is_public_email_domain(domain text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(domain) = any (array[
    'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'msn.com',
    'yahoo.com', 'yahoo.co.in', 'ymail.com', 'icloud.com', 'me.com', 'mac.com', 'aol.com',
    'proton.me', 'protonmail.com', 'zoho.com', 'zohomail.com', 'gmx.com', 'gmx.net',
    'mail.com', 'yandex.com', 'rediffmail.com', 'hey.com', 'fastmail.com'
  ]);
$$;

revoke all on function public.my_email_domain() from public;
grant execute on function public.my_email_domain() to authenticated;
grant execute on function public.is_public_email_domain(text) to authenticated;

-- Only your own organisation's domain can be shared with.
create or replace function public.validate_shared_domain()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.shared_domain is null then return new; end if;
  new.shared_domain = lower(new.shared_domain);
  if new.shared_domain is distinct from public.my_email_domain() then
    raise exception 'You can only share with your own email domain';
  end if;
  if public.is_public_email_domain(new.shared_domain) then
    raise exception 'Projects cannot be shared with a public email domain';
  end if;
  return new;
end;
$$;

create trigger validate_project_shared_domain
before insert or update of shared_domain on public.projects
for each row execute function public.validate_shared_domain();

-- Domain sharing counts as being tagged on the project everywhere access is checked.
create or replace function public.is_project_member(target_project uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.project_members
    where project_id = target_project and user_id = auth.uid()
  )
  or exists (
    select 1 from public.projects p
    where p.id = target_project
      and p.shared_domain is not null
      and p.shared_domain = public.my_email_domain()
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
  )
  or exists (
    select 1 from public.projects p
    where p.workspace_id = target_workspace
      and p.shared_domain is not null
      and p.shared_domain = public.my_email_domain()
  );
$$;

-- Let everyone on the domain know when a project is shared with them.
create or replace function public.notify_domain_share()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.shared_domain is null then return new; end if;
  if tg_op = 'UPDATE' then
    if old.shared_domain is not distinct from new.shared_domain then return new; end if;
  end if;
  insert into public.notifications (workspace_id, user_id, type, title, body, data)
  select new.workspace_id, u.id, 'project_shared',
    public.tag_actor() || ' shared a project with @' || new.shared_domain,
    'Project “' || new.name || '”',
    jsonb_build_object('project_id', new.id)
  from auth.users u
  where lower(split_part(u.email, '@', 2)) = new.shared_domain
    and u.id is distinct from auth.uid();
  return new;
end;
$$;

create trigger notify_project_domain_share
after insert or update of shared_domain on public.projects
for each row execute function public.notify_domain_share();
