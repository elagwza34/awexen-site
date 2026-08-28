# Awexen Supabase backend

## Functions

- `lms-public`: public health/readiness.
- `lms-api`: authenticated student, instructor and administration API.
- `ask-awexen`: public knowledge-grounded chat.
- `extract-knowledge-pdf`: authenticated CMS editor PDF extraction.

## Database

Run `migrations/202608280001_lms_identity_security.sql` then `migrations/202608280002_lms_transactions.sql`. They preserve the existing LMS data and add the Auth identity bridge, RLS, Storage policies and transactional RPCs.

## Deploy

See `docs/deployment-supabase-hostinger.md` from the repository root.
