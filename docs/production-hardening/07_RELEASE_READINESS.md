# 07 — Release readiness

## 1. Verdict

**Frontend release: verified. Overall production readiness: not 100%.**

The public site is served from the commit this record describes, every asset and
metadata check passes, the automated suites are green locally and in CI, and the
deployment pipeline now reports production truthfully. Three items below are
still open; none is hidden by a green run.

## 2. Release under verification

| Item | Value |
| --- | --- |
| Branch / range | `main`, `b4e2782..070463e` (7 commits) |
| Frontend publishing path | Hostinger Git integration (repo `elagwza34/awexen-site`, branch `main`, root `frontend`, output `dist`, atomic release switch) |
| Deploy as found before this work | Run [#121](https://github.com/elagwza34/awexen-site/actions/runs/45916717879) failed at the backend health step although production had updated — diagnosed and fixed, see `01_DEPLOYMENT.md` |
| Deploy verifying this release | Run [45917754918](https://github.com/elagwza34/awexen-site/actions/runs/45917754918) — **success** (backend, frontend verification, release gate; 41 s) |
| CI for this release | Run [45916717806](https://github.com/elagwza34/awexen-site/actions/runs/45916717806) — **success** (unit, calculator, CRM, Deno, build, E2E on Chromium + Firefox + WebKit) |
| Live version at verification | `version.json` → `070463e`, `builtAt` 2026-11-27T00:37:27.981Z |

## 3. Gate results

| Gate | Result | Evidence |
| --- | --- | --- |
| TypeScript | 0 errors | `tsc --noEmit` |
| Unit tests | 33/33 | `npm run test:unit`; CI job `frontend` |
| E2E (3 browsers) | 75/75 | 25 tests × Chromium 159, Firefox 159, WebKit 27.2; CI job `frontend` |
| Production build | success | `vite build`; Hostinger build log for `070463e` |
| Dependency audit | 0 high/critical | `npm audit --audit-level=high` in CI |
| Deploy pipeline | success | run 45917754918: all jobs green |
| Release gate | success | live `version.json` = pushed commit, backend health 200 |

## 4. Production evidence (2026-11-27, after run 45917754918)

| Check | Result |
| --- | --- |
| Home page | HTTP 200 |
| Deep links `/services`, `/pms`, `/awexen/chat` | HTTP 200 (SPA fallback works) |
| `version.json` | `070463e` (matches released commit) |
| `<html>` on home | `lang="ar" dir="rtl"` |
| Canonical on home | `https://awexen.com/` |
| Title on home | Arabic brand title |
| `sitemap.xml` | 24 URLs, includes `/pms`, `/project-calculator`, `/quote`, `/initiative` |
| `robots.txt` | `Sitemap: https://awexen.com/sitemap.xml`; `/awexen` and `/export` disallowed |
| Backend health (`/functions/v1/lms-public?path=health`) | HTTP 200 (with retry) |
| Assets referenced by live HTML | 8/8 HTTP 200 with correct JS/CSS/font content types |
| Server keys in served bundles | none (`sb_secret_*` and `service_role` JWT scan) |
| English switch (browser, commit `209305d`; no language code changed since) | `lang=en`, `dir=ltr`, English title, `og:locale=en_US`, JSON-LD `inLanguage=en`, canonical `https://awexen.com/services` |

## 5. Defects fixed in this work

1. Accessibility 89 → 100: consent CTA contrast, `ol > li` list semantics, and
   a named language switch.
2. Language metadata reset on navigation — English reverted to Arabic
   `lang`/`dir`/title on every route change.
3. JSON-LD reported Arabic even on English pages.
4. Sitemap omitted public routes (now 24 URLs).
5. An unavailable offer slug rendered a dead-end error without a heading or a
   way back.
6. Deployment reported a failed release while production was updated, and could
   not verify a successful one: replaced the duplicate SCP upload with
   verification of Hostinger's single writer; health checks now retry and fall
   back to the same-origin URL.

Details: `02_BUSINESS_LOGIC.md`, `03_TEST_RESULTS.md`, `04_PERFORMANCE_SEO.md`,
`01_DEPLOYMENT.md`.

## 6. Remaining blockers and risks

| # | Item | Status / impact | Needed to close |
| --- | --- | --- | --- |
| 1 | **Supabase Edge Function deploy credentials missing.** No Deploy run has deployed functions (`5f90f27`, `702f261`, `b4e2782`, `209305d`, `070463e` all skipped them). This release changed no function files, so production consistency here does not depend on it, but the deployed function version is **not proven** to equal the repo, and future function changes cannot deploy automatically. | Open; configuration only | Add `SUPABASE_ACCESS_TOKEN` (secret) and `SUPABASE_PROJECT_REF` (variable) to the `production` environment as in `01_DEPLOYMENT.md` §3, then re-run Deploy. Workflow already fails loudly when functions change without credentials. |
| 2 | **Lighthouse targets not met.** Perf 76 (target ≥ 90), LCP 3.5 s (≤ 2.5 s), TBT 570 ms (≤ 200 ms); FCP 0.9 s, CLS 0.004, a11y/SEO/best-practices 100. Production cannot be measured with Lighthouse CLI from this network (HCDN answers 403 to that headless client); the number is the identical production build served locally. | Open; needs approval | Approve one or more of: prerender public routes, defer the Supabase vendor import, inline critical CSS (`04_PERFORMANCE_SEO.md` §4). |
| 3 | **No central error sink.** Diagnostics stay in a 25-entry per-tab buffer; nobody sees a production error unless a user reports it. | Open; needs approval | Approve the Supabase `client-events` sink (function + approval-gated migration) or the zero-infrastructure "copy diagnostics" option (`05_OBSERVABILITY.md` §2). |
| 4 | Database RLS/constraint, payment-provider and email-delivery paths have no automated tests (no disposable project or sandbox credentials). | Known gap | Approve a disposable Supabase project / sandbox credentials (`03_TEST_RESULTS.md` §5). |
| 5 | Edge Function rollback is manual until item 1 is closed. | Known gap | Same as item 1. |

Constraints honoured: no production database change, no pricing change, no
customer data touched, no SSR infrastructure added, no paid dependency added, no
source deleted, and the user's untracked `docs/project-calculator/17_SECURITY_AUDIT.md`
was left untouched.

## 7. Rollback

Primary (history preserving):

```
git revert <bad-commit>
git push origin main
```

Hostinger republishes the previous frontend; the Deploy workflow then verifies
the live version and backend health. For an immediate frontend-only rollback
without touching `main`, run **Rollback frontend** with the last known-good SHA
(`rollback.yml`) — it rebuilds, uploads over SCP and verifies version and assets.
Database changes are never rolled back automatically. Full runbook:
`01_DEPLOYMENT.md` §4.

## 8. Evidence-based conclusion

Verified with evidence: production serves `070463e`; its assets, metadata,
sitemap, robots, SPA fallback and backend health are correct; the automated
suites pass locally and in a clean CI run; the release workflow now fails only
for real reasons and verified the publish it describes.

Not verified, therefore not claimed: the version of the deployed Edge Functions,
the performance targets in item 2, live error/RUM telemetry, and database-level
test coverage. Readiness is **not** 100% until items 1–3 are closed or
explicitly accepted.

## 9. Phase 8–13 continuation from 6b36d0f

Production still reported `6b36d0f` during the continuation. Seven live route and metadata requests returned 200, and all six assets referenced by the live home page passed the content-type check. The direct backend readiness, anonymous rejection and calculator contracts passed. The candidate was kept local.

- **Backend** — Eight production functions inventoried with source comparisons. Seven matched the baseline. `lms-api` version 9 has drift. Two missing deploy inventory entries and the false-positive Hostinger HTML health endpoint were corrected in the local workflow. See `08_BACKEND_DEPLOYMENT.md`.
- **Workflow integrity** — An instructor assignment race and non-atomic catalog update were remediated locally. See `09_WORKFLOW_INTEGRITY.md`.
- **Tests** — 33 unit and 81 hermetic browser executions passed. Backend contracts, telemetry contracts and two PostgreSQL fixtures passed. Hosted role and write workflows remain pending. See `03_TEST_RESULTS.md`.
- **Performance** — Two static legal routes were prepared and browser-verified. Repeatable mobile profiling still misses homepage FCP and LCP targets. See `04_PERFORMANCE_SEO.md`.
- **Monitoring** — Privacy-safe collection, retention SQL and an owner/admin dashboard were prepared. No production telemetry is active. See `05_OBSERVABILITY.md`.

**Release blocked.** The GitHub production environment needs the Supabase deploy token and project reference. Reconcile the recorded migration history with the live schema before approving SQL. Migration approval is required for the LMS RPC and telemetry storage, including enabling the currently absent Supabase Cron extension. The approved migration and secrets setup must precede any dependent Edge deployment. Verify authenticated LMS workflows, telemetry access and retention in staging, and close the homepage performance gates before a final production readiness claim.
