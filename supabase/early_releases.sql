-- Early release ("שחרור מוקדם") forms.
create table if not exists public.early_releases (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  release_date date not null default ((now() at time zone 'Asia/Jerusalem')::date),
  release_time text not null,
  teacher_name text,
  parent_full_name text not null,
  parent_id_number text not null,
  parent_phone text not null,
  child_id_number text not null,
  pickup_name text not null,
  pickup_id_number text not null,
  pickup_relation text not null,
  pickup_phone text not null,
  signature_data_url text,
  pdf_storage_path text not null,
  submitted_at timestamptz not null default now(),
  ip_address text
);
create index if not exists early_releases_date_idx on public.early_releases (release_date);

alter table public.early_releases enable row level security;

-- Parents (not signed in) can only add a row, and only for an active child.
drop policy if exists "Parents can submit early release" on public.early_releases;
create policy "Parents can submit early release" on public.early_releases
  for insert to anon
  with check (exists (select 1 from public.children c where c.id = child_id and c.is_active));

-- Staff (admins) can read and manage everything.
drop policy if exists "Admins manage early releases" on public.early_releases;
create policy "Admins manage early releases" on public.early_releases
  for all to authenticated
  using (internal.is_admin()) with check (internal.is_admin());

-- The date and time of submission are always set by the server clock (Israel time),
-- whatever the browser sends.
create or replace function internal.early_release_set_date() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.release_date := (now() at time zone 'Asia/Jerusalem')::date;
  new.submitted_at := now();
  return new;
end
$$;
revoke all on function internal.early_release_set_date() from public, anon, authenticated;

drop trigger if exists early_release_set_date on public.early_releases;
create trigger early_release_set_date
  before insert on public.early_releases
  for each row execute function internal.early_release_set_date();
