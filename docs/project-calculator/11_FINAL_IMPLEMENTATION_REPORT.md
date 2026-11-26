# Final implementation report

The development workspace contains the public calculator, dashboard module, shared pricing engine, Edge API, database migrations, bilingual draft catalog, automated tests, and this documentation. The client-specific GANTRY offer remains independent of the project pricing calculator.

Owners and admins can manage a saved draft, test scenarios, publish validated pricing, and restore historical configurations. The public flow provides condition-aware project setup, running and authoritative estimates, an A4 PDF, and formal quotation intake integrated with Quote Inbox. Calculator reports provide consented engagement and operational lead counts.

One editable draft is available at a time. The direct Arabic/English PDF preserves visual shaping using raster pages, and browser print provides selectable text. The endpoint has structural request size and conditional complexity limits. Approved production rates, hosted authentication and notifications smoke tests, and an approved deployment remain outstanding.

The starter catalog remains unpublished. No production data was modified, and no production deployment was triggered.

| Phase | Deliverable |
| --- | --- |
| 0. Audit | Existing CRM, Quote Inbox, Offers, roles, site settings, and consent paths documented. |
| 1. Architecture and database | Two additive migrations, version history, snapshots, lead links, analytics, and audit storage. |
| 2. Engines | Shared pricing, visibility, answer normalization, and configuration validation, covered by 16 unit scenarios. |
| 3. Administration | Dashboard module and draft catalog. A connected browser verified question creation, price editing, saving, and publishing using local Auth fixtures. |
| 4. Public calculator | Bilingual route, live estimates, sticky totals, navigation and draft recovery. Browser coverage includes four project types and stale-version recovery. |
| 5. Quotations and leads | Server-issued snapshots, multilingual PDF and configured WhatsApp. Connected browser and SQL tests verified lead capture. |
| 6. Security and testing | Gateway, database permissions, immutable history, idempotency, and concurrent edit tests. Results and staging limits are in the test report. |
| 7. Integration | Existing navigation and dashboard integration, CI checks, and deployment steps prepared locally. |
