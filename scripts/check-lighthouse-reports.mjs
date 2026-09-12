import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function checkReports(reports, urls, runs, assertions = {}) {
  const errors = [];
  for (const url of urls) {
    const matching = reports.filter(report => report.requestedUrl === url);
    if (matching.length !== runs) errors.push(`${url}: expected ${runs} reports, found ${matching.length}`);
    for (const report of matching) {
      if (report.runtimeError || (report.finalDisplayedUrl ?? report.finalUrl) !== url || !report.fetchTime) {
        errors.push(`${url}: failed or redirected measurement`);
      }
      for (const category of ['performance', 'accessibility', 'best-practices', 'seo']) {
        const score = report.categories?.[category]?.score;
        if (!Number.isFinite(score) || score < 0 || score > 1) errors.push(`${url}: missing ${category} score`);
        const minimum = assertions[`categories:${category}`]?.[1]?.minScore;
        if (Number.isFinite(minimum) && score < minimum) errors.push(`${url}: ${category} below ${minimum} in one run`);
      }
    }
  }
  if (reports.length !== urls.length * runs) errors.push('Unexpected total report count');
  return errors;
}

function main() {
  const config = JSON.parse(readFileSync('website/lighthouserc.json', 'utf8'));
  const reports = readdirSync('.lighthouseci').filter(name => /^lhr-.*\.json$/.test(name))
    .map(name => JSON.parse(readFileSync(`.lighthouseci/${name}`, 'utf8')));
  const errors = checkReports(reports, config.ci.collect.url, config.ci.collect.numberOfRuns, config.ci.assert.assertions);
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`Lighthouse coverage passed (${reports.length} complete reports).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { main(); } catch (error) {
    console.error(`Lighthouse coverage failed: ${error.message}`);
    process.exitCode = 1;
  }
}
