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
coverImage: "/images/..."   # optional — OG/Twitter image; default generated OG image otherwise
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

### SEO/GEO harness (do not regress)

- `src/lib/blog.ts` validates frontmatter strictly (build fails on missing required fields, non-ISO or incoherent dates, non-kebab slug, out-of-range title/description, malformed faq); defaults only for optional fields: `modified = date`, `description = excerpt`, `faq = []`.
- `src/app/blog/[slug]/page.tsx` renders the frontmatter `title` as the full SERP title via `title.absolute` (root layout template bypassed, brand kept via `openGraph.siteName`) and emits BlogPosting + BreadcrumbList (+ FAQPage) JSON-LD and article OG metas.
- `src/app/sitemap.ts` enumerates all routes including every `/docs/*` and `/specifications/*` page.
- `src/app/robots.ts` explicitly allows the main AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, …).
- `src/app/llms.txt/route.ts` and `src/app/llms-full.txt/route.ts` (`force-static`) are generated from `src/lib/llms.ts` — update `MAIN_PAGES` there when adding a main page.

### Known debt

- **Canonicals**: an external audit (2026-08) found 83 of 96 canonical URLs inconsistent with the sitemap. This is pre-existing debt on non-blog pages (blog pages are clean). Deliberately not fixed yet — to be handled by a dedicated future lot.
- **Dependencies (2026-08-25, dedicated security batch required)**: `npm audit` in `website/` reports 7 vulnerabilities (1 low, 6 high). Not introduced by the blog/SEO commits; do not fix inside blog/SEO work.
