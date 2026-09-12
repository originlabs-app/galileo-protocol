import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkReports } from './check-lighthouse-reports.mjs';

const urls = ['http://localhost:3000/', 'http://localhost:3000/docs'];
const report = requestedUrl => ({ requestedUrl, finalDisplayedUrl: requestedUrl, fetchTime: '2026-01-01T00:00:00Z', categories: Object.fromEntries(['performance', 'accessibility', 'best-practices', 'seo'].map(name => [name, { score: 1 }])) });
const reports = () => urls.flatMap(url => [report(url), report(url), report(url)]);

test('requires three valid measurements for every configured route', () => {
  assert.deepEqual(checkReports(reports(), urls, 3), []);
  assert.ok(checkReports([], urls, 3).length);
  assert.ok(checkReports(reports().slice(1), urls, 3).length);
  assert.ok(checkReports([...reports(), report(urls[0])], urls, 3).length);
});

test('rejects failed navigations, runtime failures and missing category measurements', () => {
  for (const alter of [
    x => { x.runtimeError = { code: 'NO_FCP' }; },
    x => { x.finalDisplayedUrl = 'http://localhost:3000/login'; },
    x => { x.categories.performance.score = null; },
    x => { delete x.categories.seo; },
    x => { delete x.fetchTime; },
  ]) {
    const data = reports(); alter(data[0]);
    assert.ok(checkReports(data, urls, 3).length);
  }
});
