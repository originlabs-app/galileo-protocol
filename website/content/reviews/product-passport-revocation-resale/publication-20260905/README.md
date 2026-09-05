# Publication on 5 September 2026

- Article PR: https://github.com/originlabs-app/galileo-protocol/pull/16
- Reviewed article SHA: 57f8c1688d4fd8aa36881c918994900b5e396258. Fresh Codex and Cursor Grok PASS are copied here and posted as separate PR comments.
- Merge commit: f0128d4d6daf64d40a2743238286e15e9eb130eb.
- Website CI: PASS run 33961250412 job 101293399475. Lighthouse finished success (its preview wait is nonblocking); the explicit Chrome preview evidence is separate.
- Website Vercel production deployment: 8DfFGecBY28XkFHzsVQpdS32qb1D, READY.
- Production: https://www.galileoprotocol.io/blog/2026-09-05-product-passport-revocation-resale
- curl returned 200 with the corrected W3C excerpt marker. Chrome desktop 1440 and mobile 390 returned 200, no page errors/overflow, canonical and BlogPosting/BreadcrumbList/FAQPage correct, /docs CTA navigated successfully. See timestamped JSON and screenshots.
- The first proposed complete W3C quotation in the user audit combined a note heading and sentence fragment. Fresh review caught this; the final article uses one contiguous source excerpt and the full note is archived.
- Inherited apps/contracts CI failures occur in the same steps on base ef3ec753 (run 33847308404) and candidate. No changes to those surfaces. npm dependency debt is tracked separately in #15.
- Rollback recorded before merge in PR body: revert the article merge, redeploy website, verify prior listing and article absence. No data or contract mutation.
