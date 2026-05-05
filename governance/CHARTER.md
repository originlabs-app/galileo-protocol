# Galileo Luxury Standard - Governance Charter

**Version:** 1.0.0-draft
**Effective Date:** Upon Ratification
**Last Updated:** 2026-01-30

---

## Preamble

This Charter establishes the governance framework for the Galileo Luxury Standard, an open industrial specification for digital product identity and traceability in the luxury goods sector. The governance structure is designed to ensure neutrality, prevent single-organization control, and enable competing luxury brands to collaborate on a shared standard that protects their heritage and craftsmanship.

The principles guiding this governance are inspired by successful open source foundations (Linux Foundation, Hyperledger, CNCF) and Elinor Ostrom's research on governing commons: clear boundaries, participatory decision-making, graduated sanctions, and effective conflict resolution.

---

## 1. Mission and Scope

### 1.1 Mission

The mission of the Galileo Luxury Standard is to establish an interoperable digital product identity standard for luxury goods that:

- Creates an immutable digital memory for objects spanning multiple decades
- Enables provenance verification independent of proprietary platforms
- Allows competing brands to collaborate without competitive sacrifice
- Prepares the industry for ESPR Digital Product Passport requirements (2027)

### 1.2 Core Value

> **"Proteger le patrimoine des marques et le savoir-faire humain"**
>
> Protect brand heritage and human craftsmanship through a common language enabling interoperability between competing brands without competitive sacrifice or platform dependency.

### 1.3 Scope

The Standard encompasses:

- **Specification Development:** Technical specifications for digital product identity, lifecycle events, and compliance interfaces
- **Reference Implementations:** Non-production reference code demonstrating specification compliance
- **Certification Program:** Conformance testing and certification for implementations
- **Educational Materials:** Documentation enabling adopter implementation

The Standard explicitly excludes:

- Production-ready smart contract implementations
- User interface or frontend applications
- Hosting or infrastructure services
- Financial tokenization or speculative trading features

---

## 2. Membership Categories

The Standard recognizes three membership tiers, each with distinct rights and obligations.

### 2.1 Founding Partners

**Enrollment Window:** Closed at Charter ratification. No new Founding Partners may be admitted after this date.

**Requirements:**
- Commitment of dedicated personnel (minimum 0.5 FTE) for Technical Steering Committee participation
- Financial contribution as defined in the Membership Agreement
- Demonstrated commitment to the Standard's mission

**Rights:**
- All Member rights
- Transitional representation on TSC (see Section 4.1)
- Recognition in Standard documentation and materials

**Transitional Provisions:**
- Founding Partner TSC privileges expire three (3) years from Charter ratification
- After expiration, Founding Partners retain Member status and rights

### 2.2 Members

**Enrollment:** Open to any organization upon acceptance of Membership Agreement and payment of annual dues.

**Dues Structure:**
- **SME Band** (annual revenue <EUR 10M): Base rate
- **Mid-Market Band** (annual revenue EUR 10M-100M): 3x base rate
- **Enterprise Band** (annual revenue >EUR 100M): 10x base rate

Dues are reviewed annually by the Governing Board.

**Rights:**
- Voting rights on Governing Board matters
- Nomination rights for Governing Board representatives
- Full access to Member-only meetings and materials
- Use of Member designation and badges
- Priority access to certification program

### 2.3 Observers

**Enrollment:** Open to any individual or organization. No fee required.

**Rights:**
- Full access to all published specifications
- Participation in RFC comment periods
- Attendance at public meetings (observer status)
- Commercial use of specifications under Apache License 2.0
- Contribution of RFCs and specification improvements

**Limitations:**
- No voting rights on Governing Board or Member matters
- No attendance at closed Member sessions
- No use of Member designation

### 2.4 Reference

Full membership terms, application procedures, and fee schedules are documented in:
- `membership/MEMBERSHIP_LEVELS.md`
- `membership/AGREEMENT.md`

---

## 3. Governing Board

The Governing Board provides strategic direction and fiduciary oversight for the Standard.

### 3.1 Composition

The Governing Board consists of:
- One (1) representative from each Founding Partner organization
- Representatives elected by Member organizations (number determined by membership count, minimum 3)
- Non-voting Executive Director (if appointed)

No single organization may hold more than one (1) Board seat.

### 3.2 Responsibilities

The Governing Board is responsible for:
- **Budget:** Approving annual budget and financial reports
- **Strategy:** Setting strategic direction and priorities
- **Membership:** Establishing membership policies and fee structures
- **Trademark:** Managing trademark and brand policies
- **Appointments:** Appointing Board-designated TSC members (see Section 4.1)
- **Escalation:** Serving as final arbiter for unresolved disputes
- **Charter:** Proposing and approving Charter amendments

### 3.3 Voting

- **Quorum:** Two-thirds (2/3) of voting Board members
- **Standard Decisions:** Majority of members present
- **Charter Amendments:** Two-thirds (2/3) of all voting members
- **Budget Approval:** Two-thirds (2/3) of all voting members

### 3.4 Meetings

The Board meets quarterly at minimum. Special meetings may be called by any three (3) Board members or the Chair. Meeting minutes (summary form) are published to Members within fourteen (14) days.

---

## 4. Technical Steering Committee (TSC)

The Technical Steering Committee is the technical governance body responsible for specification development and technical decision-making.

### 4.1 Composition

The TSC consists of eleven (11) voting members:

| Seats | Selection Method | Term |
|-------|------------------|------|
| 6 | Elected by Active Contributors | 2 years |
| 3 | Appointed by Governing Board (expertise/diversity) | 2 years |
| 2 | Designated by Founding Partners (transitional) | Until 3 years post-ratification |

**Anti-Dominance Provision:** No single organization may hold more than two (2) TSC seats simultaneously. If elections or appointments would result in exceeding this limit, the excess seat(s) pass to the next eligible candidate(s).

### 4.2 Active Contributor Definition

An **Active Contributor** is any individual who has had a contribution accepted during the prior twelve (12) months. Qualifying contributions include:
- Specification text (new sections, amendments, clarifications)
- Accepted RFCs
- Reference implementation code
- Official documentation
- Test suites and conformance tools

Contribution records are maintained publicly in the project repository.

### 4.3 Elections

- **Annual Cycle:** Elections held each September for seats expiring December 31
- **Nominations:** Self-nomination or nomination by another Active Contributor
- **Eligibility:** Nominees must be Active Contributors
- **Voting:** Active Contributors vote; ranked-choice voting used
- **Results:** Published within seven (7) days of voting close

### 4.4 Term Limits

TSC members serve two (2) year terms, renewable once. After serving two consecutive terms, a member must observe a one (1) year gap before seeking re-election or re-appointment.

### 4.5 Responsibilities

The TSC is responsible for:
- **Specification Approval:** Final approval of specification changes
- **RFC Decisions:** Accepting, rejecting, or requesting revision of RFCs
- **Technical Roadmap:** Setting technical priorities and release schedules
- **Architecture:** Maintaining architectural integrity and coherence
- **Working Groups:** Establishing and overseeing technical working groups
- **Standards Liaison:** Coordinating with external standards bodies (GS1, W3C, etc.)

### 4.6 Reference

Detailed TSC operating procedures are documented in:
- `tsc/MEMBERS.md` - Current membership roster
- `tsc/ELECTIONS.md` - Election procedures
- `tsc/MEETINGS.md` - Meeting cadence and minutes

---

## 5. Voting Procedures

### 5.1 Quorum

- **TSC Meetings:** Two-thirds (2/3) of voting members constitute quorum
- **Governing Board:** Two-thirds (2/3) of voting members constitute quorum

Decisions made without quorum are provisional and must be ratified at the next quorate meeting.

### 5.2 Standard Decisions

For matters not otherwise specified:
- **In-Person/Synchronous:** Majority of members present (quorum required)
- **Electronic/Asynchronous:** Majority of all voting members (not just those responding)

Electronic votes remain open for minimum seven (7) days.

### 5.3 Breaking Changes

Breaking changes require enhanced approval as specified in Section 6.

### 5.4 Abstention

Members may abstain. Abstentions count toward quorum but not toward the vote threshold.

### 5.5 Conflict of Interest

Members must disclose material conflicts of interest before voting. Conflicted members may participate in discussion but must abstain from voting on the conflicted matter.

---

## 6. Veto Mechanism for Breaking Changes

This section establishes protections for Standard adopters against disruptive specification changes.

### 6.1 Definition of Breaking Change

A **breaking change** is any modification to the specification that would:
- Cause a previously-conformant implementation to become non-conformant
- Remove or fundamentally alter the semantics of existing features
- Change mandatory requirements in a non-backward-compatible manner
- Modify identifier formats, data structures, or interfaces in incompatible ways

Clarifications, bug fixes, and additive changes are NOT breaking changes.

### 6.2 Veto Rights

Any TSC member may exercise a veto on proposed breaking changes. A veto must:

1. **Be Timely:** Declared in writing during the RFC review period
2. **Be Justified:** Include specific technical justification referencing adopter impact
3. **Be Constructive:** Propose an alternative approach or conditions for lifting the veto

A veto without these elements is procedurally invalid.

### 6.3 Veto Effect

A valid veto:
- Immediately suspends the RFC approval process
- Triggers a ninety (90) day resolution period
- Requires public documentation of the veto rationale

### 6.4 Resolution Process

During the resolution period:
1. The TSC Chair facilitates negotiation between veto holder and RFC authors
2. Working sessions are convened as needed
3. Alternative proposals are explored
4. Affected adopters may provide input

### 6.5 Veto Override

A veto may be overridden only by:
- **Unanimous TSC Consent:** All other TSC members (excluding veto holder) agree to override, OR
- **Governing Board Override:** Two-thirds (2/3) vote of the full Governing Board

Override requires documented finding that the veto is:
- Not technically justified, OR
- Contrary to the Standard's mission and adopter interests

### 6.6 Unresolved Vetoes

If a veto remains unresolved after the 90-day period:
- The RFC is tabled
- May be reintroduced after twelve (12) months with substantial modifications
- Original veto holder must be notified of reintroduction

---

## 7. Intellectual Property Policy

### 7.1 License

All specification text, schemas, reference implementations, and documentation are licensed under the **Apache License, Version 2.0**.

The full license text is provided in `governance/LICENSE`.

### 7.2 Contributions

All contributions must be submitted with a Developer Certificate of Origin (DCO) sign-off. By signing off, the contributor certifies that:
- They have the right to submit the contribution
- They agree to license it under Apache 2.0
- They understand the contribution becomes part of the public record

DCO sign-off is indicated by including in commit messages:
```
Signed-off-by: Full Name <email@example.com>
```

The Developer Certificate of Origin is documented in `governance/DCO.md`.

### 7.3 Patent Grant

Per Apache License 2.0 Section 3, contributors grant a perpetual, worldwide, non-exclusive, royalty-free patent license for any patent claims licensable by them that are necessarily infringed by their contributions.

This patent grant terminates automatically for any party that initiates patent litigation (including cross-claims or counterclaims) alleging that the Standard or contributions constitute patent infringement.

### 7.4 Trademarks

The "Galileo Luxury Standard" name, logo, and associated marks are held by the Foundation. Usage is governed by the Trademark Policy (to be established). Members may use marks in accordance with the policy; Observers may reference the Standard but may not imply endorsement.

### 7.5 Third-Party Content

Contributions must not include content that:
- Infringes third-party intellectual property
- Is subject to incompatible license terms
- Contains trade secrets or confidential information

Contributors are responsible for ensuring compliance.

---

## 8. Transparency Policy

The Standard operates under a hybrid transparency model that protects competitive concerns while ensuring accountability.

### 8.1 Deliberations

- **TSC Technical Discussions:** May be held privately to allow candid technical debate
- **Governing Board Discussions:** May be held privately to protect commercial sensitivities
- **Working Group Discussions:** Default to private, may be opened by group decision

Private deliberations protect the ability of competing brands to participate honestly.

### 8.2 Decisions

All decisions are published with:
- Full statement of the decision
- Rationale and considerations
- Dissenting positions (if members consent to attribution)
- Effective date

Decisions are published within seven (7) days of adoption.

### 8.3 Meeting Records

| Record Type | Availability |
|-------------|--------------|
| Meeting schedules | Public |
| Agenda | Members (advance), Public (after meeting) |
| Summary minutes | Public (within 14 days) |
| Detailed minutes | Members only |
| Voting records | Public (outcomes), Members (individual votes) |

### 8.4 Decision Log

A public, append-only decision log is maintained documenting:
- Decision identifier
- Date
- Body (TSC/Board)
- Summary
- Link to full rationale

The decision log serves as the authoritative record of Standard governance.

---

## 9. Antitrust Compliance

### 9.1 Safe Harbor

Participation in the Galileo Luxury Standard is intended to develop technical specifications that benefit the luxury goods industry. All activities are conducted in compliance with applicable antitrust and competition laws.

### 9.2 Permitted Activities

Participants may:
- Develop and discuss technical specifications
- Share best practices for specification implementation
- Coordinate on data formats and interoperability
- Establish conformance and certification criteria

### 9.3 Prohibited Topics

The following topics are strictly prohibited in all Standard activities:
- **Pricing:** Current, future, or historical prices; pricing strategies; price components
- **Market Allocation:** Division of customers, territories, or markets
- **Boycotts:** Agreements to refuse dealing with competitors, suppliers, or customers
- **Competitive Intelligence:** Sharing of non-public competitive information
- **Production:** Agreements on production levels or capacity

### 9.4 Compliance Procedures

- Meetings begin with antitrust reminder
- Agenda topics are reviewed for compliance
- Legal counsel may be requested for sensitive discussions
- Participants must immediately object to and leave discussions that venture into prohibited territory
- Violations are reported to the Governing Board

### 9.5 Consequences

Violations may result in:
- Immediate termination of membership
- Exclusion from Standard activities
- Referral to appropriate authorities

---

## 10. Code of Conduct

### 10.1 Applicability

All participants in Standard activities are bound by the Code of Conduct, documented at `governance/CODE_OF_CONDUCT.md`.

### 10.2 Scope

The Code of Conduct applies to:
- All project repositories and communication channels
- Mailing lists, forums, and chat systems
- Meetings (virtual and in-person)
- Conferences and events where participants represent the Standard
- Public spaces when representing the Standard

### 10.3 Enforcement

The TSC is responsible for Code of Conduct enforcement. Violations may result in graduated sanctions as specified in the Code of Conduct, up to and including permanent removal from project participation.

### 10.4 Reporting

Violations may be reported to conduct@galileoprotocol.io (or designated address). All reports are treated confidentially.

---

## 11. Amendments

### 11.1 Proposal

Charter amendments may be proposed by:
- Any Governing Board member
- The TSC (by majority vote)
- Petition of five (5) Member organizations

Proposals must include:
- Specific text changes (diff format preferred)
- Rationale for the amendment
- Impact assessment

### 11.2 Review Period

Proposed amendments undergo a sixty (60) day review period during which:
- Members may provide written comment
- Public comment is accepted
- TSC provides technical assessment (if applicable)
- Legal review is conducted (if applicable)

### 11.3 Approval

Charter amendments require:
- Two-thirds (2/3) vote of all Governing Board voting members
- Vote conducted after review period closes

### 11.4 Effective Date

Approved amendments become effective thirty (30) days after approval, unless the amendment specifies otherwise.

### 11.5 Emergency Amendments

In case of legal or regulatory emergency, the Board may adopt temporary amendments by unanimous consent, effective immediately. Emergency amendments expire after ninety (90) days unless ratified through normal process.

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0-draft | 2026-01-30 | Initial draft for community review |

---

## Appendices

### Appendix A: Definitions

- **Active Contributor:** Individual with accepted contribution in prior 12 months
- **Breaking Change:** Specification change causing conformant implementations to become non-conformant
- **Charter:** This document
- **DCO:** Developer Certificate of Origin
- **Founding Partner:** Organization admitted before Charter ratification with enhanced commitments
- **Member:** Organization with paid membership and voting rights
- **Observer:** Individual or organization with free access and participation rights
- **RFC:** Request for Comments; formal proposal for specification changes
- **Standard:** The Galileo Luxury Standard specifications and associated materials
- **TSC:** Technical Steering Committee

### Appendix B: Related Documents

| Document | Location | Purpose |
|----------|----------|---------|
| Apache License 2.0 | `governance/LICENSE` | Specification license |
| Developer Certificate of Origin | `governance/DCO.md` | Contribution certification |
| Code of Conduct | `governance/CODE_OF_CONDUCT.md` | Behavioral standards |
| Contributing Guide | `governance/CONTRIBUTING.md` | How to contribute |
| Versioning Policy | `governance/VERSIONING.md` | Semantic versioning rules |
| Membership Levels | `membership/MEMBERSHIP_LEVELS.md` | Membership tier details |
| TSC Members | `tsc/MEMBERS.md` | Current TSC roster |
| TSC Elections | `tsc/ELECTIONS.md` | Election procedures |

---

*This Charter is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) for maximum accessibility and reuse.*
