-- שחרור קבוע מהגן (נספח ג: טופס בקשה לשחרור ילד/ת גן לפני סיום הלימודים).
create table if not exists public.standing_releases (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  kindergarten_name text not null,
  release_type text not null default 'other' check (release_type in ('daycare', 'adaptation', 'other')),
  reason_text text,
  schedule jsonb not null default '[]'::jsonb,
  release_time text,
  start_date date not null,
  notes text,
  parent1_name text not null,
  parent1_signature text,
  parent2_name text,
  parent2_signature text,
  attachments jsonb not null default '[]'::jsonb,
  pdf_storage_path text not null,
  package_storage_path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved')),
  signed_storage_path text,
  approved_at timestamptz,
  submitted_at timestamptz not null default now(),
  ip_address text
);
create index if not exists standing_releases_status_idx on public.standing_releases (status, submitted_at desc);

alter table public.standing_releases enable row level security;

drop policy if exists "Parents can submit standing release" on public.standing_releases;
create policy "Parents can submit standing release" on public.standing_releases
  for insert to anon
  with check (
    status = 'pending'
    and signed_storage_path is null
    and exists (select 1 from public.children c where c.id = child_id and c.is_active)
  );

drop policy if exists "Admins manage standing releases" on public.standing_releases;
create policy "Admins manage standing releases" on public.standing_releases
  for all to authenticated
  using (internal.is_admin()) with check (internal.is_admin());

create or replace function internal.standing_release_set_time() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.submitted_at := now();
  return new;
end
$$;
revoke all on function internal.standing_release_set_time() from public, anon, authenticated;

drop trigger if exists standing_release_set_time on public.standing_releases;
create trigger standing_release_set_time
  before insert on public.standing_releases
  for each row execute function internal.standing_release_set_time();
