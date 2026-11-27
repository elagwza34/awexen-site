# 09 — Workflow integrity review

Severity labels use P0 for immediate widespread integrity or confidentiality impact, P1 for a release blocker affecting a core workflow, P2 for a bounded correctness or recoverability fault, and P3 for a lower-risk gap. This is a targeted follow-up to the baseline audit, not a certification of every production module.

| Severity | Finding | Evidence and status |
| --- | --- | --- |
| P1 | Production `lms-api` source drift | Version 9 differs from the repository. The repo contains payment-proof handling and course catalog updates absent from the deployed entrypoint. Production deployment remains blocked on credential setup, approved prerequisite migration, and LMS staging checks. |
| P1 | False-positive backend health | The Hostinger SPA fallback returned an HTML 200 at the previous health URL. Fixed locally with direct JSON and DB readiness checks. |
| P2 | Concurrent instructor assignment can fail and synchronization can partially succeed | Admin UI → LMS admin instructor action → Edge handler selected before inserting and suppressed a later catalog sync error. The production schema has a unique `(course_version_id, instructor_id)` key. The new service-only RPC serializes the course, upserts or removes the assignment, and synchronizes the catalog in one transaction. |
| P2 | Coverage gap in live access and recovery flows | The hermetic browser suite disables Supabase. Its success does not prove LMS payment approvals, cross-role reads, course progress, CRM lifecycle, CMS changes, or deletion and recovery. |

## Scope traced

- **LMS instructor assignment:** dashboard action → `lms-api` organization check → instructor relation and catalog projection → returned instructor list. The database function rechecks the actor's organization and limits invocation to the service role. A test verified unique assignment identity, latest-version fallback, cross-organization rejection, and deletion rollback when synchronization fails.
- **Calculator:** repository transactions tie the live pointer and quotation snapshots to configuration version IDs with foreign keys. Quotation reference is unique. Read-only production constraint inspection confirmed those keys. This pass did not modify pricing or create production quotes.
- **Payments and progress:** existing LMS RPCs and proof storage policy are listed in `02_BUSINESS_LOGIC.md`. The deployed entrypoint difference prevents assuming equivalent behavior. An authenticated staging run is still required.
- **CRM, CMS, and deletion:** existing test fixtures and the baseline audit were reviewed. No live customer write, deletion, or recovery was attempted. End-to-end access and concurrency verification for these modules remains open.

Read-only production introspection found RLS enabled on all 68 public tables. Thirteen selected relations spanning identities, instructors and courses, CRM, leads and quotations, offers, messages and support had at least one valid index and no direct anonymous table SELECT grant. Calculator versions, quotations, leads and support conversations also had no direct authenticated SELECT grant. This checks catalog metadata. It does not execute a policy as a customer or staff role.

Before deploying the new LMS code, apply the reviewed additive migration `202611270001_lms_atomic_instructor_assignment.sql` with explicit approval. The release helper checks the required RPC through a Management API read-only query before replacing any function. Grant database-read access to the CI deploy token for this gate. The migration has not been applied to production.
