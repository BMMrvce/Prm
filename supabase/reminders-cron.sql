-- Runs the reminder job every minute from Supabase (Vercel Hobby crons only run daily).
-- 1. Replace YOUR_DOMAIN and YOUR_CRON_SECRET (the CRON_SECRET from your env) below.
-- 2. Paste this whole file into the Supabase SQL editor and run it once.
-- To stop it later: select cron.unschedule('workbench-reminders');

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'workbench-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_DOMAIN/api/cron/reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_CRON_SECRET',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);
