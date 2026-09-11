# Local article integration checks

- Date: 11 September 2026, final build completed at 08:15:58 UTC.
- Article SHA-256: `626a9aa7f48c0c013f79ca0a67551eb9d23b27430bfab76654f6427001b3a42e`.
- Environment: this issue's local worktree, Next development server on `127.0.0.1:3197`, Chrome DevTools isolated browser context.
- Scope: the draft article, cover, inline SVG, metadata and two internal navigation targets. This is not a connected supplier trial, production check or publication.

## Build and content checks

- Dependency install: `npm ci --no-audit --no-fund`, exit 0, no dependency manifest or lockfile change.
- Final `npm run lint`: exit 0.
- Final `npm run build`: exit 0. Exact command results and article hash are in `gates/final-results.json`; full outputs are the corresponding `*-final.log` files. Archived logs normalize only line endings, trailing whitespace and final blank lines.
- Final MDX compilation, draft flag, cover existence, metadata length ranges, five exact FAQ mirrors and no em dash: PASS in `final-author-checks.json`.
- Article is approximately 2,650 words. The initial word check counted 2,644; the final whitespace-token count is 2,666 excluding the figure. Those methods count Markdown/link tokens differently, not different prose revisions.
- The cover is 1200x630, 64,128 bytes. Its recorded hash and inspection are in `cover-inspection.json`.

## Browser observations

- Desktop viewport: 1440x1000; document width and scroll width both 1440. SVG rendered 560x660. Minimum text-to-box margin 20 px.
- Mobile emulation: actual `innerWidth` 390, `innerHeight` 844; document width and scroll width both 390. SVG rendered 342x403.0625. Minimum text-to-box margin 12.4814 px.
- No horizontally overflowing article elements were found in either viewport. Cover and diagram were visually inspected in screenshots at both sizes.
- Diagram has `role="img"`, a descriptive title and a separate description. Measured contrast was 16.76:1 for titles and 12.97:1 for supporting labels against the box background.
- One article H1, ordered H2/H3 levels, five FAQ entries in the rendered structured data, and the exact cover alt were observed.
- Canonical is `https://www.galileoprotocol.io/blog/2026-09-11-dpp-provider-exit`. Open Graph type is `article`; image points to the integrated public JPEG.
- Structured data includes Organization, WebSite, BlogPosting, BreadcrumbList and FAQPage.
- Console error, warning and issue list was empty. Observed document and asset requests succeeded, including the cover and fonts, with cached 304 responses where applicable.
- Navigation to `/docs` rendered `Introduction to Galileo`. Navigation to `/blog/2026-09-08-material-marker-or-chip-dpp-binding` rendered `Material Marker or NFC Chip? A Supplier Trial Plan`. Both local routes returned 200.
- Evidence: `uat/desktop-1440.png`, `uat/mobile-390.png`, `uat/diagram-desktop.png`, `uat/diagram-mobile.png`, accessibility snapshots, both `*-metrics.json` files and `uat/browser-log.json`.

## Correction and limits

The first SVG used an inline style that the MDX renderer stripped. Browser inspection showed the diagram expanding to 1232 px. The article now uses static responsive classes; the final captures, measurements and build were taken after that correction. No component or renderer code changed.

The build reports two existing Turbopack filesystem-tracing warnings in `website/src/lib/specifications.ts` at lines 138 and 141. It also reports sentence-length notices for older blog articles; none target this article. The development startup reports an existing Edge Runtime deprecation notice. These files and configuration were not changed in this lane.

The existing page shell nests the article's `main` landmark inside the layout's `main`: `website/src/app/layout.tsx:102` and `website/src/app/blog/[slug]/page.tsx:265`. Both files are identical to the assigned base. This inherited accessibility issue remains outside the article/media scope; the checks do not claim full-site accessibility conformance.

The draft remains `published: false`, so a successful production build does not mean its public route is published. Source retrieval limits remain in `sources.md`. Independent final editorial review remains with the coordinator. No actual provider migration, backup recovery or contractual performance was tested.

The local development server was stopped before handoff. Its generated `website/AGENTS.md` and `website/CLAUDE.md` were removed only after verifying the startup attribution and their generated-only contents; the parent's existing mission file was preserved.
