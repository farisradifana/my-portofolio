import { describe, expect, it } from 'vitest';
import { bearer, MAX_BATCH, parseApplications, parseContact, secretsMatch } from '../worker/validate';
import { mapTracker, parseCsv } from '../scripts/sync-tracker.mjs';

const validApp = {
  id: 'abc-123',
  applied_at: '2026-11-10',
  company: 'Telco Company A',
  role: 'Data Analyst',
  status: 'Applied',
};

describe('parseContact', () => {
  it('accepts a normal message and trims it', () => {
    const r = parseContact({ name: ' Ana ', email: 'ana@example.com', message: 'Hello, are you available?' });
    expect(r).toEqual({ ok: true, value: { name: 'Ana', email: 'ana@example.com', message: 'Hello, are you available?', bot: false } });
  });

  it('flags a filled honeypot instead of rejecting', () => {
    const r = parseContact({ name: 'Bot', email: 'b@example.com', message: 'buy my product now', website: 'http://spam' });
    expect(r.ok && r.value.bot).toBe(true);
  });

  it('removes line breaks from single-line fields so they cannot inject mail headers', () => {
    const r = parseContact({ name: 'Ana\r\nBcc: x@evil.test', email: 'ana@example.com', message: 'A real message here.' });
    expect(r.ok && r.value.name).toBe('Ana  Bcc: x@evil.test');
    expect(parseContact({ name: 'Ana', email: 'ana@example.com\nBcc: x@evil.test', message: 'A real message here.' }).ok).toBe(false);
  });

  it.each([
    [{ name: 'A', email: 'a@example.com', message: 'long enough text' }],
    [{ name: 'Ana', email: 'not-an-email', message: 'long enough text' }],
    [{ name: 'Ana', email: 'a@example.com', message: 'short' }],
    [{ name: 'Ana', email: 'a@example.com', message: 'x'.repeat(5001) }],
    ['a string'],
    [null],
    [[1, 2]],
  ])('rejects %j', (body) => {
    expect(parseContact(body).ok).toBe(false);
  });
});

describe('parseApplications', () => {
  it('fills defaults and accepts both an array and { applications }', () => {
    const r = parseApplications({ applications: [validApp] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value[0]).toMatchObject({ last_update: '2026-11-10', platform: '', source_url: '', notes: '' });
    expect(parseApplications([validApp]).ok).toBe(true);
  });

  it.each([
    ['unknown status', { status: 'Hired' }],
    ['bad date', { applied_at: '10/11/2026' }],
    ['impossible date', { applied_at: '2026-13-40' }],
    ['id with spaces', { id: 'a b' }],
    ['missing company', { company: '' }],
    ['javascript url', { source_url: 'javascript:alert(1)' }],
  ])('rejects %s', (_name, patch) => {
    expect(parseApplications([{ ...validApp, ...patch }]).ok).toBe(false);
  });

  it('rejects empty and oversized batches', () => {
    expect(parseApplications([]).ok).toBe(false);
    expect(parseApplications(Array.from({ length: MAX_BATCH + 1 }, () => validApp)).ok).toBe(false);
    expect(parseApplications({ nope: true }).ok).toBe(false);
  });
});

describe('bearer tokens', () => {
  it('reads the token from the Authorization header', () => {
    expect(bearer('Bearer abc')).toBe('abc');
    expect(bearer('bearer abc')).toBe('abc');
    expect(bearer('Basic abc')).toBe('');
    expect(bearer(null)).toBe('');
  });

  it('matches only the exact secret and never an unset one', async () => {
    expect(await secretsMatch('s3cret', 's3cret')).toBe(true);
    expect(await secretsMatch('s3cret', 's3cret-longer')).toBe(false);
    expect(await secretsMatch('', '')).toBe(false);
    expect(await secretsMatch('anything', undefined)).toBe(false);
    expect(await secretsMatch('', 's3cret')).toBe(false);
  });
});

describe('sync-tracker', () => {
  const header = 'date,company,role,score,status,source,cv_used,job_url,ats_url,notes,followup_date,run_id';

  it('parses quoted cells, doubled quotes and CRLF', () => {
    expect(parseCsv('a,b\r\n"x, y","say ""hi"""\r\n')).toEqual([['a', 'b'], ['x, y', 'say "hi"']]);
  });

  it('keeps APPLIED rows only and gives each a stable id', () => {
    const csv = [
      header,
      '2026-11-10,Telco A,"Analyst, BI",88,APPLIED,LinkedIn,cv.pdf,https://example.com/j/1,,first,,r1',
      '2026-11-10,Bank B,Data Analyst,70,SKIPPED,Glints,cv.pdf,https://example.com/j/2,,,,r1',
      '2026-11-11,Retail C,Planner,75,QUEUED,JobStreet,cv.pdf,https://example.com/j/3,,,,r2',
      ',Broken D,Analyst,75,APPLIED,JobStreet,cv.pdf,,,,,r2',
    ].join('\n');
    const first = mapTracker(parseCsv(csv));
    expect(first.applications).toHaveLength(1);
    expect(first.applications[0]).toMatchObject({
      applied_at: '2026-11-10', company: 'Telco A', role: 'Analyst, BI', platform: 'LinkedIn',
      status: 'Applied', source_url: 'https://example.com/j/1', notes: 'first',
    });
    expect(first.skipped).toEqual([{ line: 5, reason: 'missing date, company or role' }]);
    expect(mapTracker(parseCsv(csv)).applications[0].id).toBe(first.applications[0].id);
    // What the script produces must pass the Worker's own validation.
    expect(parseApplications(first.applications).ok).toBe(true);
  });

  it('returns nothing for a header-only tracker', () => {
    expect(mapTracker(parseCsv(header + '\n'))).toEqual({ applications: [], skipped: [] });
  });
});
