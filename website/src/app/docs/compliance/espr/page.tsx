import Link from "next/link";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata = pageMetadata("/docs/compliance/espr", {
  title: "Digital Product Passport for Luxury: ESPR Guide",
  description: "Plan a digital product passport for luxury goods: distinguish ESPR obligations from Galileo's proposed data model, then identify evidence and integration gaps.",
});

export default function ESPRGuidePage() {
  return (
    <>
      <h1>Digital product passport for luxury</h1>
      <p>
        A digital product passport brings product information into a record that
        people can access through a data carrier. For a luxury business, planning
        starts with the applicable product rules and the evidence behind each field,
        not with a blanket claim of ESPR compliance.
      </p>
      <h2>Which requirements apply?</h2>
      <p>
        Under <a href="https://eur-lex.europa.eu/eli/reg/2024/1781/oj">Regulation (EU) 2024/1781, Articles 4 and 9</a>,
        product-specific delegated acts determine passport requirements. Check the
        act covering your product for its scope, required information and application
        date. There is no single DPP deadline for all luxury products.
      </p>
      <p>
        Articles 10 and 11 set requirements for access and operation; Annex III
        identifies information that delegated acts can specify. Do not treat a
        proposed list of material, repair or sustainability fields as a universal
        mandatory checklist.
      </p>
      <h2>What Galileo proposes</h2>
      <p>
        The <Link href="/specifications/schemas/dpp/dpp-core.schema">DPP core schema</Link> and{" "}
        <Link href="/specifications/schemas/dpp/dpp-leather.schema">leather extension</Link> provide
        a technical model to assess against your product requirements. Schema
        validation checks data structure; it does not certify the truth of the data
        or legal compliance. The{" "}
        <Link href="/specifications/compliance/guides/espr-readiness">readiness specification</Link> is
        a design reference, not an authoritative statement of current legal deadlines.
      </p>
      <p>
        Galileo&apos;s token design uses ERC-3643 for controlled ownership transfers.
        That design choice does not make ERC-3643 an EU DPP registry, nor does a token
        establish that a product meets ESPR obligations.
      </p>
      <h2>Prepare an integration</h2>
      <ol>
        <li>Identify the product category, applicable act and date with the person responsible for compliance.</li>
        <li>Map required information to source evidence, its owner and an update process.</li>
        <li>Compare those fields with the published schemas and record missing data or unsupported behavior.</li>
        <li>Choose access rights and a physical-to-digital link, then test them on an example item.</li>
        <li>Review implementation evidence and unresolved gaps before making a compliance claim.</li>
      </ol>
      <p>
        Continue with the <Link href="/docs/architecture">architecture guide</Link> for data
        placement and the <Link href="/docs/quick-start">integration quick start</Link> for
        a specification walkthrough.
      </p>
    </>
  );
}
