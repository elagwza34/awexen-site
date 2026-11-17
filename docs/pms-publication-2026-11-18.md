# PMS page publication — 2026-11-18

Published marketing source `a097a70` to `https://awexen.com/pms`, coordinated with licensing source `71b463e` and migration `20261117000300_pms_plan_catalogue_parity`.

The real licensing catalogue now supplies all prices, billing options, resource limits, runtime features and included setup services. Annual service has a 15% discount; one-time setup remains separate. Resource selection maps requirements to an eligible published plan. Registration and existing-account login retain the selected plan and billing interval. PMS quote CTAs and the erroneous chains wording are removed.

| Tier | Users | Branches | Warehouses | Devices | Setup services |
| --- | ---: | ---: | ---: | ---: | --- |
| Starter | 1 | 1 | 1 | 1 | None |
| Growth | 5 | 2 | 2 | 4 | WooCommerce |
| Advanced | 20 | 5 | 5 | 10 | WooCommerce and shipping companies |

Services are coordinated after subscribing; this does not introduce working desktop connectors.

Publication uploaded changed assets and then `index.html`, retained old assets and other hosted files, and checked hosted asset hashes and SPA references. Hostinger Git auto-deployment was stopped for controlled partial publication. Commits use `[skip ci]` to avoid triggering the separate workflow's unrelated Supabase migration/Edge Function rollout and whole-root replacement. No Supabase schema, Edge Function or hosting environment variable changed.

Validation: production build and TypeScript check; four pure contract tests; real-catalogue live browser checks; nine deployed-asset browser cases with synthetic API responses; mobile overflow checks. Real account registration and payment submission were not performed. Licensing release evidence is kept in its `docs/portal-systems/2026-11-18/` directory.
