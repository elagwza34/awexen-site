# Implementation plan

1. Add service-only storage for a draft, immutable versions, quotations, lead links, aggregate events, and audit records.
2. Share one validated declarative pricing and condition engine between React and the Edge Function. Run authoritative calculation before saving an estimate.
3. Add a calculator module to the dashboard for draft editing, preview, publish and restore. Seed bilingual starter content in draft only.
4. Add a public bilingual route with responsive questions, draft recovery, and sticky running costs.
5. Persist immutable estimates, link formal requests to the existing quote inbox, and expose a printable estimate using authoritative data.
6. Run engine, database, browser, and build checks. Document anything that requires deployed Supabase or business approval.
