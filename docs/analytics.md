# AWEXEN analytics and reporting — local implementation

## Status and changed behavior

The existing main.tsx -> setupAnalytics path is retained. Tracking now starts from
the router observer only after a valid accepted choice AND the source-level
TRACKING_RELEASE_APPROVED gate in src/lib/trackingPolicy.ts. That gate remains FALSE.
Acceptance in this build never loads GTM or Meta, nor emits tracking events.
There is no environment/localStorage override for the gate or authoritative container.
No direct GA4 loader exists. Legacy analyticsId/googleTagId settings remain stored
and editable; they do not load Google scripts or override GTM-M7SLX84R.
No accounts/container contents have been inspected or modified through this patch.

## Consent lifecycle

ConsentPopup provides the requested Arabic/English Accept and Reject choices with
additional disclosure that acceptance includes Google analytics and Meta marketing.
It remains outside Suspense and available on standalone routes. The small Privacy
choice control reopens it. There is no detailed preferences panel. A version-1 record
is kept for 180 days under awexen-optional-consent, independently of admin settings.
Malformed/missing/expired/future-dated records and storage failures fail closed.
Rejection preserves forms, navigation, login, and other essential functionality.

The application checks consent for every event and vendor initialization. Expiry is
scheduled, checked on focus and periodically, and withdrawal is synchronized across
tabs. Rejection stops application events, sets the GA4 disable flag, queues a denied
consent event, revokes Meta consent, clears known accessible root-path first-party
_ga/_gid/_gat/_fbp/_fbc cookies, and reloads if vendors had executed. If persistence
fails, the current runtime fails closed and shows an error; a successful new choice
must be saved to persist across reloads. Third-party/HttpOnly or unusual-path cookies
cannot all be deleted by JavaScript. Previously transmitted/in-flight data cannot be
recalled. Container consent configuration and network testing remain mandatory.

## Loader and event ownership

GTM-M7SLX84R is the only Google container. The loader preserves dataLayer, recognizes
existing Google loaders/DOM IDs, uses a window sentinel, and emits gtm.js once. It
does not retry failed network loads automatically. External loaders block our Google
loader rather than starting another container. No noscript iframe bypasses consent.

Meta retains the configured localStorage pixel ID and stays outside GTM. Only valid
numeric IDs are considered; no Meta Pixel ID was supplied for a global deployment.
The public ContentContext still does not fetch analytics settings, so an admin's
saved ID does not establish visitor-wide pixel configuration. The dashboard labels
this browser-local configuration explicitly. No optional integration is auto-enabled.
Only valid
numeric IDs load after consent/release approval. Existing external fbq prevents a
second initialization. Automatic configuration is disabled, and the loader no longer
sends PageView: trackNavigation owns one Meta PageView per eligible screen. No
advanced matching/form data is supplied. Meta can read actual document URLs itself;
it is blocked on query/fragment/dynamic-slug locations or unsafe referrers. Entering
such a location after Meta loaded triggers a reload to unload it. These restrictions
reduce reporting coverage and require real browser verification before release.

Explicit React Router awexen_navigation is the sole page-view source. Strict Mode,
rerenders, query-only and hash-only changes are deduplicated; back/forward between
screens is counted. Consent after navigation measures only the current screen and
does not replay rejected-period history. Public route allowlisting excludes admin,
authentication, reset, checkout, export, learning/instructor and CMS preview routes.
Entering an excluded route reloads if vendors were loaded to remove vendor timers.
Titles use controlled page categories, independent of lazy-loaded document titles.
Raw dynamic slugs are collapsed to /section/detail; page-level reporting therefore
groups detail pages. Arbitrary query values, hashes, raw referrers and form values are omitted.
GTM's script request uses an origin-only referrer policy.

WhatsApp contact links are observed once through a trusted delegated click handler;
click_whatsapp contains no destination, phone or message. Contact.tsx emits
generate_lead only after contact_messages insert succeeds. Initiative.tsx emits
initiative_form_submit only after initiative_applications insert succeeds. Synchronous
submission guards prevent concurrent requests; per-mount IDs deduplicate conversion
emission without transmitting IDs. Tracking is best-effort and never throws into
business flows. It is not a server-side exactly-once delivery system: fresh mounts,
user resubmission after refresh, blockers, or ambiguous network outcomes can differ
from business records. No conversion events are emitted retrospectively after consent.

## Manual GTM/GA4 setup (do not publish yet)

1. Inspect GTM-M7SLX84R, existing Google tags/destinations, Meta/custom HTML, History
   triggers and GA4 enhanced measurement. Resolve competing trackers first.
2. Use a reviewed GTM consent template with setDefaultConsentState and
   updateConsentState. At Consent Initialization set analytics_storage, ad_storage,
   ad_user_data and ad_personalization denied. Read the preloaded
   awexen_optional_consent value and update to granted only on accepted optional
   tracking; handle later awexen_consent events too. No tracking tag may precede this.
   A data-layer consent string alone is NOT Google Consent Mode.
3. Create/reuse one Google tag for G-E76S8S841V at Initialization with consent checks.
   Set send_page_view to BOOLEAN false every time it initializes. Map page_location,
   page_title and page_referrer to the sanitized data-layer values preloaded before
   gtm.js. Apply these overrides to automatic events as well. Do not use raw Page URL.
4. In GA4 -> Admin -> Data streams -> Web -> Enhanced measurement -> Page views ->
   advanced settings, disable Page changes based on browser history events.
   Disable other enhanced collection until reviewed for consent and URL/PII handling.
5. Create exactly one GA4 page_view event tag triggered by awexen_navigation. Map
   sanitized page_location/title/referrer and require consent. Do not use History
   Change or All Pages page_view triggers alongside it.
6. Create GA4 event tags consuming click_whatsapp, generate_lead and
   initiative_form_submit, with no form/destination parameters. Review which are key
   events: WhatsApp is intent, contact is a received lead, initiative is an application;
   none proves qualification or a sale. Do not create a duplicate Meta tag in GTM.
7. Test locally with the release gate enabled only in a reviewed test build. Verify
   Tag Assistant/Preview consent ordering, no denied Google/Meta requests, one initial
   and one per eligible SPA view, conversion success/failure, withdrawal, cookies,
   exclusion boundaries and payloads. Verify GA4 DebugView and Realtime separately.
   Publish and deploy only after explicit approval. The current build stays disabled.

Campaign attribution uses a closed vocabulary in trackingPolicy.ts. Sources:
facebook, instagram, google, newsletter. Mediums: paid_social, social, cpc, email.
Campaigns: awexen_initiative, awexen_services, awexen_brand. Content: image, video,
carousel, story, reel, text. Source and medium must both match before any values are
forwarded. For example use utm_source=facebook&utm_medium=paid_social&
utm_campaign=awexen_initiative&utm_content=video (on one line). Unknown campaign codes
are dropped; expand the source allowlist only through reviewed source changes.
Only fixed Google/Bing/Facebook/Instagram origins survive initial referrer mapping.
Unknown referral hosts, ad click IDs, arbitrary terms and raw URLs are omitted. This
intentionally limits referral and advertising attribution; consent granted after an
earlier landing navigation cannot recover that landing attribution. Do not add UTMs
to internal links. No production attribution accuracy claim is made before GA4 testing.

References:
- https://developers.google.com/tag-platform/security/guides/consent
- https://developers.google.com/analytics/devguides/collection/ga4/views
- https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart

## Admin reporting and missing configuration

Route: /awexen?section=analytics, reusing the existing protected admin shell. Only a
verified owner/admin role enables navigation and rendering; pending/failed role checks
do not grant Analytics access. There is no new /admin/analytics authentication path.

AnalyticsPanel has bilingual responsive overview cards, date selection, traffic and
conversion charts, source/campaign and page/landing-page tables, tracking health,
loading/error/no-data states. No metrics are fabricated or substituted with database
lead counts. analyticsReports.ts defines OverviewMetrics, SourceReport, PageReport,
TrendPoint and the ReportState union. The adapter returns disconnected because the
numeric GA4 Property ID and authorized reporting backend are unavailable. Meta Ads
reporting is also disconnected and is never inferred from pixel events.

Existing deployment uses authenticated lms-api Edge Functions; Django APIs also exist
with Supabase JWT authentication and organization permissions. No GA4 reporting API
integration was found. No frontend privileged call, backend stub, schema migration or
dependency was added. API authentication/authorization tests are not applicable until
a reporting endpoint exists; client role checks are not a replacement for that endpoint.

To connect real reports in a separately reviewed server integration:
1. Obtain the numeric GA4 Property ID (not G-E76S8S841V). Enable the Google Analytics
   Data API in a Google Cloud project. Grant the reporting identity property Viewer
   access; use the analytics.readonly scope.
2. Store service-account/workload credentials only in the chosen backend's secret
   store/ADC. Never VITE_* or browser localStorage, repository files, or logs.
3. Add a server endpoint using official Data API runReport/runReports. Authenticate
   existing tokens server-side and require verified owner/admin permissions on every
   request. Return 401/403 before calling Google; do not trust client role metadata.
4. Fix the property server-side. Accept only ISO start/end dates within the configured
   maximum (current UI permits 366 inclusive days) and nonfuture dates. Allowlist
   dimensions/metrics on the server; never accept arbitrary property IDs or queries.
   The UI validator is convenience only and must be repeated server-side.
5. Build compatible reports for totalUsers, sessions, screenPageViews, engagementRate,
   userEngagementDuration (derive documented per-user average), sessionSource/Medium,
   sessionCampaignName, landingPage, pagePath and eventName/eventCount. Query all three
   conversion events separately. Define conversion rate as sessions with the selected
   conversion / eligible sessions, not raw event count / sessions. Validate dimension
   compatibility against Google's metadata/checkCompatibility API.
6. Cache fixed reports by property/date range/access scope (e.g. five minutes), bound
   timeouts/rows, handle quota/permission failures without logging tokens, and return
   synchronization time only after a successful fetch. Preserve empty vs unavailable
   vs error distinctions and GA4 reporting lag/thresholding metadata.
7. Connect loadAnalyticsReport to the authenticated endpoint, validate response shapes,
   test expired tokens and non-admin users, then compare reports against GA4 UI.

## Verification, rollout and rollback

From frontend run node scripts/test-analytics.mjs, node scripts/test-analytics-ui.mjs,
node scripts/test-analytics-forms.mjs,
node node_modules/typescript/bin/tsc --noEmit and npm run build. No lint command is
configured. Core tests exercise the production-disabled and in-memory enabled branches
using a simulated DOM; UI checks use real React server rendering, not a live browser.
The form tests compile actual submit-handler ASTs with mocked server/state bindings
to check acknowledgement ordering, failure, validation and concurrent submissions.
They cannot prove remote script execution, cookies, route interaction, or live data.

Before release: inspect actual container, complete consent/privacy review, choose
retention settings and verify cookies, resolve Maps/video/font privacy separately,
verify Meta auto-event/automatic matching settings in its account, review attribution
limitations, perform real browser checks and Preview/DebugView/Realtime, and approve
the release gate change. Do not represent the entire site's privacy as resolved:
existing Google Fonts, Maps and video embeds are outside this patch's Google/Meta
analytics consent gate. Keep essential/auth storage intact.

Release only the reviewed artifact and manually approved container version. Pushing
main invokes hosting and backend deployment workflows, so no push is authorized here.
Record previous safe frontend/container versions. Roll back by closing the release
gate and deploying an approved safe artifact, and manually pausing/reverting the
relevant GTM tags. Do not restore the legacy direct GA4 or unconsented Meta loaders.
Open tabs can retain executed code until refresh; a frontend rollback alone cannot
recall already transmitted data. No database or hosting configuration change is needed.

## File manifest and local results

Changed source: frontend/src/App.tsx, frontend/src/admin/types.ts,
frontend/src/lib/admin.ts, frontend/src/lib/analytics.ts,
frontend/src/pages/AdminDashboard.tsx, frontend/src/pages/Contact.tsx,
frontend/src/pages/Initiative.tsx, frontend/src/pages/PrivacyPolicy.tsx.

New source: frontend/src/admin/AnalyticsPanel.tsx,
frontend/src/components/AnalyticsRouteTracker.tsx,
frontend/src/components/ConsentPopup.tsx, frontend/src/lib/analyticsReports.ts,
frontend/src/lib/consent.ts, frontend/src/lib/trackingPolicy.ts.

Verification scripts: frontend/scripts/test-analytics.mjs,
frontend/scripts/test-analytics-ui.mjs, frontend/scripts/test-analytics-forms.mjs.
Documentation: docs/analytics.md. Existing PMSSection.tsx/PMS.tsx/hooks changes belong
to the pre-existing workspace and were not edited for this task.

Local results: 15 core checks passed; bilingual React rendering checks passed for
loading/disconnected/error/empty states and saved rejection; five actual form-handler
scenarios passed (success, server failure, concurrent submission and initiative
validation). TypeScript and production build passed. No lint command is configured.
No new dependency was installed. No screenshots, browser/network verification, remote
GA4 reports, account permission tests, Preview/DebugView or Realtime verification
were possible in this session. No reporting endpoint exists yet, so server reporting
authentication/authorization remains a required future test, not a passed check.
