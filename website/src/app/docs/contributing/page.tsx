export const metadata = {
  title: "Contributing Guide",
  description:
    "How to contribute to the Galileo Luxury Standard. Learn about the RFC process, DCO sign-off requirements, review periods, and recognition.",
};

export default function ContributingPage() {
  return (
    <>
      <h1>Contributing to the Galileo Luxury Standard</h1>

      <p className="text-xl text-[var(--platinum)] leading-relaxed">
        The Galileo Luxury Standard is an open, neutral standard for product
        traceability and provenance in the luxury goods industry. All
        contributions are welcome, regardless of your membership status &mdash;
        whether you represent a major maison, an independent artisan, a
        technology provider, or are simply passionate about luxury goods
        authenticity.
      </p>

      <h2>Ways to Contribute</h2>

      <h3>Report Issues</h3>
      <p>
        Found an ambiguity in the specification? Encountered a problem
        implementing it? Open an issue describing the problem and, if possible,
        suggest a solution.
      </p>
      <ul>
        <li>
          <strong>Bug reports</strong> &mdash; Errors or inconsistencies in the
          specification
        </li>
        <li>
          <strong>Clarification requests</strong> &mdash; Sections that are
          unclear or confusing
        </li>
        <li>
          <strong>Implementation feedback</strong> &mdash; Real-world issues
          discovered during adoption
        </li>
      </ul>

      <h3>Propose Changes</h3>
      <p>
        Significant changes to the specification go through the{" "}
        <a href="/docs/rfc-process">RFC process</a>:
      </p>
      <ul>
        <li>New features or capabilities</li>
        <li>Modifications to existing features</li>
        <li>Breaking changes (require extended review)</li>
      </ul>

      <h3>Review RFCs</h3>
      <p>Active RFCs need community input during their review periods:</p>
      <ul>
        <li>Read open RFC pull requests</li>
        <li>Comment with technical feedback</li>
        <li>Share implementation perspectives</li>
        <li>Raise concerns or suggest improvements</li>
      </ul>

      <h3>Improve Documentation</h3>
      <p>
        Clear documentation lowers the barrier to adoption. Fix typos, add
        examples, improve diagrams, and translate documentation. Minor
        documentation fixes can be submitted as direct pull requests without an
        RFC.
      </p>

      <h3>Build Reference Implementations</h3>
      <p>Demonstrate that the specification works in practice:</p>
      <ul>
        <li>Create conformant implementations</li>
        <li>Share implementation guides</li>
        <li>Contribute test suites</li>
        <li>Report implementation experiences</li>
      </ul>

      <h3>Translate</h3>
      <p>
        Community translations are encouraged to improve accessibility, but the
        English version is authoritative. Translations are community-maintained
        and non-binding.
      </p>

      <h2>Getting Started</h2>
      <ol>
        <li>
          <strong>Read the specification</strong> to understand what you&apos;re
          contributing to
        </li>
        <li>
          <strong>Review open RFCs</strong> to see current discussions
        </li>
        <li>
          <strong>Join public TSC meetings</strong> as an observer to understand
          governance
        </li>
        <li>
          <strong>Start small</strong> &mdash; a documentation fix or RFC
          comment is a great first contribution
        </li>
      </ol>

      <h2>Contribution Process</h2>

      <h3>For Small Changes</h3>
      <p>
        Typos, grammar fixes, formatting improvements, and minor clarifications:
      </p>
      <ol>
        <li>Fork the repository</li>
        <li>Make your changes</li>
        <li>Submit a Pull Request with a clear description</li>
        <li>A maintainer will review and merge</li>
      </ol>
      <p>
        No RFC required for editorial changes that don&apos;t affect
        specification semantics.
      </p>

      <h3>For Significant Changes</h3>
      <p>
        New features, behavioral changes, or modifications to existing
        functionality:
      </p>
      <ol>
        <li>
          <strong>Draft an RFC</strong> using the RFC template
        </li>
        <li>
          <strong>Open a Pull Request</strong> with title{" "}
          <code>RFC: [Your Title]</code>
        </li>
        <li>
          <strong>Engage with feedback</strong> during the review period
        </li>
        <li>
          <strong>Revise as needed</strong> based on community input
        </li>
        <li>
          <strong>Await TSC decision</strong> after the review period ends
        </li>
      </ol>

      <h3>Review Periods</h3>
      <p>Review periods vary by change type:</p>
      <ul>
        <li>
          <strong>Minor changes</strong> (non-breaking clarifications): 2 weeks
        </li>
        <li>
          <strong>Major changes</strong> (new features, enhancements): 30 days
        </li>
        <li>
          <strong>Breaking changes</strong> (backward-incompatible): 60 days
        </li>
      </ul>
      <p>
        See the <a href="/docs/rfc-process">RFC Process</a> for complete
        details.
      </p>

      <h2>DCO Sign-off</h2>
      <p>
        All contributions require a{" "}
        <strong>Developer Certificate of Origin (DCO)</strong> sign-off. The DCO
        is a lightweight alternative to Contributor License Agreements (CLAs).
      </p>

      <h3>What is the DCO?</h3>
      <p>
        The DCO certifies that you have the right to submit your contribution
        and agree to license it under Apache 2.0.
      </p>

      <h3>How to Sign Off</h3>
      <p>Add the following line to your commit messages:</p>
      <pre>
        <code>Signed-off-by: Your Name &lt;your.email@example.com&gt;</code>
      </pre>
      <p>
        <strong>Git shortcut:</strong> Use the <code>-s</code> flag when
        committing:
      </p>
      <pre>
        <code>git commit -s -m &quot;Your commit message&quot;</code>
      </pre>

      <h3>Why We Require This</h3>
      <ul>
        <li>
          Ensures all contributions can be legally included in the standard
        </li>
        <li>Protects both contributors and the project</li>
        <li>Certifies you have the right to submit under Apache 2.0</li>
        <li>Industry standard practice (Linux Foundation, Apache projects)</li>
      </ul>

      <h2>Code of Conduct</h2>
      <p>
        All contributors are expected to adhere to the{" "}
        <a href="/docs/code-of-conduct">Code of Conduct</a>. We are committed to
        providing a welcoming and inclusive environment. Report violations to{" "}
        <code>conduct@galileoprotocol.io</code>.
      </p>

      <h2>Language</h2>
      <p>
        The official language of the Galileo Luxury Standard is{" "}
        <strong>English</strong>. All specification text, RFC discussions, and
        TSC meetings are conducted in English. The English version is
        authoritative for interpretation.
      </p>

      <h2>Recognition</h2>
      <p>Contributors are recognized in several ways:</p>
      <ul>
        <li>
          <strong>Git history</strong> preserves authorship
        </li>
        <li>
          <strong>RFC authorship</strong> is recorded in accepted RFCs
        </li>
        <li>
          <strong>Contributor lists</strong> acknowledge significant
          contributions
        </li>
        <li>
          <strong>Active Contributors</strong> may become eligible for TSC
          election (requires accepted contribution within prior 12 months)
        </li>
      </ul>

      <h2>Questions?</h2>
      <ul>
        <li>
          <strong>Technical questions</strong> &mdash; Open an issue
        </li>
        <li>
          <strong>Process questions</strong> &mdash; Review this document and
          the <a href="/docs/rfc-process">RFC Process</a>
        </li>
        <li>
          <strong>Governance questions</strong> &mdash; See the{" "}
          <a href="/docs/governance/charter">Governance Charter</a>
        </li>
        <li>
          <strong>General inquiries</strong> &mdash;{" "}
          <code>info@galileoprotocol.io</code>
        </li>
      </ul>
    </>
  );
}
