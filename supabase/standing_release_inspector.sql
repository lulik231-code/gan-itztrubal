-- קישור סודי עם תוקף לחתימת המפקחת על שחרור קבוע.
alter table public.standing_releases
  add column if not exists inspector_token text unique,
  add column if not exists inspector_token_expires_at timestamptz,
  add column if not exists inspector_name text;

-- קריאת הטופס לפי הקישור (ללא התחברות). מחזיר null אם הקישור לא תקף, פג תוקפו, או שהטופס כבר נחתם.
create or replace function public.get_standing_release_for_inspector(p_token text)
returns jsonb
language sql security definer set search_path = ''
as $$
  select jsonb_build_object(
    'id', s.id,
    'child_id', s.child_id,
    'child_name', c.full_name,
    'class_name', c.class_name,
    'kindergarten_name', s.kindergarten_name,
    'release_type', s.release_type,
    'reason_text', s.reason_text,
    'schedule', s.schedule,
    'start_date', s.start_date,
    'notes', s.notes,
    'parent1_name', s.parent1_name,
    'parent1_signature', s.parent1_signature,
    'parent2_name', s.parent2_name,
    'parent2_signature', s.parent2_signature,
    'attachments', s.attachments,
    'pdf_storage_path', s.pdf_storage_path,
    'package_storage_path', s.package_storage_path,
    'submitted_at', s.submitted_at,
    'expires_at', s.inspector_token_expires_at
  )
  from public.standing_releases s
  join public.children c on c.id = s.child_id
  where p_token is not null
    and length(p_token) = 64
    and s.inspector_token = p_token
    and s.inspector_token_expires_at > now()
    and s.status = 'pending'
$$;

-- סימון הטופס כחתום על ידי המפקחת. הקישור נסגר בסיום ולא ניתן לשימוש חוזר.
create or replace function public.finalize_standing_release_signed(p_token text, p_path text, p_name text)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  n integer;
begin
  update public.standing_releases s
     set status = 'approved',
         signed_storage_path = p_path,
         approved_at = now(),
         inspector_name = left(p_name, 100),
         inspector_token = null,
         inspector_token_expires_at = null
   where p_token is not null
     and length(p_token) = 64
     and s.inspector_token = p_token
     and s.inspector_token_expires_at > now()
     and s.status = 'pending'
     and p_path like 'standing-release/' || s.id::text || '\_signed\_%';
  get diagnostics n = row_count;
  return n = 1;
end
$$;

revoke all on function public.get_standing_release_for_inspector(text) from public;
revoke all on function public.finalize_standing_release_signed(text, text, text) from public;
grant execute on function public.get_standing_release_for_inspector(text) to anon, authenticated;
grant execute on function public.finalize_standing_release_signed(text, text, text) to anon, authenticated;
