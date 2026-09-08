# Source and paraphrase record

Article: `2026-09-08-material-marker-or-chip-dpp-binding`.
Author: Pierre Beunardeau. Editorial status: drafted, not published.

The article contains **no attributed verbatim quotations**. It paraphrases the three primary sources below. Short exact excerpts here are audit anchors only, not quotations presented in the article. Archives can be read locally without an origin-platform account. Capture times and SHA-256 values below reproduce the supplied provenance, which the author verified against the local files on 8 September 2026.

## SMX company update

- Corporate author: SMX (Security Matters) Public Limited.
- Original date: 31 August 2026, 08:30 EDT.
- URL: https://newsroom.smx.tech/articles/1214617/luxury-has-an-authentication-problem-smx-is-putting-the-proof-inside-the-product
- Exact audit anchor: “SMX's technology is designed to provide that continuity.”
- Capture: 2026-09-08T08:32:41.065575+00:00, public HTTPS GET, HTTP 200.
- Archive: `sources/smx-20260831.html`.
- SHA-256: `fa449540e36b795eddc375f2e32ba699c4dde573d473066ccf8c8684ff479970`.
- Article use: supplier-attributed invisible material marking and lifecycle continuity, explicitly not independent performance evidence. No marker dimensions, precision, universal chemistry, resistance or Galileo integration inferred.

## NXP product datasheet

- Corporate author: NXP Semiconductors.
- Document: NT4H2421Tx, NTAG 424 DNA TT, Product data sheet Rev. 3.0, 31 January 2019.
- URL: https://www.nxp.com/docs/en/data-sheet/NT4H2421Tx.pdf
- Exact audit anchor, section 10.1: “At delivery, NT4H2421Tx has the tag tamper feature disabled.”
- Capture 1: 2026-09-08T08:39:38.627667+00:00, partial web-tool text export, lines 1443 onward including section 9.3.
- Archive 1: `sources/nxp-web-tool-export.txt`; SHA-256 `7d171a5c586082159fee7a4cab1b73c81e3e6f9af1ff092ce0d2a5c6433f1265`.
- Capture 2: 2026-09-08T08:40:26.981303+00:00, partial web-tool text export, lines 2033 onward including section 10.
- Archive 2: `sources/nxp-web-tool-tamper-export.txt`; SHA-256 `a7a5e7b31387fb5b770f65023544caded8fe5c50974b4a40b1f8a31209892aec`.
- These are **partial text exports, not raw PDFs and not an archive of all 102 pages**. Direct public PDF GET returned 404, documented in `sources/provenance.json`. Official PDF successfully re-opened through web tool by author on 8 September; detailed sections also read in the supplied exports.
- Article use: specific SDM configuration, read-counter/server replay checks and residual risk (9.3); enablement and event-dependent wire-loop measurements (10.1-10.2). No generalisation to all NFC, whole-product authentication, guaranteed transplant detection or elimination of real-time relays. This is a historical technical reference, not a September 2026 announcement.

## ERC-3643

- Authors listed on EIP: Luc Falempin, Joachim Lebrun, Kevin Thizy, Adam Boudjemaa, Tony Malghem.
- Created: 9 July 2021; reference to the live specification is not a new September announcement.
- URL: https://eips.ethereum.org/EIPS/eip-3643
- Exact audit anchor: “Each token transfer under this standard involves a compliance check”.
- Capture: 2026-09-08T08:32:41.476246+00:00, public HTTPS GET, HTTP 200.
- Archive: `sources/erc3643.html`; SHA-256 `1d0a6e8f28b69b079e52605e3de35f6aa238afc01f0bf7986ef962f0771f982e`.
- Article use: one procurement-scope paragraph. Permissioned security-token transfers do not demonstrate portable physical verification. No ESPR obligation asserted.

## Original editorial proposal and visual

The four trials, blank acceptance sheet, conditional decisions and fictional planning case are original editorial proposals. They contain no observed supplier results or invented vendor measurements. Marker service capabilities are requests to verify, not asserted functionality. The fictional scenario is labelled at its first sentence.

The hero is supplied native image generation, concept only. `galileo-26-hero-prompt.txt` and `galileo-26-hero-provenance.json` retain the coordinator's provenance. Author also inspected the final JPEG via view_image and verified 1200x630, 71,074 bytes and the supplied SHA. No hero regeneration or replacement.

Raw watch feeds and dated titles are in `watch/`; these support ideation, not claims. Browser SVG measurement and article UAT belong to the coordinator on the reserved browser. No author browser or server was launched.
