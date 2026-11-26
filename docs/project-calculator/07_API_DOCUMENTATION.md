# API documentation

The endpoint is `POST /functions/v1/project-calculator` with JSON. Supabase clients send the normal project key. Admin operations additionally require an authenticated bearer token with AWEXEN owner or admin app metadata.

| Action | Request fields | Result |
| --- | --- | --- |
| `config` | None | Current version ID and public configuration, or null when unpublished |
| `preview` | `versionId`, `projectId`, `answers` | Server-calculated running estimate |
| `estimate` | Preview fields and `requestId` UUID | Immutable `quotation` and private `accessToken` |
| `quotation` | `reference`, `accessToken` | Original quotation snapshot |
| `lead` | Quote access fields, `lead` object, `requestId` UUID | Lead reference and status |
| `event` | `event` and optional `sessionId`, `projectId`, `sectionId` | Event accepted |
| `admin-list` | None | Current draft and version metadata |
| `admin-save` | `revision`, `config` | Saved draft and new revision |
| `admin-publish` | `revision` | Published version ID and new draft revision |
| `admin-restore` | `versionId`, `revision` | Earlier configuration copied to draft |
| `admin-records` | Optional `offset` | Up to 100 quotations, leads, and audit entries per list, with next-page indicators |
| `admin-analytics` | None | 30-day aggregate events, project and section activity, estimate averages and lead statuses |
| `admin-lead-status` | Lead `id`, `status` | Updated lead status |

Failures use `{ "error": { "code": "...", "message": "...", "details": ... } }`. On `409 stale_config`, reload the current configuration and ask the customer to review the recalculated result. Retry the original estimate request using the original request UUID and inputs. Quotation tokens belong in request bodies and should be treated as credentials.
