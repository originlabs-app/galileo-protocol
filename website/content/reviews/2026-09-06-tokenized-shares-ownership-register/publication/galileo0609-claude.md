**VERDICT: PASS** for a17f7b4e026a8f99d41591add936addd7e11b79d.

The SHA was confirmed from the worktree HEAD ref file, which points at the branch and resolves to that exact hash.

**Verified against live SEC sources**

- **Status remains proposal.** The live docket page for S7-2026-30 shows Rule Type "Proposed", release 34-106246, SEC Issue Date Sept. 1, 2026, no adopting release. The PDF cover reads "ACTION: Proposed rule."
- **Quotation is exact.** Printed page 84 of the live PDF reads "The master securityholder file is the authoritative record of who owns an issuer's securities." The article's blockquote, attribution and page reference match. The surrounding text confirms the article's gloss that it is the list "recognized by the issuer as the official list of record owners."
- **Question 83 is on printed page 140** and is a request for comment, as the article states. Its own wording places holder name and address in offchain records, which supports the article's identity boundary. One minor drift: the body says the question "asks how blockchain records could link", whereas the question asks whether the proposed rules adequately facilitate systems that associate onchain and offchain records. The FAQ wording is accurate. Non-blocking.

**Registered versus beneficial owner.** Both investor.gov pages returned HTTP 403 to my fetches, so I relied on the repo captures taken 6 September at 08:09 UTC plus a search-engine snippet of the tokenized-securities page. The captures match the article: registered owner holds directly with the company, beneficial owner holds through a bank or broker-dealer, synthetic tokens give no claims against the referenced issuer. The staff disclaimer is correctly reflected in the sources section.

**Metadata, FAQ, links, visuals**

- Title is 51 characters, description 144, date matches the filename, tags lowercase, no `modified` field (optional).
- The four FAQ entries in frontmatter match the body headings and answers word for word.
- Both internal links resolve to existing posts, and the CTA points to `/docs`.
- Cover image exists, is text-free, uses the brand palette, and renders at 1200×630 proportions. Diagram captures at 390 px and 1440 px show no overflow and comply with the SVG layout rules.
- Citations archive records the verbatim, author, date, URL, location and a readable text export with a capture timestamp.
- Archived build log shows no long-sentence warnings for this file. Previous article (5 September) is on the DPP axis, so the axis balance rule holds.

**Limits**

- No shell access: I could not measure the cover file size in bytes or recompute the article hash recorded in the checks file. The loader enforces the 150 KB cap and the archived build passed, but I did not replay the build.
- Investor.gov live pages were not directly readable by me today; verification rests on the same-day captures.
- The archived build and browser logs were produced by the author and are not tied by me to this exact SHA.

Sources: [SEC docket S7-2026-30](https://www.sec.gov/rules-regulations/2026/09/s7-2026-30), [SEC release 34-106246 PDF](https://www.sec.gov/files/rules/proposed/2026/34-106246.pdf), [Investor.gov tokenized securities](https://www.investor.gov/introduction-investing/investing-basics/investment-products/tokenized-securities), [Investor.gov registered and beneficial owners](https://www.investor.gov/what-registered-owner-what-beneficial-owner)