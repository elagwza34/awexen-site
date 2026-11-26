# Project audit

AWEXEN uses React 19, Vite, React Router, Tailwind, and Supabase Auth, Postgres, and Edge Functions. Keep the existing dashboard, Arabic/English language provider, Cairo typography, consent controls, site settings, and Supabase client.

`/quote` is an existing direct request form. `/awexen?section=quotes` provides the staff inbox for `quote_requests`. The CRM already imports qualified requests and tracks clients and deals. The existing notification trigger can handle calculator requests inserted into that inbox. Client-specific Offers and their root-level slug route are separate from this calculator.

The live metadata inspection confirmed the quote inbox, CRM clients, site settings, and client offers tables. Quote requests require an email. WhatsApp is available from site settings. Owners and admins manage pricing. Existing support access to the quote inbox remains in force. The calculator keeps configuration and customer snapshots behind a service-only database boundary.

The GitHub deployment workflow triggers on pushes to main. This work stays in the development workspace pending explicit deployment approval.
