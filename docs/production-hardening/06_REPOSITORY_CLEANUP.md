# 06 — Repository cleanup

No source code was deleted. Everything listed here is either marked, kept for
history, or left untouched with a documented reason.

## 1. Legacy Django backend (`backend/`)

- Status: not referenced by CI, the deploy workflow, or the runtime. Root
  `README.md` already described it as preserved for reference.
- Action: added an explicit **"Archived reference — do not deploy"** banner at
  the top of `backend/README.md`, pointing at Supabase Edge Functions and
  `supabase/migrations/` as the current source of truth.
- Not deleted: it contains the historical data model and SQL used to verify the
  Supabase migration; deleting it adds no runtime value and would remove a
  comparison point.

## 2. Root artifact `.codex-trp-error-export.php`

A 757-byte WordPress/TranslatePress diagnostic snippet committed in an older
commit. It is unrelated to this application. It was **not deleted** because it
may belong to another project the owner still uses; it is tracked, so removing
it later is a one-command, fully recoverable change.

## 3. Cloudflare configuration (`frontend/wrangler.jsonc`, dev dependency `wrangler`)

- Present but referenced by no script, workflow, or document. Deployment in this
  repository is Hostinger-only (`deploy.yml`).
- Kept as-is: removing the dependency changes the lockfile and install surface,
  and the owner may still use Wrangler manually for previews. If Hostinger is
  the only target, `wrangler` and `wrangler.jsonc` can be removed in a dedicated
  commit without affecting the build.

## 4. Configuration single source of truth

- Deployment: `.github/workflows/deploy.yml` only; host credentials live in the
  `production` environment, never in the repo.
- Runtime configuration: Hostinger's build reads the tracked
  `frontend/.env.production` (public project URL and publishable key only); local
  secrets stay in an ignored `frontend/.env`. `.env.example` documents names.
- Database: `supabase/migrations/` only. `backend/sql/` remains review-only and
  is labelled as such in `docs/data-dictionary.md`.

## 5. Documentation

- New: `docs/production-hardening/00`–`07` (this set).
- Existing docs were not reorganised; cross-links were kept to the smallest
  useful set to avoid moving files that other pages reference.
- `docs/project-calculator/17_SECURITY_AUDIT.md` is an untracked working file
  owned by the user; it was left untouched and uncommitted.

## 6. Dependency hygiene

- Added: `@playwright/test` and `vitest` (dev only).
- `npm audit --audit-level=high` runs in CI on every push; it was green at the
  time of writing (React Router advisories were patched in `0786808`).
- No production dependency was added or removed.

## 7. Test and build artifacts

`.gitignore` now excludes `test-results/`, `playwright-report/` and `coverage/`
in addition to the existing log exclusions.
