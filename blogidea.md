# blogidea.md — Galileo Protocol (galileoprotocol.io)

Idea log for the blog. Every brainstormed idea lands here before drafting.
Workflow: `idea` → `selected` → `drafted` (website/content/blog/) → `published` (add date).
See AGENTS.md for the frontmatter and editorial contract.
Editorial line: four axes (protocol & infra, tokenization/RWA, counterfeiting & provenance, DPP & luxury regulation) — see the "Editorial line" section in AGENTS.md. DPP is one axis, not the whole line; allocate brainstorms to the least-served axis first (currently: tokenization/RWA).
Before every brainstorm, run the news watch (below) and log the session as a dated section.

## News watch

Decision rules and commands: the "News watch (ideation)" section in `AGENTS.md`. Trends and News are ideation signals, never sources; "no relevant signal" is a valid outcome.

Google News queries (EN, US/GB): `digital product passport`, `luxury blockchain`, `RWA tokenization`, `MiCA regulation`, `luxury counterfeiting`, `ESPR`.

Journal of a watch session (dated "Brainstorm of …" section): queries run, signals evaluated (signal URL, kept / dismissed and why), editorial gap identified, primary source found. No copying of titles or wordings into the article.

Idea format:

```
### [status] Working title
- **Angle**: 2-3 sentences.
- **Sources / trigger**: links, news date.
- **Why now**: opportunity window.
```

---

## Brainstorm of 28 August 2026 (Trends × News watch)

Status note: the four drafted articles of 25-27/08 (EU DPP registry, MiCA transitional period, LVMH DPP strategy, CBP Louisville) were published 27/08/2026. They are not re-proposed.

Queries run: Google Trends RSS geo=US, geo=GB, geo=FR, geo=DE; Google News RSS (hl=en-US, gl=US, ceid=US:en) for the domain queries. Reddit searches (site:reddit.com) returned nothing today — zero social signal, not "nothing exists". X connector not authenticated, no X citations.

Trends × News crossing: no usable overlap — FR trends = Dassault Rafale (out of scope), DE = germanwings 2015 trial and generic hacker noise.

Signals evaluated:

- Tod's launches a Digital Product Passport for the Gommino with Renoon (WWD, 28/08/2026) — KEPT as new idea below. Correction vs the headline: the Gommino DPP is not new (Aura/Temera NFC since 03/2025, Di Bag since 11/2023); the news is the Renoon partnership. Axis note: DPP axis justified by a dated news event (balance rule); tokenization/RWA stays the next batch.
- Miami $1.7M Instagram counterfeit seizure — DISMISSED: same family as the 27/08 Louisville article, smaller; at most an enrichment of that lot.
- ESPR query polluted by the Esperion pharma ticker — no signal.

Editorial gap identified: coverage of brand DPP launches stays product-PR; nobody asks which attestation wins when one maison runs two passport stacks on the same product line. Primary sources to verify: tods.com, renoon.com, auraconsortium.com, todsgroup.com.

### [drafted] Tod's scans twice: Renoon QR vs Aura NFC — who is the source of truth when the customer scans?
- Article written: `website/content/blog/2026-08-28-tods-gommino-two-passports-renoon-aura.mdx` (main, 28/08/2026) — awaiting deploy (GO Pierre). Fact-check notes: WWD confirmed (datePublished 2026-08-28); Aura releases confirmed via their own JSON-LD dates (2023-11-20 Di Bag, 2025-03-14 My Gommino); renoon.com documents the deal NOWHERE publicly (full sitemap checked) — the article says so; todsgroup.com newsroom inaccessible (Access Denied), history corroborated via Aura releases.
- **Angle**: WWD (28/08/2026) announces a Tod's DPP for the Gommino with Renoon (materials, production, sustainability via QR). But Tod's has shipped Aura/Temera NFC passports since 2023 (Di Bag) and on the My Gommino since 03/2025. The maison now runs two DPP stacks on the same product line — the concrete case of the interoperability question the ESPR registry will force: which attestation wins, and what would an open protocol reconcile? Never write "first DPP".
- **Sources / trigger**: wwd.com (28/08/2026); primaries to verify the same day: tods.com DPP pages, renoon.com, auraconsortium.com (14/03/2025 My Gommino release), todsgroup.com newsroom.
- **Why now**: only true same-day story in the watch; a maison below conglomerate level putting the passport in the UX — complements LVMH (group strategy) and the EU registry (public infrastructure).

---

## Brainstorm of 27 August 2026 (Trends × News watch)

Queries run: Google Trends RSS geo=US, geo=GB, geo=FR; Google News RSS (hl=en-US, gl=US, ceid=US:en) for `digital product passport`, `luxury blockchain`, `RWA tokenization`, `MiCA regulation`, `luxury counterfeiting`, `ESPR`.

Trends × News crossing: no overlap — US trends are sports betting and consumer media, GB sports/entertainment, FR domestic politics. All signals below come from the News feed alone.

Signals evaluated:

- Aura Blockchain Consortium leadership coverage (WebWire, Luxus Plus, Business of Fashion, Vogue) — DISMISSED: primary-source check shows the appointments are not fresh (CEO Marcel Härtlein announced 08/01/2026, chairman Stefano Rosso 28/04/2026 on auraconsortium.com). The story is a resurfacing, and Aura's strategy is already covered by the 26/08 drafted LVMH DPP article.
- EU DPP registry follow-ups (EU NEIGHBOURS east, Euroconsumers, Open Access Government) — DISMISSED: same registry story already covered by the 25/08 drafted article `2026-08-25-eu-dpp-registry-live.mdx`.
- Forrester report on DPPs as customer-engagement channel — DISMISSED: analyst content, evergreen, no dated news event.
- UN ESCAP publication on DPPs for cross-border trade — DISMISSED: trade-facilitation angle, not luxury-specific.
- SealTrust DPP product launch (Packaging Europe) — DISMISSED: vendor PR; SealTrust is already cited in the counterfeiting idea below.
- World Liberty Financial USD1 stablecoin on Canton Network (Business Wire) and RWA market rally pieces (BeInCrypto, Yellow.com) — DISMISSED: institutional crypto-finance angle already covered by the existing RWA idea; weak sources for the rally figures.
- Germany reaches 79 MiCA licences (Cryptonews) — DISMISSED: banking/CASP tally, and MiCA transitional period already covered by the 25/08 drafted article.
- Lexology deep dive on finalised ESPR requirements for unsold consumer products + Ellen MacArthur Foundation position on ESPR textile performance requirements — DISMISSED as new idea, KEPT as enrichment: the delegated/implementing acts behind the destruction ban were adopted 09/02/2026; feed their details (derogations, disclosure format) into the existing idea "The ESPR destruction ban is now enforceable" when drafted.
- WIRED investigation buying a $500 counterfeit luxury watch that defeated expert inspection — DISMISSED as new idea, KEPT as enrichment: confirms the exact thesis of the existing idea "$467 billion of counterfeiting: why visual authentication is dead"; add as a dated 2026 reference (WIRED watches section, indexed 07/2026) when drafted.
- Louisville CBP counterfeit watch seizure series (WLKY local coverage) — KEPT as new idea below. The local TV figure ($1.25B) could not be confirmed; the primary sources (cbp.gov) confirm a real, escalating series worth ~$125M over June-August 2026.

Editorial gap identified: seizure coverage stays episodic local news — nobody aggregates the port-level escalation into what it means for watch and jewelry maisons' authentication infrastructure. Primary sources found: three cbp.gov newsroom releases (see idea below).

### [drafted] One port, one summer, $125M in fake Swiss watches: border enforcement cannot keep up
- Article written: `website/content/blog/2026-08-27-cbp-louisville-fake-watches-border-enforcement.mdx` (main, 27/08/2026) — awaiting deploy (GO Pierre). The "$1.25B" figure appears in the 07/08 CBP release itself but contradicts its own per-seizure numbers ($125M total, exact 10x factor); the article treats it as "reported, unverified — likely a typo that travelled".
- **Angle**: Louisville CBP intercepted three major counterfeit watch shipments in three months — $54M (June), $28M (July), $43M (August, 875 fake Audemars Piguet across June-July). Even successful enforcement is a rounding error against the flow; item-level verifiable identity shifts authentication from overloaded inspectors to the product itself.
- **Sources / trigger**: cbp.gov national media releases 30/06/2026, 17/07/2026, 07/08/2026 (cbp.gov/newsroom) — figures to be re-verified against the releases before drafting.
- **Why now**: three confirmed seizures in a single summer at a single US port, concentrated on high-end Swiss references; fresh, dated, and directly maps to verifiable product identity as structural fix.

---

## Brainstorm of 26 August 2026 (market signals / ESPR enforcement)

### [drafted] LVMH's DPP Strategy in Writing: The Signal Luxury Awaited
- Article written: `website/content/blog/2026-08-26-lvmh-dpp-strategy.mdx` — awaiting deploy (GO Pierre).
- Fact-check note: the rumoured "10 August 2026 officialisation" could NOT be verified — the LVMH DPP page predates 2026 (content references 2024 deployment). Article written as an analysis piece on the documented strategy (lvmh.com DPP page, DPP Factory via La Tribune 30/06/2025 partner content, Aura CEO interview Journal du Luxe 17/06/2026: 50+ brands, 80M+ products), with an explicit limits section. Distinct from 2026-08-25-eu-dpp-registry-live.mdx (that one = EU registry/standards; this one = market signal from the luxury leader).

### [drafted] The ESPR destruction ban is now enforceable: what luxury must disclose
- Article written: `website/content/blog/2026-08-29-espr-destruction-ban-luxury-disclosure.mdx` (29/08/2026) — awaiting deploy (GO Pierre).
- Fact-check corrections vs the original idea: the disclosure obligation is **Article 24**, not Article 29, and it has been in force since 18 July 2024 (first disclosure covers the first full financial year in force — FY 2025 for calendar-year groups, published in 2026). What applies from 19 July 2026 is the Article 25 prohibition. Key luxury hook confirmed on EUR-Lex: Article 24 disclosure covers ALL consumer products (watches/jewelry in scope), while the Article 25 ban covers only Annex VII apparel/accessories/footwear.
- Verified primary sources: EUR-Lex Reg. (EU) 2024/1781 arts. 23-26 + Annex VII (CELEX 32024R1781); Commission Delegated Regulation (EU) 2026/296 of 09/02/2026 (CELEX 32026R0296, OJ 22/04/2026 — ten derogations, 5-year documentation, applies 19/07/2026); Commission Implementing Regulation (EU) 2026/2 of 09/02/2026 (CELEX 32026R0002, OJ 10/02/2026 — Annex I standardised format, applies 02/03/2027); Commission ESPR page (09/02/2026 adoption timeline entry); Commission news 17/07/2026 (environment.ec.europa.eu — application from 19/07, EEA 4-9% / 264k-594k tonnes estimate).
- News watch of 29/08/2026 (run before drafting, per AGENTS.md): Google Trends geo=US — sports/entertainment only, no domain overlap. Google News `ESPR destruction unsold` — heavy generalist coverage of the 19/07 application (environment.ec.europa.eu, Linklaters, Freshfields, Lexology, Earth.Org, Fibre2Fashion); the editorial gap is the luxury-specific reading (Article 24 scope beyond textiles + brand-equity cost of public discard numbers), which the article takes.
- Editorial review of 29/08/2026 (HOLD, then corrected same day, all four points re-verified against the primary texts): (1) Article 26 consolidates per product group, not per company — "EU-level league table" removed; (2) comparability caveats added wherever implied — the common format of Implementing Regulation (EU) 2026/2 applies only from 02/03/2027, earlier disclosures are free-form and not directly comparable; (3) "discount — always legal" replaced by "not prohibited by Article 25, other applicable law still applies" (table + SVG + aria-label); (4) the 5-year documentation claim scoped to derogation-based destructions only (Delegated Regulation (EU) 2026/296 art. 3). Gates re-run green after the fixes.
- **Angle**: Article 24 ESPR (public disclosure of discarded unsold products — all consumer products) alongside the Article 25 ban on destroying unsold textiles/footwear applicable since 19 July 2026 for large enterprises. The board-level question: destroy, discount, or channel to certified resale — and what the public disclosure of volumes destroyed does to brand equity.
- **Sources**: EUR-Lex Regulation (EU) 2024/1781 (arts. 23-26, Annex VII), Delegated Regulation (EU) 2026/296, Implementing Regulation (EU) 2026/2, Commission ESPR page, Commission news 17/07/2026.
- **Why now**: the first Article 24 disclosure cycle (FY 2025, published 2026) makes destroyed volumes public; the derogations and format acts of 09/02/2026 are in force/applicable; Commission consolidated publication due by 19/07/2027.

### [idea] 30,000 smuggled diamonds: Vietnam's scandal is a provenance failure
- **Angle**: PNJ (Phu Nhuan Jewelry) scandal — ~30,000 smuggled diamonds, ~$57M, stock down ~19.5% — as a documentary provenance crisis in jewelry. When provenance lives in paper and ERP entries, fraud scales; verifiable, item-level provenance records are the structural fix.
- **Sources**: press coverage of the PNJ case (August 2026) — to be re-verified against primary sources before drafting.
- **Why now**: fresh scandal, directly maps to the value of verifiable provenance infrastructure.

### Note on existing idea "From Treasury bills to handbags: RWA tokenization leaves finance"
- Enrich rather than create a dedicated article: add Bitcoin back above $80k (Reuters, 25/08/2026) to the market-context paragraph when this idea is selected for drafting.

---

## Brainstorm of 25 August 2026 (RWA / DPP watch)

### [drafted] The EU Digital Product Passport registry is live: what luxury brands must do now
- Article written: `website/content/blog/2026-08-25-eu-dpp-registry-live.mdx` — awaiting deploy (GO Pierre).

### [drafted] End of the MiCA transitional period: RWA tokenization leaves the grey zone
- Article written: `website/content/blog/2026-08-25-mica-transitional-period-rwa.mdx` — awaiting deploy (GO Pierre).

### [idea] $467 billion of counterfeiting: why visual authentication is dead (and what replaces it)
- **Angle**: "super-fakes" make eye-based expertise unreliable; verifiable product identity becomes a legal requirement via the EU DPP. Problem-first, then Galileo's verifiable-proof approach (NFC/QR scan → on-chain record).
- **Sources**: sealtrust.io (20/02/2026), magazine.luxus-plus.com (02/04/2026).
- **Why now**: fresh 2026 figures + DPP regulatory convergence; great short LinkedIn format.

### [idea] From Treasury bills to handbags: RWA tokenization leaves finance
- **Angle**: 2026 RWA news is dominated by BlackRock, Nasdaq, Securitize — but the least-served segment is non-financial physical assets (luxury, art, collectibles). Position Galileo on this "missing middle".
- **Sources**: stobox.io/reports/state-of-rwa-2026, cryptonaute.fr (22/12/2025).
- **Why now**: institutional RWA euphoria (July 2026) creates media appetite for differentiated angles.

### [idea] ERC-3643, ERC-7943, W3C DID: why standards will decide the winners of tokenization
- **Angle**: ERC-7943 finalized in May 2026; ecosystem converging on open standards. Why Galileo's open-standards choice (ERC-3643, W3C DID, GS1 EPCIS) is a strategic edge vs. proprietary luxury consortium silos.
- **Sources**: stobox.io/reports/state-of-rwa-2026 (ERC-7943, May 2026), galileoprotocol.io.
- **Why now**: ERC-7943 finalization is fresh; expert-level topic that builds founder credibility on LinkedIn.
