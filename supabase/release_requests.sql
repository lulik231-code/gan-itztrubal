-- "טופס שחרור ילד/ה מהגן לפני סיום יום הלימודים" (נוסח משרד החינוך).
create table if not exists public.release_requests (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  request_date date not null,
  from_time text not null,
  to_time text not null,
  teacher_name text not null,
  kindergarten_name text not null,
  parent_full_name text not null,
  parent_relation text not null,
  pickup_name text not null,
  pickup_phone text not null,
  reason text not null,
  signature_data_url text,
  pdf_storage_path text not null,
  submitted_at timestamptz not null default now(),
  ip_address text
);
create index if not exists release_requests_date_idx on public.release_requests (request_date);

alter table public.release_requests enable row level security;

drop policy if exists "Parents can submit release request" on public.release_requests;
create policy "Parents can submit release request" on public.release_requests
  for insert to anon
  with check (exists (select 1 from public.children c where c.id = child_id and c.is_active));

drop policy if exists "Admins manage release requests" on public.release_requests;
create policy "Admins manage release requests" on public.release_requests
  for all to authenticated
  using (internal.is_admin()) with check (internal.is_admin());

-- זמן ההגשה נקבע תמיד לפי שעון השרת.
create or replace function internal.release_request_set_time() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.submitted_at := now();
  return new;
end
$$;
revoke all on function internal.release_request_set_time() from public, anon, authenticated;

drop trigger if exists release_request_set_time on public.release_requests;
create trigger release_request_set_time
  before insert on public.release_requests
  for each row execute function internal.release_request_set_time();
