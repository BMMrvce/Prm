-- Workspace reimbursements and expense tracking.
-- Additive migration: no existing tables or documents are changed.

create table public.expense_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('reimbursement', 'expense')),
  description text not null check (char_length(description) between 1 and 240),
  category text not null check (char_length(category) between 1 and 60),
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  expense_date date not null default current_date,
  status text not null default 'recorded'
    check (status in ('recorded', 'pending', 'approved', 'rejected', 'paid')),
  receipt_path text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index expense_entries_workspace_date_idx
  on public.expense_entries(workspace_id, expense_date desc);
create index expense_entries_user_idx
  on public.expense_entries(user_id, created_at desc);
create index expense_entries_pending_idx
  on public.expense_entries(workspace_id, status)
  where status = 'pending';

create trigger expense_entries_updated_at
before update on public.expense_entries
for each row execute function public.touch_updated_at();

alter table public.expense_entries enable row level security;

create policy "expense entries members read"
on public.expense_entries for select to authenticated
using (
  user_id = auth.uid()
  or public.has_workspace_role(
    workspace_id,
    array['owner', 'admin']::public.workspace_role[]
  )
);

create policy "expense entries own create"
on public.expense_entries for insert to authenticated
with check (
  user_id = auth.uid()
  and public.is_workspace_member(workspace_id)
  and status in ('recorded', 'pending')
);

create policy "expense entries own update"
on public.expense_entries for update to authenticated
using (
  user_id = auth.uid()
  and status in ('recorded', 'pending')
)
with check (
  user_id = auth.uid()
  and public.is_workspace_member(workspace_id)
  and status in ('recorded', 'pending')
);

create policy "expense entries managers review"
on public.expense_entries for update to authenticated
using (
  public.has_workspace_role(
    workspace_id,
    array['owner', 'admin']::public.workspace_role[]
  )
)
with check (
  public.has_workspace_role(
    workspace_id,
    array['owner', 'admin']::public.workspace_role[]
  )
);

create policy "expense entries own delete"
on public.expense_entries for delete to authenticated
using (
  (user_id = auth.uid() and status in ('recorded', 'pending'))
  or public.has_workspace_role(
    workspace_id,
    array['owner', 'admin']::public.workspace_role[]
  )
);

alter publication supabase_realtime add table public.expense_entries;
alter table public.expense_entries replica identity full;
