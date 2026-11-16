#!/usr/bin/env node
// One command to refresh the portfolio dashboard after an apply-job-daily run:
//   1. sync-tracker   -> upserts tracker rows into the live D1 database (private view)
//   2. export-public  -> rewrites src/data/applications.public.json (public view)
//   3. if that file changed: commit only that file and push main, which makes
//      GitHub Actions rebuild and deploy the site.
//
//   npm run publish-dashboard            (reads TRACKER_CSV, PORTFOLIO_URL, INGEST_TOKEN from .env)
//   npm run publish-dashboard -- --no-push
//
// Every step has a timeout; any failure exits non-zero with a one-line reason.
// Nothing besides the public JSON file is ever staged or committed.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DATA = 'src/data/applications.public.json';
const noPush = process.argv.includes('--no-push');

function run(cmd, args, timeoutMs = 120_000) {
  return execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', timeout: timeoutMs, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function step(name, fn) {
  try {
    return fn();
  } catch (err) {
    const detail = String(err.stderr || err.stdout || err.message || err).trim().split('\n').pop();
    console.error(`publish-dashboard failed at ${name}: ${detail}`);
    process.exit(1);
  }
}

const csv = process.env.TRACKER_CSV;
if (!csv) {
  console.error('publish-dashboard failed: TRACKER_CSV is not set (add it to .env).');
  process.exit(1);
}

const node = process.execPath;
console.log(step('sync-tracker', () => run(node, ['scripts/sync-tracker.mjs', csv])));
console.log(step('export-public', () => run(node, ['scripts/export-public.mjs', csv])));

const changed = step('git status', () => run('git', ['status', '--porcelain', '--', DATA]));
if (!changed) {
  console.log('Public dashboard data unchanged; nothing to commit.');
  process.exit(0);
}
if (noPush) {
  console.log(`${DATA} changed; --no-push given, leaving it uncommitted.`);
  process.exit(0);
}

const branch = step('git branch', () => run('git', ['rev-parse', '--abbrev-ref', 'HEAD']));
if (branch !== 'main') {
  console.error(`publish-dashboard failed: on branch "${branch}", expected main. Data file left uncommitted.`);
  process.exit(1);
}

const day = new Date().toISOString().slice(0, 10);
step('git commit', () =>
  run('git', ['commit', '-m', `Update public dashboard data (${day})`, '--only', '--', DATA]),
);
step('git push', () => {
  try {
    run('git', ['push', 'origin', 'main'], 90_000);
  } catch {
    // One bounded retry: bring in remote commits, then push again.
    run('git', ['pull', '--rebase', '--autostash', 'origin', 'main'], 90_000);
    run('git', ['push', 'origin', 'main'], 90_000);
  }
});
const sha = step('git rev-parse', () => run('git', ['rev-parse', '--short', 'HEAD']));
console.log(`Committed and pushed ${sha} to main; GitHub Actions will deploy it.`);
