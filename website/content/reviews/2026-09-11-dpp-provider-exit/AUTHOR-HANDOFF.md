# Author handoff

- Issue: https://github.com/originlabs-app/galileo-protocol/issues/32.
- Worktree: `.worktrees/blog-20260911-dpp-provider-exit`.
- Branch: `blog/2026-09-11-dpp-provider-exit`.
- Starting base: `a007514e7a7cd82e1d33aea3f063bf7388ae6cc7`.
- Article: `website/content/blog/2026-09-11-dpp-provider-exit.mdx`.
- Status: complete English draft, `published: false`, ready for independent editorial review and media integration.

## What the reader gets

The article develops Pierre's starting point into six supplier checks, a representative recovery trial, a concrete exit schedule and a response to an announced closure. The fictional brand's printed labels remain the thread through the decision. Exported data, existing addresses, permissions, historical evidence and operational control are treated as separate things to demonstrate.

The legal sections keep Article 11(e)'s actual economic-operator subject, avoid equating registry checks with product conformity, and treat 2027 as an indicative provider timeline. No named provider approval, real migration outcome or Galileo capability is asserted. The 8 September physical-authentication supplier trial is linked and not reproduced.

## Author verification

- `author-checks.json` records the exact article hash, word count, metadata counts and successful targeted checks.
- Markdown/MDX syntax compiled using the existing base checkout's `@mdx-js/mdx`, without installation or dependency changes.
- YAML parsed with existing `gray-matter`; title/description lengths, date order, draft visibility, nonempty tags, five exact FAQ mirrors and internal route source paths checked.
- Article contains no em dash and no attributed quotation requiring a quotation archive. Source claims and retrieval limits are in `sources.md`; applicability is in `citations.md`.
- `git diff --check` succeeded before handoff. Preflight WARN is explained by the new local branch without upstream, the parent's untracked mission, this lane's text changes, and the coordinator's newly created media. No conflicting hot file was reported.

## Remaining coordinator work

- Integrate the native cover and inline body diagram from `visual-brief.md`. The cover field was omitted while the image was absent, so the loader would not reference a missing file. A coordinator-created image appeared during the final preflight and was intentionally left outside the author's staging scope.
- Run the website's lint/build and inspect final desktop and 390 px rendering, including the diagram, canonical and FAQ output. Targeted MDX compilation is not the website build or a browser check.
- Obtain independent editorial review of the complete article. The source audit earlier in the session does not replace an independent review of the text now written by the same author.
- Keep production publication separate. The author made local text commits only, with no push, PR, merge or deployment.

The pre-existing `docs/missions/` file and coordinator-owned media remain outside the author's commits.
