# Security review

- Edge administration verifies the Supabase access token through Auth and checks trusted `app_metadata`. Database access for privileged operations is service-only. Admin configuration mutations require the current draft revision.
- Prices and totals are recalculated from stored published configuration. Customer monetary inputs are never used directly as prices. Snapshot insertion takes a lock on the current version pointer.
- The browser receives an allowlisted public configuration. Internal notes, reusable drafts, inactive choices, hidden admin metadata and unpublished versions are excluded. Active pricing rules remain visible in the browser to support instant previews. Breakdown visibility controls presentation and is not a secrecy boundary for published rates.
- No executable expressions run from a configuration. The API bounds JSON bytes and answer structure, restricts CORS, limits requests by keyed network and email buckets, and uses a lead honeypot. Rate limits are application controls. Verify gateway IP headers and abuse monitoring before launch.
- Quote retrieval requires a secret-derived token. Only its hash is persisted. Lead creation validates the same token and is serialized per quotation to prevent duplicate requests.
- Analytics retains only allowlisted event names, consented session IDs and catalog identifiers. Quotation answers, contact fields and access tokens stay out of analytics. The existing CRM and Quote Inbox have their own role gates.
- Once deployed, monitor rate-limit storage, quotation retention, abuse rates and administrator audit access. The included schema does not schedule retention jobs.
