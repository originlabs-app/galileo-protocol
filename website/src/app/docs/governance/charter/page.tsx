export const metadata = {
  title: "Governance Charter",
  description:
    "Full governance charter for the Galileo Luxury Standard. Defines the Governing Board, TSC structure, membership categories, veto mechanism, anti-dominance rules, and amendment procedures.",
};

export default function GovernanceCharterPage() {
  return (
    <>
      <h1>Governance Charter</h1>

      <p className="text-xl text-[var(--platinum)] leading-relaxed">
        This charter establishes the governance framework for the Galileo Luxury
        Standard, an open industrial specification for digital product identity
        and traceability in the luxury goods sector. The governance structure
        ensures neutrality, prevents single-organization control, and enables
        competing luxury brands to collaborate on a shared standard.
      </p>

      <h2>1. Mission and Scope</h2>
      <p>
        The mission of the Galileo Luxury Standard is to establish an
        interoperable digital product identity standard for luxury goods that:
      </p>
      <ul>
        <li>
          Creates an immutable digital memory for objects spanning multiple
          decades
        </li>
        <li>
          Enables provenance verification independent of proprietary platforms
        </li>
        <li>
          Allows competing brands to collaborate without competitive sacrifice
        </li>
        <li>
          Prepares the industry for ESPR Digital Product Passport requirements
          (2027)
        </li>
      </ul>

      <h3>Core Value</h3>
      <blockquote>
        <p>
          <em>
            &quot;Proteger le patrimoine des marques et le savoir-faire
            humain&quot;
          </em>{" "}
          &mdash; Protect brand heritage and human craftsmanship through a
          common language enabling interoperability between competing brands
          without competitive sacrifice or platform dependency.
        </p>
      </blockquote>

      <h3>Scope</h3>
      <p>The Standard encompasses:</p>
      <ul>
        <li>
          <strong>Specification Development</strong> &mdash; Technical
          specifications for digital product identity, lifecycle events, and
          compliance interfaces
        </li>
        <li>
          <strong>Reference Implementations</strong> &mdash; Non-production
          reference code demonstrating specification compliance
        </li>
        <li>
          <strong>Certification Program</strong> &mdash; Conformance testing and
          certification for implementations
        </li>
        <li>
          <strong>Educational Materials</strong> &mdash; Documentation enabling
          adopter implementation
        </li>
      </ul>
      <p>
        The Standard explicitly excludes production-ready smart contract
        implementations, user interface applications, hosting or infrastructure
        services, and financial tokenization or speculative trading features.
      </p>

      <h2>2. Participation</h2>
      <p>
        Galileo Protocol follows an open contribution model. All contributions
        require a Developer Certificate of Origin (DCO 1.1) sign-off.
      </p>

      <h3>2.1 Contributors</h3>
      <p>
        Anyone may contribute to the Standard by submitting RFCs, code, or
        documentation. No membership or fee is required.
      </p>
      <ul>
        <li>Full access to all published specifications</li>
        <li>Participation in RFC comment periods</li>
        <li>Submit pull requests and specification proposals</li>
        <li>Commercial use of specifications under Apache License 2.0</li>
      </ul>

      <h3>2.2 Active Contributors</h3>
      <p>
        Contributors with sustained, meaningful participation over 12+ months
        gain recognition and eligibility for TSC nomination.
      </p>
      <ul>
        <li>Eligible for TSC seat nomination (elected or peer-nominated)</li>
        <li>Invitation to contributor-only working group sessions</li>
        <li>Listed in project contributors registry</li>
      </ul>

      <h3>2.3 Founding Partners</h3>
      <p>
        Enrollment window closed at Charter ratification. Founding Partners hold
        transitional TSC seats that sunset after three (3) years.
      </p>
      <ul>
        <li>Transitional representation on TSC (see Section 4)</li>
        <li>All Contributor rights</li>
        <li>
          <strong>Sunset:</strong> Founding Partner TSC privileges expire three
          (3) years from Charter ratification. After expiration, Founding
          Partners continue as Active Contributors.
        </li>
        <li>Contribution of RFCs and specification improvements</li>
      </ul>
      <p>
        Observers have no voting rights on Governing Board or Member matters,
        and no attendance at closed Member sessions.
      </p>

      <h2>3. Governing Board</h2>
      <p>
        The Governing Board provides strategic direction and fiduciary oversight
        for the Standard.
      </p>

      <h3>3.1 Composition</h3>
      <ul>
        <li>One (1) representative from each Founding Partner organization</li>
        <li>
          Representatives elected by Member organizations (minimum 3, number
          based on membership count)
        </li>
        <li>Non-voting Executive Director (if appointed)</li>
      </ul>
      <p>No single organization may hold more than one (1) Board seat.</p>

      <h3>3.2 Responsibilities</h3>
      <ul>
        <li>
          <strong>Budget</strong> &mdash; Approving annual budget and financial
          reports
        </li>
        <li>
          <strong>Strategy</strong> &mdash; Setting strategic direction and
          priorities
        </li>
        <li>
          <strong>Membership</strong> &mdash; Establishing membership policies
          and fee structures
        </li>
        <li>
          <strong>Trademark</strong> &mdash; Managing trademark and brand
          policies
        </li>
        <li>
          <strong>Appointments</strong> &mdash; Appointing Board-designated TSC
          members
        </li>
        <li>
          <strong>Escalation</strong> &mdash; Serving as final arbiter for
          unresolved disputes
        </li>
        <li>
          <strong>Charter</strong> &mdash; Proposing and approving Charter
          amendments
        </li>
      </ul>

      <h3>3.3 Voting</h3>
      <ul>
        <li>
          <strong>Quorum:</strong> Two-thirds (2/3) of voting Board members
        </li>
        <li>
          <strong>Standard Decisions:</strong> Majority of members present
        </li>
        <li>
          <strong>Charter Amendments:</strong> Two-thirds (2/3) of all voting
          members
        </li>
        <li>
          <strong>Budget Approval:</strong> Two-thirds (2/3) of all voting
          members
        </li>
      </ul>

      <h2>4. Technical Steering Committee (TSC)</h2>
      <p>
        The TSC is the technical governance body responsible for specification
        development and technical decision-making.
      </p>

      <h3>4.1 Composition</h3>
      <p>The TSC consists of eleven (11) voting members:</p>
      <ul>
        <li>
          <strong>6 Elected</strong> &mdash; Elected by Active Contributors for
          2-year terms
        </li>
        <li>
          <strong>3 Appointed</strong> &mdash; Appointed by the Governing Board
          for expertise and diversity, 2-year terms
        </li>
        <li>
          <strong>2 Founding Partner (Transitional)</strong> &mdash; Designated
          by Founding Partners, expire 3 years post-ratification
        </li>
      </ul>

      <h3>4.2 Anti-Dominance Provision</h3>
      <p>
        No single organization may hold more than two (2) TSC seats
        simultaneously. If elections or appointments would exceed this limit,
        the excess seat(s) pass to the next eligible candidate(s).
      </p>

      <h3>4.3 Active Contributor Definition</h3>
      <p>
        An <strong>Active Contributor</strong> is any individual who has had a
        contribution accepted during the prior twelve (12) months. Qualifying
        contributions include specification text, accepted RFCs, reference
        implementation code, official documentation, and test suites.
      </p>

      <h3>4.4 Elections</h3>
      <ul>
        <li>
          Annual elections held each September for seats expiring December 31
        </li>
        <li>Self-nomination or nomination by another Active Contributor</li>
        <li>Nominees must be Active Contributors</li>
        <li>Ranked-choice voting by Active Contributors</li>
        <li>Results published within seven (7) days of voting close</li>
      </ul>

      <h3>4.5 Term Limits</h3>
      <p>
        TSC members serve two (2) year terms, renewable once. After two
        consecutive terms, a member must observe a one (1) year gap before
        seeking re-election or re-appointment.
      </p>

      <h2>5. Voting Procedures</h2>
      <ul>
        <li>
          <strong>Quorum:</strong> Two-thirds (2/3) of voting members for both
          TSC and Governing Board
        </li>
        <li>
          <strong>Standard Decisions:</strong> Majority of members present
          (in-person) or majority of all voting members (electronic)
        </li>
        <li>Electronic votes remain open for minimum seven (7) days</li>
        <li>
          Members may abstain; abstentions count toward quorum but not the vote
          threshold
        </li>
        <li>
          Members must disclose material conflicts of interest before voting
        </li>
      </ul>

      <h2>6. Veto Mechanism for Breaking Changes</h2>
      <p>
        This section establishes protections for Standard adopters against
        disruptive specification changes.
      </p>

      <h3>6.1 Definition</h3>
      <p>
        A <strong>breaking change</strong> is any modification that would cause
        a previously-conformant implementation to become non-conformant, remove
        or fundamentally alter existing feature semantics, change mandatory
        requirements in a non-backward-compatible manner, or modify identifier
        formats, data structures, or interfaces incompatibly.
      </p>

      <h3>6.2 Veto Rights</h3>
      <p>
        Any TSC member may exercise a veto on proposed breaking changes. A veto
        must be:
      </p>
      <ul>
        <li>
          <strong>Timely</strong> &mdash; Declared in writing during the RFC
          review period
        </li>
        <li>
          <strong>Justified</strong> &mdash; Include specific technical
          justification referencing adopter impact
        </li>
        <li>
          <strong>Constructive</strong> &mdash; Propose an alternative approach
          or conditions for lifting the veto
        </li>
      </ul>

      <h3>6.3 Veto Effect and Resolution</h3>
      <p>
        A valid veto immediately suspends the RFC approval process and triggers
        a ninety (90) day resolution period. The TSC Chair facilitates
        negotiation between the veto holder and RFC authors. If unresolved, the
        RFC is tabled and may be reintroduced after twelve (12) months with
        substantial modifications.
      </p>

      <h3>6.4 Veto Override</h3>
      <p>A veto may be overridden only by:</p>
      <ul>
        <li>
          <strong>Unanimous TSC Consent</strong> &mdash; All other TSC members
          (excluding veto holder) agree to override
        </li>
        <li>
          <strong>Governing Board Override</strong> &mdash; Two-thirds (2/3)
          vote of the full Governing Board
        </li>
      </ul>

      <h2>7. Intellectual Property Policy</h2>
      <ul>
        <li>
          All specification text, schemas, reference implementations, and
          documentation are licensed under the{" "}
          <strong>Apache License, Version 2.0</strong>.
        </li>
        <li>
          All contributions must be submitted with a{" "}
          <strong>Developer Certificate of Origin (DCO)</strong> sign-off,
          certifying the contributor has the right to submit under Apache 2.0.
        </li>
        <li>
          Per Apache License 2.0, contributors grant a perpetual, worldwide,
          royalty-free patent license for patent claims necessarily infringed by
          their contributions.
        </li>
        <li>
          The &quot;Galileo Luxury Standard&quot; name, logo, and marks are held
          by the Foundation. Usage is governed by the Trademark Policy.
        </li>
      </ul>

      <h2>8. Transparency Policy</h2>
      <p>
        The Standard operates under a hybrid transparency model that protects
        competitive concerns while ensuring accountability.
      </p>
      <ul>
        <li>
          <strong>Deliberations:</strong> TSC and Board discussions may be held
          privately to allow candid debate between competing brands.
        </li>
        <li>
          <strong>Decisions:</strong> All decisions are published within seven
          (7) days with full rationale.
        </li>
        <li>
          <strong>Meeting Records:</strong> Summary minutes published within 14
          days. Detailed minutes are available to Members only.
        </li>
        <li>
          A public, append-only <strong>decision log</strong> is maintained as
          the authoritative record of Standard governance.
        </li>
      </ul>

      <h2>9. Antitrust Compliance</h2>
      <p>
        All activities are conducted in compliance with applicable antitrust and
        competition laws. The following topics are strictly prohibited in all
        Standard activities:
      </p>
      <ul>
        <li>
          <strong>Pricing</strong> &mdash; Current, future, or historical
          prices; pricing strategies
        </li>
        <li>
          <strong>Market Allocation</strong> &mdash; Division of customers,
          territories, or markets
        </li>
        <li>
          <strong>Boycotts</strong> &mdash; Agreements to refuse dealing with
          competitors, suppliers, or customers
        </li>
        <li>
          <strong>Competitive Intelligence</strong> &mdash; Sharing of
          non-public competitive information
        </li>
        <li>
          <strong>Production</strong> &mdash; Agreements on production levels or
          capacity
        </li>
      </ul>
      <p>
        Violations may result in immediate termination of membership, exclusion
        from Standard activities, and referral to appropriate authorities.
      </p>

      <h2>10. Code of Conduct</h2>
      <p>
        All participants are bound by the{" "}
        <a href="/docs/code-of-conduct">Code of Conduct</a>. The TSC is
        responsible for enforcement. Violations may result in graduated
        sanctions up to and including permanent removal from project
        participation.
      </p>

      <h2>11. Amendment Procedures</h2>
      <p>Charter amendments may be proposed by:</p>
      <ul>
        <li>Any Governing Board member</li>
        <li>The TSC (by majority vote)</li>
        <li>Petition of five (5) Member organizations</li>
      </ul>
      <p>
        Proposed amendments undergo a sixty (60) day review period. Approval
        requires a two-thirds (2/3) vote of all Governing Board voting members.
        Approved amendments become effective thirty (30) days after approval.
      </p>
      <p>
        In case of legal or regulatory emergency, the Board may adopt temporary
        amendments by unanimous consent, effective immediately. Emergency
        amendments expire after ninety (90) days unless ratified through the
        normal process.
      </p>

      <h2>Related Documents</h2>
      <ul>
        <li>
          <a href="/docs/contributing">Contributing Guide</a>
        </li>
        <li>
          <a href="/docs/rfc-process">RFC Process</a>
        </li>
        <li>
          <a href="/docs/code-of-conduct">Code of Conduct</a>
        </li>
        <li>
          <a href="/docs/versioning">Versioning Policy</a>
        </li>
        <li>
          <a href="/docs/license">License</a>
        </li>
        <li>
          <a href="/governance/tsc">Technical Steering Committee</a>
        </li>
      </ul>
    </>
  );
}
