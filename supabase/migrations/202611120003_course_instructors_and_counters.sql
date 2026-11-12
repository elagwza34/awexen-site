-- مدة الكورس بالأشهر، العدد المخطط للوحدات، وتعيين المحاضرين
-- يضيف الحقول المطلوبة لإنشاء/تعديل الكورس من محتوى منصة التعلم

alter table public.courses_course
  add column if not exists duration_months integer,
  add column if not exists modules_count integer;

alter table public.courses_course
  drop constraint if exists courses_course_duration_months_check,
  drop constraint if exists courses_course_modules_count_check;

alter table public.courses_course
  add constraint courses_course_duration_months_check
    check (duration_months is null or duration_months >= 0),
  add constraint courses_course_modules_count_check
    check (modules_count is null or modules_count >= 0);

comment on column public.courses_course.duration_months is 'مدة الكورس بالأشهر (مخطط)';
comment on column public.courses_course.modules_count is 'عدد الوحدات المخطط للكورس';

-- مزامنة الكتالوج التسويقي: الأ(months) أولًا ثم الدقائق، والمقاعد من الكورس
create or replace function private.lms_course_catalog_sync(p_course_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  row_data record;
  duration_label text;
begin
  if to_regclass('public.courses') is null then
    return;
  end if;

  select c.*, v.title as version_title, v.short_description as version_short_description,
    v.description as version_description, v.difficulty, v.estimated_minutes,
    v.thumbnail_url,
    coalesce((
      select nullif(trim(u.full_name), '')
      from public.courses_courseinstructor ci
      join public.accounts_user u on u.id = ci.instructor_id
      where ci.course_version_id = v.id
      order by ci.is_lead desc, ci.created_at
      limit 1
    ), 'Awexen Learning Team') as instructor_name
  into row_data
  from public.courses_course c
  join public.courses_courseversion v on v.id = c.current_version_id
  where c.id = p_course_id;

  if not found then
    return;
  end if;

  duration_label := case
    when row_data.duration_months is not null and row_data.duration_months > 0
      then row_data.duration_months::text || ' months'
    when row_data.estimated_minutes > 0 and row_data.estimated_minutes % 60 = 0
      then (row_data.estimated_minutes / 60)::text || ' hours'
    when row_data.estimated_minutes > 0 then row_data.estimated_minutes::text || ' minutes'
    else ''
  end;

  perform set_config('awexen.catalog_mirror', 'on', true);

  execute $catalog$
    insert into public.courses (
      id, slug, title, short_description, description, instructor,
      delivery_mode, level, duration, price, currency, capacity,
      starts_at, featured_image, status
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
    on conflict (slug) do update set
      title = excluded.title,
      short_description = excluded.short_description,
      description = excluded.description,
      instructor = excluded.instructor,
      delivery_mode = excluded.delivery_mode,
      level = excluded.level,
      duration = excluded.duration,
      price = excluded.price,
      currency = excluded.currency,
      capacity = excluded.capacity,
      starts_at = excluded.starts_at,
      featured_image = excluded.featured_image,
      status = excluded.status,
      updated_at = now()
  $catalog$ using
    row_data.id, row_data.slug, row_data.version_title,
    row_data.version_short_description, row_data.version_description,
    row_data.instructor_name, row_data.delivery_mode,
    case row_data.difficulty
      when 'beginner' then 'beginner'
      when 'intermediate' then 'intermediate'
      when 'advanced' then 'advanced'
      else 'all-levels'
    end,
    duration_label, row_data.price, row_data.currency, row_data.capacity,
    row_data.starts_at, nullif(row_data.thumbnail_url, ''),
    case when row_data.status = 'published' then 'published' else 'closed' end;
end;
$$;

notify pgrst, 'reload schema';