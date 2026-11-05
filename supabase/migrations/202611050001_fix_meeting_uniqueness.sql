-- Allow more than one manually created meeting per workspace.
--
-- The core schema declared `unique nulls not distinct (workspace_id, external_provider,
-- external_id)`. Manual meetings have NULL provider and id, and NULLS NOT DISTINCT treats
-- those as equal, so only one manual meeting could exist per workspace. Uniqueness is only
-- needed for meetings synced from an external calendar.

alter table public.meetings
  drop constraint if exists meetings_workspace_id_external_provider_external_id_key;

create unique index if not exists meetings_external_unique_idx
  on public.meetings (workspace_id, external_provider, external_id)
  where external_id is not null;
