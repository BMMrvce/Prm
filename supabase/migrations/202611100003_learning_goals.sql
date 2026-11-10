-- Technical Learning Hub and Goals & Milestones. Additive only: new tables,
-- their indexes, triggers and policies. Nothing existing changes.

create table if not exists public.learning_topics (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  category text not null default 'other'
    check (category in ('system_design', 'linux', 'aws', 'devops', 'software_engineering', 'software_architecture', 'other')),
  status text not null default 'not_started'
    check (status in ('not_started', 'learning', 'practised', 'mastered')),
  -- Free-text links/notes rather than a separate resources table: kept deliberately lightweight.
  resources text check (resources is null or char_length(resources) <= 4000),
  notes text check (notes is null or char_length(notes) <= 4000),
  position numeric(20, 10) not null default 1000,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists learning_topics_workspace_user_idx
  on public.learning_topics (workspace_id, user_id, archived_at);

drop trigger if exists learning_topics_updated_at on public.learning_topics;
create trigger learning_topics_updated_at before update on public.learning_topics
for each row execute function public.touch_updated_at();

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  category text not null default 'other'
    check (category in ('career', 'financial', 'personal_development', 'learning', 'other')),
  status text not null default 'active'
    check (status in ('active', 'completed', 'abandoned')),
  target_date date,
  notes text check (notes is null or char_length(notes) <= 4000),
  position numeric(20, 10) not null default 1000,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists goals_workspace_user_idx
  on public.goals (workspace_id, user_id, status);

drop trigger if exists goals_updated_at on public.goals;
create trigger goals_updated_at before update on public.goals
for each row execute function public.touch_updated_at();

-- A goal's progress is computed client-side from completed/total milestones.
create table if not exists public.goal_milestones (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  target_date date,
  completed_at timestamptz,
  position numeric(20, 10) not null default 1000,
  created_at timestamptz not null default now()
);

create index if not exists goal_milestones_goal_idx
  on public.goal_milestones (goal_id, position);

alter table public.learning_topics enable row level security;
alter table public.goals enable row level security;
alter table public.goal_milestones enable row level security;

drop policy if exists "learning topics owner all" on public.learning_topics;
create policy "learning topics owner all" on public.learning_topics for all to authenticated
  using (user_id = auth.uid() and public.is_workspace_member(workspace_id))
  with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists "goals owner all" on public.goals;
create policy "goals owner all" on public.goals for all to authenticated
  using (user_id = auth.uid() and public.is_workspace_member(workspace_id))
  with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists "goal milestones owner all" on public.goal_milestones;
create policy "goal milestones owner all" on public.goal_milestones for all to authenticated
  using (user_id = auth.uid() and public.is_workspace_member(workspace_id))
  with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

grant select, insert, update, delete on public.learning_topics to authenticated;
grant select, insert, update, delete on public.goals to authenticated;
grant select, insert, update, delete on public.goal_milestones to authenticated;
