# Versioning and Release Policy

## Overview

This document defines the versioning, release, and deprecation policies for the Galileo Luxury Standard. These policies are designed for the unique requirements of the luxury goods industry, where products have multi-generational lifecycles and adopters require exceptional stability guarantees.

**Key principles:**
- Predictable releases for enterprise planning
- Extended deprecation timelines reflecting luxury product lifecycles
- Rapid security response when needed
- Clear backward compatibility commitments

---

## 1. Version Format

The Galileo Luxury Standard uses **Semantic Versioning 2.0.0** (SemVer).

### Format

```
MAJOR.MINOR.PATCH
```

| Component | Meaning | Example Change |
|-----------|---------|----------------|
| **MAJOR** | Breaking changes (backward-incompatible) | Field renamed, required field removed, semantic change |
| **MINOR** | New features (backward-compatible additions) | New optional field added, new endpoint |
| **PATCH** | Bug fixes, clarifications (no functional change) | Typo correction, documentation clarification |

### Version Progression Examples

| Change | Old Version | New Version | Rationale |
|--------|-------------|-------------|-----------|
| Required field removed | 1.2.3 | **2.0.0** | Breaking change: existing implementations break |
| Field renamed | 1.2.3 | **2.0.0** | Breaking change: existing data invalid |
| Semantics changed | 1.2.3 | **2.0.0** | Breaking change: interpretation differs |
| New optional field | 1.2.3 | 1.**3.0** | Feature addition: backward compatible |
| New endpoint added | 1.2.3 | 1.**3.0** | Feature addition: extends capability |
| New enum value added | 1.2.3 | 1.**3.0** | Feature addition: open enum expanded |
| Typo fixed in docs | 1.2.3 | 1.2.**4** | Patch: no functional change |
| Example clarified | 1.2.3 | 1.2.**4** | Patch: no functional change |

### Pre-release Versions

Pre-release versions use suffixes appended to the version number:

```
1.0.0-alpha.1    # Early development, unstable
1.0.0-beta.1     # Feature complete, testing
1.0.0-rc.1       # Release candidate, final validation
```

Pre-release versions:
- Are NOT covered by deprecation guarantees
- May contain breaking changes between pre-release versions
- Should not be used in production implementations

---

## 2. What Constitutes a Breaking Change

A **breaking change** is any modification that would cause a previously-conformant implementation to become non-conformant.

### Breaking Changes (Require MAJOR Version)

| Category | Examples |
|----------|----------|
| **Field removal** | Removing a required field; removing an optional field that implementations depend on |
| **Field rename** | Changing `productId` to `product_identifier` |
| **Semantic change** | Changing date format from ISO 8601 to Unix timestamp |
| **Type change** | Changing a field from `string` to `integer` |
| **Validation tightening** | Adding new required constraints to existing fields |
| **Enum restriction** | Removing values from a closed enumeration |
| **Endpoint removal** | Removing an API endpoint or operation |
| **Authentication change** | Changing required authentication mechanism |
| **Protocol change** | Changing required transport or encoding |

### Non-Breaking Changes (MINOR or PATCH)

| Category | Examples | Version Impact |
|----------|----------|----------------|
| **Adding optional fields** | New optional metadata field | MINOR |
| **Adding endpoints** | New query operation | MINOR |
| **Extending open enums** | Adding new status value to open enum | MINOR |
| **Relaxing validation** | Making a required field optional | MINOR |
| **Documentation** | Clarifying ambiguous text | PATCH |
| **Typo correction** | Fixing spelling errors | PATCH |
| **Example updates** | Improving code examples | PATCH |

### Closed vs. Open Enumerations

- **Closed enumeration:** All valid values are explicitly listed; adding values is BREAKING
- **Open enumeration:** Listed values are examples; implementations must handle unknown values gracefully

The specification explicitly marks each enumeration as closed or open.

---

## 3. Release Schedule

### Planned Release Cadence

| Release Type | Frequency | Timing | Purpose |
|--------------|-----------|--------|---------|
| **Minor releases** | Semiannual | March, September | New features, improvements |
| **Patch releases** | As needed | Typically monthly | Bug fixes, clarifications |
| **Major releases** | Only when necessary | Minimum 60-day RFC review | Breaking changes |

### Semiannual Schedule Rationale

The semiannual release cadence (March and September) provides:

1. **ERP integration predictability** - Enterprise adopters can plan integration work around known release dates
2. **RFC consensus time** - Sufficient time to gather feedback from diverse stakeholders
3. **Industry alignment** - Avoids major fashion industry events (Fashion Weeks, SIHH, Baselworld)
4. **Testing windows** - Allows thorough validation before adoption

### Release Timeline

```
T-8 weeks    RFC submission deadline for inclusion
T-4 weeks    Feature freeze (no new features accepted)
T-2 weeks    Release candidate published
T-0          Final release published
```

---

## 4. Release Process

### Minor/Patch Release Process

1. **Feature freeze** (T-4 weeks)
   - No new features accepted for this release
   - Only bug fixes and documentation improvements

2. **Release candidate** (T-2 weeks)
   - RC version published for validation
   - Adopters encouraged to test against RC
   - Final call for critical bug reports

3. **Final release** (T-0)
   - Version number updated
   - Release notes published
   - CHANGELOG.md updated
   - Announcement to mailing list

### Major Release Process

Major releases require additional governance:

1. **RFC for breaking changes** (T-minimum 60 days)
   - Each breaking change requires separate RFC
   - 60-day minimum review period
   - TSC veto rights apply

2. **Migration guide preparation** (T-30 days)
   - Comprehensive migration documentation
   - Code examples for common patterns
   - Tool support where feasible

3. **Extended RC period** (T-4 weeks)
   - Longer validation window for breaking changes
   - Active outreach to major adopters

4. **Coordinated release**
   - Communication to all known adopters
   - Support channels prepared for migration questions

### Artifacts

Each release includes:

| Artifact | Location | Purpose |
|----------|----------|---------|
| Specification documents | `/spec/` | Normative specification text |
| JSON schemas | `/schemas/` | Machine-readable validation |
| CHANGELOG.md | Repository root | Human-readable change history |
| Release notes | GitHub Releases | Highlights and migration notes |
| Migration guide | `docs/migration/` (created with each major release) | For major releases only |

---

## 5. Deprecation Policy

### 10-Year Sunset Period

Deprecated features have a **10-year sunset period** from the deprecation announcement date.

**Rationale:** The luxury goods industry operates on timescales incompatible with standard software deprecation practices:

- Fine watches are passed between generations
- Jewelry pieces may be held for 50+ years
- Heritage leather goods appreciate with age
- Wine and spirits may be cellared for decades

A 10-year sunset ensures adopters are never forced into emergency migrations due to specification changes.

### Contrast with Industry Norms

| Industry | Typical Deprecation | Galileo Standard |
|----------|---------------------|------------------|
| SaaS platforms | 6-12 months | 10 years |
| Enterprise software | 12-24 months | 10 years |
| Web APIs | 12-24 months | 10 years |
| Cloud services | 12-36 months | 10 years |

### What Deprecation Means

During the 10-year sunset period:

| Aspect | Status |
|--------|--------|
| Feature availability | Fully functional |
| Documentation | Maintained |
| Security fixes | Provided |
| Bug fixes | Provided |
| New development | No new features for deprecated components |
| Support | Available |

After sunset:
- Feature may be removed in next MAJOR release
- Documentation archived but available
- Community support only

---

## 6. Deprecation Process

### Announcement

Deprecated features are marked in the next minor release with:
- `@deprecated` annotation in specification text
- Entry in CHANGELOG.md deprecation section
- Migration guide to recommended alternative
- Sunset date clearly stated

### Notification Schedule

Adopters receive deprecation notifications at these milestones:

| Milestone | Timing | Action |
|-----------|--------|--------|
| **Announcement** | At deprecation | Full documentation of deprecation, migration guide |
| **5-year notice** | 5 years before sunset | Reminder notification, migration resources |
| **2-year notice** | 2 years before sunset | Escalated notice, migration support offered |
| **1-year notice** | 1 year before sunset | Final migration planning window |
| **6-month notice** | 6 months before sunset | Urgent migration reminder |
| **3-month final warning** | 3 months before sunset | Last call, removal imminent |

### Notification Channels

Deprecation notifications are distributed via:
- Mailing list announcement
- GitHub repository notice
- Specification document annotations
- HTTP response headers (for API deprecations)

### Documentation Requirements

For each deprecated feature:
- Original documentation maintained until sunset
- Migration guide with code examples
- Rationale for deprecation
- Recommended replacement

---

## 7. HTTP Headers for API Deprecation

API deprecations use standard HTTP headers per RFC 8594 (Sunset) and RFC 9745 (Deprecation).

### Sunset Header (RFC 8594)

Indicates when a resource will become unavailable:

```http
Sunset: Sat, 31 Dec 2035 23:59:59 GMT
```

### Deprecation Header (RFC 9745)

Indicates when a resource was deprecated:

```http
Deprecation: @1577836800
```

The timestamp is a Unix epoch value indicating when deprecation was announced.

### Link Header

Points to deprecation documentation:

```http
Link: <https://spec.galileoprotocol.io/deprecations/field-xyz>; rel="deprecation"
```

### Complete Example

For an API endpoint deprecated on January 1, 2026, with sunset on January 1, 2036:

```http
HTTP/1.1 200 OK
Content-Type: application/json
Deprecation: @1735689600
Sunset: Thu, 01 Jan 2036 00:00:00 GMT
Link: <https://spec.galileoprotocol.io/deprecations/v1-legacy-endpoint>; rel="deprecation"

{ "data": "..." }
```

### Implementation Guidance

Conformant implementations SHOULD:
- Return deprecation headers for all deprecated endpoints
- Log client usage of deprecated features
- Provide monitoring for deprecated feature usage

---

## 8. Security Hotfixes

### 72-Hour Coordinated Disclosure

Critical security vulnerabilities receive expedited handling with a **72-hour coordinated disclosure window**.

### Process

```
T-0h        Vulnerability reported to security contact
T+4h        Initial triage and severity assessment
T+24h       Fix developed and tested (if critical)
T-72h       Private notification to known adopters
T-48h       Patch release prepared
T-24h       Final testing
T-0h        Public release and advisory
```

### Severity Assessment

Vulnerabilities are assessed using CVSS (Common Vulnerability Scoring System):

| CVSS Score | Severity | Response Time |
|------------|----------|---------------|
| 9.0-10.0 | Critical | 72h coordinated disclosure |
| 7.0-8.9 | High | 7-day coordinated disclosure |
| 4.0-6.9 | Medium | Next patch release |
| 0.1-3.9 | Low | Next minor release |

### Security Contact

Report vulnerabilities to: **security@galileoprotocol.io**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if known)

### Private Notification

Known adopters receive private notification before public disclosure:
- 72 hours for Critical vulnerabilities
- 7 days for High vulnerabilities

This allows adopters to prepare patches and protect their implementations.

### Public Disclosure

Public disclosure includes:
- Security advisory with CVE identifier (if applicable)
- Affected versions
- Patched versions
- Mitigation steps
- Credit to reporter (if desired)

### What Constitutes a Security Vulnerability

| Category | Examples |
|----------|----------|
| **Data exposure** | Specification flaw enabling unauthorized data access |
| **Authentication bypass** | Weakness in identity verification patterns |
| **Cryptographic weakness** | Flawed cryptographic recommendations |
| **Injection vectors** | Specification patterns enabling injection attacks |
| **Privacy leakage** | Unintended personal data exposure patterns |

---

## 9. Version Support Matrix

### Support Levels

| Version Status | Features | Bug Fixes | Security Fixes | Documentation |
|----------------|----------|-----------|----------------|---------------|
| **Current MAJOR** | Yes | Yes | Yes | Yes |
| **Previous MAJOR** (during sunset) | No | Yes | Yes | Maintained |
| **Older MAJOR** (post-sunset) | No | No | Community only | Archived |

### Example Support Matrix

| Version | Status | Support Level | Sunset Date |
|---------|--------|---------------|-------------|
| 3.x | Current | Full | - |
| 2.x | Sunset period | Security + Bug fixes | 2035-01-01 |
| 1.x | Post-sunset | Community only | 2030-01-01 (passed) |

### Long-Term Support (LTS)

The last minor release of each MAJOR version receives LTS status:
- Security fixes for the full 10-year sunset period
- Critical bug fixes for 5 years
- Documentation maintained for 10 years

---

## 10. Specification Version in Documents

### Document Headers

All specification documents include version information:

```yaml
---
specification: Galileo Luxury Standard
version: 1.2.3
status: Final
date: 2026-03-15
---
```

### JSON-LD Context

The JSON-LD @context includes version in the URL:

```json
{
  "@context": "https://spec.galileoprotocol.io/v1/context.jsonld"
}
```

Version in context URL:
- Major version only (`v1`, `v2`)
- Ensures documents remain valid during minor/patch updates
- Breaking changes require context URL change

### Schema URLs

JSON schemas include full version:

```
https://spec.galileoprotocol.io/schemas/v1.2.3/dpp.schema.json
```

Schema URL resolution:
- Full version available for precise validation
- Major-only aliases available for flexibility

### Version Discovery

Implementations can discover the current version via:

```http
GET https://spec.galileoprotocol.io/.well-known/version
```

Response:
```json
{
  "current": "1.2.3",
  "latest_major": "1",
  "supported_majors": ["1"],
  "deprecated_majors": [],
  "sunset_dates": {}
}
```

---

## 11. Backward Compatibility Commitment

### Forward Compatibility

Newer versions of the specification can always read data created under older versions of the same MAJOR release:

- Version 1.3.0 implementation can read version 1.0.0 data
- Version 2.0.0 implementation can read version 1.x data (with documented transformation)

### Backward Compatibility Scope

Older versions may not read newer data:

- Version 1.0.0 implementation may not understand version 1.3.0 extensions
- Implementations SHOULD ignore unknown fields gracefully (per JSON processing rules)

### Conformance Requirements

A conformant implementation:
- MUST support the current MAJOR version
- SHOULD support the previous MAJOR version (during sunset)
- MAY support older versions

### Unknown Field Handling

Implementations MUST NOT reject documents containing unknown fields:
- Unknown fields SHOULD be preserved in round-trip scenarios
- Unknown fields MAY be ignored for processing
- Unknown fields MUST NOT cause validation failure

This enables forward compatibility with specification extensions.

---

## 12. Version History

### Template

| Version | Date | Type | Summary |
|---------|------|------|---------|
| X.Y.Z | YYYY-MM-DD | Major/Minor/Patch | Brief description of changes |

### Example

| Version | Date | Type | Summary |
|---------|------|------|---------|
| 1.0.0 | 2027-03-01 | Major | Initial stable release |
| 1.1.0 | 2027-09-01 | Minor | Added molecular signature extension |
| 1.1.1 | 2027-10-15 | Patch | Clarified timestamp format requirements |
| 1.2.0 | 2028-03-01 | Minor | Added multi-language product descriptions |

---

## Appendix A: SemVer 2.0.0 Reference

This policy follows [Semantic Versioning 2.0.0](https://semver.org/).

Key rules:
1. Once a versioned package has been released, contents MUST NOT be modified
2. Major version zero (0.y.z) is for initial development
3. Version 1.0.0 defines the public API
4. Patch version increments for backward-compatible bug fixes
5. Minor version increments for backward-compatible new features
6. Major version increments for backward-incompatible changes

## Appendix B: HTTP Header References

- [RFC 8594: The Sunset HTTP Header Field](https://datatracker.ietf.org/doc/html/rfc8594)
- [RFC 9745: The Deprecation HTTP Header Field](https://datatracker.ietf.org/doc/html/rfc9745)

## Appendix C: CVSS Reference

- [CVSS v3.1 Specification](https://www.first.org/cvss/v3.1/specification-document)
- [CVSS Calculator](https://www.first.org/cvss/calculator/3.1)

---

*Document version: 1.0.0*
*Last updated: 2026-01-30*
*Maintainer: Galileo Luxury Standard TSC*
