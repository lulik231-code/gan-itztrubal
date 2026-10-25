-- Kindergarten teachers shown in the early release form dropdown.
create table if not exists public.kindergarten_teachers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.kindergarten_teachers enable row level security;

drop policy if exists "Anyone can read teachers" on public.kindergarten_teachers;
create policy "Anyone can read teachers" on public.kindergarten_teachers
  for select to anon, authenticated using (true);

drop policy if exists "Admins manage teachers" on public.kindergarten_teachers;
create policy "Admins manage teachers" on public.kindergarten_teachers
  for all to authenticated
  using (internal.is_admin()) with check (internal.is_admin());

insert into public.kindergarten_teachers (full_name, sort_order)
select v.name, v.ord
from (values ('מלי וילנר', 1), ('סיגל דואני', 2)) as v(name, ord)
where not exists (select 1 from public.kindergarten_teachers);
