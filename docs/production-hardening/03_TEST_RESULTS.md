# 03 — Automated test results

## 1. What was added

| Suite | Files | Framework | Runs in |
| --- | --- | --- | --- |
| Unit | `frontend/tests/unit/*.test.ts` (5 files) | Vitest 5 (node env) | `npm run test:unit`, CI |
| E2E | `frontend/tests/e2e/*.spec.ts` (3 files) | Playwright | `npm run test:e2e`, CI on Chromium + Firefox + WebKit |

Unit coverage targets pure logic where a regression is invisible in a browser:
calculator pricing (base, included quantity, options, percentage discount and
cap, minimum price, strict mode, disabled project, config validation), CMS style
sanitisation and metric clamping, CMS readers, offer helpers, and tracking
policy.

E2E coverage runs a hermetic production build with empty Supabase variables:
public navigation (15 routes), unknown routes, an unavailable offer slug,
version/service-worker/robots/sitemap availability, SEO metadata and
language/direction persistence across navigation, the recovery screen for a
failed entry script, the outdated-browser screen, and the guarantee that a
normal visit registers no service worker.

## 2. Results (2026-11-27)

```
npm run test:unit   → 5 files, 33 tests passed
npx playwright test → 75 tests passed (25 × chromium, 25 × firefox, 25 × webkit)
npx tsc --noEmit    → 0 errors
npm run build       → success
```

Browsers used: Chrome for Testing 159, Firefox 159 and WebKit 27.2 shipped with
the installed `@playwright/test` (via `npx playwright install`).

## 3. Defects the suite caught during authoring

- The English-language regression test failed until `SeoManager` re-ran on
  language change; that product bug is fixed (see `02_BUSINESS_LOGIC.md`).
- The unknown-route test exposed that every single-segment URL is treated as an
  offer slug and degraded to a bare error when the service was unavailable;
  the error state was made readable.
- The sitemap test failed until `/pms` and `/project-calculator` were added.
- Two initial unit tests encoded wrong assumptions about the engine fixture and
  the CMS variable naming; the tests were corrected to the real contract, not
  the implementation changed.

## 4. CI integration

`.github/workflows/ci.yml`, frontend job, after typecheck and build:

```yaml
- run: npm run test:unit
- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium firefox webkit
- name: Run end-to-end tests (Chromium, Firefox, WebKit)
  run: npm run test:e2e
- name: Upload Playwright report on failure
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: playwright-report
    path: frontend/playwright-report
```

The E2E project builds its own bundle through `webServer` with empty Supabase
env, so tests never reach a real backend. `reuseExistingServer` is disabled on
CI so a stale local build cannot mask a failure.

## 5. Not covered (and why)

- Database-level RLS tests: require a disposable Supabase project; running them
  against production would violate the no-destructive-test-data rule.
- Payment provider and email delivery: no sandbox credentials in the repo.
- Visual regression snapshots: would add a maintenance-heavy baseline without a
  stated requirement.

## 6. Phase 10 continuation and coverage limits

The 33 unit tests exercise calculator logic, CMS helpers, offer helpers and analytics policy. The original 75 browser cases are 25 scenarios across three engines. They disable Supabase and cover public routes, language/metadata and startup recovery. They do not run real sign-in, RLS, cross-role access, payment approval, enrollment validity, progress/certificate eligibility, CRM writes or CMS publishing.

The continuation added six browser executions for static legal HTML and the React handoff (two routes on three engines), three backend-contract tests with mock HTTP responses, and two privacy-contract tests. The browser suite initially timed out waiting for its local build/preview server. Running with two browser workers and webserver logging completed with 81 passes.

Two transactional SQL fixtures passed on real local PostgreSQL 17. The instructor test uses stand-ins for the legacy organization and catalog routines and verifies privileges, upsert identity and rollback. The telemetry test uses a cron stub and verifies real table constraints, grants, rate limiting and aggregation. CI now runs both against an isolated PostgreSQL service. Neither fixture proves production role mappings or actual scheduler operation.

The production smoke used direct read-only readiness and public configuration checks and an anonymous rejection. Real Auth role isolation, concurrent approval of payment proofs, progress and certificate eligibility, CRM lifecycle, and CMS draft/publish behavior still need an isolated full Supabase stack and synthetic accounts. The production site was not used to run those write tests.
