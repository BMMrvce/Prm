-- Habit & Personal Growth Tracker: habits, daily habit entries, reading and
-- focus/deep-work tracking. Additive only: new tables, one new nullable
-- column on workspaces, their indexes, triggers and policies. Nothing
-- existing changes.

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  category text not null default 'other'
    check (category in ('focus', 'reading', 'technical', 'health', 'financial', 'other')),
  frequency text not null default 'daily'
    check (frequency in ('daily', 'weekly', 'weekdays')),
  -- Only set when frequency = 'weekdays'. 0 = Sunday .. 6 = Saturday.
  weekdays smallint[],
  -- Only set when frequency = 'weekly': how many times a week it must be done.
  target_per_week smallint check (target_per_week is null or target_per_week between 1 and 7),
  target_kind text not null default 'boolean'
    check (target_kind in ('boolean', 'duration', 'quantity')),
  target_value numeric check (target_value is null or target_value > 0),
  target_unit text check (target_unit is null or char_length(target_unit) <= 30),
  color text not null default 'blue',
  position numeric(20, 10) not null default 1000,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists habits_workspace_user_idx
  on public.habits (workspace_id, user_id, archived_at);

drop trigger if exists habits_updated_at on public.habits;
create trigger habits_updated_at before update on public.habits
for each row execute function public.touch_updated_at();

-- One row per habit per day. Absence of a row means "not completed" --
-- that state is never written, only inferred, so history is never fabricated.
create table if not exists public.habit_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  entry_date date not null,
  status text not null check (status in ('completed', 'skipped')),
  logged_at timestamptz not null default now(),
  note text check (note is null or char_length(note) <= 2000),
  quantity_value numeric check (quantity_value is null or quantity_value >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, entry_date)
);

create index if not exists habit_entries_lookup_idx
  on public.habit_entries (workspace_id, user_id, entry_date);

drop trigger if exists habit_entries_updated_at on public.habit_entries;
create trigger habit_entries_updated_at before update on public.habit_entries
for each row execute function public.touch_updated_at();

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  author text not null default '' check (char_length(author) <= 200),
  status text not null default 'planned'
    check (status in ('planned', 'reading', 'completed')),
  total_pages integer check (total_pages is null or total_pages > 0),
  started_at date,
  completed_at date,
  position numeric(20, 10) not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists books_workspace_user_idx
  on public.books (workspace_id, user_id, status);

drop trigger if exists books_updated_at on public.books;
create trigger books_updated_at before update on public.books
for each row execute function public.touch_updated_at();

-- One book per session; multiple sessions per day are allowed (e.g. two
-- different books read the same day), so there is no unique date constraint.
create table if not exists public.reading_sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  session_date date not null,
  pages_read integer check (pages_read is null or pages_read >= 0),
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  takeaway text check (takeaway is null or char_length(takeaway) <= 4000),
  created_at timestamptz not null default now()
);

create index if not exists reading_sessions_lookup_idx
  on public.reading_sessions (workspace_id, user_id, session_date);

-- One row per deep-work session. The count of rows for a day is "number of
-- deep work sessions"; concentration_rating is a self-rating, not a clinical
-- assessment.
create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_date date not null,
  duration_minutes integer not null check (duration_minutes > 0),
  distraction_count integer not null default 0 check (distraction_count >= 0),
  tasks_completed integer not null default 0 check (tasks_completed >= 0),
  concentration_rating smallint not null check (concentration_rating between 1 and 5),
  note text check (note is null or char_length(note) <= 2000),
  created_at timestamptz not null default now()
);

create index if not exists focus_sessions_lookup_idx
  on public.focus_sessions (workspace_id, user_id, session_date);

-- Marks that the default habits/books have been seeded once for a
-- workspace, so deleting them all later never triggers a silent re-seed.
alter table public.workspaces add column if not exists growth_seeded_at timestamptz;

alter table public.habits enable row level security;
alter table public.habit_entries enable row level security;
alter table public.books enable row level security;
alter table public.reading_sessions enable row level security;
alter table public.focus_sessions enable row level security;

-- Private, like Day Note and Plan of Action: only you, and only in
-- workspaces you belong to.
drop policy if exists "habits owner all" on public.habits;
create policy "habits owner all" on public.habits for all to authenticated
  using (user_id = auth.uid() and public.is_workspace_member(workspace_id))
  with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists "habit entries owner all" on public.habit_entries;
create policy "habit entries owner all" on public.habit_entries for all to authenticated
  using (user_id = auth.uid() and public.is_workspace_member(workspace_id))
  with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists "books owner all" on public.books;
create policy "books owner all" on public.books for all to authenticated
  using (user_id = auth.uid() and public.is_workspace_member(workspace_id))
  with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists "reading sessions owner all" on public.reading_sessions;
create policy "reading sessions owner all" on public.reading_sessions for all to authenticated
  using (user_id = auth.uid() and public.is_workspace_member(workspace_id))
  with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists "focus sessions owner all" on public.focus_sessions;
create policy "focus sessions owner all" on public.focus_sessions for all to authenticated
  using (user_id = auth.uid() and public.is_workspace_member(workspace_id))
  with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

grant select, insert, update, delete on public.habits to authenticated;
grant select, insert, update, delete on public.habit_entries to authenticated;
grant select, insert, update, delete on public.books to authenticated;
grant select, insert, update, delete on public.reading_sessions to authenticated;
grant select, insert, update, delete on public.focus_sessions to authenticated;
