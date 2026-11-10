-- Personal Finance: budgets, savings goals and recurring payments. Additive only: new
-- tables, their indexes, triggers and policies, plus two nullable/widened columns on the
-- existing expense_entries table. Nothing existing changes, and Office/Studio are unaffected
-- (they never write these new tables or the new expense_entries columns).

-- A payment method and optional note per entry, and a 'transfer' kind so moving money
-- between your own accounts can be logged without counting as income or an expense.
alter table public.expense_entries
  add column if not exists payment_method text check (payment_method is null or char_length(payment_method) <= 40);
alter table public.expense_entries
  add column if not exists notes text check (notes is null or char_length(notes) <= 500);

alter table public.expense_entries drop constraint if exists expense_entries_kind_check;
alter table public.expense_entries
  add constraint expense_entries_kind_check check (kind in ('reimbursement', 'expense', 'income', 'transfer'));

-- One active budget per person per workspace: an overall monthly limit plus a
-- {category: limit} map. Not month-indexed history — it's an ongoing policy evaluated
-- against whichever month is being viewed.
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  monthly_limit numeric(12, 2) check (monthly_limit is null or monthly_limit >= 0),
  category_limits jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

drop trigger if exists budgets_updated_at on public.budgets;
create trigger budgets_updated_at before update on public.budgets
for each row execute function public.touch_updated_at();

-- Savings goals. current amount is never stored: it is computed client-side from
-- savings_contributions, the same way a book's pages read is computed from its sessions.
create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  target_amount numeric(12, 2) not null check (target_amount > 0),
  target_date date,
  position numeric(20, 10) not null default 1000,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists savings_goals_workspace_user_idx
  on public.savings_goals (workspace_id, user_id, archived_at);

drop trigger if exists savings_goals_updated_at on public.savings_goals;
create trigger savings_goals_updated_at before update on public.savings_goals
for each row execute function public.touch_updated_at();

create table if not exists public.savings_contributions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.savings_goals(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  direction text not null check (direction in ('contribution', 'withdrawal')),
  occurred_on date not null default current_date,
  note text check (note is null or char_length(note) <= 240),
  created_at timestamptz not null default now()
);

create index if not exists savings_contributions_goal_idx
  on public.savings_contributions (goal_id, occurred_on desc);

-- Recurring commitments (subscriptions, rent, EMIs, bills, regular income): a schedule
-- only. Marking one paid inserts a real expense_entries row and advances next_due_date;
-- nothing here ever posts a transaction on its own.
create table if not exists public.recurring_payments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  kind text not null check (kind in ('expense', 'income')),
  category text check (category is null or char_length(category) <= 60),
  amount numeric(12, 2) not null check (amount > 0),
  frequency text not null default 'monthly' check (frequency in ('monthly', 'weekly', 'yearly')),
  next_due_date date not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recurring_payments_workspace_user_idx
  on public.recurring_payments (workspace_id, user_id, active, next_due_date);

drop trigger if exists recurring_payments_updated_at on public.recurring_payments;
create trigger recurring_payments_updated_at before update on public.recurring_payments
for each row execute function public.touch_updated_at();

alter table public.budgets enable row level security;
alter table public.savings_goals enable row level security;
alter table public.savings_contributions enable row level security;
alter table public.recurring_payments enable row level security;

drop policy if exists "budgets owner all" on public.budgets;
create policy "budgets owner all" on public.budgets for all to authenticated
  using (user_id = auth.uid() and public.is_workspace_member(workspace_id))
  with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists "savings goals owner all" on public.savings_goals;
create policy "savings goals owner all" on public.savings_goals for all to authenticated
  using (user_id = auth.uid() and public.is_workspace_member(workspace_id))
  with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists "savings contributions owner all" on public.savings_contributions;
create policy "savings contributions owner all" on public.savings_contributions for all to authenticated
  using (user_id = auth.uid() and public.is_workspace_member(workspace_id))
  with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists "recurring payments owner all" on public.recurring_payments;
create policy "recurring payments owner all" on public.recurring_payments for all to authenticated
  using (user_id = auth.uid() and public.is_workspace_member(workspace_id))
  with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

grant select, insert, update, delete on public.budgets to authenticated;
grant select, insert, update, delete on public.savings_goals to authenticated;
grant select, insert, update, delete on public.savings_contributions to authenticated;
grant select, insert, update, delete on public.recurring_payments to authenticated;
