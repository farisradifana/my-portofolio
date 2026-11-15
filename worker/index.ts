// API Worker. Static pages are served straight from the assets directory; this
// script only runs for /api/* (see run_worker_first in wrangler.jsonc).
//
//   POST /api/contact        contact form  -> email to the site owner
//   GET  /api/applications   dashboard     -> all rows   (Bearer DASHBOARD_READ_TOKEN)
//   POST /api/applications   apply-job-daily -> upsert   (Bearer INGEST_TOKEN)
import type { Application } from '../src/lib/metrics';
import { bearer, parseApplications, parseContact, secretsMatch } from './validate';

interface EmailBinding {
  send(message: { from: string; to: string; replyTo?: string; subject: string; text: string }): Promise<unknown>;
}

export interface Env {
  DB: D1Database;
  CONTACT_EMAIL: EmailBinding;
  RL_CONTACT: RateLimit;
  RL_API: RateLimit;
  CONTACT_FROM: string;
  CONTACT_TO: string;
  // Secrets, set with `wrangler secret put`. Never in the repo.
  DASHBOARD_READ_TOKEN?: string;
  INGEST_TOKEN?: string;
}

const MAX_CONTACT_BYTES = 16 * 1024;
const MAX_INGEST_BYTES = 1024 * 1024;
const MAX_ROWS = 5000;

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...extra,
    },
  });

const error = (status: number, message: string, extra?: Record<string, string>) => json({ error: message }, status, extra);

/** Reads a JSON body, refusing anything that is not JSON or is larger than `limit` bytes. */
async function readJson(request: Request, limit: number): Promise<{ ok: true; value: unknown } | { ok: false; response: Response }> {
  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
    return { ok: false, response: error(415, 'Send JSON.') };
  }
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > limit) return { ok: false, response: error(413, 'Request body is too large.') };
  const raw = await request.arrayBuffer();
  if (raw.byteLength > limit) return { ok: false, response: error(413, 'Request body is too large.') };
  try {
    return { ok: true, value: JSON.parse(new TextDecoder().decode(raw)) };
  } catch {
    return { ok: false, response: error(400, 'Body is not valid JSON.') };
  }
}

const clientIp = (request: Request) => request.headers.get('cf-connecting-ip') ?? 'unknown';

async function contact(request: Request, env: Env): Promise<Response> {
  // Browsers always send Origin on a cross-site POST, so this blocks other sites from submitting the form.
  if (request.headers.get('origin') !== new URL(request.url).origin) return error(403, 'Cross-site requests are not accepted.');

  const { success } = await env.RL_CONTACT.limit({ key: clientIp(request) });
  if (!success) return error(429, 'Too many messages. Try again in a minute.', { 'retry-after': '60' });

  const body = await readJson(request, MAX_CONTACT_BYTES);
  if (!body.ok) return body.response;
  const parsed = parseContact(body.value);
  if (!parsed.ok) return error(400, parsed.error);
  const { name, email, message, bot } = parsed.value;
  // Bots get the same answer as people, so they cannot tell the honeypot caught them.
  if (bot) return json({ ok: true });

  try {
    await env.CONTACT_EMAIL.send({
      from: env.CONTACT_FROM,
      to: env.CONTACT_TO,
      replyTo: email,
      subject: `Portfolio contact from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}\n`,
    });
  } catch (cause) {
    console.error('contact: email send failed', cause instanceof Error ? cause.message : 'unknown error');
    return error(502, 'The message could not be sent.');
  }
  return json({ ok: true });
}

async function authorize(request: Request, env: Env, secret: string | undefined): Promise<Response | null> {
  // Slows down token guessing. The limit is per client address.
  const { success } = await env.RL_API.limit({ key: clientIp(request) });
  if (!success) return error(429, 'Too many requests.', { 'retry-after': '60' });
  if (!(await secretsMatch(bearer(request.headers.get('authorization')), secret))) {
    return error(401, 'A valid bearer token is required.', { 'www-authenticate': 'Bearer' });
  }
  return null;
}

async function listApplications(request: Request, env: Env): Promise<Response> {
  const denied = await authorize(request, env, env.DASHBOARD_READ_TOKEN);
  if (denied) return denied;
  const { results } = await env.DB.prepare(
    `SELECT id, applied_at, company, role, platform, location, work_type, seniority,
            source_url, status, last_update, notes
       FROM applications ORDER BY applied_at DESC, id LIMIT ?`,
  )
    .bind(MAX_ROWS)
    .all<Application>();
  return json({ applications: results });
}

async function upsertApplications(request: Request, env: Env): Promise<Response> {
  const denied = await authorize(request, env, env.INGEST_TOKEN);
  if (denied) return denied;
  const body = await readJson(request, MAX_INGEST_BYTES);
  if (!body.ok) return body.response;
  const parsed = parseApplications(body.value);
  if (!parsed.ok) return error(400, parsed.error);

  // A re-sent "Applied" row must not undo a later status (Interview, Rejected, ...)
  // recorded for the same application, so status and last_update only move forward.
  const statement = env.DB.prepare(
    `INSERT INTO applications
       (id, applied_at, company, role, platform, location, work_type, seniority, source_url, status, last_update, notes)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
     ON CONFLICT(id) DO UPDATE SET
       applied_at = excluded.applied_at,
       company = excluded.company,
       role = excluded.role,
       platform = excluded.platform,
       location = excluded.location,
       work_type = excluded.work_type,
       seniority = excluded.seniority,
       source_url = excluded.source_url,
       notes = excluded.notes,
       status = CASE WHEN excluded.status = 'Applied' THEN applications.status ELSE excluded.status END,
       last_update = CASE WHEN excluded.status = 'Applied' THEN applications.last_update ELSE excluded.last_update END`,
  );
  await env.DB.batch(
    parsed.value.map((a) =>
      statement.bind(
        a.id, a.applied_at, a.company, a.role, a.platform, a.location,
        a.work_type, a.seniority, a.source_url, a.status, a.last_update, a.notes,
      ),
    ),
  );
  return json({ ok: true, upserted: parsed.value.length });
}

export default {
  async fetch(request, env): Promise<Response> {
    const { pathname } = new URL(request.url);
    try {
      if (pathname === '/api/contact') {
        return request.method === 'POST' ? await contact(request, env) : error(405, 'Use POST.', { allow: 'POST' });
      }
      if (pathname === '/api/applications') {
        if (request.method === 'GET') return await listApplications(request, env);
        if (request.method === 'POST') return await upsertApplications(request, env);
        return error(405, 'Use GET or POST.', { allow: 'GET, POST' });
      }
      return error(404, 'Not found.');
    } catch (cause) {
      // Details stay in the Worker log; the client gets a generic message.
      console.error('unhandled', pathname, cause instanceof Error ? cause.message : 'unknown error');
      return error(500, 'Something went wrong.');
    }
  },
} satisfies ExportedHandler<Env>;
