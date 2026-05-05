# TSC Meeting Operations

**Version:** 1.0.0-draft
**Last Updated:** 2026-01-30
**Authority:** [CHARTER.md](../CHARTER.md) Sections 4 and 8

---

## 1. Meeting Cadence

### 1.1 Regular Meetings

| Type | Frequency | Duration | Format |
|------|-----------|----------|--------|
| Regular TSC | Bi-weekly (every 2 weeks) | 60-90 minutes | Video conference |
| Special Session | As needed | Variable | Video conference |
| Working Group | Per group charter | 60 minutes typical | Video conference |

### 1.2 Schedule Publication

- **Quarterly:** Full meeting schedule published 3 months in advance
- **Updates:** Schedule changes announced minimum 7 days in advance
- **Calendar:** [Calendar subscription link TBD]

### 1.3 Time Zone Rotation

To accommodate global participation, meeting times rotate on a quarterly basis:

| Quarter | Primary Time Zone Focus |
|---------|------------------------|
| Q1 (Jan-Mar) | Europe-friendly (CET/CEST morning) |
| Q2 (Apr-Jun) | Americas-friendly (ET/PT morning) |
| Q3 (Jul-Sep) | APAC-friendly (HKT/JST morning) |
| Q4 (Oct-Dec) | Europe-friendly (CET/CEST morning) |

Exact times published in quarterly schedule. Two-thirds (2/3) TSC vote may adjust rotation.

---

## 2. Meeting Types

### 2.1 Regular TSC Meetings

**Purpose:** Ongoing technical governance, RFC reviews, roadmap updates

**Standing Agenda Items:**
- Roll call and quorum confirmation
- Antitrust reminder
- Approval of previous meeting minutes
- Action item review
- RFC status updates (new, under review, ready for vote)
- Release planning and roadmap review
- Working group reports
- New business
- Action item summary
- Next meeting confirmation

### 2.2 Special Sessions

**Purpose:** Address urgent matters requiring immediate TSC attention

**Triggers:**
- Security vulnerability disclosure
- Breaking change RFC requiring expedited review
- Emergency governance matter
- Time-sensitive external standards coordination

**Calling a Special Session:**
- TSC Chair may call with 24-48 hours notice (security: 24h minimum, other: 48h minimum)
- Any three (3) TSC members may jointly request
- Governing Board may request TSC special session

### 2.3 Working Group Meetings

**Purpose:** Focused technical work on specific domains

**Characteristics:**
- Open to non-TSC participants (Active Contributors, subject matter experts)
- Report to TSC at regular meetings
- May make recommendations but not final decisions
- Charter established by TSC for each working group

**Current Working Groups:**
- [To be established as needed]

---

## 3. Attendance

### 3.1 TSC Member Expectations

| Expectation | Details |
|-------------|---------|
| Attendance target | 75% of regular meetings |
| Absence notification | Notify Chair 24+ hours in advance |
| Prolonged absence | 3 consecutive absences without notice may trigger vacancy |
| Proxy | No proxy voting; written input may be submitted |

### 3.2 Quorum

Per [CHARTER.md](../CHARTER.md) Section 5.1:

**Quorum: Two-thirds (2/3) of voting TSC members = 8 of 11 members**

| Situation | Action |
|-----------|--------|
| Quorum met | Proceed with binding decisions |
| Quorum not met | Discussion only; decisions provisional |
| Provisional decisions | Must be ratified at next quorate meeting |

### 3.3 Observers

**Members and Observers** (per Charter membership tiers) may attend public TSC sessions.

| Role | Rights |
|------|--------|
| TSC Members | Full participation and voting |
| Active Contributors | Participate in discussion when recognized |
| Members (organizational) | Observe, request to speak via Chair |
| Observers | Observe only, no speaking unless invited |

### 3.4 Executive Sessions

**When:** Personnel matters, legal matters, Code of Conduct cases, competitive-sensitive technical discussions

**Who:** TSC members only; observers dismissed

**Records:** Summary decisions only (no detailed minutes)

---

## 4. Transparency Policy

Per [CHARTER.md](../CHARTER.md) Section 8 hybrid model.

### 4.1 Deliberations

| Session Type | Openness |
|--------------|----------|
| Regular TSC (technical) | May be private to enable candid debate |
| Executive session | Always private (TSC members only) |
| Working groups | Default private, may be opened by group vote |

**Rationale:** Private deliberations protect the ability of competing luxury brands to participate honestly without fear of competitive disclosure.

### 4.2 Decisions

**All decisions are published** regardless of whether deliberations were private.

Published decision records include:
- Full statement of the decision
- Rationale and key considerations
- Dissenting positions (if members consent to attribution)
- Effective date

**Timeline:** Decisions published within seven (7) days of adoption.

### 4.3 Meeting Minutes

| Record Type | Availability | Timeline |
|-------------|--------------|----------|
| Summary minutes | Public | Within 14 days |
| Detailed minutes | Members and Founding Partners | Within 7 days |
| Recordings | Not published | N/A |

**Summary Minutes Include:**
- Date, time, duration
- Attendees (with TSC member/observer distinction)
- Agenda items discussed
- Decisions made (with brief rationale)
- Action items assigned
- Next meeting date

**Detailed Minutes Include:**
- Everything in summary minutes
- Discussion points and alternatives considered
- Vote counts (not individual votes unless member requests attribution)
- Full rationale documentation

**Recordings:** Meeting recordings are not published. This encourages candid discussion among competitors. Recordings may be retained internally for minute preparation and deleted after 30 days.

---

## 5. Agenda

### 5.1 Agenda Publication

| Timeline | Action |
|----------|--------|
| T-7 days | Draft agenda circulated to TSC |
| T-3 days | Final agenda published |
| T-0 | Meeting held |

### 5.2 Standing Items

Every regular meeting includes:
1. Roll call and quorum confirmation
2. Antitrust compliance reminder
3. Approval of previous minutes
4. Action item review
5. [Variable agenda items]
6. Action item summary
7. Next meeting confirmation

### 5.3 Requesting Agenda Items

Any participant may request an agenda item:

| Requester | Method | Deadline |
|-----------|--------|----------|
| TSC member | Email to Chair | T-5 days |
| Active Contributor | Email to Chair via TSC mailing list | T-7 days |
| Working Group | Via Working Group lead | T-7 days |

The Chair sets the final agenda. Declined items are acknowledged with rationale.

### 5.4 RFC Scheduling

RFCs ready for TSC review are scheduled according to:
- Review period status (has comment period closed?)
- RFC type and urgency (security > breaking > major > minor)
- Working Group recommendation status
- Author availability for questions

---

## 6. Decision Making

### 6.1 Default: Lazy Consensus

**Lazy consensus** is the default decision mechanism for non-controversial matters.

**Process:**
1. Proposal presented (verbally or in writing)
2. Call for objections
3. If no objections after reasonable time: approved
4. "Reasonable time": In meeting = 2 minutes; asynchronous = 72 hours

### 6.2 Explicit Vote

A formal vote is called when:
- Any member requests a vote
- Consensus is unclear
- Matter is controversial
- Breaking change RFC (always requires explicit vote)
- Charter or process changes

**Vote process:**
1. Chair states the motion clearly
2. Call for discussion
3. Call for vote (show of hands or roll call)
4. Record: approve, oppose, abstain
5. Announce result

### 6.3 Voting Thresholds

| Matter | Threshold | Notes |
|--------|-----------|-------|
| Standard decisions | Majority of members present | Quorum required |
| Electronic/async votes | Majority of all members | 7-day minimum |
| Breaking changes | No valid veto (see Section 6.4) | Veto rules apply |
| Removal of member | 2/3 of members (excluding subject) | See ELECTIONS.md |

### 6.4 Breaking Change Veto

Per [CHARTER.md](../CHARTER.md) Section 6:

- Any TSC member may veto breaking changes
- Veto must include technical justification and alternative proposal
- Valid veto triggers 90-day resolution period
- Override requires unanimous TSC (excluding veto holder) or 2/3 Governing Board

### 6.5 Tie Breaking

If a vote results in a tie:
- Chair casts deciding vote
- If Chair has already voted, Chair may change vote to break tie
- If Chair abstains from tie-breaking, motion fails

---

## 7. Minutes Template

### 7.1 Summary Minutes Format

```markdown
# TSC Meeting - [DATE]

**Date:** [YYYY-MM-DD]
**Time:** [HH:MM-HH:MM UTC]
**Type:** Regular | Special | [Working Group Name]

## Attendees

### TSC Members Present
- [Name] (Organization)
- [Name] (Organization)
[Quorum: Yes/No (X of 11)]

### TSC Members Absent
- [Name] (Organization) - [excused/unexcused]

### Observers
- [Name] (Organization) - [Member/Observer/Guest]

## Agenda Items

### 1. [Topic]
**Discussion:** [Brief summary]
**Decision:** [Outcome]
**Action:** [If any - owner, deadline]

### 2. [Topic]
[...]

## Action Items

| # | Action | Owner | Deadline | Status |
|---|--------|-------|----------|--------|
| 1 | [Description] | [Name] | [Date] | Open |

## Next Meeting

**Date:** [YYYY-MM-DD]
**Time:** [HH:MM UTC]
**Focus:** [If known]

---
*Minutes prepared by: [Name]*
*Approved: [Date of approval]*
```

### 7.2 Decision Record Format

```markdown
# TSC Decision - [NUMBER]

**Decision ID:** TSC-[YYYY]-[NNN]
**Date:** [YYYY-MM-DD]
**Meeting:** [Regular/Special/Async] - [Date]

## Decision

[Clear statement of what was decided]

## Rationale

[Key reasons for the decision]

## Alternatives Considered

[Other options discussed]

## Dissent

[Dissenting views, if any members consent to attribution]

## Effective Date

[When this decision takes effect]

## Related

- RFC: [If applicable]
- Previous decisions: [If superseding]
```

---

## 8. Minutes Location

### 8.1 Storage

All meeting minutes are stored in the project repository:

```
governance/
└── tsc/
    └── minutes/
        ├── README.md
        ├── 2026/
        │   ├── 2026-01-15.md
        │   ├── 2026-01-29.md
        │   └── ...
        └── decisions/
            ├── TSC-2026-001.md
            └── ...
```

### 8.2 Archive Policy

- All minutes preserved indefinitely
- No minutes may be deleted or modified after approval
- Corrections appended as addenda
- Git history serves as audit trail

### 8.3 Access

| Content | Access |
|---------|--------|
| Summary minutes | Public (main branch) |
| Detailed minutes | Members only (separate access-controlled system) |
| Decision records | Public (main branch) |

---

## 9. Remote Participation

### 9.1 Primary Platform

- **Video Conference:** [Platform TBD - e.g., Zoom, Google Meet, Teams]
- **Dial-in Audio:** Available as backup
- **Meeting Link:** Published with agenda

### 9.2 Participation Guidelines

| Feature | Usage |
|---------|-------|
| Video | Encouraged but not required |
| Audio | Mute when not speaking |
| Chat | Questions, links, non-disruptive comments |
| Screen share | For presentations with Chair permission |
| Recording | Not permitted by attendees |

### 9.3 Technical Issues

- Chair waits 5 minutes for quorum if technical issues
- If platform fails, backup communication via [email/chat TBD]
- Meeting may be rescheduled if persistent issues prevent quorum

### 9.4 Asynchronous Participation

For those unable to attend live:
- Review minutes when published
- Submit written input to agenda items via TSC mailing list
- Vote asynchronously on electronic votes
- Raise concerns via Chair within 7 days of meeting

---

## 10. Emergency Procedures

### 10.1 Security Issues

For critical security vulnerabilities:

| Phase | Timeline | Action |
|-------|----------|--------|
| Discovery | T+0 | Reporter notifies TSC Chair |
| Triage | T+24h max | Chair convenes emergency session |
| Session | T+24-48h | TSC meets with reduced quorum (6 of 11) |
| Disclosure | T+72h | Coordinated disclosure per VERSIONING.md |

**Reduced Quorum Exception:** For security-only emergency sessions, 6 of 11 TSC members constitute quorum. All other matters deferred to regular meeting.

### 10.2 Out-of-Band Decisions

When immediate decision required before next meeting:

1. Chair proposes decision via TSC mailing list
2. 48-hour comment period (security: 24 hours)
3. Majority of all TSC members must respond affirmatively
4. Decision effective immediately upon threshold reached
5. **Must be ratified** at next regular TSC meeting

### 10.3 Chair Unavailability

If Chair unavailable for emergency:
1. Vice-Chair assumes responsibilities
2. If no Vice-Chair, most senior TSC member (by tenure)
3. Temporary authority until Chair returns

---

## 11. Meeting Conduct

### 11.1 Antitrust Reminder

Every meeting begins with:

> "This meeting is conducted in compliance with applicable antitrust laws. Discussions of pricing, market allocation, boycotts, and competitive intelligence are strictly prohibited. Please object and leave if discussion ventures into prohibited territory."

### 11.2 Code of Conduct

All participants are bound by the [Code of Conduct](../CODE_OF_CONDUCT.md). Meeting-specific expectations:

- Respect speaking time allocations
- Avoid interrupting others
- Direct criticism at ideas, not individuals
- Declare conflicts of interest before relevant discussions
- Honor confidentiality of executive sessions

### 11.3 Speaking

- Raise hand (physically or virtually) to speak
- Chair recognizes speakers in order
- Chair may limit speaking time in lengthy discussions
- Chair may table items if insufficient time

---

## References

- [CHARTER.md](../CHARTER.md) - Authoritative source for TSC powers and quorum
- [MEMBERS.md](./MEMBERS.md) - Current TSC roster
- [ELECTIONS.md](./ELECTIONS.md) - TSC election procedures
- [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md) - Behavioral standards
- [VERSIONING.md](../VERSIONING.md) - Security disclosure procedures

---

*This document is part of the Galileo Luxury Standard governance framework.*
