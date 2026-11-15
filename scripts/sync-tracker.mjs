#!/usr/bin/env node
// Pushes applied jobs from the apply-job-daily tracker CSV to the portfolio
// dashboard (POST /api/applications). Safe to run after every apply-job-daily
// run: rows are upserted by id, and a row's id is derived from its content.
//
//   INGEST_TOKEN=... PORTFOLIO_URL=https://farisradifana.my.id \
//     node scripts/sync-tracker.mjs "F:\apply-job\ai-job-apply\data\tracker.csv"
//
// Add --dry-run to print what would be sent without sending it.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const BATCH = 200;
const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 15_000;

/** RFC 4180 parser: quoted fields, doubled quotes, CRLF or LF. Returns rows of cells. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const src = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      if (row.some((v) => v !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((v) => v !== '')) rows.push(row);
  return rows;
}

/**
 * Tracker rows -> dashboard applications. Only rows with status APPLIED count:
 * QUEUED, SKIPPED, BLOCKED and FOUND are not applications.
 * Returns { applications, skipped } where skipped lists rows that could not be mapped.
 */
export function mapTracker(rows) {
  const [header, ...body] = rows;
  if (!header) return { applications: [], skipped: [] };
  const col = Object.fromEntries(header.map((name, i) => [name.trim().toLowerCase(), i]));
  for (const required of ['date', 'company', 'role', 'status']) {
    if (!(required in col)) throw new Error(`Tracker CSV has no "${required}" column.`);
  }
  const get = (row, name) => (col[name] === undefined ? '' : (row[col[name]] ?? '').trim());

  const applications = [];
  const skipped = [];
  body.forEach((row, i) => {
    if (get(row, 'status').toUpperCase() !== 'APPLIED') return;
    const date = get(row, 'date').slice(0, 10);
    const company = get(row, 'company');
    const role = get(row, 'role');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !company || !role) {
      skipped.push({ line: i + 2, reason: 'missing date, company or role' });
      return;
    }
    const url = get(row, 'job_url') || get(row, 'ats_url');
    applications.push({
      id: createHash('sha256').update([date, company, role, url].join('|').toLowerCase()).digest('hex').slice(0, 24),
      applied_at: date,
      company,
      role,
      platform: get(row, 'source'),
      location: '',
      work_type: '',
      seniority: '',
      source_url: /^https?:\/\//i.test(url) ? url : '',
      status: 'Applied',
      last_update: date,
      notes: get(row, 'notes'),
    });
  });
  return { applications, skipped };
}

async function post(url, token, applications) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ applications }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.ok) return;
      const detail = (await res.text()).slice(0, 200);
      // 4xx will not get better on retry, except 429.
      if (res.status < 500 && res.status !== 429) throw Object.assign(new Error(`HTTP ${res.status}: ${detail}`), { fatal: true });
      throw new Error(`HTTP ${res.status}: ${detail}`);
    } catch (err) {
      if (err.fatal || attempt === MAX_ATTEMPTS) throw err;
      await new Promise((r) => setTimeout(r, attempt * 2000));
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const file = args.find((a) => !a.startsWith('--')) ?? process.env.TRACKER_CSV;
  if (!file) throw new Error('Pass the tracker CSV path as an argument or set TRACKER_CSV.');

  const { applications, skipped } = mapTracker(parseCsv(await readFile(file, 'utf8')));
  for (const s of skipped) console.warn(`skipped line ${s.line}: ${s.reason}`);
  if (applications.length === 0) {
    console.log('No APPLIED rows in the tracker. Nothing to send.');
    return;
  }
  if (dryRun) {
    console.log(`Dry run: ${applications.length} application(s) would be sent.`);
    return;
  }

  const base = process.env.PORTFOLIO_URL;
  const token = process.env.INGEST_TOKEN;
  if (!base || !token) throw new Error('Set PORTFOLIO_URL and INGEST_TOKEN in the environment.');
  const url = new URL('/api/applications', base).href;
  for (let i = 0; i < applications.length; i += BATCH) {
    await post(url, token, applications.slice(i, i + BATCH));
  }
  console.log(`Sent ${applications.length} application(s) to ${new URL(base).host}.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    console.error(`sync-tracker failed: ${err.message}`);
    process.exit(1);
  });
}
