# Test results

Development checks ran on Windows with Node, Deno, local PostgreSQL 17, PostgREST 14.14, and Microsoft Edge.

| Check | Result |
| --- | --- |
| `node --experimental-strip-types frontend/scripts/test-calculator.mjs` | 21 passing engine scenarios |
| Deno check and lint, plus `deno test supabase/functions/project-calculator/public-config_test.ts` | Type and lint checks passed. 3 endpoint-support tests passed. |
| Calculator migrations and `supabase/tests/project_calculator.sql` | Passed on a fresh local test database using the existing quote-request table definition and an Offers fixture. |
| `node frontend/scripts/test-calculator-api.mjs` against local Edge and PostgREST | Publication guards, four estimates, immutable snapshots, lead inbox links, restore and edit concurrency verified. The Auth user endpoint used local role fixtures. |
| `frontend/scripts/test-calculator-browser.mjs` | Four browser fixture scenarios, including an estimate with manual-review items, and stale-version recovery passed. The browser transport was mocked for these cases. |
| Connected mobile browser smoke test | Public browser → real local Edge Function → PostgREST → PostgreSQL passed, including live preview, a saved estimate, PDF download and formal lead. |
| Connected admin browser smoke test | Local Auth fixture and real Edge/Postgres persistence. Edited a project price, added a bilingual question, saved, approved, published, and verified the public configuration. |
| Admin records pagination | Real Edge/PostgREST lookup passed for linked quotation references, page bounds, and empty pages. |
| Offers and CRM regression scripts | Passed. |
| Frontend TypeScript and Vite build | Passed. |

The starter catalog has 16 projects, 13 sections, and 128 questions. The price migration (0008) fills all 141 unconfigured charges and the 16 project base prices with approximate EGP rates; the composed catalog (0006 through 0008) validates with no errors. Sample engine estimates: a corporate site with 8 pages and custom design totals 41,800 EGP, an e-commerce store with 80 products totals 80,400 EGP, and a single-page landing page totals 8,900 EGP. These are indicative starter rates, not approved commercial prices. The draft also ships two working gates: the custom-software scope selector keeps only the platform steps the visitor picks, and a WordPress technology answer skips the custom backend step. Corporate, e-commerce, custom-software, and mobile test prices lived only in local fixtures.

To repeat the API suite on a fresh local calculator installation, set `CALCULATOR_TEST_URL`, `CALCULATOR_TEST_ADMIN_TOKEN`, and `CALCULATOR_TEST_SUPPORT_TOKEN`. Use a disposable database initialized with the two calculator migrations and no published version. The test intentionally publishes development fixtures. Test a real Supabase Auth account and the existing notification deliverability in staging before an approved rollout.

For the isolated public browser scenarios, start Vite using `VITE_SUPABASE_URL=https://calculator-test.example` and a local test public key. Point `PLAYWRIGHT_MODULE` to a Playwright installation and set `CALCULATOR_TEST_BROWSER` if a browser executable must be selected. The script intercepts that fixture hostname.
