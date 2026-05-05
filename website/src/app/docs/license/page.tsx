export const metadata = {
  title: "License",
  description:
    "Apache 2.0 license details for the Galileo Luxury Standard. Understand what you can do, your obligations, the patent grant, and why this license fits luxury brands.",
};

export default function LicensePage() {
  return (
    <>
      <h1>License</h1>

      <p className="text-xl text-[var(--platinum)] leading-relaxed">
        The Galileo Luxury Standard is released under the Apache License,
        Version 2.0. This page explains what this means for users, implementors,
        and contributors.
      </p>

      <h2>Why Apache 2.0?</h2>
      <p>
        The Apache License 2.0 was chosen because it provides the best balance
        of openness and protection for an industry standard:
      </p>
      <ul>
        <li>
          <strong>Permissive</strong> &mdash; Anyone can use, modify, and
          distribute the standard without restriction, including in proprietary
          products.
        </li>
        <li>
          <strong>Patent grant</strong> &mdash; Contributors automatically grant
          a royalty-free patent license, protecting implementors from patent
          claims.
        </li>
        <li>
          <strong>No copyleft</strong> &mdash; Implementations are not required
          to be open source, which is essential for luxury brands with
          proprietary systems.
        </li>
        <li>
          <strong>Industry standard</strong> &mdash; Apache 2.0 is widely
          understood and accepted by corporate legal teams.
        </li>
      </ul>

      <h2>What You Can Do</h2>
      <ul>
        <li>
          <strong>Use freely</strong> &mdash; Implement the Galileo
          specification in any product, commercial or non-commercial, without
          paying royalties.
        </li>
        <li>
          <strong>Modify</strong> &mdash; Create extensions, profiles, or
          derived specifications tailored to your needs.
        </li>
        <li>
          <strong>Distribute</strong> &mdash; Include the specification in your
          documentation, SDKs, or products.
        </li>
        <li>
          <strong>Sublicense</strong> &mdash; Grant your customers the same
          rights under the Apache 2.0 terms.
        </li>
      </ul>

      <h2>What You Must Do</h2>
      <ul>
        <li>
          <strong>Include the license</strong> &mdash; Any distribution of the
          specification or substantial portions of it must include a copy of the
          Apache 2.0 license.
        </li>
        <li>
          <strong>State changes</strong> &mdash; If you modify the
          specification, you must note that changes were made. You cannot
          present a modified version as the official Galileo standard.
        </li>
        <li>
          <strong>Preserve notices</strong> &mdash; Retain all copyright,
          patent, trademark, and attribution notices from the original files.
        </li>
      </ul>

      <h2>What You Cannot Do</h2>
      <ul>
        <li>
          <strong>Use trademarks</strong> &mdash; The Apache 2.0 license does
          not grant permission to use the Galileo name, logo, or trademarks.
          Trademark usage requires separate authorization.
        </li>
        <li>
          <strong>Hold contributors liable</strong> &mdash; The specification is
          provided &quot;as is&quot; without warranties. Contributors are not
          liable for any issues arising from the use of the standard.
        </li>
      </ul>

      <h2>Patent Grant</h2>
      <p>
        The Apache 2.0 license includes an express patent grant. Every
        contributor grants a perpetual, worldwide, non-exclusive, royalty-free
        patent license for any patents necessarily infringed by their
        contributions.
      </p>
      <p>This means:</p>
      <ul>
        <li>
          Implementors are protected from patent claims by contributors for
          functionality covered by the specification.
        </li>
        <li>
          If a contributor initiates patent litigation related to their
          contribution, their patent license is automatically terminated.
        </li>
      </ul>

      <h2>For Luxury Brands</h2>
      <p>Apache 2.0 is well-suited for the luxury industry because:</p>
      <ul>
        <li>
          You can build proprietary authentication systems on top of Galileo
          without open-sourcing your code.
        </li>
        <li>
          Your competitors cannot gain special patent advantages through their
          contributions to the standard.
        </li>
        <li>
          The license is stable and well-understood &mdash; no legal surprises.
        </li>
      </ul>

      <h2>Full License Text</h2>
      <p>
        The complete Apache License, Version 2.0 text is available at:{" "}
        <a href="https://www.apache.org/licenses/LICENSE-2.0">
          apache.org/licenses/LICENSE-2.0
        </a>
      </p>

      <h2>Related Documents</h2>
      <ul>
        <li>
          <a href="/docs/governance/charter">Governance Charter</a> &mdash;
          Intellectual property provisions
        </li>
        <li>
          <a href="/docs/contributing">Contributing Guide</a> &mdash; DCO
          sign-off and contribution terms
        </li>
      </ul>
    </>
  );
}
