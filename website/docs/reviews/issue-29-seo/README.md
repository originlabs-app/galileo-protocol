# Issue 29, worker implementation evidence

Local implementation only, branch `fix/29-seo-canonicals`, base
`f06ac5d166707943302fbd88a63ac82985377ea8`. The coordinator owns push, PR,
independent reviews, preview UAT and any later production decision.
This dossier is evidence from the author, not an independent approval.

## Result and boundaries

- 109 sitemap pages have an explicit page-level canonical and matching Open Graph URL.
  The root layout no longer supplies either URL to descendants. The small shared
  `pageMetadata` helper also uses each page's own title and description for sharing.
  Existing blog article and breadcrumb schemas remain aligned with their canonical;
  Organization/WebSite schemas correctly keep the site identity at the homepage.
- 67 sitemap entries omit lastmod. The other 42 retain dates from blog frontmatter
  or an explicit specification Last Updated field. No build-time date fallback.
- Only generated blog/specification routes are served. Unknown routes and extra or
  omitted specification segments return 404/noindex without a canonical. Category
  cards now include their real subdirectory, fixing 26 links to alternative paths.
- Home has the requested visible H1. ABYSSE is decorative (`aria-hidden`) and the
  existing visual identity is retained. Scroll guidance follows the CTAs in normal
  flow so the longer heading does not overlap the mobile actions.
- Introduction explains principles, architecture explains data placement, quick
  start maps an illustrative integration, and the existing ESPR page addresses DPP
  planning for luxury. Specification, release evidence and legal obligation are
  explicitly distinguished. No blog content, protocol source or dependency changed.

## Criteria and evidence

| Criterion | Observation | Evidence |
|---|---|---|
| Reproduce inherited canonical / fabricated dates on exact base | Initial checker exited 1, 240 metadata/date discrepancies across 109 pages | `base-test.log`, `base.json`, `base-build.log`, `base-source-excerpts.txt` |
| All indexable routes covered | All static route files and all generated HTML page routes represented in sitemap; all 109 fetched over local HTTP with 200 | `scripts/check-seo.py`, `http.json` |
| Clean unique canonical and sharing URL | All 109 initial documents checked with a real HTML parser; descriptions and sharing titles also checked | `http.json`, `http-test.log` |
| Schema URL consistency | Existing BlogPosting / BreadcrumbList page identities checked; site-level identity remains site-level | `scripts/check-seo.py`, existing `OrganizationJsonLd.tsx` |
| No invented lastmod | Every emitted date compared with its source, missing dates must be omitted | `http.json` |
| Private/parameter routes | 109 query variants keep the clean canonical; seven unknown/private/malformed paths are 404/noindex without canonical | `http.json` → `probes` |
| H1, intentions and user journey | Real Chrome at measured 1440×1000 and 390×844; no horizontal page overflow; introduction → architecture → quick start → ESPR clicked, plus eight evidence/specification links | `browser-observations.json`, `browser-clicks.json`, screenshots, `espr-snapshot.txt` |
| Local gates | npm ci, lint, build and focused SEO checks exited 0 | logs below |
| All internal links resolved | **INCOMPLETE, pre-existing:** 84 occurrences still return 404; every retained pair exists in base output, no new unresolved pair | `base.json`, `http.json` → `broken_internal_links` |
| Independent review / remote CI / preview / production | **UNVERIFIED, coordinator scope**; no push, PR, merge or deployment by worker | local-only handoff |

## Commands and return codes

Commands below run from `website/` unless stated otherwise. Log whitespace and
terminal progress line endings are normalized; messages and outcomes are retained.

| Command | Exit | Log |
|---|---:|---|
| `npm ci` | 0 | `npm-ci.log` |
| `npm run build` on unchanged base | 0 | `base-build.log` |
| `python3 scripts/check-seo.py --output docs/reviews/issue-29-seo/base.json` before implementation | 1, expected reproduction | `base-test.log` |
| First `npm run lint` | 1, new internal anchors required Next Link | `lint-first.log`, corrected before final gates |
| Final `npm run lint` | 0 | `lint.log` |
| Final `npm run build` | 0 | `build.log` |
| `npm run test:seo` | 0, with explicit base link debt | `candidate-test.log` |
| `python3 scripts/check-seo.py --baseline docs/reviews/issue-29-seo/base.json --origin http://127.0.0.1:8474 --output docs/reviews/issue-29-seo/http.json` | 0, with explicit base link debt | `http-test.log` |
| `git diff --check` | 0 | worker tool transcript |

The checker gained route-inventory, sharing-description, H1 and HTTP-probe assertions
following the initial reproduction. `base.json` preserves the observations made
before the implementation, rather than being regenerated against the candidate.
`--baseline` permits only exact pre-existing relative source/href pairs. Absolute category links
are not exempt, so the repaired subdirectory links cannot silently regress. Without this explicit
option, remaining internal broken links fail the checker. This is a local helper,
not a replacement for the repository CI or an approval gate. Python 3 standard library
only, no added dependency. CI definitions and protections were not changed.

## Inherited limits

The 84 remaining broken links are references rendered from specification documents,
including relative `.md`, `.json` and Solidity paths and governance source references.
There are 25 distinct targets including fragments. Their source/href pairs are in
both base and candidate evidence; the candidate additionally records real HTTP 404s.
The base evidence establishes the unchanged links and absent generated target pages,
not a separately run base HTTP server. Repairing the source-reference renderer or
protocol document links is deferred; no protocol/specification source was edited.

Old compliance claims remain in other documentation and the immutable-for-this-task
blog/specification corpus. For example the unchanged compliance overview contains
`2027`, `Ready` and `All ESPR-required attributes included` at the base SHA; excerpts
are attached. The newly written ESPR guide expressly says the readiness specification
is a design reference, not an authoritative statement of current legal deadlines.
This lot does not certify regulatory correctness of the entire existing corpus.

Blog sentence-length warnings also occur in the clean base build. `npm ci` reported
one moderate vulnerability in the existing lockfile. No dependency repair or general
monorepo diagnostic was performed. No forms submitted, no GEO/provider API requests.

## Facts and implementation sources

- `specifications/architecture/hybrid-architecture.md`, especially §4: the CRAB
  terminology is **Create, Read, Append, Burn**. The earlier website expansion was
  incorrect. The introduction and architecture describe the design, not universal
  deployment capabilities or GDPR certification.
- `specifications/identity/DID-METHOD.md`, `specifications/token/ownership-transfer.md`,
  `specifications/resolver/access-control.md`, and the DPP core/leather schemas are
  the linked technical references. Their existing source paths are preserved.
- `/blog/2026-03-22-production-deployment` is the existing public release report,
  linked as a dated report, not revalidated here as a current deployment guarantee.
- Official ESPR source checked 2026-09-08:
  https://eur-lex.europa.eu/eli/reg/2024/1781/oj . Articles 4 and 9 tie requirements
  to applicable delegated acts; Articles 10–11 concern access/operation, Annex III
  provides the information categories. Official indexed EUR-Lex text was available;
  direct HTML/PDF opens encountered the site's anti-bot screen. No universal date,
  product-wide compliance guarantee or mandatory blockchain claim is added.
- Next.js official `generateStaticParams` documentation checked 2026-09-08:
  https://nextjs.org/docs/app/api-reference/functions/generate-static-params .
  `dynamicParams = false` limits serving to generated routes; runtime behavior is
  independently exercised in the local HTTP probes.
- Only Galileo rows from `/tmp/galileo-29-public-audit.json` were used from the supplied
  audit. A compact copy is `public-audit-summary.json`; no other site's data was read.

## Browser evidence and process ownership

Chrome headless uses only `/tmp/chrome-galileo-29-worker`, debugging port 9301 (uat1).
Server binds only `127.0.0.1:8474`. Exact PIDs and shutdown observations are recorded
in `processes.json`. No other browser profile or cmux was used.

All changed document pages were rendered at both requested widths and inspected.
The code examples and existing ASCII architecture diagram scroll within their blocks
on mobile; the page itself does not overflow. The first home mobile capture revealed
an overlapping scroll cue; the final screenshot follows the corrected flow layout.
Some full-page screenshots capture the existing scroll-triggered footer before its
animation, so an unpainted footer invitation in those captures is not evidence of a
new missing component. The DOM snapshots retain its text.
