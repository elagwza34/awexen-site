-- إصلاح: قاعدة البيانات بترفض DELETE بدون WHERE («DELETE requires a WHERE clause»).
--
-- أول ما الأدمن يفعّل الإشعارات، الأداة بتولّد مفاتيح VAPID جديدة وبتنادي
-- awexen_support_push_config_save. الدالة دي كانت بتمسح كل الاشتراكات
-- القديمة بـ DELETE من غير WHERE، وده بيترفض. الحل: شرط WHERE صريح
-- (الـ id مفتاح أساسي وعمره ما بيكون NULL).
--
-- idempotent: ينفع بتمسح كل الاشتراكات القديمة بأمان لما المفاتيح تتغير.

create or replace function public.awexen_support_push_config_save(
  p_public_key text,
  p_private_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_public text := btrim(coalesce(p_public_key, ''));
  v_private text := btrim(coalesce(p_private_key, ''));
  v_changed boolean;
begin
  if not public.awexen_support_is_agent() then
    raise exception 'غير مصرّح بإشعارات الدعم.' using errcode = '42501';
  end if;

  if v_public = '' or v_private = '' or char_length(v_public) > 200 or char_length(v_private) > 200 then
    raise exception 'مفاتيح الإشعارات غير صحيحة.' using errcode = '22023';
  end if;

  select coalesce(c.public_key, '') <> v_public into v_changed
  from public.support_push_config c
  where c.id = 1;

  update public.support_push_config
  set public_key = v_public, private_key = v_private, updated_at = now()
  where id = 1;

  -- لو المفاتيح اتغيّرت، كل الاشتراكات القديمة بقت غير صالحة.
  if coalesce(v_changed, true) then
    delete from public.support_push_subscriptions
    where id is not null;
  end if;
end;
$$;

notify pgrst, 'reload schema';
