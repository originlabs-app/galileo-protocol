export const metadata = {
  title: "Versioning Policy",
  description:
    "Versioning and release policy for the Galileo Luxury Standard. Semantic versioning, semiannual release cadence, 10-year deprecation sunset, veto mechanism for breaking changes, and security hotfix process.",
};

export default function VersioningPage() {
  return (
    <>
      <h1>Versioning and Release Policy</h1>

      <p className="text-xl text-[var(--platinum)] leading-relaxed">
        The Galileo Luxury Standard uses Semantic Versioning with extended
        deprecation timelines reflecting luxury product lifecycles, where
        products have multi-generational lifecycles and adopters require
        exceptional stability guarantees.
      </p>

      <h2>1. Version Format</h2>
      <p>
        The Standard uses <strong>Semantic Versioning 2.0.0</strong> (SemVer):
      </p>
      <pre>
        <code>MAJOR.MINOR.PATCH</code>
      </pre>
      <ul>
        <li>
          <strong>MAJOR</strong> &mdash; Breaking changes
          (backward-incompatible). Examples: field renamed, required field
          removed, semantic change.
        </li>
        <li>
          <strong>MINOR</strong> &mdash; New features (backward-compatible
          additions). Examples: new optional field added, new endpoint.
        </li>
        <li>
          <strong>PATCH</strong> &mdash; Bug fixes and clarifications (no
          functional change). Examples: typo correction, documentation
          clarification.
        </li>
      </ul>

      <h3>Pre-release Versions</h3>
      <pre>
        <code>{`1.0.0-alpha.1    # Early development, unstable
1.0.0-beta.1     # Feature complete, testing
1.0.0-rc.1       # Release candidate, final validation`}</code>
      </pre>
      <p>
        Pre-release versions are not covered by deprecation guarantees, may
        contain breaking changes, and should not be used in production
        implementations.
      </p>

      <h2>2. What Constitutes a Breaking Change</h2>
      <p>
        A <strong>breaking change</strong> is any modification that would cause
        a previously-conformant implementation to become non-conformant.
      </p>

      <h3>Breaking Changes (Require MAJOR Version)</h3>
      <ul>
        <li>Field removal or rename</li>
        <li>Semantic change (e.g., changing date format)</li>
        <li>Type change on existing field</li>
        <li>Validation tightening on existing fields</li>
        <li>Enum restriction (removing values from closed enumeration)</li>
        <li>Endpoint removal or authentication change</li>
        <li>Protocol change (transport or encoding)</li>
      </ul>

      <h3>Non-Breaking Changes (MINOR or PATCH)</h3>
      <ul>
        <li>Adding optional fields or endpoints (MINOR)</li>
        <li>Extending open enums (MINOR)</li>
        <li>Relaxing validation (making required field optional) (MINOR)</li>
        <li>Documentation clarifications, typo corrections (PATCH)</li>
      </ul>

      <h2>3. Release Schedule</h2>

      <h3>Semiannual Cadence</h3>
      <ul>
        <li>
          <strong>Minor releases</strong> &mdash; Semiannual (March and
          September). New features and improvements.
        </li>
        <li>
          <strong>Patch releases</strong> &mdash; As needed, typically monthly.
          Bug fixes and clarifications.
        </li>
        <li>
          <strong>Major releases</strong> &mdash; Only when necessary, with
          minimum 60-day RFC review. Breaking changes.
        </li>
      </ul>

      <h3>Semiannual Schedule Rationale</h3>
      <p>The March/September cadence provides:</p>
      <ul>
        <li>
          <strong>ERP integration predictability</strong> &mdash; Enterprise
          adopters can plan integration work around known release dates
        </li>
        <li>
          <strong>RFC consensus time</strong> &mdash; Sufficient time to gather
          feedback from diverse stakeholders
        </li>
        <li>
          <strong>Industry alignment</strong> &mdash; Avoids major fashion
          industry events (Fashion Weeks, SIHH, Baselworld)
        </li>
        <li>
          <strong>Testing windows</strong> &mdash; Allows thorough validation
          before adoption
        </li>
      </ul>

      <h3>Release Timeline</h3>
      <pre>
        <code>{`T-8 weeks    RFC submission deadline for inclusion
T-4 weeks    Feature freeze (no new features accepted)
T-2 weeks    Release candidate published
T-0          Final release published`}</code>
      </pre>

      <h2>4. Breaking Change Process</h2>
      <p>
        Breaking changes are taken seriously because they affect every
        implementor. The process requires:
      </p>
      <ul>
        <li>
          An RFC for each breaking change with a minimum 60-day review period
        </li>
        <li>
          <strong>TSC veto rights apply</strong> &mdash; Any TSC member may
          exercise a veto on proposed breaking changes (see the{" "}
          <a href="/docs/governance/charter">Governance Charter</a> Section 6)
        </li>
        <li>
          A comprehensive migration guide with code examples, prepared at least
          30 days before release
        </li>
        <li>
          An extended release candidate period (4 weeks) with active outreach to
          major adopters
        </li>
      </ul>

      <h2>5. Deprecation Policy</h2>

      <h3>10-Year Sunset Period</h3>
      <p>
        Deprecated features have a <strong>10-year sunset period</strong> from
        the deprecation announcement date.
      </p>
      <p>
        <strong>Rationale:</strong> The luxury goods industry operates on
        timescales incompatible with standard software deprecation practices:
      </p>
      <ul>
        <li>Fine watches are passed between generations</li>
        <li>Jewelry pieces may be held for 50+ years</li>
        <li>Heritage leather goods appreciate with age</li>
        <li>Wine and spirits may be cellared for decades</li>
      </ul>

      <h3>During the Sunset Period</h3>
      <ul>
        <li>Feature remains fully functional</li>
        <li>Documentation maintained</li>
        <li>Security fixes and bug fixes provided</li>
        <li>No new features for deprecated components</li>
      </ul>
      <p>
        After sunset, the feature may be removed in the next MAJOR release.
        Documentation is archived but available.
      </p>

      <h3>Deprecation Notification Schedule</h3>
      <ul>
        <li>
          <strong>At deprecation</strong> &mdash; Full documentation, migration
          guide, sunset date stated
        </li>
        <li>
          <strong>5-year notice</strong> &mdash; Reminder notification,
          migration resources
        </li>
        <li>
          <strong>2-year notice</strong> &mdash; Escalated notice, migration
          support offered
        </li>
        <li>
          <strong>1-year notice</strong> &mdash; Final migration planning window
        </li>
        <li>
          <strong>6-month notice</strong> &mdash; Urgent migration reminder
        </li>
        <li>
          <strong>3-month final warning</strong> &mdash; Last call, removal
          imminent
        </li>
      </ul>

      <h2>6. Security Hotfixes</h2>

      <h3>72-Hour Coordinated Disclosure</h3>
      <p>
        Critical security vulnerabilities receive expedited handling with a
        72-hour coordinated disclosure window.
      </p>
      <pre>
        <code>{`T-0h     Vulnerability reported to security contact
T+4h     Initial triage and severity assessment
T+24h    Fix developed and tested (if critical)
T-72h    Private notification to known adopters
T-48h    Patch release prepared
T-24h    Final testing
T-0h     Public release and advisory`}</code>
      </pre>

      <h3>Severity Response Times</h3>
      <ul>
        <li>
          <strong>Critical (CVSS 9.0&ndash;10.0)</strong> &mdash; 72-hour
          coordinated disclosure
        </li>
        <li>
          <strong>High (CVSS 7.0&ndash;8.9)</strong> &mdash; 7-day coordinated
          disclosure
        </li>
        <li>
          <strong>Medium (CVSS 4.0&ndash;6.9)</strong> &mdash; Next patch
          release
        </li>
        <li>
          <strong>Low (CVSS 0.1&ndash;3.9)</strong> &mdash; Next minor release
        </li>
      </ul>
      <p>
        Report vulnerabilities to: <code>security@galileoprotocol.io</code>
      </p>

      <h2>7. Long-Term Support (LTS)</h2>
      <p>The last minor release of each MAJOR version receives LTS status:</p>
      <ul>
        <li>Security fixes for the full 10-year sunset period</li>
        <li>Critical bug fixes for 5 years</li>
        <li>Documentation maintained for 10 years</li>
      </ul>

      <h2>8. Backward Compatibility</h2>
      <ul>
        <li>
          <strong>Forward compatibility:</strong> Newer versions can always read
          data created under older versions of the same MAJOR release.
        </li>
        <li>
          <strong>Unknown field handling:</strong> Implementations MUST NOT
          reject documents containing unknown fields. Unknown fields SHOULD be
          preserved in round-trip scenarios.
        </li>
        <li>
          A conformant implementation MUST support the current MAJOR version and
          SHOULD support the previous MAJOR version during its sunset period.
        </li>
      </ul>

      <h2>Related Documents</h2>
      <ul>
        <li>
          <a href="/docs/governance/charter">Governance Charter</a> &mdash; Veto
          mechanism and breaking change governance
        </li>
        <li>
          <a href="/docs/rfc-process">RFC Process</a> &mdash; How changes are
          proposed and approved
        </li>
      </ul>
    </>
  );
}
