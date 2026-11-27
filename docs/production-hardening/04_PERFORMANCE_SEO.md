# 04 — Performance and SEO

## 1. Measurement conditions

- Lighthouse 13.6.0, mobile preset, simulated throttling (Moto G Power profile,
  1.6 Mbps), against the **production build** (`vite build` + `vite preview`)
  built from this branch with empty Supabase variables, served on localhost.
- Production itself cannot be measured with Lighthouse CLI from this network:
  HCDN returns **403** to Lighthouse's headless Chrome (the same request from
  `curl` with a headless user agent returns 200, so this is bot filtering, not a
  site error). PSI API returned 429 (quota) at the time of measurement. Real
  production timings will be captured from the live CDN after release and can be
  re-checked with the uptime job and browser DevTools.
- Numbers below are single-run lab values and vary by a few points between runs.

## 2. Results

| Metric | Target | Run A (baseline) | Run B (after a11y fixes) | Status |
| --- | --- | --- | --- | --- |
| Performance score | ≥ 90 | 84 | 76 | **Not met** |
| Accessibility | ≥ 90 | 89 | **100** | Met |
| Best practices | — | 100 | **100** | Met |
| SEO | — | 100 | **100** | Met |
| FCP | ≤ 1.8 s | 1.3 s | 0.9 s | Met |
| LCP | ≤ 2.5 s | 3.7 s | 3.5 s | **Not met** |
| TBT | ≤ 200 ms | 270 ms | 570 ms | **Not met** |
| CLS | ≤ 0.1 | 0.005 | 0.004 | Met |

The performance-score swings between runs (84 → 76) are dominated by main-thread
variance on the measuring machine; the structural causes are stable:

1. **LCP element is hero text, and it is painted by JavaScript.** Lighthouse
   reports `elementRenderDelay` ≈ 1.1 s with TTFB ≈ 22 ms. With a static SPA the
   hero cannot paint until the entry chunk, React vendor chunk and Home chunk
   have executed. This is the fundamental cost of the current hosting model.
2. **Unused JavaScript.** Lighthouse attributes 46 KB wasted of a 57 KB
   `supabase-vendor` chunk (loaded eagerly through `CmsContext`) plus 28 KB of
   `react-vendor` on first paint.
3. **Render-blocking CSS** of ≈ 24 KB (about 150–280 ms simulated).
4. **Main-thread work** ≈ 4.7 s total lab work, with max potential FID 220–420 ms.

## 3. What was improved now

- Accessibility 89 → 100: the consent CTA uses dark text on the brand orange
  (5.65:1), the home process list uses `ol > li` instead of `ol > div > li`, and
  the language switch exposes its visible label plus an `sr-only` description.
- No visual identity change to the layout, typography or brand palette.
- The hero already used the existing `instant` reveal mode, so no above-the-fold
  animation was delaying paint.

## 4. What is required to reach the performance targets (needs approval)

| Option | Effect | Cost / risk |
| --- | --- | --- |
| **Prerender public routes at build time** (for example `vite-plugin-prerender`), then serve `/services/index.html` etc. from Hostinger with a small `.htaccess` rule per top-level route | Removes the JS dependency from LCP; typically brings LCP under 2.5 s and the score over 90 | Changes how routes are served; must keep the SPA fallback for unknown paths and preserve the boot/recovery script. This is a hosting-routing change and is **not** SSR, but it is out of scope without approval. |
| Defer the Supabase import until after first paint (dynamic `import()` inside `CmsContext` after mount) | Removes ≈ 46 KB of unused JS from first load on pages that render before CMS data | Touches CMS boot; must keep CMS content/first paint ordering and the retry/fallback paths. |
| Extract and inline critical CSS for the shell | Removes the render-blocking stylesheet from the critical path | Build complexity; must keep Tailwind v4 output identical for the rest of the site. |

The static single-`index.html` model cannot serve per-route HTML without a host
rewrite decision, so this report deliberately stops at documented evidence plus
proposals rather than changing hosting behaviour unilaterally.

## 5. SEO verification

Verified by `tests/e2e/seo-language.spec.ts` and `tests/e2e/public.spec.ts` on a
fresh production build:

- Home page has a canonical URL, OG/Twitter tags, JSON-LD structured data, and
  `lang="ar" dir="rtl"`.
- Switching to English gives English title/description, `lang="en" dir="ltr"`,
  `og:locale=en_US`, and survives client-side navigation (regression fixed).
- `/awexen` (admin) is `noindex, nofollow` and is disallowed in `robots.txt`.
- `/project-calculator` and `/pms` are indexable and present in the sitemap.
- `robots.txt` points at `https://awexen.com/sitemap.xml`.
- Sitemap now contains 24 public URLs (was 20).
- One HTML document serves every route; per-route titles/canonical are applied
  client-side. Social crawlers that do not execute JS see the home metadata —
  accepted limitation of the current static model, and the reason prerendering
  is proposed above.
