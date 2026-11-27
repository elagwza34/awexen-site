# 08 — Backend inventory and release verification

Baseline checkout `6b36d0f`. On November 27, 2026 the connected Supabase Management API returned eight active production functions. The source comparison examined every file exposed for each bundle with line endings normalized.

| Function | Platform version | JWT verification | Comparison with repository |
| --- | ---: | --- | --- |
| `ai-chat-test` | 7 | Enabled | All 4 deployed files match |
| `ask-awexen` | 21 | Disabled | All 3 deployed files match |
| `extract-knowledge-pdf` | 8 | Enabled | All 3 deployed files match |
| `form-notify` | 7 | Disabled | Both deployed files match |
| `lms-api` | 9 | Enabled | Entrypoint differs. Both shared files match. |
| `lms-public` | 8 | Disabled | All 3 deployed files match |
| `project-calculator` | 3 | Disabled | All 7 deployed files match |
| `support-push` | 8 | Disabled | Both deployed files match |

All gateway JWT flags match `supabase/config.toml`. A disabled gateway JWT check is intentional for public functions and for functions with their own authentication or shared-secret checks. It does not attest the authorization of individual routes.

The live `lms-api` differs in payment-proof path handling, course catalog synchronization, and other entrypoint code including the current mail dependency. Deploying that function should be followed by an authenticated LMS smoke test in staging using synthetic data. No production source was overwritten in this audit.

## Functional readiness

The old `https://awexen.com/functions/v1/lms-public?path=health` returned HTTP 200 and `text/html`, the static rewrite. The old direct `?path=health/ready` also returned HTTP 200 but did not perform the database readiness check. The direct `lms-public/health/ready` URL returned JSON with database and Edge Function checks true. The production calculator configuration endpoint returned a shaped configuration response. The anonymous LMS account request returned JSON with HTTP 401. No test lead, payment, booking, or course write was submitted.

Release and scheduled health now share those three direct checks. Health responses must match their JSON contracts. Tests exercise the accepted contracts and reject static HTML, a liveness-only response, an unavailable database, a protected-route regression, and malformed calculator metadata.

## Deployment and rollback

The function release script checks the declared inventory against repository entrypoints. It verifies each new active version and JWT policy from the Management API after deploying, and saves the commit, platform version, digest, and completion state as an Actions artifact. A partial deployment stops the job and leaves an incomplete artifact with the confirmed prefix. It never prunes functions. The deployment workflow includes both `ai-chat-test` and `support-push`, which the previous hardcoded deploy list omitted.

Normal releases also require a successful push-triggered CI run for their exact commit. Explicit backend-only rollback uses a known-good commit in main history and verifies the deployed backend contracts even if the failing commit's CI is red. The CI gate cannot prevent Hostinger's independent Git webhook from publishing a push.

For a backend-only recovery, run **Deploy** from `main` with `backend_ref` set to the full SHA of a known-good commit in main history. The workflow redeploys that source and verifies backend contracts. The frontend target is unaffected. Inspect the deployment artifact first for a partially completed release. Backward-compatible rollout ordering is still necessary because Hostinger independently publishes frontend pushes.

The ordinary **Deploy** dispatch does not apply database migrations. The database job requires independently choosing `apply_migrations` and providing the exact comma-separated SQL filenames in `reviewed_migrations` after the production owner approves the SQL and backup plan. The live dry run must match that list before it applies anything. A backend rollback cannot select this path.

The production Management API returned only 11 recorded migration rows, including consolidated versions named `client_offers_and_pricing` and `client_offer_translation` under different timestamps than the checkout. Some later database objects already exist even though corresponding checkout filenames are absent from that history. Reconcile the schema and recorded history from a read-only inspection and review the exact pending migration plan before any apply. Do not blindly replay historical migrations or repair their tracking rows.

## Credential and environment status

The GitHub API returned no names under the repository's `production` environment secrets or variables. Values were not requested or printed. For automated function releases:

1. Generate a Supabase personal access token from **Supabase Dashboard → Account → Access Tokens** using an account authorized to deploy functions on the AWEXEN project.
2. In **GitHub → elagwza34/awexen-site → Settings → Environments → production**, add secret `SUPABASE_ACCESS_TOKEN` and variable `SUPABASE_PROJECT_REF` with value `rlppzlcdkwrxsuekszcm`. Enter the token directly in GitHub.
3. Keep `SUPABASE_DB_PASSWORD` separate. It is required only for an expressly approved migration run.
4. Confirm an authorized staging build and the optional provider configurations before dispatching a production Edge release. Keep `apply_migrations` unchecked.

The browser project URL and publishable key come from `frontend/.env.production`. A successful calculator configuration call proves that its signing-key branch and database access are operational. Successful LMS readiness proves the Edge runtime's project URL and server key can read its organization table. Provider configuration remains unverified for SMTP, Hostinger Mail, OpenRouter, web push VAPID, Zoom, and Google Meet. Verify the names in Supabase Edge Function Secrets without exporting values, then test delivery with staging accounts. A read-only production inventory does not prove provider credentials.

**Open** — GitHub production credentials, an executed managed deployment and rollback, authenticated LMS smoke tests, and provider configuration checks. The workflow changes are local.
