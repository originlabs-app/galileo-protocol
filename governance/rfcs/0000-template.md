# RFC-XXXX: [Title]

<!--
  RFC Template for the Galileo Luxury Standard

  Instructions:
  1. Copy this file to XXXX-your-descriptive-title.md
  2. Fill in all sections below
  3. Delete these instruction comments before submitting
  4. Open a Pull Request with title "RFC: [Your Title]"

  All sections are required. If a section is not applicable,
  explain why rather than leaving it blank.
-->

- **RFC Number:** XXXX (assigned upon acceptance)
- **Title:** [Descriptive title of the proposal]
- **Author:** [Your Name (organization)]
- **Champion:** [TSC member - assigned after submission]
- **Status:** Draft
- **Created:** [YYYY-MM-DD]
- **Review Deadline:** [YYYY-MM-DD] (calculated from submission based on change type)
- **Spec Version Target:** [e.g., 1.3.0]

---

## Summary

<!--
  One paragraph explanation of the proposal. This should be a concise
  summary that someone can read to quickly understand what the RFC proposes.

  Think of this as the "elevator pitch" for your proposal.
-->

[One paragraph summary of the proposal]

## Motivation

<!--
  Why is this change needed? What problem does it solve?

  Focus on:
  - What use cases does this enable?
  - What pain points does this address?
  - Who benefits from this change?
  - What happens if we don't make this change?

  A strong motivation section is critical. RFCs without clear motivation
  are likely to be rejected or deferred.
-->

[Explain why this change is needed]

### Use Cases

[Describe specific use cases this enables]

### Pain Points Addressed

[What problems does this solve?]

## Guide-level explanation

<!--
  Explain the proposal as if teaching it to an adopter who will implement it.

  This section should:
  - Use examples and scenarios relevant to luxury goods
  - Explain concepts in plain language
  - Focus on the "what" and "how to use"
  - Avoid implementation minutiae

  Imagine you're writing documentation for someone implementing
  the Galileo Luxury Standard in their brand's systems.
-->

[Explain the proposal from an adopter's perspective]

### Example

[Provide a concrete example of how this would work]

## Reference-level explanation

<!--
  Technical specification of the proposal.

  This section should include:
  - Precise definitions and semantics
  - Edge cases and corner cases
  - Interaction with existing specification features
  - Schema changes (JSON-LD, etc.) if applicable
  - API changes if applicable

  This is where the precise technical details go. Someone should be
  able to implement the feature from this section alone.
-->

[Technical specification details]

### Schema Changes

[If applicable, show schema modifications]

```json
{
  "example": "schema"
}
```

### Interactions with Existing Features

[How does this interact with existing specification features?]

## Drawbacks

<!--
  Why should we NOT do this?

  Consider:
  - What are the costs (complexity, performance, implementation burden)?
  - What complexity does this add to the specification?
  - Who is negatively impacted?
  - Are there maintenance or long-term support concerns?

  Being honest about drawbacks shows you've thought through the proposal
  carefully and builds trust in your analysis.
-->

[Explain reasons NOT to make this change]

## Rationale and alternatives

<!--
  Why is this the best design among alternatives?

  This section should:
  - List alternatives that were considered
  - Explain why each alternative was rejected
  - Justify why the proposed approach is superior
  - Describe the impact of not making this change
-->

[Why is this approach the best?]

### Alternatives Considered

| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| [Alt 1] | [Benefits] | [Drawbacks] | [Reason] |
| [Alt 2] | [Benefits] | [Drawbacks] | [Reason] |

### Impact of Not Doing This

[What happens if we reject this RFC?]

## Prior art

<!--
  How do other standards or systems handle this?

  Investigate:
  - Existing approaches in the luxury industry
  - Approaches in adjacent domains (supply chain, identity, provenance)
  - Relevant standards (GS1, EPCIS, W3C, ISO)
  - Lessons learned from prior implementations

  Prior art provides confidence that the approach is sound and
  helps reviewers understand the context.
-->

[Research on how others solve this problem]

### Luxury Industry

[Existing approaches in luxury sector]

### Adjacent Domains

[Approaches in supply chain, identity, provenance, etc.]

### Standards

[Relevant standards: GS1, EPCIS, W3C, ISO, etc.]

## Compliance impact

<!--
  How does this change affect regulatory compliance?

  Consider impact on:
  - ESPR (Digital Product Passport requirements)
  - GDPR (data privacy, right to erasure)
  - MiCA (if token-related)
  - AML/KYC requirements

  The Galileo Luxury Standard operates in a heavily regulated
  environment. All changes must be evaluated for compliance impact.
-->

[Assess regulatory compliance implications]

### ESPR Impact

[Does this affect Digital Product Passport compliance?]

### GDPR Impact

[Does this affect data privacy or on-chain/off-chain boundaries?]

### Other Regulatory Considerations

[Any other compliance implications?]

## Backward compatibility

<!--
  How does this change affect existing implementations?

  Classify this change:
  - Fully backward compatible: Existing implementations continue to work
  - Partially compatible: Some features may need updates
  - Breaking change: Existing implementations will break

  For breaking changes, provide a migration path.
-->

[Assess backward compatibility]

### Compatibility Classification

[Fully compatible / Partially compatible / Breaking]

### Migration Path

[If not fully compatible, how do adopters migrate?]

## Unresolved questions

<!--
  What questions need resolution during the RFC process?

  These are questions that:
  - Should be resolved before the RFC is accepted
  - Require community input or expertise
  - May affect the design significantly

  This is NOT for questions that can be resolved during implementation.
-->

[Questions to resolve during RFC review]

1. [Open question 1]
2. [Open question 2]

## Future possibilities

<!--
  What extensions or follow-on work might this enable?

  This section is:
  - NOT a commitment to future work
  - A way to show how this fits into larger evolution
  - Helpful for reviewers to understand the vision

  Keep this section brief and speculative.
-->

[Potential future extensions enabled by this RFC]

---

## Review Comments

<!--
  This section is populated during the review process.
  Leave empty when submitting. TSC members and community reviewers
  will add comments here during the review period.
-->

*Comments will be added during review.*

## Decision

<!--
  This section is populated by the TSC after the decision.
  Leave empty when submitting.
-->

- **Decision:** [Pending | Accepted | Rejected | Deferred]
- **Date:** [YYYY-MM-DD]
- **Rationale:** [Explanation of the decision]

---

*RFC template based on the [Rust RFC process](https://github.com/rust-lang/rfcs), adapted for the Galileo Luxury Standard.*
