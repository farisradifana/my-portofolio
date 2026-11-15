// Input validation for the Worker API. Pure functions: no bindings, no I/O,
// so the same code runs under vitest.
import { STATUSES, type Application, type Status } from '../src/lib/metrics';

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const fail = (error: string): Result<never> => ({ ok: false, error });
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Trimmed string with control characters removed. Line breaks survive only when `multiline` is set. */
function clean(v: unknown, multiline = false): string {
  if (typeof v !== 'string') return '';
  const stripped = multiline
    ? v.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '')
    : v.replace(/[\u0000-\u001F\u007F]/g, ' ');
  return stripped.trim();
}

// ---- Contact form -------------------------------------------------------------

export interface ContactMessage {
  name: string;
  email: string;
  message: string;
  /** True when the hidden honeypot field was filled in: accept the request, send nothing. */
  bot: boolean;
}

const EMAIL = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]{2,}$/;

export function parseContact(body: unknown): Result<ContactMessage> {
  if (!isRecord(body)) return fail('Send a JSON object.');
  const name = clean(body.name);
  const email = clean(body.email);
  const message = clean(body.message, true);
  if (name.length < 2 || name.length > 100) return fail('Name must be 2 to 100 characters.');
  if (email.length > 254 || !EMAIL.test(email)) return fail('Enter a valid email address.');
  if (message.length < 10 || message.length > 5000) return fail('Message must be 10 to 5,000 characters.');
  return { ok: true, value: { name, email, message, bot: clean(body.website) !== '' } };
}

// ---- Applications -------------------------------------------------------------

export const MAX_BATCH = 500;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const isDay = (v: string) => ISO_DAY.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));

function parseApplication(raw: unknown, i: number): Result<Application> {
  const at = `applications[${i}]`;
  if (!isRecord(raw)) return fail(`${at} must be an object.`);
  const id = clean(raw.id);
  const applied_at = clean(raw.applied_at).slice(0, 10);
  const company = clean(raw.company);
  const role = clean(raw.role);
  const status = clean(raw.status) || 'Applied';
  const last_update = clean(raw.last_update).slice(0, 10) || applied_at;
  const source_url = clean(raw.source_url);

  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return fail(`${at}.id must be 1 to 64 letters, digits, "_" or "-".`);
  if (!isDay(applied_at)) return fail(`${at}.applied_at must be a YYYY-MM-DD date.`);
  if (!isDay(last_update)) return fail(`${at}.last_update must be a YYYY-MM-DD date.`);
  if (!company || company.length > 200) return fail(`${at}.company is required (200 characters at most).`);
  if (!role || role.length > 200) return fail(`${at}.role is required (200 characters at most).`);
  if (!(STATUSES as readonly string[]).includes(status)) return fail(`${at}.status must be one of: ${STATUSES.join(', ')}.`);
  if (source_url && (source_url.length > 2000 || !/^https?:\/\//i.test(source_url))) {
    return fail(`${at}.source_url must be an http(s) URL.`);
  }
  return {
    ok: true,
    value: {
      id,
      applied_at,
      company,
      role,
      platform: clean(raw.platform).slice(0, 100),
      location: clean(raw.location).slice(0, 200),
      work_type: clean(raw.work_type).slice(0, 50),
      seniority: clean(raw.seniority).slice(0, 50),
      source_url,
      status: status as Status,
      last_update,
      notes: clean(raw.notes, true).slice(0, 2000),
    },
  };
}

export function parseApplications(body: unknown): Result<Application[]> {
  const list = isRecord(body) ? body.applications : body;
  if (!Array.isArray(list)) return fail('Send { "applications": [...] }.');
  if (list.length === 0) return fail('The applications list is empty.');
  if (list.length > MAX_BATCH) return fail(`Send at most ${MAX_BATCH} applications per request.`);
  const out: Application[] = [];
  for (let i = 0; i < list.length; i++) {
    const parsed = parseApplication(list[i], i);
    if (!parsed.ok) return parsed;
    out.push(parsed.value);
  }
  return { ok: true, value: out };
}

// ---- Bearer tokens ------------------------------------------------------------

export function bearer(header: string | null): string {
  const match = /^Bearer\s+(\S+)$/i.exec(header ?? '');
  return match?.[1] ?? '';
}

/**
 * Compares two secrets without leaking where they differ. Both sides are hashed
 * first, so the comparison always covers 32 bytes whatever the input lengths.
 * An unset expected secret never matches.
 */
export async function secretsMatch(given: string, expected: string | undefined): Promise<boolean> {
  if (!expected || !given) return false;
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(given)),
    crypto.subtle.digest('SHA-256', enc.encode(expected)),
  ]);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i]! ^ y[i]!;
  return diff === 0;
}
