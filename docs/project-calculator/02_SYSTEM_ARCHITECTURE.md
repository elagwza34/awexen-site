# System architecture

The existing Vite app exposes `/project-calculator` and the Cost Calculator section in the AWEXEN admin. Both import the same pure TypeScript engine used by the `project-calculator` Supabase Edge Function. The browser previews only a filtered published configuration. It reconciles with debounced server previews, and the server independently validates and reprices any estimate it stores.

The service reads the current version pointer, projects its public fields, and computes the same totals used by the quotation view. The admin works on a revisioned draft and explicitly publishes it. Postgres writes an immutable version and advances the live pointer in one transaction. Copying to draft supports rollback without rewriting history.

A formal request links the immutable snapshot to `quote_requests` in one transaction. Quote Inbox and its existing CRM conversion are the staff handoff. The calculator tracks its extended lead stages independently. The confirmed snapshot feeds an Arabic or English A4 download and browser printing.
