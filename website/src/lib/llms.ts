import { getAllPosts } from '@/lib/blog';

const SITE_URL = 'https://www.galileoprotocol.io';

interface PageEntry {
  path: string;
  description: string;
}

/**
 * Main public pages, kept in sync with src/app routes.
 */
const MAIN_PAGES: PageEntry[] = [
  { path: '/', description: 'Open standard for luxury product authentication and provenance' },
  { path: '/docs', description: 'Developer and integrator documentation for the Galileo Protocol' },
  { path: '/docs/quick-start', description: 'Quick start: issue a first Digital Product Passport in minutes' },
  { path: '/docs/concepts', description: 'Core concepts: DPP, identity, provenance, hybrid on-chain/off-chain model' },
  { path: '/docs/architecture', description: 'Technical architecture of the protocol and its components' },
  { path: '/docs/compliance', description: 'Regulatory compliance hub: ESPR, GDPR, MiCA' },
  { path: '/docs/compliance/espr', description: 'How Galileo implements the EU ESPR Digital Product Passport requirements' },
  { path: '/docs/identity', description: 'Decentralized identity: W3C DIDs, verifiable credentials, ONCHAINID' },
  { path: '/docs/token', description: 'Token model and ERC-3643 compliant asset tokenization' },
  { path: '/specifications', description: 'Open specifications of the protocol, versioned and reviewed in public' },
  { path: '/governance', description: 'Protocol governance: charter, RFC process, technical steering committee' },
  { path: '/maison', description: 'Galileo for luxury maisons: use cases and onboarding' },
  { path: '/blog', description: 'Articles on luxury authentication, DPP and protocol updates' },
  { path: '/changelog', description: 'Protocol and platform release notes' },
  { path: '/roadmap', description: 'Public roadmap of the protocol' },
  { path: '/tools', description: 'Developer tools: testnet faucet, gas estimator' },
];

function postUrl(slug: string): string {
  return `${SITE_URL}/blog/${slug}`;
}

/**
 * Compact llms.txt: identity, main pages, article index.
 */
export function buildLlmsTxt(): string {
  const posts = getAllPosts();

  const lines: string[] = [
    '# Galileo Protocol',
    '',
    '> Galileo Protocol is an open protocol for luxury product authenticity and provenance. It implements the Digital Product Passport (DPP) required by the EU ESPR regulation on open standards: ERC-3643, W3C DIDs and GS1 EPCIS. The LEOX token powers the network.',
    '',
    `- Detailed version: ${SITE_URL}/llms-full.txt`,
    '',
    '## Identity',
    '- Project: Galileo Protocol',
    '- Type: open protocol for luxury product authentication and provenance',
    '- Focus: Digital Product Passport (DPP) compliant with the EU ESPR regulation',
    '- Standards: ERC-3643 (tokenization), W3C DID (identity), GS1 EPCIS (traceability events)',
    '- Use cases: watches, leather goods, jewelry, art',
    '- Token: LEOX',
    '- Language: English',
    `- Canonical JSON-LD identifier: ${SITE_URL}/#organization`,
    '',
    '## Main pages',
    ...MAIN_PAGES.map((p) => `- ${SITE_URL}${p.path} : ${p.description}`),
    '',
    '## Blog',
    ...posts.map(
      (post) => `- ${postUrl(post.slug)} : ${post.frontmatter.title}`
    ),
    '',
  ];

  return lines.join('\n');
}

/**
 * Detailed llms-full.txt: standards, use cases, articles with dates and summaries.
 */
export function buildLlmsFullTxt(): string {
  const posts = getAllPosts();

  const lines: string[] = [
    '# Galileo Protocol — detailed context for LLMs',
    '',
    '> Galileo Protocol is an open protocol for luxury product authenticity and provenance. It implements the Digital Product Passport (DPP) required by the EU ESPR regulation on open standards: ERC-3643, W3C DIDs and GS1 EPCIS. The LEOX token powers the network.',
    '',
    '## Identity',
    '- Project: Galileo Protocol',
    '- Type: open protocol for luxury product authentication and provenance',
    '- Mission: give every physical luxury product a verifiable digital identity, from manufacture to resale',
    '- Focus: Digital Product Passport (DPP) compliant with the EU ESPR regulation (Regulation (EU) 2024/1781)',
    '- Token: LEOX, used for network fees and ecosystem incentives',
    '- Language: English',
    `- Canonical JSON-LD identifier: ${SITE_URL}/#organization`,
    '',
    '## Standards implemented',
    '- ERC-3643 (T-REX): permissioned token standard for compliant asset tokenization, used to represent products and ownership transfers',
    '- W3C Decentralized Identifiers (DID): self-sovereign identities for products, brands and actors',
    '- W3C Verifiable Credentials: attestations such as authenticity certificates and repair records',
    '- GS1 EPCIS: standard event model for supply-chain traceability (commissioning, shipping, repair, resale)',
    '- ONCHAINID: on-chain identity registry compatible with ERC-3643',
    '',
    '## Use cases',
    '- Watches: lifetime passport, service history, theft registry, resale authentication',
    '- Leather goods: material provenance, atelier traceability, second-hand verification',
    '- Jewelry: stone provenance, certificates, ownership chain',
    '- Art: certificates of authenticity, provenance records, edition management',
    '',
    '## Compliance',
    '- ESPR: Galileo schemas and data model map to the EU Digital Product Passport requirements; see /docs/compliance/espr',
    '- GDPR: hybrid on-chain/off-chain model keeps personal data off-chain; see /docs/compliance/gdpr',
    '- MiCA: LEOX token considerations; see /docs/compliance/mica',
    '',
    '## Main pages',
    ...MAIN_PAGES.map((p) => `- ${SITE_URL}${p.path} : ${p.description}`),
    '',
    '## Blog articles',
  ];

  for (const post of posts) {
    const f = post.frontmatter;
    lines.push(
      '',
      `### ${f.title}`,
      `- URL: ${postUrl(post.slug)}`,
      `- Published: ${f.date}`,
      `- Updated: ${f.modified}`,
      `- Author: ${f.author}`,
      `- Tags: ${f.tags.join(', ') || 'none'}`,
      `- Summary: ${f.excerpt}`
    );
  }

  lines.push('');
  return lines.join('\n');
}
