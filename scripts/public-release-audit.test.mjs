import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditFiles, auditIdentity, auditContext } from './public-release-audit.mjs';

const owner = 'Pierre Beunardeau <pierre.beunardeau@originlabs.app>';
const sha = 'a'.repeat(40);
const parents = ['b'.repeat(40), 'c'.repeat(40)];
const merge = { sha, parents, author: 'originlabs-app <pierre.beunardeau@originlabs.app>', committer: 'GitHub <noreply@github.com>' };
const verifiedMerge = {
  sha, parents: parents.map(sha => ({ sha })),
  author: { login: 'originlabs-app' }, committer: { login: 'web-flow' },
  commit: {
    author: { name: 'originlabs-app', email: 'pierre.beunardeau@originlabs.app' },
    committer: { name: 'GitHub', email: 'noreply@github.com' },
    verification: { verified: true, reason: 'valid', signature: 'signed payload', payload: 'commit payload' },
  },
};

test('ordinary contributions require both approved identities', async () => {
  assert.deepEqual(await auditIdentity({ sha, parents: [], author: owner, committer: owner }), []);
  for (const field of ['author', 'committer']) {
    const result = await auditIdentity({ sha, parents: [], author: owner, committer: owner, [field]: 'unexpected <other@example.org>' });
    assert.ok(result.length > 0);
  }
});

test('a GitHub merge requires matching signed API evidence', async () => {
  assert.deepEqual(await auditIdentity(merge, async () => verifiedMerge), []);
  for (const alter of [
    x => { x.sha = 'd'.repeat(40); },
    x => { x.parents.reverse(); },
    x => { x.author.login = 'other'; },
    x => { x.committer.login = 'other'; },
    x => { x.commit.author.email = 'other@example.org'; },
    x => { x.commit.committer.name = 'Other'; },
    x => { x.commit.verification.verified = false; },
    x => { x.commit.verification.reason = 'unsigned'; },
    x => { x.commit.verification.signature = ''; },
    x => { x.commit.verification.payload = ''; },
  ]) {
    const evidence = structuredClone(verifiedMerge);
    alter(evidence);
    assert.ok((await auditIdentity(merge, async () => evidence)).length > 0);
  }
  assert.ok((await auditIdentity(merge, async () => { throw new Error('unavailable'); })).length > 0);
  assert.ok((await auditIdentity({ ...merge, parents: [parents[0]] }, async () => verifiedMerge)).length > 0);
  assert.ok((await auditIdentity({ ...merge, author: 'some-bot <bot@example.org>' }, async () => verifiedMerge)).length > 0);
});

test('private paths and secrets cannot enter the release tree', () => {
  for (const file of ['AGENTS.md', '.agents/task.md', 'nested/.codex/config.toml', 'geo/prompts.json', 'blogidea.md', 'website/content/reviews/proof.jsonl', 'docs/investor-demo-pack/report.md', '.env.production', 'id_ed25519']) {
    assert.ok(auditFiles([file], () => 'fixture').length > 0, file);
  }
  const token = ['ghp', '_', 'a'.repeat(36)].join('');
  for (const file of ['README.md', 'apps/api/test/fixture.ts', 'apps/dashboard/e2e/test.ts', 'unexpected.data']) {
    const errors = auditFiles([file], () => token);
    assert.ok(errors.length > 0, file);
    assert.ok(!errors.join('\n').includes(token), 'diagnostics must not echo secrets');
  }
  assert.deepEqual(auditFiles(['CONTRIBUTING.md', 'website/content/blog/example.mdx', '.env.example'], () => 'Normal contributor documentation'), []);
  assert.ok(auditFiles(['README.md'], () => { throw new Error('missing'); }).length > 0);
});

test('relocated internal transcripts remain private', () => {
  const transcript = ['[', 'cmux', '-bridge] ', '@participant'].join('');
  assert.ok(auditFiles(['docs/notes.md'], () => transcript).length > 0);
  assert.deepEqual(auditFiles(['docs/architecture.md'], () => 'The outbox worker processes jobs. ClaudeBot may crawl the public site.'), []);
});

test('pull requests and pushes bind the audit to the tested commit', () => {
  const event = { pull_request: { head: { sha } } };
  assert.deepEqual(auditContext(sha, { GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: 'pull_request', GITHUB_SHA: parents[0] }, event), []);
  assert.ok(auditContext(parents[0], { GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: 'pull_request' }, event).length > 0);
  assert.deepEqual(auditContext(sha, { GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: 'push', GITHUB_SHA: sha }, {}), []);
  assert.ok(auditContext(sha, { GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: 'push', GITHUB_SHA: parents[0] }, {}).length > 0);
  assert.ok(auditContext(sha, { GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: 'pull_request' }, {}).length > 0);
});

test('CLI rejects staged secrets, private files and foreign identities in PR and push contexts', () => {
  const script = fileURLToPath(new URL('./public-release-audit.mjs', import.meta.url));
  for (const eventName of ['pull_request', 'push']) {
    for (const scenario of ['clean', 'secret', 'private', 'identity']) {
      const cwd = mkdtempSync(join(tmpdir(), 'public-audit-'));
      try {
        const env = { ...process.env, GIT_AUTHOR_NAME: 'Pierre Beunardeau', GIT_COMMITTER_NAME: 'Pierre Beunardeau', GIT_AUTHOR_EMAIL: 'pierre.beunardeau@originlabs.app', GIT_COMMITTER_EMAIL: 'pierre.beunardeau@originlabs.app' };
        if (scenario === 'identity') env.GIT_AUTHOR_NAME = 'Unexpected contributor';
        const git = args => execFileSync('git', args, { cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
        git(['init', '--quiet']);
        writeFileSync(join(cwd, 'README.md'), 'Contributor documentation');
        git(['add', 'README.md']);
        git(['-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', 'Initial contribution']);
        if (scenario === 'secret') {
          writeFileSync(join(cwd, 'README.md'), ['ghp', '_', 'a'.repeat(36)].join(''));
          git(['add', 'README.md']);
          writeFileSync(join(cwd, 'README.md'), 'Clean worktree cannot hide staged content');
        }
        if (scenario === 'private') {
          writeFileSync(join(cwd, 'AGENTS.md'), 'Internal configuration');
          git(['add', 'AGENTS.md']);
        }
        const head = git(['rev-parse', 'HEAD']).trim();
        const eventPath = join(cwd, 'event.json');
        writeFileSync(eventPath, JSON.stringify({ pull_request: { head: { sha: head } } }));
        const result = spawnSync(process.execPath, [script], { cwd, encoding: 'utf8', env: {
          ...env, GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: eventName, GITHUB_SHA: head, GITHUB_EVENT_PATH: eventPath,
        } });
        assert.equal(result.status, scenario === 'clean' ? 0 : 1, `${eventName}/${scenario}: ${result.stderr}`);
      } finally { rmSync(cwd, { recursive: true, force: true }); }
    }
  }
});
