import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const allowedEnvExamples = new Set([
  '.env.example',
  '.env.testnet.example',
  'apps/api/.env.example',
  'contracts/.env.example',
  'website/.env.example',
]);

const deniedTrackedPathPatterns = [
  /(^|\/)\.env($|\.)(?!.*\.example$)/,
  /(^|\/)(AGENTS|CLAUDE|GEMINI)\.md$/,
  /(^|\/)\.(agents|claude|codex|cursor|factory|windsurf|playwright-mcp)(\/|$)/,
  /^docs\/(investor-[^/]*|exec-plans|plans|screenshots)(\/|$)/,
  /^(geo|website\/content\/reviews)(\/|$)/,
  /^blogidea\.md$/,
  /(^|\/)(\.cursorrules|copilot-instructions\.md)$/,
  /(^|\/)(\.blog-archive|\.planning|planning|dogfood-output|proof-packs)(\/|$)/,
  /^docs\/[^/]*HANDOFF[^/]*\.md$/,
  /^docs\/references\/agent-missions(\/|$)/,
  /^docs\/PILOT_DEMO_ROOM/i,
  /(^|\/)(id_rsa|id_ed25519)(\.|$)/,
  /\.(pem|p12|pfx|key|keystore)$/i,
];

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

const allowedIdentity = 'Pierre Beunardeau <pierre.beunardeau@originlabs.app>';
const githubAuthor = 'originlabs-app <pierre.beunardeau@originlabs.app>';
const githubCommitter = 'GitHub <noreply@github.com>';
const repository = 'originlabs-app/galileo-protocol';
const identity = value => `${value?.name} <${value?.email}>`;

export async function auditIdentity(commit, verifyMerge) {
  const { sha, author, committer, parents } = commit;
  if (author === allowedIdentity && committer === allowedIdentity) return [];
  // Names alone are forgeable. Only GitHub's verified, matching merge object
  // may use the repository owner's account alias and the web-flow committer.
  if (author === githubAuthor && committer === githubCommitter &&
      (parents.length === 1 || parents.length === 2) && verifyMerge) {
    try {
      const remote = await verifyMerge(sha);
      const verification = remote.commit?.verification;
      // A signed one-parent web commit is not necessarily a squash merge.
      // Bind that exception to the merged PR that introduced this exact SHA.
      const isMergedSquash = Array.isArray(remote.pullRequests) && remote.pullRequests.some(pull =>
        pull?.state === 'closed' && typeof pull.merged_at === 'string' && Number.isFinite(Date.parse(pull.merged_at)) &&
        pull.merge_commit_sha === sha && pull.base?.ref === 'main' && pull.base?.repo?.full_name === repository);
      if (remote.sha === sha && remote.author?.login === 'originlabs-app' &&
          remote.committer?.login === 'web-flow' &&
          identity(remote.commit?.author) === author && identity(remote.commit?.committer) === committer &&
          JSON.stringify(remote.parents?.map(parent => parent.sha)) === JSON.stringify(parents) &&
          verification?.verified === true && verification.reason === 'valid' &&
          typeof verification.signature === 'string' && verification.signature.trim() &&
          typeof verification.payload === 'string' && verification.payload.trim() &&
          (parents.length === 2 || isMergedSquash)) return [];
    } catch {
      return [`${sha}: GitHub merge verification unavailable`];
    }
  }
  return [`${sha}: unapproved contribution identity or unverified GitHub merge`];
}

export function auditContext(head, env, event) {
  if (env.GITHUB_ACTIONS !== 'true') return [];
  const expected = env.GITHUB_EVENT_NAME === 'pull_request' ? event?.pull_request?.head?.sha :
    env.GITHUB_EVENT_NAME === 'push' ? env.GITHUB_SHA : undefined;
  return /^[a-f0-9]{40}$/.test(expected ?? '') && expected === head ? [] :
    ['Checkout must match the pull request head or pushed commit being tested'];
}

export function auditFiles(files, read = file => readFileSync(file)) {
  const failures = [];
  for (const file of files) {
    if (deniedTrackedPathPatterns.some(pattern => pattern.test(file)) && !allowedEnvExamples.has(file)) {
      failures.push(`${file}: tracked path is not public-release safe`);
    }
    let content;
    try {
      const bytes = read(file);
      // Scan every indexed blob, including binary data and generated files.
      content = bytes.toString();
    } catch {
      failures.push(`${file}: tracked content could not be read`);
      continue;
    }
    for (const pattern of secretPatterns) {
      if (pattern.regex.test(content)) failures.push(`${file}: possible ${pattern.name}`);
    }
    // Literal transcript markers, not a classification of ordinary prose.
    if (/\[cmux-bridge\]|<(?:INSTRUCTIONS|environment_context)>|"type"\s*:\s*"(?:session_meta|turn_context|response_item)"/.test(content)) {
      failures.push(`${file}: internal execution transcript`);
    }
  }
  return failures;
}

async function readGitHub(path) {
  if (process.env.GH_TOKEN || process.env.GITHUB_TOKEN) {
    const response = await fetch(`https://api.github.com/repos/${repository}/${path}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${process.env.GH_TOKEN || process.env.GITHUB_TOKEN}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      signal: AbortSignal.timeout(15000),
      redirect: 'error',
    });
    if (!response.ok) throw new Error('GitHub verification failed');
    return response.json();
  }
  return JSON.parse(execFileSync('gh', ['api', '--hostname', 'github.com', `repos/${repository}/${path}`], {
    encoding: 'utf8', timeout: 20000, stdio: ['ignore', 'pipe', 'pipe'],
  }));
}

async function verifyGitHubMerge(sha) {
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('Invalid commit');
  const remote = await readGitHub(`commits/${sha}`);
  if (remote.parents?.length === 1) {
    remote.pullRequests = await readGitHub(`commits/${sha}/pulls?per_page=100`);
  }
  return remote;
}

async function main() {
  const git = args => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  const files = git(['ls-files', '-z']).split('\0').filter(Boolean);
  const head = git(['rev-parse', 'HEAD']).trim();
  const event = process.env.GITHUB_ACTIONS === 'true' && process.env.GITHUB_EVENT_NAME === 'pull_request' ?
    JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')) : {};
  const failures = auditContext(head, process.env, event);
  if (git(['rev-parse', '--is-shallow-repository']).trim() !== 'false') {
    failures.push('Full commit history is required for the identity audit');
  }
  const entries = git(['log', '--format=%H%x00%an <%ae>%x00%cn <%ce>%x00%P', 'HEAD']).trim().split('\n');
  for (const entry of entries) {
    const [sha, author, committer, parentText] = entry.split('\0');
    failures.push(...await auditIdentity({ sha, author, committer, parents: parentText.split(' ').filter(Boolean) }, verifyGitHubMerge));
  }
  // Audit the indexed bytes that will be committed, including staged changes.
  // A clean working copy must not hide a secret already present in the index.
  failures.push(...auditFiles(files, file => execFileSync('git', ['cat-file', 'blob', `:${file}`], {
    maxBuffer: 50 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
  })));
  if (failures.length) {
    console.error('Public release audit failed:\n' + failures.map(failure => `- ${failure}`).join('\n'));
    process.exitCode = 1;
  } else {
    console.log(`Public release audit passed (${files.length} tracked files, ${entries.length} commits).`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(() => {
    console.error('Public release audit could not complete.');
    process.exitCode = 1;
  });
}
