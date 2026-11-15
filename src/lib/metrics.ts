// Pure analytics over job applications. No DOM, no network: shared by the
// dashboard page and unit tests. Every number shown on the dashboard comes from here.

export const STATUSES = ['Applied', 'Viewed', 'Assessment', 'Interview', 'Offer', 'Rejected', 'Ghosted'] as const;
export type Status = (typeof STATUSES)[number];

export interface Application {
  id: string;
  applied_at: string; // ISO date, YYYY-MM-DD
  company: string;
  role: string;
  platform: string;
  location: string;
  work_type: string; // Onsite | Hybrid | Remote | ''
  seniority: string;
  source_url: string;
  status: Status;
  last_update: string; // ISO date
  notes: string;
}

export const FUNNEL_STAGES = ['Applied', 'Viewed', 'Assessment', 'Interview', 'Offer'] as const;

const DAY = 86_400_000;
const toDay = (iso: string) => Date.parse(iso.slice(0, 10) + 'T00:00:00Z');
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const daysBetween = (a: string, b: string) => Math.round((toDay(b) - toDay(a)) / DAY);

/** An employer reply of any kind. "Viewed" is a signal, not a reply. */
const RESPONDED: ReadonlySet<Status> = new Set(['Assessment', 'Interview', 'Offer', 'Rejected']);
const INTERVIEWED: ReadonlySet<Status> = new Set(['Interview', 'Offer']);
const CLOSED: ReadonlySet<Status> = new Set(['Rejected', 'Ghosted']);

export const pct = (part: number, whole: number) => (whole === 0 ? null : (part / whole) * 100);

export interface Kpis {
  total: number;
  thisWeek: number;
  responseRate: number | null;
  interviewRate: number | null;
  avgDaysToResponse: number | null;
  active: number;
}

export function kpis(apps: Application[], today: string): Kpis {
  const weekStart = toDay(today) - 6 * DAY;
  const responded = apps.filter((a) => RESPONDED.has(a.status));
  // Only last_update is stored, so "first response" is approximated by the latest update.
  const waits = responded.map((a) => daysBetween(a.applied_at, a.last_update)).filter((d) => d >= 0);
  return {
    total: apps.length,
    thisWeek: apps.filter((a) => toDay(a.applied_at) >= weekStart && toDay(a.applied_at) <= toDay(today)).length,
    responseRate: pct(responded.length, apps.length),
    interviewRate: pct(apps.filter((a) => INTERVIEWED.has(a.status)).length, apps.length),
    avgDaysToResponse: waits.length ? waits.reduce((s, d) => s + d, 0) / waits.length : null,
    active: apps.filter((a) => !CLOSED.has(a.status)).length,
  };
}

export interface DayPoint {
  date: string;
  count: number;
  cumulative: number;
}

/** One point per calendar day for the last `days` days, zero-filled. */
export function perDay(apps: Application[], days: number, today: string): DayPoint[] {
  const end = toDay(today);
  const start = end - (days - 1) * DAY;
  const counts = new Map<string, number>();
  let before = 0;
  for (const a of apps) {
    const t = toDay(a.applied_at);
    if (t < start) before++;
    else if (t <= end) counts.set(isoDay(t), (counts.get(isoDay(t)) ?? 0) + 1);
  }
  const out: DayPoint[] = [];
  let cumulative = before;
  for (let t = start; t <= end; t += DAY) {
    const count = counts.get(isoDay(t)) ?? 0;
    cumulative += count;
    out.push({ date: isoDay(t), count, cumulative });
  }
  return out;
}

export interface Bucket {
  label: string;
  count: number;
}

export function countBy(apps: Application[], key: (a: Application) => string, limit?: number): Bucket[] {
  const m = new Map<string, number>();
  for (const a of apps) {
    const k = key(a).trim() || 'Unknown';
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  const out = [...m].map(([label, count]) => ({ label, count }));
  out.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  return limit ? out.slice(0, limit) : out;
}

/**
 * Applications that reached at least each stage. Rejected/Ghosted rows do not
 * record how far they got, so they count toward "Applied" only.
 */
export function funnel(apps: Application[]): Bucket[] {
  return FUNNEL_STAGES.map((stage, i) => ({
    label: stage,
    count: apps.filter((a) => {
      const at = (FUNNEL_STAGES as readonly string[]).indexOf(a.status);
      return i === 0 || at >= i;
    }).length,
  }));
}

export function statusDistribution(apps: Application[]): Bucket[] {
  return STATUSES.map((s) => ({ label: s, count: apps.filter((a) => a.status === s).length })).filter((b) => b.count > 0);
}

// ---- Insights ---------------------------------------------------------------

const MIN_FOR_INSIGHTS = 10;
const MIN_PER_PLATFORM = 5;
const round = (n: number) => Math.round(n);
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** English sentences computed from the data. Returns [] when the sample is too small to say anything. */
export function insights(apps: Application[], today: string): string[] {
  if (apps.length < MIN_FOR_INSIGHTS) return [];
  const out: string[] = [];
  const total = apps.length;

  // Platform share of volume vs share of interviews, and the best converter.
  const platforms = countBy(apps, (a) => a.platform);
  const interviews = apps.filter((a) => INTERVIEWED.has(a.status));
  const top = platforms[0];
  if (top && interviews.length > 0) {
    const topInterviews = interviews.filter((a) => (a.platform.trim() || 'Unknown') === top.label).length;
    let line = `${top.label} accounts for ${round(pct(top.count, total)!)}% of applications and ${round(
      pct(topInterviews, interviews.length)!,
    )}% of interviews`;
    const rate = (label: string, count: number) =>
      interviews.filter((a) => (a.platform.trim() || 'Unknown') === label).length / count;
    const topRate = rate(top.label, top.count);
    const best = platforms
      .filter((p) => p.label !== top.label && p.count >= MIN_PER_PLATFORM)
      .map((p) => ({ ...p, rate: rate(p.label, p.count) }))
      .sort((a, b) => b.rate - a.rate)[0];
    if (best && best.rate > topRate) {
      line +=
        topRate > 0
          ? `. ${best.label} converts to interview ${(best.rate / topRate).toFixed(1)}× as often`
          : `. ${best.label} converts better, at ${round(best.rate * 100)}% to interview`;
    }
    out.push(line + '.');
  } else if (top) {
    out.push(`${top.label} accounts for ${round(pct(top.count, total)!)}% of applications. No interviews recorded yet.`);
  }

  // Week over week.
  const end = toDay(today);
  const inRange = (from: number, to: number) =>
    apps.filter((a) => toDay(a.applied_at) >= from && toDay(a.applied_at) <= to).length;
  const thisWeek = inRange(end - 6 * DAY, end);
  const lastWeek = inRange(end - 13 * DAY, end - 7 * DAY);
  if (lastWeek > 0) {
    const change = round(((thisWeek - lastWeek) / lastWeek) * 100);
    out.push(
      change === 0
        ? `${thisWeek} applications in the last 7 days, level with the 7 days before.`
        : `${thisWeek} applications in the last 7 days, ${Math.abs(change)}% ${change > 0 ? 'more' : 'fewer'} than the 7 days before (${lastWeek}).`,
    );
  } else if (thisWeek > 0) {
    out.push(`${thisWeek} applications in the last 7 days, none in the 7 days before.`);
  }

  // Busiest weekday.
  const byWeekday = countBy(apps, (a) => WEEKDAYS[new Date(toDay(a.applied_at)).getUTCDay()]!);
  if (byWeekday[0] && byWeekday.length > 1) {
    out.push(`${byWeekday[0].label} is the busiest day, with ${round(pct(byWeekday[0].count, total)!)}% of applications.`);
  }

  // Stale applications: still open with no update for two weeks.
  const stale = apps.filter((a) => (a.status === 'Applied' || a.status === 'Viewed') && daysBetween(a.last_update, today) >= 14);
  if (stale.length > 0) {
    out.push(`${stale.length} open ${stale.length === 1 ? 'application has' : 'applications have'} had no update for 14 days or more (${round(pct(stale.length, total)!)}% of the total).`);
  }

  // Response time.
  const k = kpis(apps, today);
  if (k.avgDaysToResponse !== null && k.responseRate !== null) {
    out.push(`${round(k.responseRate)}% of applications got a reply, after ${k.avgDaysToResponse.toFixed(1)} days on average.`);
  }

  // Work-type mix, only when it is recorded.
  const typed = apps.filter((a) => a.work_type.trim());
  if (typed.length >= MIN_FOR_INSIGHTS) {
    const mix = countBy(typed, (a) => a.work_type);
    out.push(`${mix[0]!.label} roles make up ${round(pct(mix[0]!.count, typed.length)!)}% of applications with a known work type.`);
  }
  return out;
}

// ---- Table helpers ----------------------------------------------------------

export interface Filters {
  search: string;
  platform: string;
  status: string;
  from: string;
  to: string;
}

export function applyFilters(apps: Application[], f: Filters): Application[] {
  const q = f.search.trim().toLowerCase();
  return apps.filter(
    (a) =>
      (!f.platform || a.platform === f.platform) &&
      (!f.status || a.status === f.status) &&
      (!f.from || a.applied_at >= f.from) &&
      (!f.to || a.applied_at <= f.to) &&
      (!q || `${a.company} ${a.role} ${a.location} ${a.notes}`.toLowerCase().includes(q)),
  );
}

export const CSV_COLUMNS: (keyof Application)[] = [
  'id', 'applied_at', 'company', 'role', 'platform', 'location', 'work_type',
  'seniority', 'source_url', 'status', 'last_update', 'notes',
];

/** RFC 4180 CSV. Cells starting with = + - @ are prefixed so spreadsheets do not run them as formulas. */
export function toCsv(apps: Application[]): string {
  const cell = (v: string) => {
    const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
    return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return [CSV_COLUMNS.join(','), ...apps.map((a) => CSV_COLUMNS.map((c) => cell(String(a[c] ?? ''))).join(','))].join('\r\n');
}
