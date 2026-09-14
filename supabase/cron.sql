-- Execute depois do deploy na Vercel, substituindo os placeholders.
-- Requer pg_cron e pg_net habilitados no Supabase.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('uaiflow-drain-every-minute')
where exists (select 1 from cron.job where jobname = 'uaiflow-drain-every-minute');

select cron.schedule(
  'uaiflow-drain-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://SEU-DOMINIO-VERCEL/api/queue/drain',
    headers := jsonb_build_object('x-worker-secret', 'SEU_WORKER_SECRET')
  );
  $$
);

select cron.unschedule('uaiflow-refresh-weekly')
where exists (select 1 from cron.job where jobname = 'uaiflow-refresh-weekly');

select cron.schedule(
  'uaiflow-refresh-weekly',
  '0 9 * * 1',
  $$
  select net.http_post(
    url := 'https://SEU-DOMINIO-VERCEL/api/token/refresh',
    headers := jsonb_build_object('x-worker-secret', 'SEU_WORKER_SECRET')
  );
  $$
);
