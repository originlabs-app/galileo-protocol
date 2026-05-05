import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';

const trackedFiles = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);

const allowedEnvExamples = new Set([
  '.env.example',
  '.env.testnet.example',
  'apps/api/.env.example',
  'contracts/.env.example',
  'website/.env.example',
]);

const deniedTrackedPathPatterns = [
  /(^|\/)\.env($|\.)(?!.*\.example$)/,
  /(^|\/)(AGENTS|CLAUDE)\.md$/,
  /(^|\/)\.(claude|codex|cursor|factory|windsurf)(\/|$)/,
  /^docs\/(investor-|exec-plans|plans|screenshots)(\/|$)/,
  /^docs\/references\/agent-missions(\/|$)/,
  /^docs\/PILOT_DEMO_ROOM/i,
  /(^|\/)(id_rsa|id_ed25519)(\.|$)/,
  /\.(pem|p12|pfx|key|keystore)$/i,
];

const ignoredContentPatterns = [
  /^contracts\/lib\//,
  /^contracts\/out\//,
  /^contracts\/cache\//,
  /^apps\/api\/src\/services\/blockchain\/bytecode\.ts$/,
  /^apps\/api\/test\//,
  /^apps\/dashboard\/e2e\//,
  /^pnpm-lock\.yaml$/,
  /^website\/package-lock\.json$/,
  /^package-lock\.json$/,
];

const textExtensions = new Set([
  '',
  '.cjs',
  '.css',
  '.env',
  '.example',
  '.html',
  '.js',
  '.json',
  '.jsonld',
  '.md',
  '.mdx',
  '.mjs',
  '.prisma',
  '.sol',
  '.sql',
  '.svg',
  '.toml',
  '.ts',
  '.tsx',
  '.txt',
  '.yml',
  '.yaml',
]);

const secretPatterns = [
  {
    name: 'raw private key assignment',
    regex:
      /\b(?:DEPLOYER_PRIVATE_KEY|MINTING_PRIVATE_KEY|HANDOFF_ADMIN_PRIVATE_KEY|CDP_API_KEY_PRIVATE_KEY|SOURCE_PRIVATE_KEY)\s*=\s*(?!["']?(?:0x_YOUR|0x\.\.\.|0x_PLACEHOLDER|0x_TEST|test|example|placeholder)\b)["']?0x[a-fA-F0-9]{64}\b/,
  },
  {
    name: 'private key block',
    regex: /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/,
  },
  {
    name: 'GitHub token',
    regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{30,}\b|github_pat_[A-Za-z0-9_]{50,}/,
  },
  {
    name: 'OpenAI API key',
    regex: /\bsk-[A-Za-z0-9_-]{32,}\b/,
  },
  {
    name: 'AWS access key',
    regex: /\bAKIA[0-9A-Z]{16}\b/,
  },
  {
    name: 'Google API key',
    regex: /\bAIza[0-9A-Za-z_-]{35}\b/,
  },
  {
    name: 'Slack token',
    regex: /\bxox[baprs]-[0-9A-Za-z-]{20,}\b/,
  },
  {
    name: 'real secret assignment',
    regex:
      /^\s*(?:JWT_SECRET|JWT_REFRESH_SECRET|DATABASE_URL|DIRECT_URL|DEPLOYER_PRIVATE_KEY|MINTING_MNEMONIC|HANDOFF_ADMIN_MNEMONIC|HANDOFF_ADMIN_PRIVATE_KEY|BASESCAN_API_KEY|CDP_API_KEY_PRIVATE_KEY|R2_SECRET_ACCESS_KEY|KYC_API_SECRET|SENTRY_DSN)\s*=\s*(?!(?:$|""|''|["']?(?:YOUR|YOUR_|your|your_|change-me|example|placeholder|test|ci-test|x{16,}|0x\.\.\.|0x_YOUR|word1|postgres(?:ql)?:\/\/YOUR_USER|postgres(?:ql)?:\/\/galileo:galileo(?:_dev)?@localhost)))["']?[^#\n]+/im,
  },
];

const failures = [];

const allowedIdentity = 'Pierre Beunardeau <pierre.beunardeau@originlabs.app>';
const commitIdentities = execFileSync(
  'git',
  ['log', '--format=%H%x00%an <%ae>%x00%cn <%ce>', 'HEAD'],
  { encoding: 'utf8' },
)
  .trim()
  .split('\n')
  .filter(Boolean);

for (const entry of commitIdentities) {
  const [commit, author, committer] = entry.split('\0');
  if (author !== allowedIdentity) {
    failures.push(`${commit}: commit author must be ${allowedIdentity}, got ${author}`);
  }
  if (committer !== allowedIdentity) {
    failures.push(`${commit}: commit committer must be ${allowedIdentity}, got ${committer}`);
  }
}

for (const file of trackedFiles) {
  if (deniedTrackedPathPatterns.some((pattern) => pattern.test(file))) {
    if (!allowedEnvExamples.has(file)) {
      failures.push(`${file}: tracked path is not public-release safe`);
    }
  }

  if (ignoredContentPatterns.some((pattern) => pattern.test(file))) {
    continue;
  }

  const extension = extname(file);
  if (!textExtensions.has(extension)) {
    continue;
  }

  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  for (const pattern of secretPatterns) {
    if (pattern.regex.test(content)) {
      failures.push(`${file}: possible ${pattern.name}`);
    }
  }
}

if (failures.length > 0) {
  console.error('Public release audit failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Public release audit passed (${trackedFiles.length} tracked files scanned).`);
