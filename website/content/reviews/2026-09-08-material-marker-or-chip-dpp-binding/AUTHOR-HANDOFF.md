# Author handoff, issue #26

Status: drafted, local delivery only. No push, PR, merge, publication, deployment or IndexNow by author. Coordinator owns the DRAFT PR, real-browser checks and independent reviews. No reviewer verdict or human GO completed by author.

## Candidate

- Branch: `blog/20260908-marker-chip`.
- Exclusive worktree: `/Users/pierrebeunardeau/dev/internal/galileo-luxury-standard/.worktrees/blog-20260908-marker-chip`.
- Base: `915c531f65256c54b50b4bfee0ccdfb444bd188d`.
- First, separate watch commit: `718b2cf`, committed before article drafting.
- Article: `website/content/blog/2026-09-08-material-marker-or-chip-dpp-binding.mdx`.
- Article SHA-256: `30d388facd95070f46e4daf791ddef96009d4838339c7b946e5a53c03f88586b`.
- Exact delivery Git SHA will be recorded in the final issue comment and `/tmp/galileo-26-author-final.md` immediately after the local content commit. The article hash links the build evidence to that committed content.
- Frontmatter `published: true` makes the candidate available in the local production-mode build for metadata and browser checks. It is not publication status or authority to merge. The carnet remains `[rédigé]`. The 7 September GO is not applicable.

## Reader benefit and distinct function

The reader can set an acceptance scope, run four comparable adverse-condition trials and retain a blank decision sheet. Tests cover replay, physical transplantation, replacement of checked material and supplier exit. The fictional case makes a scope decision before any trial result exists.

Chanel (2 September) teaches identifier/identity and NFC/transplant risk. Repair (7 September) provides the workshop-history record. This article supplies the missing supplier acceptance protocol, not those earlier deliverables. The SMX 31 August event supports the documented consecutive-axis exception; it is not described as September news.

## Commands actually executed and results

From `website/`:

```sh
npm ci
npm run lint
npm run build
```

All exit 0; logs in `gates/npm-ci.log`, `gates/npm-lint.log`, `gates/npm-build.log`. Lint and build were replayed after the final SVG spacing change, both exit 0. No dependency file changes. `npm ci` reports one moderate vulnerability in the existing locked dependencies, not the older seven-vulnerability snapshot in AGENTS.md. No audit fix attempted.

From the worktree root:

```sh
python3 website/content/reviews/2026-09-08-material-marker-or-chip-dpp-binding/gates/check-render.py
/Users/pierrebeunardeau/.agents/skills/concurrency-preflight/references/preflight.sh
git diff --check
```

- Read-only built-HTML check exits 0, result in `gates/render-check.json`. Uses installed Python BeautifulSoup and website's gray-matter. It launches no browser or server.
- Checker initially assumed flat JSON-LD; inspected actual output, corrected the checker to read the existing `@graph`, then passed. This was a checker assumption, not a site metadata defect.
- A first SVG spacing edit used a root-relative path from `website/` and did not apply. Corrected from the worktree root, then replayed lint/build. Final source hash above is the checked version.
- Full staged whitespace check flags trailing whitespace in unchanged raw source archives. Those bytes are intentionally preserved to retain supplied SHA-256 provenance. The scoped check of authored MDX, carnet, report and checker passes; raw evidence is not reformatted.
- Preflight WARN: new branch without upstream, plus explicitly owned candidate files. No upstream attached; no `main` modification. Full precommit output is in `gates/precommit.log`.

## Evidence status

- PASS: actual Trends US/GB/FR and News US/GB feeds, dates, titles and hashes in `watch/`. Exact News query had zero results, broader query found SMX syndication; no relevant Trends overlap or growth claim.
- PASS: three official sources opened/read, supplied archive hashes verified, provenance preserved. See `citations.md` and `sources/verification.json`. SMX remains supplier-attributed; NXP exports remain explicitly partial text, direct GET 404 documented. No supplier trials or independent performance result claimed.
- PASS: direct answer, four proposed trials, blank observations, conditional decisions, fictional example identified before narrative, identical visible/frontmatter/JSON-LD FAQ, `/docs` CTA.
- PASS: title 50 characters, description 138; canonical, article OG/Twitter hero, BlogPosting, BreadcrumbList and FAQPage; sitemap, robots, llms and llms-full output; built internal-link targets.
- PASS: unchanged native hero, 1200x630, 71,074 bytes and supplied SHA, final JPEG inspected by author via view_image. Prompt and coordinator provenance archived.
- PASS, structural only: SVG is retained in compiled HTML with role/title/desc, static width classes, system-ui and short text lines. Vertical 320x600 viewBox; `max-w-sm` caps enlargement. These checks are not font measurements.
- UNVERIFIED by author: actual SVG text bounds, >=12px four-edge margins, readability/clipping at 1440/390, console and served article UAT. Explicitly assigned to coordinator on reserved uat1/9301, server 8473. Author launched neither browser nor server.
- PENDING, coordinator-owned: two fresh independent reviews at delivery SHA, DRAFT PR. No author-created review opinions or approval records.

## Build warnings and limits

Build succeeds. Existing code emits Edge Runtime deprecation and dynamic filesystem tracing warnings in `src/lib/specifications.ts`; existing older articles emit long-sentence warnings. No long-sentence warning names this new article. Those files and package-lock are unchanged from base. No claim that a baseline build was replayed; no gate failed requiring baseline reproduction.

No production or preview checks were run or claimed. Source HTML archives are evidence files, not content injected into the article. Local build output is not committed. The final issue handoff freezes the author delivery; subsequent review/UAT belongs to the coordinator.
