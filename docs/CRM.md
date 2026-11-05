# Awexen CRM

Open `/awexen?section=clients`. Existing clients keep their IDs and contact details.

## Workflows

- **Clients:** search, stage/employee filters, tags, priorities, contacts, archive/restore and CSV export. Matching email/phone is checked before manually creating another active client.
- **Pipeline:** multiple deals per client, six stages, value in EGP, probability, expected closing date, employee assignment and loss reason.
- **Tasks:** client/deal links, due date, priority, assignee, today/overdue/completed filters. A client's next-follow-up field creates or updates a follow-up task; completing it clears the reminder.
- **Timeline:** manually record notes, calls, email, WhatsApp and meetings. Client, deal, task, contact, payment and invoice changes also add audit entries in the same database transaction.
- **Invoices:** draft itemized invoices, optional tax, issue, print/save PDF, partial payments and overdue status. Issued invoices cannot be edited. Cancel associated payments before cancelling a paid invoice. Invoice numbers are database-generated; sequence gaps are expected after rolled-back transactions.
- **Payments:** EGP ledger, payment date/method/reference, optional issued-invoice link, cancellation recorded in the timeline. Deal and invoice balances are distinct: invoice totals can include tax.
- **Intake:** manually convert contact messages, quote requests and initiative applications. Existing matches open the client instead. A unique source key also prevents importing the same request twice.
- **Reports:** pipeline/weighted values, won/lost rate, collections, source counts, team workload and deals CSV. Date filters apply to deal creation and payment dates; source counts and open tasks are lifetime figures.

## Access and data

Owner/admin manage financial records. Support can read finance and manage clients, deals, contacts, tasks and communication. Visitors and other roles cannot access CRM data. The CRM uses the existing trusted `app_metadata` role policy. Employee options are restricted by existing profile-read policies; owner/admin can assign all visible active CRM employees.

Existing `clients.project_value` / `paid_value` values are migrated into opening deals/payments; follow-up dates become tasks. Those legacy amount columns remain for compatibility and are no longer the ledger used by CRM. No existing client is deleted. Contacts/deals/tasks use restricted foreign keys; normal client removal is archival.

WhatsApp, phone and email buttons open external apps. No automatic messages or email campaigns are sent. Printing uses the browser's PDF/printer dialog. The ledger records payments; it does not charge cards or reconcile bank transactions.

## Validation

Run `npm run test:crm`, `npm exec tsc -- --noEmit`, and `npm run build` in `frontend/`.
Run `supabase/tests/crm_workspace.sql` against a migrated database with a privileged SQL connection. It uses an existing auth user to simulate role claims and rolls back all fixture records. It tests invoice totals/immutability, cross-client integrity, follow-up synchronization, and owner/support/viewer/anonymous permissions.

Browser validation used isolated mock data at widths 320, 375, 390, 768 and 1440: client/deal/task/activity creation, invoice issuance, partial payment, website conversion, dialog keyboard controls, overflow checks and support finance restrictions. Production verification covers migrations, database assertions and published assets; it does not impersonate an owner's browser session.
