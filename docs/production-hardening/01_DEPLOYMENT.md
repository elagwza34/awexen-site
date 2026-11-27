# 01 — Deployment reliability

Scope: `.github/workflows/deploy.yml`, `.github/workflows/rollback.yml`,
`.github/workflows/uptime.yml`, `backend/README.md`.

## 1. What was wrong

1. The frontend upload used `appleboy/scp-action`, which returned a non-zero
   exit code on Hostinger shared hosting even when files arrived. The deploy
   run was red while production was actually updated, so a real failure would
   have been indistinguishable from this noise.
2. The Edge Functions job failed opaquely when Supabase credentials were not
   configured. It also could not tell a frontend-only push from a function
   change, so a changed function could stay undeployed while the new frontend
   went live.
3. Nothing compared the deployed artifact with the built one, so a partial
   upload would only be noticed by a user.

## 2. Current pipeline

```
push to main
  └─ backend (Backend (Edge Functions))
       ├─ checkout with fetch-depth: 0
       ├─ git diff BASE..SHA → functions / migrations changed?
       ├─ credential preflight
       │    functions changed + credentials missing → ::error:: and job fails
       │    functions unchanged + credentials missing → warning, skip deploys
       │    credentials present → deploy every function
       └─ always: GET lms-public?path=health, must be 200
  └─ frontend (needs: backend)
       ├─ npm ci, build with VITE_* variables
       ├─ abort if a server key appears in dist/
       ├─ OpenSSH: mkdir public_html, scp dist/. → public_html/
       │    (no deletion: old hashed assets stay available)
       └─ poll version.json (18 × 10 s) and verify every asset in the live HTML
  └─ release (needs: both, if: always())
       ├─ fails if either job is not success
       ├─ live version.json must equal this commit's short SHA
       └─ backend health must be 200
  └─ database  (workflow_dispatch only, environment: production)
       ├─ supabase link + db push --include-all
       └─ migration list afterwards
```

Key properties:

- **Ordering**: backend first, frontend second. A new frontend can never call a
  function that has not been deployed.
- **No silent gaps**: a function change with missing credentials fails the run
  before the frontend job starts, so production cannot run old functions with
  new callers.
- **Real exit codes**: native `ssh`/`scp` means the job is red only when the
  upload actually failed.
- **Backward compatibility**: hashed assets are additive; the old bundle keeps
  working for already-open tabs.
- **Migrations**: never automatic. They run only from `workflow_dispatch` and
  only inside the `production` environment (manual approval).

## 3. Required configuration (set once)

Repository → Settings → Environments → `production`:

| Kind | Name | Used by |
| --- | --- | --- |
| Secret | `HOSTINGER_SSH_PRIVATE_KEY` | frontend upload |
| Secret | `HOSTINGER_SSH_HOST` | frontend upload |
| Secret | `HOSTINGER_SSH_PORT` | frontend upload |
| Secret | `HOSTINGER_SSH_USER` | frontend upload |
| Secret | `SUPABASE_ACCESS_TOKEN` | Edge Function deploys |
| Secret | `SUPABASE_DB_PASSWORD` | migration job only |
| Variable | `SUPABASE_PROJECT_REF` | Edge Function deploys |
| Variable | `VITE_SUPABASE_URL` | frontend build + health checks |
| Variable | `VITE_SUPABASE_PUBLISHABLE_KEY` | frontend build |

`VITE_*` values are intentionally variables, not secrets: they are compiled
into the browser bundle. Never add the service-role key to this list. CI also
greps `dist/` for `sb_secret_*` and JWT-shaped strings and aborts the deploy if
one appears.

The browser cannot read any of these values from the repository; secrets are
only exposed to the workflow environment that references them.

## 4. Rollback

`.github/workflows/rollback.yml` is a `workflow_dispatch` workflow with a `ref`
input (commit SHA or tag). It checks out that ref, rebuilds with the same
`VITE_*` variables, uploads `dist/` to `public_html/`, then verifies
`version.json` and every referenced asset against the live site.

Runbook:

1. Actions → **Rollback** → Run workflow → enter the last known-good commit
   (for example `b4e2782`).
2. Wait for the job to reach "Rollback verified".
3. Confirm `https://awexen.com/version.json` shows the target commit.

Database rollback is deliberately not automated: restore is a manual,
approval-gated decision by the owner.

## 5. Health monitoring

`.github/workflows/uptime.yml` runs every six hours (and on demand) and fails
when any of the following regresses:

- home page not `200`,
- `version.json` without a build id,
- `lms-public` health not `200`,
- sitemap missing `/pms` or `/project-calculator`,
- `robots.txt` not pointing at the sitemap,
- any `/assets/*` URL referenced by the live HTML not `200`.

A failed scheduled run raises a GitHub notification; no third-party or paid
service is involved.

## 6. Verification status

- `deploy.yml`, `rollback.yml` and `uptime.yml` were reviewed manually. GitHub
  Actions YAML cannot be executed locally; the first real run after the push is
  recorded in `07_RELEASE_READINESS.md`.
- Production verification of the release produced by this work is recorded in
  `07_RELEASE_READINESS.md`.
