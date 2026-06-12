alter table public.applications
  add column if not exists updated_at timestamptz not null default now();

alter table public.applications
  drop constraint if exists applications_status_check;

alter table public.applications
  add constraint applications_status_check
  check (status in ('submitted', 'assessed', 'human_review', 'appeal_pending', 'appeal_approved', 'appeal_declined', 'cancelled'));

alter table public.applications
  alter column business_type set not null,
  alter column location set not null,
  alter column mpesa_summary set not null,
  alter column seasonal_pattern set not null;

create index if not exists applications_status_created_at_idx on public.applications (status, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists applications_set_updated_at on public.applications;

create trigger applications_set_updated_at
before update on public.applications
for each row
execute function public.set_updated_at();
