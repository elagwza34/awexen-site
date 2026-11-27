# 05 — Observability

## 1. What already exists

| Capability | Implementation | Notes |
| --- | --- | --- |
| Runtime errors | `frontend/src/lib/telemetry.ts` (`setupMonitoring`) | Catches `error`, `unhandledrejection`, failed `SCRIPT`/`LINK`/`IMG` resources, service-worker errors, offline transitions, and Supabase 5xx/network failures. |
| Dedupe + throttle | `recordDiagnostic` | Same key is suppressed for 30 s by default (5 min for resource errors). |
| Privacy | `sanitize` | Messages are truncated to 240 chars and URLs are reduced to their path; no inputs, tokens, or payment data are read. |
| Build correlation | `build: APP_BUILD_ID` | Every diagnostic records the git short SHA of the running bundle. |
| Local retention | `sessionStorage` buffer | Last 25 entries per tab; no cookie, no cross-site identifier. |
| Boot failure | `index.html` watchdog | After 15 s without a mounted app the recovery screen appears with retry and cache-reset actions; the 1.2 s check catches an early error state. |
| Chunk failure after a deploy | `lazyWithRetry` | Retries a failed dynamic import and then reloads once to fetch the new hashed asset. |
| Compatibility | boot script check | Unsupported browsers get the `is-outdated` screen instead of a blank page. |
| Deployment health | `.github/workflows/deploy.yml` release gate + `.github/workflows/uptime.yml` | Live `version.json`, asset availability, backend health, sitemap/robots, every six hours and on demand. |

## 2. Gap: no central sink

`VITE_ERROR_REPORT_URL` is unset, so diagnostics stay in the browser. This is a
deliberate privacy-safe default, but it means nobody sees a production error
unless a user reports it.

Options, in order of cost:

1. **Supabase Edge Function sink (recommended).** Add a small `client-events`
   function (same pattern as `form-notify`: shared-secret protected, rate
   limited, sanitised fields only) and set `VITE_ERROR_REPORT_URL` as a build
   variable. No new vendor, uses existing infrastructure. Requires a migration
   for the table — approval-gated.
2. Keep the current buffer and add a developer-facing "copy diagnostics" action
   to the recovery screen for support conversations. Zero infrastructure.
3. A third-party RUM service — paid or data-processor heavy; not proposed
   without approval.

## 3. Core Web Vitals

No RUM is collected today. A no-dependency collector could observe LCP, CLS,
INP and TTFB with `PerformanceObserver`, keep only the numeric values plus the
build id, and send them through the same sink chosen above. It is intentionally
**not** implemented yet: collecting vitals without a destination would add code
and payload for no visibility. The lab baseline in `04_PERFORMANCE_SEO.md`
remains the reference until a sink is approved.

## 4. Sampling and retention proposal (for the sink)

- Errors: all unique kinds (deduped client-side), capped at 50 events per tab.
- Vitals: one summary per page load, sent once on `visibilitychange: hidden`.
- Retention: 30 days for raw rows, aggregated counts kept indefinitely.
- No IP address stored; rate limiting uses a salted hash like the calculator.

## 5. What was added in this work

- `uptime.yml`: scheduled verification of the live site, build id, backend
  health, sitemap/robots and referenced assets; failures raise GitHub
  notifications without any paid service.
- The release gate already fails a deploy whose live version or health does not
  match, so a bad release cannot be reported as successful.

## 6. Phase 12 implementation prepared locally

The browser debug buffer now stores fixed error codes and coarse route classes. The opt-in transport accepts only event kind, route class, Git build, browser family, OS family, and vital rating. Raw errors, request bodies, URLs, user-agent strings, user IDs and credentials are excluded. LCP, INP and CLS use the open-source web-vitals implementation, sampled on 10% of visits and sent only with optional analytics consent. Startup attempts are sampled at 10%. Diagnostics are deduplicated and capped at 25 submissions per tab.

The new `client-events` function validates the exact event shape, limits request bytes, and hashes the network bucket using a separate secret. PostgreSQL rate-limits to 20 events per minute per bucket, aggregates identical dimensions hourly, and schedules retention of 30 days for aggregates and one day for buckets. The browser only categorizes Edge failures it observes. Background Edge-only failures still require the Supabase logs or additional instrumentation. Failures before the application JavaScript initializes still use the local boot recovery screen.

The dashboard's **Production monitoring** section lists recent aggregates with severity, counts, first/last seen, versions, and platform classes. The backend rereads the authenticated user's role and limits the list to owners and admins. The SQL fixture verifies service-only access, rate limiting, aggregation, and rejection of raw routes. It uses a scheduler stub and does not prove cron execution.

Activation requires explicit approval for migration `202611270002_telemetry_hourly_aggregates.sql`. Production read-only inspection found `pg_cron` absent. Enable Supabase Cron as part of the approved database change, set a random 32-character-or-longer `TELEMETRY_RATE_KEY` through Supabase Edge secrets, and deploy `client-events` before enabling `VITE_ERROR_REPORT_URL=https://rlppzlcdkwrxsuekszcm.supabase.co/functions/v1/client-events` in the Hostinger build. Verify authorized and denied dashboard reads and the retention job in staging. This continuation has not enabled the production sink.
