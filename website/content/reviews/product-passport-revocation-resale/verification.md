# Local author verification, 5 September 2026

Issue: https://github.com/originlabs-app/galileo-protocol/issues/14
Base: ef3ec753af4911a446a87fa7207d45941d4d8fd3 (origin/main)
Branch: blog/2026-09-05-revocation
Watch-only commit: 4491fdd

## Scope and source review

Article: `website/content/blog/2026-09-05-product-passport-revocation-resale.mdx`.
New infrastructure decision guide, not another Chanel copying explainer, MiCA notice or Beezie news article. Fictional consignment example is explicitly labelled. No assertion of Galileo feature readiness or new DPP obligation. Four primary documents read on 5 September: W3C Bitstring Status List 1.0 (2025 Recommendation), W3C VC Data Model 2.0, GS1 Digital Signatures guideline 1.1.0 (January 2026), RFC 9111 (HTTP Caching). Two institutional quotations archived separately, seven words W3C and eight words GS1. No social-source quotation or social claim used as factual evidence.

## Terminal gates

- npm ci: PASS, exit 0. Existing lockfile preserved.
- npm run lint: PASS, exit 0; `lint.log`.
- npm run build: PASS, exit 0; `build.log`. No warning for this article. Existing corpus long-sentence warnings and two project-wide filesystem-tracing warnings remain.
- npm audit: FAIL, one moderate transitive development dependency `@humanfs/node` advisory GHSA-p498-v437-472g. Lockfile and manifests unchanged from base; remediation outside this editorial issue. No claim of a clean security audit.
- Frontmatter: title 51 characters, description 147, all four FAQ answers exactly mirrored in prose.
- Cover JPEG: 1200 by 630, 94,120 bytes, generated and inspected without baked text or logo.
- No em dash in new article. Existing older corpus unchanged.

## Browser evidence

Production build served locally at http://localhost:4315 using next start. Dedicated isolated Chrome DevTools context `galileo-revocation`.

- Desktop 1280x900: title, author, date and cover rendered, document scroll width exactly 1280. `desktop.png`.
- Mobile device emulation 390x844 at device pixel ratio 1: innerWidth and document scrollWidth both exactly 390. `mobile-390.png`. A preliminary desktop resize stopped at Chrome's 500px minimum and is not counted as the mobile test.
- SVG actual rendered bounds at 390: x24, width342, height285. Text measured with real browser font, maximum line width about254 SVG units within448-unit boxes. `svg-mobile-390.png` inspected, no overlap or clipping. `svg-desktop.png` standalone Chrome render also inspected.
- Article canonical: https://www.galileoprotocol.io/blog/2026-09-05-product-passport-revocation-resale . OG type article. JSON-LD graph includes BlogPosting, BreadcrumbList, FAQPage (alongside existing Organization/WebSite).
- Console error and warning list empty on article.
- Cover complete, natural width1200. Three internal links resolve; CTA clicked in browser, location changed to /docs with H1 Introduction to Galileo.
- Sitemap, robots, llms.txt, llms-full.txt all HTTP200 locally. Article slug present in sitemap and both llms files.
- Local server intentionally stopped after verification. This is local rendering evidence, not production UAT or independent review.

## Visual generation

Built-in image_gen used. Original output retained at /Users/pierrebeunardeau/.codex/generated_images/01a07060-c4a4-70a1-b2c1-21038df5281c/exec-797a9f45-a029-4c19-80e4-81bf9ba8af07.png . Encoded with macOS sips to contract JPEG dimensions and size; original preserved.

Prompt: Use case: stylized-concept. Generate a premium editorial cover for Galileo Protocol article about revocation of luxury product credentials. Wide 1200x630 composition. A pristine unbranded sculptural black leather handbag on an obsidian #000810 studio pedestal; separate translucent glass certificate slab beside it with one subtle amber interrupted ring and cyan #00FFFF edge lighting. The bag remains clearly intact and valuable while the separate digital certificate is uncertain. Premium photoreal tech-noir, carefully crafted tactile materials, restrained composition, generous dark negative space. Absolutely no text, letters, digits, logos, watermarks, UI labels or readable markings anywhere. Save final generated image for project use.

## Remaining gates

Independent fresh review and any resulting corrections are not performed by the author. No push, merge, deployment or publication occurred. `published: true` is the article's ready-to-render frontmatter and does not mean this local branch is deployed.
