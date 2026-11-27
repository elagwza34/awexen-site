# 00 — Baseline audit

Date: 2026-11-27
Repository: `elagwza34/awexen-site`, branch `main`
Baseline commit: `b4e2782` (live production build at audit time)
Live site: https://awexen.com (`version.json` reported `b4e2782`)

## 1. Architecture as found

| Layer | Implementation | Notes |
| --- | --- | --- |
| Front end | React 19.2, TypeScript 5.9, Vite 7.3, Tailwind v4, React Router 7.18, TanStack Query 5 | Static SPA. All routes are served from `index.html` by the host rewrite in `frontend/public/.htaccess`. |
| Hosting | Hostinger shared hosting + HCDN | `public_html` receives `dist/` over SCP from GitHub Actions. Hashed assets are never deleted, so open tabs keep working across releases. |
| Backend | Supabase Edge Functions (Deno) + PostgreSQL | `lms-public`, `lms-api`, `ask-awexen`, `extract-knowledge-pdf`, `form-notify`, `project-calculator`. Business writes go through RPCs (`lms_edge_*`, `calculator_store_quote`, `calculator_store_lead`). RLS is enabled on customer tables. |
| Database changes | `supabase/migrations/*.sql` | Applied manually by the owner; the deploy workflow reports changed migrations but never applies them. |
| CI/CD | GitHub Actions | `.github/workflows/ci.yml` (push/PR) and `deploy.yml` (push to `main`). |
| Client resilience | Boot watchdog in `index.html`, recovery screen, build-version check, optional service worker | Already present before this work. |

## 2. Verified baseline state

- `https://awexen.com/` answered **200**; `version.json` reported `b4e2782`.
- `lms-public?path=health` answered **200** (verified by the release gate of the previous deploy).
- Every asset referenced by the live HTML answered **200** with the correct content type (previous release gate).
- `sitemap.xml` contained **20** URLs and was **missing `/pms` and `/project-calculator`**.
- `SeoManager` set `lang`/`dir` on mount only, and each route had only Arabic metadata: switching to English on one route, then navigating, reverted the document to `ar`/`rtl` and Arabic titles. Verified by a reproduction test.
- Lighthouse (mobile, simulated throttling) against the production build on localhost: performance **84**, accessibility **89**, best practices **100**, SEO **100**; LCP **3.7 s**, TBT **270 ms**.
- Accessibility failures: contrast 3.34:1 on the consent CTA, `ol > div > li` list markup on the home process section, and a language button whose accessible name did not contain its visible text.

## 3. Risks found

| Risk | Severity | Evidence |
| --- | --- | --- |
| Supabase deploy credentials absent from the `production` environment | High | Deploy job had been failing/opaque; `SUPABASE_ACCESS_TOKEN` / `SUPABASE_PROJECT_REF` missing, so Edge Functions could silently remain undeployed. |
| Deploy used to upload with an action that returned a non-zero exit code on Hostinger even when the upload succeeded | Medium | Previous red runs while production was updated. |
| No automated browser test suite | High | Regressions (language metadata, list semantics) reached production unnoticed. |
| `headless` Lighthouse is rejected by HCDN (HTTP 403) | Low | Lab measurement must run against the production build, documented in `04_PERFORMANCE_SEO.md`. |
| Client error telemetry has no central sink (`VITE_ERROR_REPORT_URL` unset) | Medium | Errors are only kept in `sessionStorage`; see `05_OBSERVABILITY.md`. |

## 4. Acceptance criteria used in this work

| Area | Criterion | Result |
| --- | --- | --- |
| Deployment | A frontend-only change deploys without requiring Supabase credentials; a function change without credentials fails loudly | Met (`01_DEPLOYMENT.md`) |
| Deployment | The release job proves live `version.json`, assets and backend health | Met in workflow; live verification recorded in `07` |
| Database | No migration or pricing change applied automatically | Met (workflow is `workflow_dispatch` only) |
| Tests | Unit + E2E suites exist and run in CI on Chromium, Firefox, WebKit | Met (`03_TEST_RESULTS.md`) |
| SEO | Canonical, robots, sitemap, structured data verified; language switch keeps metadata | Met |
| Accessibility | Lighthouse accessibility ≥ 90 | Met (100) |
| Performance | Lighthouse performance ≥ 90, LCP ≤ 2.5 s, FCP ≤ 1.8 s, TBT ≤ 200 ms, CLS ≤ 0.1 | **Not met** for performance/LCP/TBT; met for FCP and CLS. Causes and required decision documented in `04_PERFORMANCE_SEO.md`. |
| Observability | Deployment health monitored without paid dependencies | Met (`uptime.yml`) |
| Repository | Legacy code identified and marked, nothing deleted without history | Met (`06_REPOSITORY_CLEANUP.md`) |
