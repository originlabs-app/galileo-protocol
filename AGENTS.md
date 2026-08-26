# AGENTS.md — galileo-luxury-standard

Guidance for AI agents working in this repository.

## Production-sensitive

This repo ships to production (smart contracts, API, galileoprotocol.io). **Never `git push` or deploy without an explicit GO from Pierre.** Local builds, tests and lint may be run freely.

## Repository layout

- `apps/`, `packages/`, `contracts/` — pnpm workspaces (see `pnpm-workspace.yaml`), built with turbo.
- `specifications/` — protocol specifications consumed by the website at build time.
- `website/` — public site galileoprotocol.io (see below). **Not part of the pnpm workspace.**

## Website (`website/`)

- Stack: Next.js 16 App Router, React 19, Tailwind 4, TypeScript, SSG via `generateStaticParams`. Deployed on Vercel (`website/vercel.json`). English only.
- Build and gates (always from `website/`, with npm — not pnpm):
  ```bash
  cd website && npm ci && npm run lint && npm run build
  ```
  Both lint and build must be green before handing off.
- Blog posts live in `website/content/blog/*.mdx` and are read by `website/src/lib/blog.ts` (fs + gray-matter). Newest-first by `date`; `published: false` hides a post in production builds.

### Blog editorial workflow

Frontmatter contract (all fields unless noted):

```yaml
---
title: "..."                 # full SERP title, rendered via title.absolute (no layout suffix) — 45-60 chars, hard max 60
date: "YYYY-MM-DD"          # first publication
modified: "YYYY-MM-DD"      # optional, defaults to date — bump on every meaningful edit
author: "Pierre Beunardeau"
excerpt: "..."              # teaser shown on /blog and in llms-full.txt
description: "..."          # optional, defaults to excerpt — meta/OG description, 120-158 chars
tags: [dpp, espr]           # lowercase list
published: true
coverImage: "/images/..."   # optional in the loader, required for new articles (see Blog visual contract); default generated OG image otherwise
coverImageAlt: "..."        # optional, only with coverImage
faq:                        # optional, drives FAQPage JSON-LD — keep empty if none
  - question: "..."
    answer: "..."
---
```

Editorial contract for every article:

1. **Direct answer in the first 2 sentences**, before the first H2 — extractable as-is by a search engine or LLM.
2. **Primary sources linked inline** (EUR-Lex, ec.europa.eu, CEN-CENELEC, standard bodies) — verify every fact and date before publishing; reformulate cautiously anything unverifiable.
3. **FAQ section** mirrored in the `faq` frontmatter (the frontmatter is the source of truth for FAQPage JSON-LD).
4. **CTA** at the end pointing to `/docs` and/or contact.

Publication checklist:

- [ ] Frontmatter complete (see contract above), `date` matches the filename prefix.
- [ ] Build gates on frontmatter (enforced by `src/lib/blog.ts`, build fails on violation): all required fields present, `title` 45-60 chars (it is the full SERP title, rendered via `title.absolute` without the layout template suffix), `description` 120-158 chars (or `excerpt` in that range when used as fallback), `date`/`modified` ISO with `modified >= date`, kebab-case filename slug, well-formed `faq`.
- [ ] Facts and dates verified against primary sources, linked inline.
- [ ] Direct answer present in the first 2 sentences.
- [ ] `cd website && npm run lint && npm run build` green.
- [ ] Spot-check the built article HTML: canonical, `og:type=article`, JSON-LD BlogPosting/BreadcrumbList (+ FAQPage if faq).
- [ ] `/sitemap.xml`, `/robots.txt`, `/llms.txt`, `/llms-full.txt` regenerated (automatic at build).

### News watch (ideation)

Ideation signals only — never sources. Run before every brainstorm and every article, even when the topic is already set. "No relevant signal" is a valid outcome: an evergreen or regulatory article is never forced into the news cycle. Geography: US/GB (English-speaking market) and EU (`geo=FR` for the French luxury ecosystem). Domain queries and the session journal live in `blogidea.md`.

1. **Google Trends** (`geo=US`, also `geo=GB` / `geo=FR`):

   ```bash
   curl -s "https://trends.google.com/trending/rss?geo=US" \
     | sed 's/</\n</g' \
     | awk '/^<item>$/{f=1;next} f && /^<title>/{sub(/^<title>/,"");print;f=0}'
   ```

2. **Google News RSS**, URL-encoded query — domain keyword or exact article subject (`hl/gl/ceid` = `en-US/US/US:en`, also `en-GB/GB/GB:en`):

   ```bash
   curl -sG "https://news.google.com/rss/search" \
     --data-urlencode "q=<subject>" --data-urlencode "hl=en-US" \
     --data-urlencode "gl=US" --data-urlencode "ceid=US:en" \
     | sed 's/</\n</g' \
     | awk '/^<item>$/{f=1;next} f && /^<title>/{sub(/^<title>/,"");print;f=0}'
   ```

3. **Cross the two feeds**: a trending topic overlapping a domain keyword is a signal to evaluate against business relevance and search intent. Reading already-published coverage serves to spot the editorial gap and differentiate — never reuse a title or wording, always an original contribution.
4. **Journal** the session in `blogidea.md` (date, queries, signals evaluated, gap identified, primary source found). Verify any retained news item against its primary source the same day — never draft on an unconfirmed claim.

### Blog visual contract

Every new article ships with visuals, generated with a native image-generation tool (`image_gen`/`$imagegen` via an agent CLI — never a stock photo, never a hand-drawn placeholder):

- [ ] **Cover image** referenced by the `coverImage` frontmatter field: JPEG, exactly 1200×630, ≤ 150 KB, stored in `website/public/images/blog/` and served from `/images/blog/`. Used as OG/Twitter image and as the article hero. `src/lib/blog.ts` fails the build if the file is missing or overweight.
- [ ] **At least one body visual** per article; prefer inline SVG for anything data-driven (timelines, grids, comparisons) so it stays crisp and token-consistent.
- [ ] **No text, letters, numbers or logos baked into generated images** (hallucinated glyphs are a factual-error risk). Text lives in the article, not in the pixels.
- [ ] **Style derived from the brand tokens** (`website/src/app/globals.css`): dark obsidian canvas (`#000810`), cyan bioluminescent accents (`#00FFFF`/`#22D3EE`), editorial photo or premium tech-noir illustration. Avoid literal flags and cliché stock metaphors.
- [ ] Inspect every final image before committing; regenerate on any artefact, off-topic content or embedded text.

### SEO/GEO harness (do not regress)

- `src/lib/blog.ts` validates frontmatter strictly (build fails on missing required fields, non-ISO or incoherent dates, non-kebab slug, out-of-range title/description, malformed faq); defaults only for optional fields: `modified = date`, `description = excerpt`, `faq = []`.
- `src/app/blog/[slug]/page.tsx` renders the frontmatter `title` as the full SERP title via `title.absolute` (root layout template bypassed, brand kept via `openGraph.siteName`) and emits BlogPosting + BreadcrumbList (+ FAQPage) JSON-LD and article OG metas.
- `src/app/sitemap.ts` enumerates all routes including every `/docs/*` and `/specifications/*` page.
- `src/app/robots.ts` explicitly allows the main AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, …).
- `src/app/llms.txt/route.ts` and `src/app/llms-full.txt/route.ts` (`force-static`) are generated from `src/lib/llms.ts` — update `MAIN_PAGES` there when adding a main page.

### Known debt

- **Canonicals**: an external audit (2026-08) found 83 of 96 canonical URLs inconsistent with the sitemap. This is pre-existing debt on non-blog pages (blog pages are clean). Deliberately not fixed yet — to be handled by a dedicated future lot.
- **Dependencies (2026-08-25, dedicated security batch required)**: `npm audit` in `website/` reports 7 vulnerabilities (1 low, 6 high). Not introduced by the blog/SEO commits; do not fix inside blog/SEO work.
