-- Reading Library enrichment: cover, category, rating, per-book knowledge
-- extraction, a reading pace goal, and chapter-tagged session notes.
-- Additive only: new nullable columns. Nothing existing changes.

alter table public.books add column if not exists cover_url text;
alter table public.books add column if not exists category text check (category is null or char_length(category) <= 60);
alter table public.books add column if not exists rating smallint check (rating is null or rating between 1 and 5);
alter table public.books add column if not exists learned text check (learned is null or char_length(learned) <= 4000);
alter table public.books add column if not exists interesting text check (interesting is null or char_length(interesting) <= 4000);
alter table public.books add column if not exists apply text check (apply is null or char_length(apply) <= 4000);
alter table public.books add column if not exists action text check (action is null or char_length(action) <= 4000);
alter table public.books add column if not exists pages_per_day_goal numeric check (pages_per_day_goal is null or pages_per_day_goal > 0);

alter table public.reading_sessions add column if not exists chapter text check (chapter is null or char_length(chapter) <= 120);
