-- تحديث جدول initiative_applications لجعل الحقول الاختيارية تقبل القيم الفارغة
-- وتعديل سياسة RLS لتسمح بإدخال الحقول الاختيارية فارغة.

-- 1. جعل الأعمدة الاختيارية nullable (تقبل NULL أو سلسلة فارغة)
alter table if exists public.initiative_applications
  alter column city drop not null;

alter table if exists public.initiative_applications
  alter column business_name drop not null;

alter table if exists public.initiative_applications
  alter column business_sector drop not null;

alter table if exists public.initiative_applications
  alter column business_description drop not null;

alter table if exists public.initiative_applications
  alter column business_age drop not null;

alter table if exists public.initiative_applications
  alter column target_audience drop not null;

alter table if exists public.initiative_applications
  alter column biggest_challenge drop not null;

alter table if exists public.initiative_applications
  alter column website_necessity drop not null;

alter table if exists public.initiative_applications
  alter column website_objective drop not null;

alter table if exists public.initiative_applications
  alter column six_month_goal drop not null;

alter table if exists public.initiative_applications
  alter column content_readiness drop not null;

alter table if exists public.initiative_applications
  alter column cooperation_readiness drop not null;

-- 2. تحديث سياسة RLS للسماح بإدخال الحقول الاختيارية فارغة
drop policy if exists "Allow public insert to initiative_applications"
  on public.initiative_applications;

create policy "Allow public insert to initiative_applications"
on public.initiative_applications
for insert
to anon, authenticated
with check (
  -- الحقول المطلوبة دائمًا
  char_length(trim(applicant_name)) between 2 and 100
  and char_length(trim(whatsapp_number)) between 10 and 30
  and char_length(trim(email)) between 5 and 254
  -- الحقول الاختيارية: تقبل فارغة أو تفي بالقيود
  and (city is null or char_length(trim(city)) = 0 or char_length(trim(city)) between 2 and 100)
  and (business_name is null or char_length(trim(business_name)) = 0 or char_length(trim(business_name)) between 2 and 200)
  and (business_sector is null or char_length(trim(business_sector)) = 0 or char_length(trim(business_sector)) between 2 and 100)
  and (business_description is null or char_length(trim(business_description)) = 0 or char_length(trim(business_description)) between 20 and 2000)
  and (business_age is null or char_length(trim(business_age)) = 0 or char_length(trim(business_age)) between 2 and 50)
  and (target_audience is null or char_length(trim(target_audience)) = 0 or char_length(trim(target_audience)) between 10 and 2000)
  and (biggest_challenge is null or char_length(trim(biggest_challenge)) = 0 or char_length(trim(biggest_challenge)) between 3 and 2000)
  and (website_necessity is null or char_length(trim(website_necessity)) = 0 or char_length(trim(website_necessity)) between 10 and 2000)
  and (website_objective is null or char_length(trim(website_objective)) = 0 or char_length(trim(website_objective)) between 2 and 100)
  and (six_month_goal is null or char_length(trim(six_month_goal)) = 0 or char_length(trim(six_month_goal)) between 10 and 2000)
  and (content_readiness is null or char_length(trim(content_readiness)) = 0 or char_length(trim(content_readiness)) between 2 and 50)
  and (cooperation_readiness is null or char_length(trim(cooperation_readiness)) = 0 or char_length(trim(cooperation_readiness)) between 2 and 50)
);

-- Legacy columns from the previous form must not block current submissions.
do $$
declare legacy_column text;
begin
  foreach legacy_column in array array['name', 'business_type', 'how_website_helps'] loop
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'initiative_applications' and column_name = legacy_column) then
      execute format('alter table public.initiative_applications alter column %I drop not null', legacy_column);
    end if;
  end loop;
end $$;
