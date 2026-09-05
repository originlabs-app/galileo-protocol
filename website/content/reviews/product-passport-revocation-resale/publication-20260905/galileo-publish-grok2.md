**Verdict: PASS**  
**Commit:** `57f8c1688d4fd8aa36881c918994900b5e396258`  
**Scope:** `AGENTS.md`, `website/content/blog/2026-09-05-product-passport-revocation-resale.mdx`, `website/content/reviews/product-passport-revocation-resale/{citations.md,w3c-excerpt.txt,gs1-excerpt.txt}`, cover JPEG, committed SVG renders. Live sources, lint/build, and HTML/JSON-LD were not replayed.

---

### Quote exactness — W3C
PASS. The only W3C quotation is the 16-word span at article line 43:

`is about the verifiable credential itself and might not apply to any underlying or backing credential`

That string is a contiguous substring of `w3c-excerpt.txt` (section 1.1, 15 May 2025) and matches `citations.md`. Surrounding claims are scoped: Recommendation date, degree example, and “this application is our analysis” are not presented as extra verbatim.

### Quote exactness — GS1
PASS. The only GS1 quotation at line 86:

`Note that revocation checks should be done online.`

matches `gs1-excerpt.txt` (`Exact excerpt`) and `citations.md`. The article limits it to the DigSig workflow on printed page 35 (January 2026 / release 1.1.0).

### Certificate / object distinction
PASS. Lead, W3C application, recommended desk line, three-box diagram, worked case, and FAQ Q1 all keep revocation on the credential and leave authenticity, ownership, and condition as separate evidence. The cover (bag vs separate glass certificate) matches that split. “Passport” is used for the digital record/interface, not the physical item.

### FAQ
PASS. Four frontmatter Q/A pairs are byte-identical to the body FAQ. None assert a press claim or an unverified primary-source fact. Modal language (“may reflect”) matches the body’s possible-scenario framing.

### Metadata
PASS against the AGENTS contract.

| Field | Value | Gate |
|---|---|---|
| title | 51 chars | 45–60 |
| description / excerpt | 147 chars, identical | 120–158 |
| date / modified | 2026-09-05 | matches filename; `modified >= date` |
| slug | kebab-case | `2026-09-05-product-passport-revocation-resale` |
| author / published / tags / cover / faq | complete | required fields present |

Direct answer is the first two sentences, before the first H2. CTA points to `/docs`. No em dash.

### Links
Internal targets exist in this tree:

- `/blog/2026-09-02-chanel-serial-code-not-identity`
- `/blog/2026-08-30-fpjourne-secondary-market-portable-proof`
- `/docs`

External URLs are well-formed primary-source links (W3C VC DM 2.0, Bitstring §1.1 and privacy section, GS1 Digital Signatures, RFC 9111). Live HTTP was not fetched.

### Visual contract
PASS.

- Cover `website/public/images/blog/product-passport-revocation-resale.jpg`: JPEG, **1200×630**, **94 120 bytes** (≤ 150 KB), path matches frontmatter.
- Inspection: dark canvas, cyan edge light, bag and certificate separated; no letters, numbers, flags, or logos visible in the pixels.
- Body visual: inline SVG with brand colours (`#000810`, `#22D3EE`). Committed desktop and mobile renders show all labels inside the boxes; no overflow observed.
- `coverImageAlt` matches the cover.

---

### Non-blocking notes (do not change the verdict)
- `citations.md` header capture time is the GS1 stamp (`2026-09-05T07:08:42Z`); the W3C recapture time is only in `w3c-excerpt.txt` (`10:37:49Z`).
- `w3c-excerpt.txt` concatenates heading and body and wraps a space before the comma; the article quote does not inherit that artefact.
- Two SVG lines are 36–37 characters (`Too old or missing? Hold and refresh.`, `Assess the physical item separately.`) against the 35-character preference; both are well under the 50-character hard stop, and the renders do not clip.
- Description/excerpt omits the lead’s “by itself” (`does not prove a fake` vs `does not, by itself, prove … counterfeit`).
- Privacy and RFC 9111 remarks are paraphrases with links, not archived quotations.

**Gates not replayed here:** `cd website && npm run lint && npm run build`, and the built HTML (canonical, `og:type=article`, BlogPosting / BreadcrumbList / FAQPage).
