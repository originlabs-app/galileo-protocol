# RFC Process

This document describes the Request for Comments (RFC) process for proposing changes to the Galileo Protocol specification.

## What is an RFC?

An RFC (Request for Comments) is a formal proposal for specification changes. RFCs ensure that significant changes are thoroughly documented, reviewed by the community, and approved through a transparent process.

### When is an RFC Required?

| Change Type | RFC Required? | Review Period |
|-------------|---------------|---------------|
| New features or capabilities | Yes | 30 days |
| Breaking changes to existing features | Yes | 60 days |
| Non-breaking modifications to existing features | Yes | 30 days |
| Minor clarifications or editorial improvements | Yes | 2 weeks |
| Typos, grammar fixes, formatting | No (direct PR) | - |

## Who Can Submit?

**Anyone.** The Galileo Protocol operates under an Open Contribution model.

- No membership is required to submit an RFC
- RFCs are evaluated on technical merit, not submitter status
- Organizations of any size (from artisan workshops to major maisons) are welcome
- The TSC reviews all RFCs based on their value to the standard

## RFC Lifecycle

```
  Draft          Submitted         Champion          Review           Decision        Implementation
    |                |             Assigned            |                  |                  |
    v                v                |                v                  v                  v
+--------+      +--------+           |           +--------+         +--------+         +--------+
| Author |  ->  |   PR   |  ->   TSC member  ->  | Public |  ->     |  TSC   |  ->     | Merged |
| writes |      | opened |       shepherds       | review |         | votes  |         |  spec  |
+--------+      +--------+                       +--------+         +--------+         +--------+
```

### 1. Draft

The author prepares the RFC using the [RFC template](0000-template.md). Key sections include:

- **Summary**: One-paragraph overview
- **Motivation**: Why this change is needed
- **Guide-level explanation**: How adopters will use this
- **Reference-level explanation**: Technical specification
- **Alternatives**: Other approaches considered

### 2. Submitted

The author opens a Pull Request against the `governance/rfcs/` directory. The PR title should follow the format: `RFC: [Short descriptive title]`.

### 3. Champion Assigned

A TSC member is assigned as the RFC's champion. The champion:

- Shepherds the RFC through the process
- Ensures timely review and feedback
- Facilitates discussion and resolution of concerns
- Presents the RFC for TSC decision

This prevents RFC abandonment and ensures all proposals receive proper attention.

### 4. Review Period

The RFC enters a public comment period based on change type:

| Change Type | Review Period |
|-------------|---------------|
| Minor (non-breaking clarifications) | 2 weeks |
| Major (new features, enhancements) | 30 days |
| Breaking (backward-incompatible) | 60 days |

During this period:
- Community members comment on the PR
- Author responds and may revise the RFC
- Champion tracks open concerns

### 5. Decision

After the review period, the TSC decides:

| Decision | Meaning |
|----------|---------|
| **Accepted** | RFC approved for implementation in target version |
| **Rejected** | RFC not accepted (rationale documented) |
| **Deferred** | RFC postponed for future consideration |

**Decision mechanisms:**

- **Lazy consensus**: If no objections by the review deadline, the RFC proceeds to acceptance
- **Explicit vote**: For contested RFCs, TSC members vote explicitly
- **Breaking changes**: Require veto-free TSC approval (see [CHARTER.md](../CHARTER.md))

### 6. Implementation

Accepted RFCs are:
- Assigned an RFC number (sequential: 0001, 0002, 0003...)
- Merged into the rfcs/ directory
- Implemented in the target specification version
- Status updated to "Implemented" upon release

## RFC Numbering

- **Sequential integers**: 0001, 0002, 0003...
- **Assigned when accepted**: Not at submission time
- **Draft RFCs use placeholder**: `XXXX` in the filename and header

Example: A draft RFC is submitted as `XXXX-multi-language-schema.md`. Upon acceptance, it becomes `0042-multi-language-schema.md`.

## RFC Statuses

| Status | Description |
|--------|-------------|
| **Draft** | Work in progress, not yet submitted |
| **Submitted** | PR opened, under review |
| **Accepted** | Approved for implementation |
| **Implemented** | Released in a specification version |
| **Rejected** | Not accepted (rationale preserved) |
| **Withdrawn** | Author withdrew the proposal |
| **Deferred** | Postponed for future consideration |

## Language

- **Official language**: English
- All RFC text, discussions, and decisions are conducted in English
- The English version is authoritative for interpretation
- **Community translations**: Encouraged for accessibility, but non-authoritative

## Active RFCs

| RFC | Title | Status | Champion | Review Deadline |
|-----|-------|--------|----------|-----------------|
| - | *No active RFCs yet* | - | - | - |

## Accepted RFCs

| RFC | Title | Implemented In |
|-----|-------|----------------|
| - | *No accepted RFCs yet* | - |

## How to Submit an RFC

1. **Fork** the repository
2. **Copy** `0000-template.md` to `XXXX-your-title.md`
3. **Fill in** all sections of the template
4. **Open a Pull Request** with title `RFC: [Your Title]`
5. **Engage** with feedback during the review period

See [CONTRIBUTING.md](../CONTRIBUTING.md) for general contribution guidelines.

---

*This RFC process is inspired by the [Rust RFC process](https://github.com/rust-lang/rfcs) and adapted for the luxury industry standard context.*
