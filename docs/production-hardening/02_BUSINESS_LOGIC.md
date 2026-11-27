# 02 — Business logic and database integrity audit

Method: static review of every server-side write path plus the client flows that
call it, cross-checked against migrations and RLS policies. No production data
was written, deleted, or modified during this audit, and no migration was
applied.

## 1. Areas reviewed

| Area | Entry points | What was checked |
| --- | --- | --- |
| Authentication / RBAC | `lms-api`, `lms-public`, admin routes | Admin checks re-read the user from Supabase (`getUser`) and require `app_metadata` claims, never a client-supplied role. |
| CMS | `lms-api` CMS reads/writes, `CmsContext`, `CmsStyleSheet` | Server-side validation of style values; CSS injection blocked by `isSafeColor` / `isSafeText` and number clamping; unknown keys dropped. |
| LMS / enrollments | `lms_edge_*` RPCs, storage `payment-proofs` | Enrollment, proof upload and approval are RPC-scoped; storage policies are folder-scoped per user; 5 MB limit and jpeg/png/pdf only. |
| Payment proofs | `lms-api` approval path | Approval must be performed by an admin session; the RPC links approval to entitlement, and re-approval is idempotent. |
| Progress / certificates | progress RPCs | Progress updates are idempotent per lesson/event; certificates derive from server-side completion state. |
| CRM / quote requests | `quote_requests` policies, admin inbox | Insert allowed for anonymous visitors with validation; reads restricted to admins; no cross-role reads. |
| Project calculator | `project-calculator` function, engine | Prices are computed only on the server from the published config; `calculate` clamps rounding, `discountLimitBps`, `minimumPrice`; answers validated structurally; quotation is idempotent on `requestId` + request hash; lead submission rate-limited and honeypot-guarded. |
| Ask AWEXEN | `ask-awexen` | Knowledge sources are server-side; no client-supplied system prompt. |
| Notifications | `form-notify` | Called by a DB trigger with a shared secret compared in constant time; recipients validated and capped; disabled by default unless configured. |
| Admin boundaries | `/awexen` route guards, `awexen-*` storage/functions | Route guard is UX only; every sensitive action is re-checked server-side. |

## 2. Verified defects found and fixed

1. **Language-specific metadata was lost on navigation** (`frontend/src/components/SeoManager.tsx`).
   The effect depended only on `pathname`, so switching to English then
   navigating reset `document.documentElement.lang/dir` to Arabic and restored
   the Arabic title/description. English titles and descriptions were added for
   every static route, the effect now depends on `lang`, and `og:locale` follows
   the language. Covered by `tests/e2e/seo-language.spec.ts`.
2. **Unavailable offer slugs rendered an error without a heading or exit**
   (`frontend/src/pages/PublicOffer.tsx`).
   When the offer RPC failed, the page showed a bare alert and a retry button —
   no `h1`, no link home. The error state now shows a heading, the alert, retry,
   and "Back to AWEXEN". Covered by `tests/e2e/public.spec.ts`.
3. **Sitemap omitted two public pages** (`frontend/public/sitemap.xml`).
   `/pms` and `/project-calculator` were indexable but unlisted; `/quote` and
   `/initiative` were added alongside them since all four are public routes.
4. **Structured data kept Arabic values after switching to English**
   (`frontend/src/components/SeoManager.tsx`).
   The JSON-LD graph hardcoded `inLanguage: "ar"` and the Arabic page name, so
   an English page still told crawlers it was Arabic. The graph now uses the
   active language and title; `tests/e2e/seo-language.spec.ts` asserts it.

No defect was found in the audited pricing, RBAC, RLS, idempotency, or
notification paths. This is a result of review, not proof of absence: database
level integration tests were not run against production because that would
require privileged access and test data the task forbids.

## 3. Concurrency and idempotency notes

- Calculator estimate: `requestId` is a client UUID; a replayed request with the
  same payload returns the stored quotation, a different payload with the same
  ID returns `409 idempotency_conflict`. The token is HMAC-signed server-side.
- Lead submission: rate-limited per email and per network (hashed identifiers),
  with a per-quotation lead stored once; duplicate submissions do not create
  parallel rows.
- Enrollment approval: guarded by the RPC, which tolerates retries.

## 4. Residual risks

| Risk | Mitigation | Owner action |
| --- | --- | --- |
| RLS or constraint regressions on future migrations | Migrations are approval-gated and reviewed manually | Keep applying migrations only through the `database` job after review |
| Admin claim drift (`app_metadata.role`) | Server always re-reads the user; client role is cosmetic | Keep the claim managed from the Supabase dashboard only |
| No automated DB-level (RLS) test suite | Unit/E2E cover client and engine behaviour; DB tests would need a disposable Supabase project | Approve a disposable staging project if DB tests are required |
