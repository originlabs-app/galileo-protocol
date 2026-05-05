export const metadata = {
  title: "RFC Process",
  description:
    "How to propose specification changes to the Galileo Luxury Standard. Complete guide to the RFC lifecycle: draft, champion assignment, review, and TSC decision via lazy consensus.",
};

export default function RFCProcessPage() {
  return (
    <>
      <h1>RFC Process</h1>

      <p className="text-xl text-[var(--platinum)] leading-relaxed">
        All significant changes to the Galileo Luxury Standard go through the
        Request for Comments (RFC) process. RFCs ensure that modifications are
        thoroughly documented, reviewed by the community, and approved through a
        transparent process.
      </p>

      <h2>When is an RFC Required?</h2>
      <p>An RFC is required for:</p>
      <ul>
        <li>New features or capabilities (30-day review)</li>
        <li>Non-breaking modifications to existing features (30-day review)</li>
        <li>Breaking changes to existing features (60-day review)</li>
        <li>Minor clarifications or editorial improvements (2-week review)</li>
      </ul>
      <p>
        An RFC is <strong>not</strong> required for typos, grammar fixes, and
        formatting changes &mdash; these can be submitted as direct pull
        requests.
      </p>

      <h2>Who Can Submit?</h2>
      <p>
        <strong>Anyone.</strong> The Galileo Luxury Standard operates under an
        Open Contribution model. No membership is required to submit an RFC.
        RFCs are evaluated on technical merit, not submitter status.
        Organizations of any size, from artisan workshops to major maisons, are
        welcome.
      </p>

      <h2>RFC Lifecycle</h2>

      <h3>1. Draft</h3>
      <p>
        The author prepares the RFC using the RFC template. Key sections
        include:
      </p>
      <ul>
        <li>
          <strong>Summary</strong> &mdash; One-paragraph overview
        </li>
        <li>
          <strong>Motivation</strong> &mdash; Why this change is needed
        </li>
        <li>
          <strong>Guide-level explanation</strong> &mdash; How adopters will use
          this
        </li>
        <li>
          <strong>Reference-level explanation</strong> &mdash; Technical
          specification
        </li>
        <li>
          <strong>Alternatives</strong> &mdash; Other approaches considered
        </li>
        <li>
          <strong>Compliance impact</strong> &mdash; Regulatory implications
          (ESPR, GDPR)
        </li>
        <li>
          <strong>Backward compatibility</strong> &mdash; Impact on existing
          implementations
        </li>
      </ul>

      <h3>2. Submitted</h3>
      <p>
        The author opens a Pull Request against the{" "}
        <code>governance/rfcs/</code> directory. The PR title should follow the
        format: <code>RFC: [Short descriptive title]</code>.
      </p>
      <p>
        <strong>Note:</strong> Draft RFCs use placeholder <code>XXXX</code> in
        the filename. RFC numbers are assigned only when accepted, not at
        submission.
      </p>

      <h3>3. Champion Assigned</h3>
      <p>
        A TSC member is assigned as the RFC&apos;s <strong>champion</strong>.
        The champion:
      </p>
      <ul>
        <li>Shepherds the RFC through the process</li>
        <li>Ensures timely review and feedback</li>
        <li>Facilitates discussion and resolution of concerns</li>
        <li>Presents the RFC for TSC decision</li>
      </ul>
      <p>
        This prevents RFC abandonment and ensures all proposals receive proper
        attention.
      </p>

      <h3>4. Review Period</h3>
      <p>The RFC enters a public comment period based on change type:</p>
      <ul>
        <li>
          <strong>Minor</strong> (non-breaking clarifications): 2 weeks
        </li>
        <li>
          <strong>Major</strong> (new features, enhancements): 30 days
        </li>
        <li>
          <strong>Breaking</strong> (backward-incompatible): 60 days
        </li>
      </ul>
      <p>
        During this period, community members comment on the PR, the author
        responds and may revise the RFC, and the champion tracks open concerns.
      </p>

      <h3>5. Decision</h3>
      <p>After the review period, the TSC decides:</p>
      <ul>
        <li>
          <strong>Accepted</strong> &mdash; RFC approved for implementation in
          target version
        </li>
        <li>
          <strong>Rejected</strong> &mdash; RFC not accepted (rationale
          documented)
        </li>
        <li>
          <strong>Deferred</strong> &mdash; RFC postponed for future
          consideration
        </li>
      </ul>

      <h3>Decision Mechanisms</h3>
      <ul>
        <li>
          <strong>Lazy consensus</strong> &mdash; If no objections by the review
          deadline, the RFC proceeds to acceptance
        </li>
        <li>
          <strong>Explicit vote</strong> &mdash; For contested RFCs, TSC members
          vote explicitly
        </li>
        <li>
          <strong>Breaking changes</strong> &mdash; Require veto-free TSC
          approval. Any TSC member may exercise a veto on breaking changes (see{" "}
          <a href="/docs/governance/charter">Governance Charter</a> Section 6)
        </li>
      </ul>

      <h3>6. Implementation</h3>
      <p>Accepted RFCs are:</p>
      <ul>
        <li>
          Assigned an RFC number (sequential: 0001, 0002, 0003...) &mdash;
          numbers are assigned when accepted, not at submission
        </li>
        <li>
          Merged into the <code>rfcs/</code> directory
        </li>
        <li>Implemented in the target specification version</li>
        <li>Status updated to &quot;Implemented&quot; upon release</li>
      </ul>

      <h2>RFC Statuses</h2>
      <ul>
        <li>
          <strong>Draft</strong> &mdash; Work in progress, not yet submitted
        </li>
        <li>
          <strong>Submitted</strong> &mdash; PR opened, under review
        </li>
        <li>
          <strong>Accepted</strong> &mdash; Approved for implementation
        </li>
        <li>
          <strong>Implemented</strong> &mdash; Released in a specification
          version
        </li>
        <li>
          <strong>Rejected</strong> &mdash; Not accepted (rationale preserved)
        </li>
        <li>
          <strong>Withdrawn</strong> &mdash; Author withdrew the proposal
        </li>
        <li>
          <strong>Deferred</strong> &mdash; Postponed for future consideration
        </li>
      </ul>

      <h2>RFC Template</h2>
      <p>Every RFC must include the following sections:</p>
      <pre>
        <code>{`# RFC-XXXX: [Title]

- RFC Number: XXXX (assigned upon acceptance)
- Author: [Your Name (organization)]
- Champion: [TSC member - assigned after submission]
- Status: Draft
- Created: [YYYY-MM-DD]
- Review Deadline: [calculated from submission]
- Spec Version Target: [e.g., 1.3.0]

## Summary
One-paragraph overview of the proposal.

## Motivation
Why is this change needed? What use cases does it enable?

## Guide-level explanation
How adopters will use this, with examples.

## Reference-level explanation
Technical specification details, schema changes.

## Drawbacks
Why should we NOT do this?

## Rationale and alternatives
Why is this the best design among alternatives?

## Prior art
How do other standards handle this?

## Compliance impact
ESPR, GDPR, and other regulatory implications.

## Backward compatibility
Is this a breaking change? Migration path?

## Unresolved questions
Questions to resolve during RFC review.`}</code>
      </pre>

      <h2>How to Submit an RFC</h2>
      <ol>
        <li>
          <strong>Fork</strong> the repository
        </li>
        <li>
          <strong>Copy</strong> <code>0000-template.md</code> to{" "}
          <code>XXXX-your-title.md</code>
        </li>
        <li>
          <strong>Fill in</strong> all sections of the template
        </li>
        <li>
          <strong>Open a Pull Request</strong> with title{" "}
          <code>RFC: [Your Title]</code>
        </li>
        <li>
          <strong>Engage</strong> with feedback during the review period
        </li>
      </ol>

      <h2>Language</h2>
      <p>
        All RFC text, discussions, and decisions are conducted in{" "}
        <strong>English</strong>. The English version is authoritative.
        Community translations are encouraged for accessibility but are
        non-authoritative.
      </p>

      <h2>Related Documents</h2>
      <ul>
        <li>
          <a href="/docs/governance/charter">Governance Charter</a> &mdash; TSC
          structure, veto mechanism, and voting rules
        </li>
        <li>
          <a href="/docs/contributing">Contributing Guide</a> &mdash; How to get
          started
        </li>
        <li>
          <a href="/docs/versioning">Versioning Policy</a> &mdash; How accepted
          RFCs are released
        </li>
      </ul>
    </>
  );
}
