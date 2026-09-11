# Visual handoff

The coordinator supplied the native cover. The author inspected and integrated it, then authored the inline SVG. Both now render in the article. The prompt and draft labels below preserve the initial proposal; actual output and final checks are recorded here, in `cover-inspection.json` and in `LOCAL-UAT.md`.

- Actual cover: black leather handbag, blank identity tag, two archive cubes and cyan light. JPEG 1200x630, 64,128 bytes.
- Exact integrated alt: `A black leather handbag with a blank identity tag sits between two transparent archive cubes connected by cyan light.`
- SVG: 560x660 viewBox, four vertical boxes, accessible title and description, static responsive classes.
- Rendered minimum text padding: 20 px desktop, 12.48 px at a 390 px viewport. Minimum measured text contrast: 12.97:1.
- Final supporting labels include `Use an independent account` and `Check permitted access`; footer: `Proposed exercise, no result claimed`.

## Native cover prompt

Create a premium editorial still-life photograph for an English article about keeping a luxury product's digital information accessible when its software provider changes. Wide composition, 1200 by 630 final crop. A carefully crafted, unbranded leather travel case on a dark obsidian surface, with a small blank ceramic identity tab attached to it. Behind it, two separate elegant translucent archival enclosures, one softly fading into shadow and the other gently illuminated. A single understated cyan light path remains connected to the same identity tab while passing toward the second enclosure, suggesting a planned handover. Restrained, credible materials, fine leather texture, clean optical glass, subtle cyan bioluminescent accents using #00FFFF and #22D3EE on #000810. High-end editorial photography, quiet and practical, not a science-fiction dashboard. No people, text, letters, numbers, logos, flags, QR patterns, padlocks, chains, currency or certification badges. No implication of an official EU approval. Leave enough negative space around the case for a flexible crop. Image only, no typography.

- Planned file: `website/public/images/blog/dpp-provider-exit-v1.jpg`.
- Format: exactly 1200x630 JPEG, <=150 KB, inspect final pixels before inclusion.
- Planned frontmatter: `coverImage: "/images/blog/dpp-provider-exit-v1.jpg"`.
- Draft alt text, to be adjusted to the actual output: `An unbranded leather case stays connected to a cyan-lit record path as it moves between two separate archival enclosures.`

## Body diagram

- Place before `## Rehearse the exit before accepting the service`.
- Use one compact vertical flow, not a dense comparison grid. The diagram represents the editorial exercise and no statutory architecture.
- Four boxes: `Original product label`, `Recoverable records`, `Authorised replacement`, `Reader can reach the record`.
- Short supporting labels if room permits: `Keep its existing route`; `Meaning, files, permissions`; `Operate without the old account`; `Check access and limits`.
- Caption: `Proposed exit exercise: keep the product route, recover usable information, then test the replacement with the original account unavailable.`
- Bottom note: `Editorial method. No migration result claimed.`
- Inline SVG in brand tokens. Render desktop and at 390 px; retain at least 12 px measured padding around text. No externally generated labels or unverified regulatory dates.
