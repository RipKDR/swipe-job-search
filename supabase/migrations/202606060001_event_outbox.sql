-- Durable event outbox for at-least-once event delivery
-- See: backend/src/services/outbox.py

create table if not exists event_outbox (
  id uuid primary key,
  event_type text not null,
  version integer not null default 1,
  correlation_id text not null,
  payload jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'delivered', 'dead_letter')),
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  retry_count integer not null default 0,
  last_error text
);

create index if not exists idx_event_outbox_status_created
  on event_outbox (status, created_at)
  where status = 'pending';

create index if not exists idx_event_outbox_retry_count
  on event_outbox (retry_count)
  where status = 'pending' and retry_count > 0;
