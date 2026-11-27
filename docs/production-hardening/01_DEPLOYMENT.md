# 01 — Deployment reliability

Scope: `.github/workflows/deploy.yml`, `.github/workflows/rollback.yml`,
`.github/workflows/uptime.yml`, `backend/README.md`.

## 1. What was wrong

1. **Two writers for one document root.** The frontend is published by
   Hostinger's Git integration (repository `elagwza34/awexen-site`, branch
   `main`, root `frontend`, output `dist`), which rebuilds and switches the
   release atomically on every push. The workflow also uploaded `dist/` over
   SCP into the same `public_html`. Both wrote the same files, and the run
   result described the slower path, not the one that actually served traffic.
2. **A false red release.** Deploy run
   [#121](https://github.com/elagwza34/awexen-site/actions/runs/45916717879)
   (commit `209305d`) failed in the backend health step 5 s after the job
   started, and the frontend job was skipped — yet production updated 30 s
   later, because Hostinger published the same commit independently. The
   release looked failed while production was correct. The health step also
   built its URL from `vars.VITE_SUPABASE_URL`; when that variable is unset
   the URL becomes relative, so the step can never pass.
3. **Noisy SFTP action.** The original upload used `appleboy/scp-action`, which
   returned a non-zero exit code on Hostinger shared hosting even when the
   files arrived.
4. **Anonymous function scope.** The Edge Functions job failed opaquely when
   Supabase credentials were missing and could not tell a frontend-only push
   from a function change.

## 2. Current pipeline

```
push to main
  ├─ Hostinger Git integration  (single writer for the frontend)
  │    build frontend → publish versioned release → switch current → sync public_html
  └─ GitHub Actions "Deploy"
       ├─ backend (Backend (Edge Functions))
       │    ├─ checkout with fetch-depth: 0
       │    ├─ git diff BASE..SHA → functions / migrations changed?
       │    ├─ credential preflight
       │    │    functions changed + credentials missing → ::error:: and job fails
       │    │    functions unchanged + credentials missing → warning, skip deploys
       │    │    credentials present → deploy every function
       │    └─ always: health on the project URL (if the variable is set) and on
       │         https://awexen.com/functions/v1/lms-public?path=health,
       │         6 attempts × 10 s each, must reach 200
       ├─ frontend (needs: backend) — verification only, no upload
       │    ├─ wait until live version.json equals this commit (24 × 15 s)
       │    ├─ check every asset the live HTML references: 200 and the
       │    │  correct content type (JS / CSS / WOFF2)
       │    └─ scan the served JS for sb_secret_* and for JWTs whose payload
       │         carries role=service_role
       ├─ release (needs: both, if: always())
       │    ├─ fails if either job is not success
       │    ├─ live version.json must equal this commit's short SHA
       │    └─ backend health must reach 200 (6 attempts × 10 s)
       └─ database  (workflow_dispatch only, environment: production)
            ├─ supabase link + db push --include-all
            └─ migration list afterwards
```

Key properties:

- **Single writer**: only Hostinger publishes the frontend. The workflow
  verifies what is actually served, so it cannot disagree with production.
- **A red run means a real problem**: the version wait and the asset checks
  fail loudly when Hostinger does not publish, when an asset is missing, or
  when a server key is exposed.
- **Ordering**: backend first, frontend verification second. A new frontend can
  never call a function that has not been deployed.
- **No silent gaps**: a function change with missing credentials fails the run
  before the frontend verification starts.
- **Backward compatibility**: Hostinger keeps versioned releases and hashed
  asset names are additive, so tabs that are already open keep working across
  a switch.
- **Migrations**: never automatic. They run only from `workflow_dispatch` and
  only inside the `production` environment (manual approval).

## 3. Required configuration (set once)

Repository → Settings → Environments → `production`:

| Kind | Name | Used by |
| --- | --- | --- |
| Secret | `SUPABASE_ACCESS_TOKEN` | Edge Function deploys |
| Secret | `SUPABASE_DB_PASSWORD` | migration job only |
| Secret | `HOSTINGER_SSH_PRIVATE_KEY` | emergency rollback only |
| Secret | `HOSTINGER_SSH_HOST` | emergency rollback only |
| Secret | `HOSTINGER_SSH_PORT` | emergency rollback only |
| Secret | `HOSTINGER_SSH_USER` | emergency rollback only |
| Variable | `SUPABASE_PROJECT_REF` | Edge Function deploys |
| Variable | `VITE_SUPABASE_URL` | direct health check (optional; the same-origin URL is checked regardless) |
| Variable | `VITE_SUPABASE_PUBLISHABLE_KEY` | optional; the tracked `frontend/.env.production` already provides it to Hostinger's build |

The browser build does not depend on repository variables: Hostinger reads the
tracked `frontend/.env.production`, which contains only the public project URL
and the publishable key. Never add the service-role key to this list. The
verification job scans the served bundles for `sb_secret_*` and for
`service_role` JWTs and fails the release if one is found.

**Still missing at the time of this release:** `SUPABASE_ACCESS_TOKEN` and
`SUPABASE_PROJECT_REF` are not configured in the `production` environment, so
every recent Deploy run skipped the function deploys (runs for `5f90f27`,
`702f261`, `b4e2782`, `209305d`). To enable them:

1. Supabase dashboard → Account → Access Tokens → generate a token.
2. GitHub → repository → Settings → Environments → `production`.
3. Add secret `SUPABASE_ACCESS_TOKEN` (paste the token) and secret
   `SUPABASE_DB_PASSWORD` (only needed for the manual migration job).
4. Add variable `SUPABASE_PROJECT_REF` (`rlppzlcdkwrxsuekszcm`, the project
   subdomain of the URL already in `frontend/.env.production`).
5. Re-run the Deploy workflow with **Run workflow** to deploy the functions.

## 4. Rollback

**Primary path — history preserving.** Revert the offending commit on `main`
and push; Hostinger republishes the previous frontend and the Deploy workflow
verifies it:

```
git revert <bad-commit>
git push origin main
```

Edge Functions follow the same rule (`git revert`, push, then deploy them —
automatic once the Supabase credentials above are set, manual until then).
Database rollback is deliberately not automated: restoring a database is a
manual, approval-gated decision by the owner.

**Emergency path — frontend only.** `.github/workflows/rollback.yml` is a
`workflow_dispatch` workflow with a `ref` input (commit SHA or tag). It checks
out that ref, rebuilds, uploads `dist/` over SCP, then verifies `version.json`
and every referenced asset. It does not change `main`, is not used by the
normal deploy, and is temporary by design: the next push publishes `main`
again.

## 5. Health monitoring

`.github/workflows/uptime.yml` runs every six hours (and on demand) and fails
when any of the following regresses:

- home page not `200`,
- `version.json` without a build id,
- `lms-public` health not `200` after retries,
- sitemap missing `/pms` or `/project-calculator`,
- `robots.txt` not pointing at the sitemap,
- any `/assets/*` URL referenced by the live HTML not `200`.

A failed scheduled run raises a GitHub notification; no third-party or paid
service is involved.

## 6. Verification status

The workflows parse as valid YAML (js-yaml, exit 0 for all four files). The
Node asset/secret scan in the verification job was executed against production
during this work: 8 assets, all `200` with correct content types, no server key
found.

The run that verifies this pipeline after the fix, and the production evidence
it produced, are recorded in `07_RELEASE_READINESS.md`.
