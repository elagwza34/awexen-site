-- Conditional steps for the starter catalog.
--
-- 1. Adds a scope selector for the "Custom software" project so only the
--    platform steps the visitor picks stay in the flow.
-- 2. Gates the platform steps on that selector, and the backend step on the
--    preferred development technology (a WordPress build skips the custom
--    backend questions).
--
-- The draft may already contain edits made in the dashboard, so nothing is
-- replaced: the question is appended only when it is missing, and a section
-- condition is written only where no condition exists yet.

update public.calculator_draft
set config = jsonb_set(
  config,
  '{questions}',
  (config->'questions') || jsonb_build_array(
$scope${
  "id": "custom-scope",
  "title": {"en": "Which parts should the custom system include?", "ar": "ما الأجزاء التي سيتضمنها النظام المخصص؟"},
  "description": {"en": "Pick every module the system needs. Modules you leave out are not part of the estimate.", "ar": "اختر كل وحدة يحتاجها النظام. الوحدات غير المختارة لا تدخل في التقدير."},
  "active": true,
  "order": 3,
  "kind": "multiple",
  "sectionId": "general",
  "projectIds": ["custom"],
  "required": true,
  "options": [
    {"id": "store", "title": {"en": "Online store", "ar": "متجر إلكتروني"}, "active": true, "order": 0, "pricing": {"method": "free"}},
    {"id": "education", "title": {"en": "Education platform", "ar": "منصة تعليمية"}, "active": true, "order": 1, "pricing": {"method": "free"}},
    {"id": "business", "title": {"en": "Business management", "ar": "إدارة أعمال"}, "active": true, "order": 2, "pricing": {"method": "free"}},
    {"id": "mobile", "title": {"en": "Mobile app", "ar": "تطبيق هاتف"}, "active": true, "order": 3, "pricing": {"method": "free"}},
    {"id": "web-portal", "title": {"en": "Web portal or dashboard", "ar": "بوابة أو لوحة تحكم ويب"}, "active": true, "order": 4, "pricing": {"method": "free"}}
  ]
}$scope$::jsonb
  )
)
where id
  and jsonb_typeof(config->'questions') = 'array'
  and not exists (
    select 1
    from jsonb_array_elements(config->'questions') as question
    where question->>'id' = 'custom-scope'
  );

update public.calculator_draft
set config = jsonb_set(config, '{sections}', (
  select jsonb_agg(
    case
      when entry.section->>'id' = 'commerce' and not (entry.section ? 'condition')
        then entry.section || $commerce${"condition":{"or":[{"questionId":"custom-scope","operator":"selected","value":"store"},{"questionId":"custom-scope","operator":"empty"}]}}$commerce$::jsonb
      when entry.section->>'id' = 'education' and not (entry.section ? 'condition')
        then entry.section || $education${"condition":{"or":[{"questionId":"custom-scope","operator":"selected","value":"education"},{"questionId":"custom-scope","operator":"empty"}]}}$education$::jsonb
      when entry.section->>'id' = 'business' and not (entry.section ? 'condition')
        then entry.section || $business${"condition":{"or":[{"questionId":"custom-scope","operator":"selected","value":"business"},{"questionId":"custom-scope","operator":"empty"}]}}$business$::jsonb
      when entry.section->>'id' = 'mobile' and not (entry.section ? 'condition')
        then entry.section || $mobile${"condition":{"or":[{"questionId":"custom-scope","operator":"selected","value":"mobile"},{"questionId":"custom-scope","operator":"empty"}]}}$mobile$::jsonb
      when entry.section->>'id' = 'backend' and not (entry.section ? 'condition')
        then entry.section || $backend${"condition":{"or":[{"questionId":"technology","operator":"ne","value":"option-3"},{"questionId":"technology","operator":"empty"}]}}$backend$::jsonb
      else entry.section
    end
    order by entry.ordinality
  )
  from jsonb_array_elements(config->'sections') with ordinality as entry(section, ordinality)
))
where id
  and exists (
    select 1
    from jsonb_array_elements(config->'sections') as section
    where section->>'id' in ('commerce', 'education', 'business', 'mobile', 'backend')
      and not (section ? 'condition')
  );
