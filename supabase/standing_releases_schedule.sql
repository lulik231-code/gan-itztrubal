-- שחרור קבוע: סוג שחרור, ימים ושעות (עדכון לטבלה הקיימת).
alter table public.standing_releases
  add column if not exists release_type text not null default 'other'
    check (release_type in ('daycare', 'adaptation', 'other')),
  add column if not exists reason_text text,
  add column if not exists schedule jsonb not null default '[]'::jsonb;

alter table public.standing_releases alter column release_time drop not null;
