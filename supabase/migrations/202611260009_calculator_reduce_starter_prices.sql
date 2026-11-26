-- Reduce the seeded starter prices by 70% (the new amount is 30% of the
-- seeded one). Prices were reviewed as too high for the target market.
--
-- Only charges whose current value still equals the seeded value are replaced,
-- so any price edited from the dashboard is kept as-is. Re-running the file is
-- a no-op: already reduced charges no longer match their seeded values.
--
-- This updates the draft only. Publish from the calculator dashboard so the
-- public calculator and new requests use the reduced prices; issued quotations
-- keep their original figures.

with base(project_id, old_amount, new_amount) as (values
  ('landing', 800000, 240000),
  ('corporate', 2500000, 750000),
  ('personal', 700000, 210000),
  ('portfolio', 900000, 270000),
  ('ecommerce', 4500000, 1350000),
  ('education', 6500000, 1950000),
  ('booking', 3500000, 1050000),
  ('restaurant', 2800000, 840000),
  ('pos', 5500000, 1650000),
  ('erp', 12000000, 3600000),
  ('crm', 7500000, 2250000),
  ('saas', 11000000, 3300000),
  ('mobile', 9000000, 2700000),
  ('custom', 6000000, 1800000),
  ('redesign', 1800000, 540000),
  ('maintenance', 1200000, 360000)
)
update public.calculator_draft d
set config = jsonb_set(d.config, '{projects}', (
  select jsonb_agg(
    case
      when base.old_amount is not null
        and jsonb_typeof(project->'basePrice') = 'number'
        and (project->>'basePrice')::numeric = base.old_amount
        then jsonb_set(project, '{basePrice}', to_jsonb(base.new_amount))
      else project
    end
    order by entry.ordinality
  )
  from jsonb_array_elements(d.config->'projects') with ordinality as entry(project, ordinality)
  left join base on base.project_id = project->>'id'
), false),
revision = gen_random_uuid(), updated_at = now()
where d.id;

with question_prices(question_id, old_pricing, new_pricing) as (values
  ('custom-design', '{"method":"fixed","amount":600000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":180000,"billing":"oneTime"}'::jsonb),
  ('unique-designs', '{"method":"perUnit","unitPrice":120000,"billing":"oneTime"}'::jsonb, '{"method":"perUnit","unitPrice":36000,"billing":"oneTime"}'::jsonb),
  ('desktop-design', '{"method":"fixed","amount":250000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":75000,"billing":"oneTime"}'::jsonb),
  ('mobile-design', '{"method":"fixed","amount":250000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":75000,"billing":"oneTime"}'::jsonb),
  ('prototype', '{"method":"fixed","amount":450000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":135000,"billing":"oneTime"}'::jsonb),
  ('design-system', '{"method":"fixed","amount":700000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":210000,"billing":"oneTime"}'::jsonb),
  ('animation', '{"method":"fixed","amount":350000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":105000,"billing":"oneTime"}'::jsonb),
  ('branding', '{"method":"fixed","amount":900000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":270000,"billing":"oneTime"}'::jsonb),
  ('page-count', '{"method":"perUnit","unitPrice":90000,"billing":"oneTime"}'::jsonb, '{"method":"perUnit","unitPrice":27000,"billing":"oneTime"}'::jsonb),
  ('dynamic-pages', '{"method":"perUnit","unitPrice":180000,"billing":"oneTime"}'::jsonb, '{"method":"perUnit","unitPrice":54000,"billing":"oneTime"}'::jsonb),
  ('forms', '{"method":"perUnit","unitPrice":70000,"billing":"oneTime"}'::jsonb, '{"method":"perUnit","unitPrice":21000,"billing":"oneTime"}'::jsonb),
  ('portfolio', '{"method":"fixed","amount":250000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":75000,"billing":"oneTime"}'::jsonb),
  ('blog', '{"method":"fixed","amount":300000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":90000,"billing":"oneTime"}'::jsonb),
  ('services', '{"method":"fixed","amount":150000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":45000,"billing":"oneTime"}'::jsonb),
  ('site-search', '{"method":"fixed","amount":200000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":60000,"billing":"oneTime"}'::jsonb),
  ('site-accounts', '{"method":"fixed","amount":800000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":240000,"billing":"oneTime"}'::jsonb),
  ('backend-required', '{"method":"fixed","amount":1200000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":360000,"billing":"oneTime"}'::jsonb),
  ('database', '{"method":"fixed","amount":800000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":240000,"billing":"oneTime"}'::jsonb),
  ('admin-dashboard', '{"method":"fixed","amount":1500000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":450000,"billing":"oneTime"}'::jsonb),
  ('user-roles', '{"method":"perUnit","unitPrice":250000,"billing":"oneTime"}'::jsonb, '{"method":"perUnit","unitPrice":75000,"billing":"oneTime"}'::jsonb),
  ('permissions', '{"method":"fixed","amount":400000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":120000,"billing":"oneTime"}'::jsonb),
  ('backend-reports', '{"method":"fixed","amount":600000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":180000,"billing":"oneTime"}'::jsonb),
  ('notifications', '{"method":"fixed","amount":350000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":105000,"billing":"oneTime"}'::jsonb),
  ('audit-trail', '{"method":"fixed","amount":400000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":120000,"billing":"oneTime"}'::jsonb),
  ('file-management', '{"method":"fixed","amount":450000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":135000,"billing":"oneTime"}'::jsonb),
  ('api-development', '{"method":"fixed","amount":700000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":210000,"billing":"oneTime"}'::jsonb),
  ('products', '{"method":"perUnit","unitPrice":20000,"billing":"oneTime"}'::jsonb, '{"method":"perUnit","unitPrice":6000,"billing":"oneTime"}'::jsonb),
  ('product-categories', '{"method":"perUnit","unitPrice":50000,"billing":"oneTime"}'::jsonb, '{"method":"perUnit","unitPrice":15000,"billing":"oneTime"}'::jsonb),
  ('variations', '{"method":"fixed","amount":400000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":120000,"billing":"oneTime"}'::jsonb),
  ('ecommerce-inventory', '{"method":"fixed","amount":600000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":180000,"billing":"oneTime"}'::jsonb),
  ('cart', '{"method":"fixed","amount":500000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":150000,"billing":"oneTime"}'::jsonb),
  ('checkout', '{"method":"fixed","amount":500000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":150000,"billing":"oneTime"}'::jsonb),
  ('checkout-gateway', '{"method":"fixed","amount":400000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":120000,"billing":"oneTime"}'::jsonb),
  ('commerce-shipping', '{"method":"fixed","amount":500000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":150000,"billing":"oneTime"}'::jsonb),
  ('coupons', '{"method":"fixed","amount":250000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":75000,"billing":"oneTime"}'::jsonb),
  ('shopper-accounts', '{"method":"fixed","amount":700000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":210000,"billing":"oneTime"}'::jsonb),
  ('tracking', '{"method":"fixed","amount":400000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":120000,"billing":"oneTime"}'::jsonb),
  ('sales-reports', '{"method":"fixed","amount":500000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":150000,"billing":"oneTime"}'::jsonb),
  ('marketplace', '{"method":"fixed","amount":1800000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":540000,"billing":"oneTime"}'::jsonb),
  ('courses', '{"method":"perUnit","unitPrice":150000,"billing":"oneTime"}'::jsonb, '{"method":"perUnit","unitPrice":45000,"billing":"oneTime"}'::jsonb),
  ('lessons', '{"method":"perUnit","unitPrice":25000,"billing":"oneTime"}'::jsonb, '{"method":"perUnit","unitPrice":7500,"billing":"oneTime"}'::jsonb),
  ('student-accounts', '{"method":"fixed","amount":800000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":240000,"billing":"oneTime"}'::jsonb),
  ('instructor-accounts', '{"method":"fixed","amount":600000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":180000,"billing":"oneTime"}'::jsonb),
  ('exams', '{"method":"fixed","amount":700000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":210000,"billing":"oneTime"}'::jsonb),
  ('certificates', '{"method":"fixed","amount":400000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":120000,"billing":"oneTime"}'::jsonb),
  ('live-classes', '{"method":"fixed","amount":900000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":270000,"billing":"oneTime"}'::jsonb),
  ('attendance', '{"method":"fixed","amount":350000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":105000,"billing":"oneTime"}'::jsonb),
  ('course-payments', '{"method":"fixed","amount":500000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":150000,"billing":"oneTime"}'::jsonb),
  ('student-reporting', '{"method":"fixed","amount":450000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":135000,"billing":"oneTime"}'::jsonb),
  ('sales', '{"method":"fixed","amount":700000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":210000,"billing":"oneTime"}'::jsonb),
  ('purchasing', '{"method":"fixed","amount":600000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":180000,"billing":"oneTime"}'::jsonb),
  ('inventory', '{"method":"fixed","amount":800000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":240000,"billing":"oneTime"}'::jsonb),
  ('warehouses', '{"method":"fixed","amount":500000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":150000,"billing":"oneTime"}'::jsonb),
  ('accounting', '{"method":"fixed","amount":1200000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":360000,"billing":"oneTime"}'::jsonb),
  ('customers', '{"method":"fixed","amount":500000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":150000,"billing":"oneTime"}'::jsonb),
  ('suppliers', '{"method":"fixed","amount":400000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":120000,"billing":"oneTime"}'::jsonb),
  ('employees', '{"method":"fixed","amount":500000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":150000,"billing":"oneTime"}'::jsonb),
  ('branches', '{"method":"fixed","amount":450000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":135000,"billing":"oneTime"}'::jsonb),
  ('pos', '{"method":"fixed","amount":1500000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":450000,"billing":"oneTime"}'::jsonb),
  ('business-reporting', '{"method":"fixed","amount":700000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":210000,"billing":"oneTime"}'::jsonb),
  ('approval', '{"method":"fixed","amount":600000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":180000,"billing":"oneTime"}'::jsonb),
  ('device-licensing', '{"method":"fixed","amount":500000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":150000,"billing":"oneTime"}'::jsonb),
  ('offline-operation', '{"method":"fixed","amount":1200000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":360000,"billing":"oneTime"}'::jsonb),
  ('android', '{"method":"fixed","amount":2000000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":600000,"billing":"oneTime"}'::jsonb),
  ('ios', '{"method":"fixed","amount":2000000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":600000,"billing":"oneTime"}'::jsonb),
  ('screens', '{"method":"perUnit","unitPrice":250000,"billing":"oneTime"}'::jsonb, '{"method":"perUnit","unitPrice":75000,"billing":"oneTime"}'::jsonb),
  ('mobile-auth', '{"method":"fixed","amount":600000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":180000,"billing":"oneTime"}'::jsonb),
  ('push', '{"method":"fixed","amount":500000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":150000,"billing":"oneTime"}'::jsonb),
  ('mobile-maps', '{"method":"fixed","amount":600000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":180000,"billing":"oneTime"}'::jsonb),
  ('camera', '{"method":"fixed","amount":500000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":150000,"billing":"oneTime"}'::jsonb),
  ('mobile-payments', '{"method":"fixed","amount":700000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":210000,"billing":"oneTime"}'::jsonb),
  ('mobile-offline', '{"method":"fixed","amount":800000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":240000,"billing":"oneTime"}'::jsonb),
  ('mobile-backend', '{"method":"fixed","amount":900000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":270000,"billing":"oneTime"}'::jsonb),
  ('store-publishing', '{"method":"fixed","amount":600000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":180000,"billing":"oneTime"}'::jsonb),
  ('languages', '{"method":"perUnit","unitPrice":800000,"billing":"oneTime"}'::jsonb, '{"method":"perUnit","unitPrice":240000,"billing":"oneTime"}'::jsonb),
  ('content-entry', '{"method":"fixed","amount":500000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":150000,"billing":"oneTime"}'::jsonb),
  ('copywriting', '{"method":"fixed","amount":600000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":180000,"billing":"oneTime"}'::jsonb),
  ('translation', '{"method":"fixed","amount":700000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":210000,"billing":"oneTime"}'::jsonb),
  ('product-entry', '{"method":"fixed","amount":400000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":120000,"billing":"oneTime"}'::jsonb),
  ('image-processing', '{"method":"fixed","amount":300000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":90000,"billing":"oneTime"}'::jsonb),
  ('content-migration', '{"method":"fixed","amount":600000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":180000,"billing":"oneTime"}'::jsonb),
  ('integration-payments', '{"method":"fixed","amount":500000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":150000,"billing":"oneTime"}'::jsonb),
  ('integration-shipping', '{"method":"fixed","amount":500000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":150000,"billing":"oneTime"}'::jsonb),
  ('whatsapp', '{"method":"fixed","amount":300000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":90000,"billing":"oneTime"}'::jsonb),
  ('email-services', '{"method":"fixed","amount":250000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":75000,"billing":"oneTime"}'::jsonb),
  ('sms', '{"method":"fixed","amount":300000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":90000,"billing":"oneTime"}'::jsonb),
  ('google-maps', '{"method":"fixed","amount":250000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":75000,"billing":"oneTime"}'::jsonb),
  ('analytics', '{"method":"fixed","amount":300000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":90000,"billing":"oneTime"}'::jsonb),
  ('crm', '{"method":"fixed","amount":800000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":240000,"billing":"oneTime"}'::jsonb),
  ('erp', '{"method":"fixed","amount":1200000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":360000,"billing":"oneTime"}'::jsonb),
  ('ai', '{"method":"fixed","amount":1000000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":300000,"billing":"oneTime"}'::jsonb),
  ('external-api', '{"method":"fixed","amount":600000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":180000,"billing":"oneTime"}'::jsonb),
  ('advanced-security', '{"method":"fixed","amount":800000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":240000,"billing":"oneTime"}'::jsonb),
  ('performance', '{"method":"fixed","amount":600000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":180000,"billing":"oneTime"}'::jsonb),
  ('automated-tests', '{"method":"fixed","amount":900000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":270000,"billing":"oneTime"}'::jsonb),
  ('browser-tests', '{"method":"fixed","amount":500000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":150000,"billing":"oneTime"}'::jsonb),
  ('mobile-tests', '{"method":"fixed","amount":400000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":120000,"billing":"oneTime"}'::jsonb),
  ('seo', '{"method":"fixed","amount":600000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":180000,"billing":"oneTime"}'::jsonb),
  ('backups', '{"method":"fixed","amount":300000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":90000,"billing":"oneTime"}'::jsonb),
  ('domain-registration', '{"method":"fixed","amount":120000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":36000,"billing":"oneTime"}'::jsonb),
  ('domain-renewal', '{"method":"fixed","amount":100000,"billing":"annual"}'::jsonb, '{"method":"fixed","amount":30000,"billing":"annual"}'::jsonb),
  ('business-email', '{"method":"fixed","amount":30000,"billing":"monthly"}'::jsonb, '{"method":"fixed","amount":9000,"billing":"monthly"}'::jsonb),
  ('database-hosting', '{"method":"fixed","amount":50000,"billing":"monthly"}'::jsonb, '{"method":"fixed","amount":15000,"billing":"monthly"}'::jsonb),
  ('storage', '{"method":"fixed","amount":20000,"billing":"monthly"}'::jsonb, '{"method":"fixed","amount":6000,"billing":"monthly"}'::jsonb),
  ('monthly-maintenance', '{"method":"fixed","amount":500000,"billing":"monthly"}'::jsonb, '{"method":"fixed","amount":150000,"billing":"monthly"}'::jsonb),
  ('annual-maintenance', '{"method":"fixed","amount":5000000,"billing":"annual"}'::jsonb, '{"method":"fixed","amount":1500000,"billing":"annual"}'::jsonb),
  ('support', '{"method":"fixed","amount":300000,"billing":"monthly"}'::jsonb, '{"method":"fixed","amount":90000,"billing":"monthly"}'::jsonb),
  ('training', '{"method":"fixed","amount":400000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":120000,"billing":"oneTime"}'::jsonb),
  ('documentation', '{"method":"fixed","amount":250000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":75000,"billing":"oneTime"}'::jsonb),
  ('data-migration', '{"method":"fixed","amount":600000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":180000,"billing":"oneTime"}'::jsonb),
  ('deployment', '{"method":"fixed","amount":300000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":90000,"billing":"oneTime"}'::jsonb),
  ('source-handover', '{"method":"fixed","amount":500000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":150000,"billing":"oneTime"}'::jsonb)
)
update public.calculator_draft d
set config = jsonb_set(d.config, '{questions}', (
  select jsonb_agg(
    case
      when question_prices.old_pricing is not null and question->'pricing' = question_prices.old_pricing
        then jsonb_set(question, '{pricing}', question_prices.new_pricing)
      else question
    end
    order by entry.ordinality
  )
  from jsonb_array_elements(d.config->'questions') with ordinality as entry(question, ordinality)
  left join question_prices on question_prices.question_id = question->>'id'
), false),
revision = gen_random_uuid(), updated_at = now()
where d.id;

with option_prices(question_id, option_id, old_pricing, new_pricing) as (values
  ('design-complexity', 'option-2', '{"method":"fixed","amount":400000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":120000,"billing":"oneTime"}'::jsonb),
  ('design-complexity', 'option-3', '{"method":"fixed","amount":900000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":270000,"billing":"oneTime"}'::jsonb),
  ('page-categories', 'option-2', '{"method":"fixed","amount":150000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":45000,"billing":"oneTime"}'::jsonb),
  ('page-categories', 'option-3', '{"method":"fixed","amount":200000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":60000,"billing":"oneTime"}'::jsonb),
  ('dashboard-complexity', 'option-2', '{"method":"fixed","amount":1000000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":300000,"billing":"oneTime"}'::jsonb),
  ('hosting-plan', 'option-1', '{"method":"fixed","amount":30000,"billing":"monthly"}'::jsonb, '{"method":"fixed","amount":9000,"billing":"monthly"}'::jsonb),
  ('hosting-plan', 'option-2', '{"method":"fixed","amount":90000,"billing":"monthly"}'::jsonb, '{"method":"fixed","amount":27000,"billing":"monthly"}'::jsonb),
  ('hosting-plan', 'option-3', '{"method":"fixed","amount":150000,"billing":"monthly"}'::jsonb, '{"method":"fixed","amount":45000,"billing":"monthly"}'::jsonb),
  ('delivery-speed', 'option-2', '{"method":"fixed","amount":800000,"billing":"oneTime"}'::jsonb, '{"method":"fixed","amount":240000,"billing":"oneTime"}'::jsonb)
)
update public.calculator_draft d
set config = jsonb_set(d.config, '{questions}', (
  select jsonb_agg(
    case
      when jsonb_typeof(question->'options') = 'array'
        then jsonb_set(question, '{options}', (
          select jsonb_agg(
            case
              when option_prices.old_pricing is not null and option->'pricing' = option_prices.old_pricing
                then jsonb_set(option, '{pricing}', option_prices.new_pricing)
              else option
            end
            order by option_entry.ordinality
          )
          from jsonb_array_elements(question->'options') with ordinality as option_entry(option, ordinality)
          left join option_prices on option_prices.question_id = question->>'id'
            and option_prices.option_id = option->>'id'
        ))
      else question
    end
    order by entry.ordinality
  )
  from jsonb_array_elements(d.config->'questions') with ordinality as entry(question, ordinality)
), false),
revision = gen_random_uuid(), updated_at = now()
where d.id;
