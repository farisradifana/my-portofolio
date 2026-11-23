#!/usr/bin/env node
// Writes the public dashboard data (src/data/applications.public.json) from the
// apply-job-daily tracker CSV. Only APPLIED rows are exported. Company names
// are reduced to initials (also inside role titles), and links and notes are
// left out, so the committed file never carries a full employer name.
//
//   node scripts/export-public.mjs "F:\apply-job\ai-job-apply\data\tracker.csv"
//
// Run it before a build whenever the tracker has changed.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mapTracker, parseCsv } from './sync-tracker.mjs';

const OUT = fileURLToPath(new URL('../src/data/applications.public.json', import.meta.url));
const LEGAL_PREFIX = /^(pt|cv|ud|pd|fa)\.?$/i;
const LEGAL_SUFFIX = /^(tbk|persero|ltd|inc|llc|corp|co|gmbh|pte|sdn|bhd|plc)\.?$/i;

/**
 * "PT. Prima Sentral Distribusi" -> "PT. PSD", "PT. Metrodata" -> "PT. MD".
 * Several words give one letter each. A single word gives its first letter plus
 * the first consonant from its midpoint on, so the result is never one letter.
 * A name of one or two letters would show in full, so it is masked: "QZ" -> "Q*".
 */
export function companyInitials(name) {
  const words = name
    .replace(/[()[\],]/g, ' ')
    .split(/[\s\-_/&.]+/)
    .filter(Boolean);
  let prefix = '';
  if (words.length > 1 && LEGAL_PREFIX.test(words[0])) prefix = words.shift().replace(/\./g, '').toUpperCase() + '. ';
  while (words.length > 1 && LEGAL_SUFFIX.test(words[words.length - 1])) words.pop();
  const first = (w) => [...w][0].toUpperCase();
  if (words.length === 0) return prefix.trim() || '?';
  if (words.length > 1) return prefix + words.map(first).join('');
  const word = words[0];
  if ([...word].length <= 2) return `${prefix}${first(word)}*`;
  const rest = [...word.slice(Math.floor(word.length / 2))];
  const second = rest.find((c) => /[^aeiou\d]/i.test(c)) ?? rest[0] ?? '';
  return prefix + first(word) + second.toUpperCase();
}

/** "Acme Graduate Program" at Acme -> "AM Graduate Program". */
function redactEmployer(role, company, label) {
  const words = company.trim().split(/\s+/);
  if (words.length > 1 && LEGAL_PREFIX.test(words[0])) words.shift();
  while (words.length > 1 && LEGAL_SUFFIX.test(words[words.length - 1])) words.pop();
  // Full name first, so "PT. Acme" does not become "PT. PT. AM".
  const names = [...new Set([company.trim(), words.join(' ')])].filter((n) => n.length >= 3);
  if (names.length === 0) return role;
  const any = names.map((n) => n.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')).join('|');
  return role.replace(new RegExp(`(?<![\\p{L}\\p{N}])(?:${any})(?![\\p{L}\\p{N}])`, 'giu'), () => label);
}

/** Mapped tracker applications -> public rows. Different companies never share a label. */
export function toPublic(applications) {
  const labels = new Map(); // company (lower case) -> label
  const taken = new Map(); // initials -> how many companies use them
  const label = (company) => {
    const key = company.toLowerCase();
    if (!labels.has(key)) {
      const base = companyInitials(company);
      const n = (taken.get(base) ?? 0) + 1;
      taken.set(base, n);
      labels.set(key, n === 1 ? base : `${base} ${n}`);
    }
    return labels.get(key);
  };
  return [...applications]
    .sort((a, b) => a.applied_at.localeCompare(b.applied_at) || a.id.localeCompare(b.id))
    .map((a, i) => ({
      id: `app-${String(i + 1).padStart(4, '0')}`,
      applied_at: a.applied_at,
      company: label(a.company),
      role: redactEmployer(a.role, a.company, label(a.company)),
      platform: a.platform,
      location: a.location,
      work_type: a.work_type,
      seniority: a.seniority,
      source_url: '',
      status: a.status,
      last_update: a.last_update,
      notes: '',
    }));
}

async function main() {
  const file = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? process.env.TRACKER_CSV;
  if (!file) throw new Error('Pass the tracker CSV path as an argument or set TRACKER_CSV.');
  const { applications, skipped } = mapTracker(parseCsv(await readFile(file, 'utf8')));
  for (const s of skipped) console.warn(`skipped line ${s.line}: ${s.reason}`);
  const rows = toPublic(applications);
  await writeFile(OUT, JSON.stringify(rows, null, 2) + '\n');
  console.log(`Wrote ${rows.length} application(s) to src/data/applications.public.json.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    console.error(`export-public failed: ${err.message}`);
    process.exit(1);
  });
}
