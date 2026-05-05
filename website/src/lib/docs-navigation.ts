export interface NavItem {
  title: string;
  href: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const docsNavigation: NavSection[] = [
  {
    title: 'Getting Started',
    items: [
      { title: 'Introduction', href: '/docs' },
      { title: 'Quick Start', href: '/docs/quick-start' },
      { title: 'Core Concepts', href: '/docs/concepts' },
    ],
  },
  {
    title: 'Architecture',
    items: [
      { title: 'Hybrid Model', href: '/docs/architecture' },
    ],
  },
  {
    title: 'Identity',
    items: [
      { title: 'Overview', href: '/docs/identity' },
      { title: 'DID Method', href: '/docs/identity/did-method' },
      { title: 'ONCHAINID', href: '/docs/identity/onchainid' },
      { title: 'Verifiable Credentials', href: '/docs/identity/verifiable-credentials' },
    ],
  },
  {
    title: 'Token',
    items: [
      { title: 'ERC-3643 Extension', href: '/docs/token' },
      { title: 'Ownership Transfer', href: '/docs/token/ownership-transfer' },
    ],
  },
  {
    title: 'Compliance',
    items: [
      { title: 'Overview', href: '/docs/compliance' },
      { title: 'GDPR Guide', href: '/docs/compliance/gdpr' },
      { title: 'MiCA Guide', href: '/docs/compliance/mica' },
      { title: 'ESPR Readiness', href: '/docs/compliance/espr' },
    ],
  },
];
