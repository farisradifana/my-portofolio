// Dashboard page. Every number comes from src/lib/metrics.ts; this file only
// fetches, filters and draws. All text reaches the DOM through textContent.
import { demoApplications } from '../lib/demo';
import publicRows from '../data/applications.public.json';
import {
  STATUSES, applyFilters, countBy, daysBetween, funnel, insights, kpis, pct, perDay, statusDistribution, toCsv,
  type Application, type Bucket, type Status,
} from '../lib/metrics';

const TOKEN_KEY = 'dashboard-read-token';
const PAGE_SIZE = 15;
const SVG_NS = 'http://www.w3.org/2000/svg';
const DAY = 86_400_000;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text) node.textContent = text;
  return node;
};
const svg = (tag: string, attrs: Record<string, string | number> = {}): SVGElement => {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
};

const pad = (n: number) => String(n).padStart(2, '0');
const now = new Date();
const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const addDays = (iso: string, n: number) => new Date(Date.parse(iso + 'T00:00:00Z') + n * DAY).toISOString().slice(0, 10);
const shortDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const longDate = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const fmt = (iso: string, f = shortDate) => f.format(new Date(iso + 'T00:00:00Z'));
const plural = (n: number, word = 'application') => `${n.toLocaleString('en-GB')} ${word}${n === 1 ? '' : 's'}`;
const share = (part: number, whole: number) => {
  const p = pct(part, whole);
  return p === null ? '' : `${p < 10 ? p.toFixed(1) : Math.round(p)}%`;
};
const statusVar = (s: string) => `var(--st-${s.toLowerCase()})`;

// ---- State ------------------------------------------------------------------

type SortKey = 'applied_at' | 'company' | 'role' | 'platform' | 'location' | 'status' | 'last_update';
const COLUMNS: [SortKey, string][] = [
  ['applied_at', 'Applied'], ['company', 'Company'], ['role', 'Role'], ['platform', 'Platform'],
  ['location', 'Location'], ['status', 'Status'], ['last_update', 'Last update'],
];

let all: Application[] = [];
let mode: 'demo' | 'public' | 'private' = 'demo';
let view: Application[] = [];
let sort: { key: SortKey; dir: 1 | -1 } = { key: 'applied_at', dir: -1 };
let page = 0;

const filtersForm = $<HTMLFormElement>('filters');
const viewEl = $('view');
const tip = $('tip');

// ---- Tooltip ----------------------------------------------------------------

function showTip(x: number, y: number, title: string, detail: string) {
  tip.replaceChildren(el('strong', '', title), document.createTextNode(detail));
  tip.hidden = false;
  const left = Math.min(Math.max(8, x + 12), window.innerWidth - tip.offsetWidth - 8);
  const top = Math.min(Math.max(8, y - tip.offsetHeight - 12), window.innerHeight - tip.offsetHeight - 8);
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}
const hideTip = () => {
  tip.hidden = true;
};
function hoverTip(target: Element, title: string, detail: string) {
  target.addEventListener('pointermove', (e) => showTip((e as PointerEvent).clientX, (e as PointerEvent).clientY, title, detail));
  target.addEventListener('pointerleave', hideTip);
}

// ---- Period -----------------------------------------------------------------

function period(): { days: number; from: string } {
  const range = Number(new FormData(filtersForm).get('range'));
  if (range > 0) return { days: range, from: addDays(today, -(range - 1)) };
  // "All": from the first application to today, at least 30 days, at most a year on the charts.
  const first = all.reduce((min, a) => (a.applied_at < min ? a.applied_at : min), today);
  return { days: Math.min(366, Math.max(30, daysBetween(first, today) + 1)), from: '' };
}

// ---- KPI row ----------------------------------------------------------------

function drawKpis(apps: Application[]) {
  const k = kpis(apps, today);
  const rate = (v: number | null) => (v === null ? '–' : `${Math.round(v)}%`);
  const tiles: [string, string, string?][] = [
    ['Total applications', k.total.toLocaleString('en-GB')],
    ['Last 7 days', k.thisWeek.toLocaleString('en-GB')],
    ['Response rate', rate(k.responseRate)],
    ['Interview rate', rate(k.interviewRate)],
    ['Avg. time to response', k.avgDaysToResponse === null ? '–' : k.avgDaysToResponse.toFixed(1), k.avgDaysToResponse === null ? '' : 'days'],
    ['Active applications', k.active.toLocaleString('en-GB')],
  ];
  $('kpis').replaceChildren(
    ...tiles.map(([label, value, unit]) => {
      const box = el('div');
      const dd = el('dd', '', value);
      if (unit) dd.append(el('small', '', unit));
      box.append(el('dt', '', label), dd);
      return box;
    }),
  );
}

// ---- Line chart -------------------------------------------------------------

function niceTicks(max: number): number[] {
  const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];
  const step = steps.find((s) => max / s <= 4) ?? Math.ceil(max / 4);
  const out: number[] = [];
  for (let v = 0; v < max + step; v += step) out.push(v);
  return out;
}

function drawLine(apps: Application[], days: number) {
  const host = $('plot-time');
  const series = new FormData(filtersForm).get('series') === 'cumulative' ? 'cumulative' : 'count';
  const pts = perDay(apps, days, today);
  const values = pts.map((p) => p[series]);
  const W = Math.max(280, host.clientWidth);
  const H = 240;
  const [L, R, T, B] = [36, 12, 12, 26];
  const ticks = niceTicks(Math.max(1, ...values));
  const top = ticks[ticks.length - 1]!;
  const x = (i: number) => L + (pts.length === 1 ? 0 : (i * (W - L - R)) / (pts.length - 1));
  const y = (v: number) => T + (1 - v / top) * (H - T - B);

  const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', tabindex: 0 });
  const total = pts.reduce((s, p) => s + p.count, 0);
  root.setAttribute(
    'aria-label',
    `${series === 'cumulative' ? 'Cumulative applications' : 'Applications per day'}, ${fmt(pts[0]!.date)} to ${fmt(pts[pts.length - 1]!.date)}. ` +
      `${plural(total)} in the period. Use the arrow keys to read each day.`,
  );

  for (const t of ticks) {
    root.append(svg('line', { class: 'gridline', x1: L, x2: W - R, y1: y(t), y2: y(t) }));
    const label = svg('text', { x: L - 8, y: y(t) + 4, 'text-anchor': 'end' });
    label.textContent = String(t);
    root.append(label);
  }
  const labelCount = Math.min(pts.length, W < 480 ? 3 : 5);
  for (let n = 0; n < labelCount; n++) {
    const i = labelCount === 1 ? 0 : Math.round((n * (pts.length - 1)) / (labelCount - 1));
    const label = svg('text', { x: x(i), y: H - 6, 'text-anchor': n === 0 ? 'start' : n === labelCount - 1 ? 'end' : 'middle' });
    label.textContent = fmt(pts[i]!.date);
    root.append(label);
  }

  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  root.append(
    svg('path', { class: 'area', d: `${d}L${x(pts.length - 1).toFixed(1)},${y(0)}L${x(0)},${y(0)}Z` }),
    svg('path', { class: 'line', d }),
  );

  const cross = svg('line', { class: 'cross', y1: T, y2: H - B, visibility: 'hidden' });
  const dot = svg('circle', { class: 'dot', r: 5, visibility: 'hidden' });
  const hit = svg('rect', { x: L, y: T, width: W - L - R, height: H - T - B, fill: 'transparent' });
  root.append(cross, dot, hit);

  let at = -1;
  const select = (i: number) => {
    at = Math.min(pts.length - 1, Math.max(0, i));
    const p = pts[at]!;
    cross.setAttribute('x1', String(x(at)));
    cross.setAttribute('x2', String(x(at)));
    dot.setAttribute('cx', String(x(at)));
    dot.setAttribute('cy', String(y(values[at]!)));
    cross.setAttribute('visibility', 'visible');
    dot.setAttribute('visibility', 'visible');
    const box = root.getBoundingClientRect();
    const detail = series === 'cumulative' ? `${plural(p.cumulative)} in total, ${p.count} that day` : `${plural(p.count)} sent`;
    showTip(box.left + x(at), box.top + y(values[at]!), fmt(p.date, longDate), detail);
  };
  const clear = () => {
    at = -1;
    cross.setAttribute('visibility', 'hidden');
    dot.setAttribute('visibility', 'hidden');
    hideTip();
  };
  hit.addEventListener('pointermove', (e) => {
    const px = (e as PointerEvent).clientX - root.getBoundingClientRect().left;
    select(Math.round(((px - L) / (W - L - R)) * (pts.length - 1)));
  });
  hit.addEventListener('pointerleave', clear);
  root.addEventListener('focus', () => select(pts.length - 1));
  root.addEventListener('blur', clear);
  root.addEventListener('keydown', (e) => {
    const key = (e as KeyboardEvent).key;
    const next = key === 'ArrowLeft' ? at - 1 : key === 'ArrowRight' ? at + 1 : key === 'Home' ? 0 : key === 'End' ? pts.length - 1 : null;
    if (key === 'Escape') clear();
    if (next === null) return;
    e.preventDefault();
    select(next);
  });

  host.replaceChildren(root);
}

// ---- Horizontal bars --------------------------------------------------------

function drawBars(hostId: string, buckets: Bucket[], whole: number, of: string) {
  const host = $(hostId);
  if (buckets.length === 0) return host.replaceChildren(el('p', 'empty', 'Nothing to show for these filters.'));
  const max = Math.max(...buckets.map((b) => b.count));
  const list = el('ul', 'hbars');
  for (const b of buckets) {
    const li = el('li');
    const name = el('span', 'name', b.label);
    name.title = b.label;
    const val = el('span', 'val');
    val.append(el('b', '', b.count.toLocaleString('en-GB')), document.createTextNode(` · ${share(b.count, whole)}`));
    const track = el('div', 'track');
    const fill = el('div', 'fill');
    fill.style.setProperty('--w', `${(b.count / max) * 100}%`);
    track.append(fill);
    li.append(name, val, track);
    hoverTip(li, b.label, `${plural(b.count)}, ${share(b.count, whole)} of ${of}`);
    list.append(li);
  }
  host.replaceChildren(list);
}

// ---- Donut ------------------------------------------------------------------

function drawDonut(apps: Application[]) {
  const host = $('plot-status');
  const parts = statusDistribution(apps);
  const total = apps.length;
  // r = 15.915 gives a circumference of 100, so dash lengths are percentages.
  const root = svg('svg', { viewBox: '0 0 42 42', role: 'img' });
  root.setAttribute('aria-label', `Status of ${plural(total)}: ${parts.map((p) => `${p.label} ${p.count}`).join(', ')}.`);
  const gap = parts.length > 1 ? 0.6 : 0;
  let offset = 25; // start at 12 o'clock
  for (const p of parts) {
    const len = (p.count / total) * 100;
    const arc = svg('circle', {
      cx: 21, cy: 21, r: 15.915,
      'stroke-dasharray': `${Math.max(0.4, len - gap)} ${100 - Math.max(0.4, len - gap)}`,
      'stroke-dashoffset': offset,
    });
    arc.style.setProperty('stroke', statusVar(p.label));
    hoverTip(arc, p.label, `${plural(p.count)}, ${share(p.count, total)} of the total`);
    root.append(arc);
    offset -= len;
  }
  const num = svg('text', { class: 'total', x: 21, y: 22, 'text-anchor': 'middle' });
  num.textContent = total.toLocaleString('en-GB');
  const cap = svg('text', { class: 'total-label', x: 21, y: 27, 'text-anchor': 'middle' });
  cap.textContent = 'applications';
  root.append(num, cap);

  const legend = el('ul', 'legend');
  for (const p of parts) {
    const li = el('li');
    const sw = el('span', 'swatch');
    sw.style.setProperty('--c', statusVar(p.label));
    const val = el('span', 'val');
    val.append(el('b', '', String(p.count)), document.createTextNode(` · ${share(p.count, total)}`));
    li.append(sw, el('span', '', p.label), val);
    legend.append(li);
  }
  host.replaceChildren(root, legend);
}

// ---- Calendar heatmap -------------------------------------------------------

function drawHeat(apps: Application[], days: number) {
  const host = $('plot-heat');
  const counts = new Map<string, number>();
  for (const a of apps) counts.set(a.applied_at, (counts.get(a.applied_at) ?? 0) + 1);
  const start = addDays(today, -(days - 1));
  // Columns are weeks starting on Monday.
  const lead = (new Date(start + 'T00:00:00Z').getUTCDay() + 6) % 7;
  const first = addDays(start, -lead);
  const span = daysBetween(first, today) + 1;
  const [CELL, STEP, LEFT, TOP] = [12, 15, 30, 18];
  const cols = Math.ceil(span / 7);
  const max = Math.max(0, ...[...counts].filter(([d]) => d >= start && d <= today).map(([, c]) => c));

  const root = svg('svg', { width: LEFT + cols * STEP, height: TOP + 7 * STEP, role: 'img' });
  root.setAttribute('aria-label', `Applications per day from ${fmt(start, longDate)} to ${fmt(today, longDate)}. Busiest day: ${max}.`);
  ['Mon', '', 'Wed', '', 'Fri', '', ''].forEach((name, row) => {
    if (!name) return;
    const t = svg('text', { x: 0, y: TOP + row * STEP + 10 });
    t.textContent = name;
    root.append(t);
  });
  let lastLabel = -4;
  for (let i = 0; i < span; i++) {
    const date = addDays(first, i);
    const [col, row] = [Math.floor(i / 7), i % 7];
    if (row === 0 && col - lastLabel >= 4 && Number(addDays(date, 6).slice(8)) <= 7) {
      const t = svg('text', { x: LEFT + col * STEP, y: 10 });
      t.textContent = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' }).format(new Date(addDays(date, 6) + 'T00:00:00Z'));
      root.append(t);
      lastLabel = col;
    }
    if (date < start) continue;
    const n = counts.get(date) ?? 0;
    const level = n === 0 ? 0 : Math.max(1, Math.ceil((n / max) * 4));
    const cell = svg('rect', { x: LEFT + col * STEP, y: TOP + row * STEP, width: CELL, height: CELL, rx: 2 });
    cell.style.setProperty('fill', `var(--heat-${level})`);
    hoverTip(cell, fmt(date, longDate), n === 0 ? 'No applications' : `${plural(n)} sent`);
    root.append(cell);
  }
  const scroll = el('div', 'heat-scroll');
  scroll.append(root);
  const key = el('div', 'heat-key');
  key.append(el('span', '', 'Fewer'));
  for (let level = 0; level <= 4; level++) {
    const sw = el('i');
    sw.style.setProperty('background', `var(--heat-${level})`);
    key.append(sw);
  }
  key.append(el('span', '', max > 0 ? `More (up to ${max} a day)` : 'More'));
  host.replaceChildren(scroll, key);
  scroll.scrollLeft = scroll.scrollWidth; // most recent weeks first on narrow screens
}

// ---- Insights ---------------------------------------------------------------

function drawInsights(apps: Application[]) {
  const lines = insights(apps, today);
  if (lines.length === 0) {
    return $('insights').replaceChildren(el('p', 'empty', 'Insights appear once at least 10 applications are in view.'));
  }
  const list = el('ul', 'insights');
  list.append(...lines.map((line) => el('li', '', line)));
  $('insights').replaceChildren(list);
}

// ---- Table ------------------------------------------------------------------

function sorted(): Application[] {
  const { key, dir } = sort;
  return [...view].sort((a, b) => dir * a[key].localeCompare(b[key]) || b.applied_at.localeCompare(a.applied_at) || a.id.localeCompare(b.id));
}

function drawHead() {
  $('thead').replaceChildren(
    ...COLUMNS.map(([key, label]) => {
      const th = el('th');
      th.scope = 'col';
      if (sort.key === key) th.setAttribute('aria-sort', sort.dir === 1 ? 'ascending' : 'descending');
      const btn = el('button', '', label);
      btn.type = 'button';
      btn.addEventListener('click', () => {
        sort = { key, dir: sort.key === key ? (sort.dir === 1 ? -1 : 1) : key === 'applied_at' || key === 'last_update' ? -1 : 1 };
        page = 0;
        drawTable();
      });
      th.append(btn);
      return th;
    }),
  );
}

function drawTable() {
  drawHead();
  const rows = sorted();
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  page = Math.min(page, pages - 1);
  const slice = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  $('tbody').replaceChildren(
    ...slice.map((a) => {
      const tr = el('tr');
      const company = el('td');
      if (/^https?:\/\//i.test(a.source_url)) {
        const link = el('a', '', a.company);
        link.href = a.source_url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        company.append(link);
      } else company.textContent = a.company;
      const status = el('td');
      const chip = el('span', 'status', a.status);
      chip.style.setProperty('--c', statusVar(a.status));
      status.append(chip);
      tr.append(
        el('td', 'date', fmt(a.applied_at, longDate).replace(/^\w+ /, '')), company, el('td', '', a.role), el('td', '', a.platform || '–'),
        el('td', '', [a.location, a.work_type].filter(Boolean).join(' · ') || '–'), status,
        el('td', 'date', fmt(a.last_update, longDate).replace(/^\w+ /, '')),
      );
      return tr;
    }),
  );
  $('page-info').textContent = `${page * PAGE_SIZE + 1}–${page * PAGE_SIZE + slice.length} of ${plural(rows.length)} · page ${page + 1} of ${pages}`;
  $<HTMLButtonElement>('prev').disabled = page === 0;
  $<HTMLButtonElement>('next').disabled = page >= pages - 1;
}

// ---- Render -----------------------------------------------------------------

function render() {
  const data = new FormData(filtersForm);
  const { days, from } = period();
  view = applyFilters(all, {
    search: String(data.get('search') ?? ''),
    platform: String(data.get('platform') ?? ''),
    status: String(data.get('status') ?? ''),
    from,
    to: today,
  });
  hideTip();
  drawKpis(view);

  const empty = view.length === 0;
  $('empty-all').hidden = !empty;
  $('charts').hidden = empty;
  if (empty) {
    const none = all.length === 0;
    $('empty-title').textContent = none ? 'No applications recorded yet' : 'No applications match these filters';
    $('empty-text').textContent = none
      ? 'Charts and the table appear here after the first application is synced from the tracker.'
      : 'Widen the period or clear the platform, status and search filters.';
    return;
  }
  drawLine(view, days);
  drawDonut(view);
  drawBars('plot-platform', countBy(view, (a) => a.platform), view.length, 'applications');
  drawBars('plot-funnel', funnel(view), view.length, 'applications');
  drawBars('plot-companies', countBy(view, (a) => a.company, 10), view.length, 'applications');
  drawBars('plot-roles', countBy(view, (a) => a.role, 10), view.length, 'applications');
  drawHeat(view, days);
  drawInsights(view);
  drawTable();
}

function setData(apps: Application[], next: 'demo' | 'public' | 'private') {
  all = apps;
  mode = next;
  page = 0;
  const select = $<HTMLSelectElement>('f-platform');
  const chosen = select.value;
  const names = countBy(all, (a) => a.platform).map((b) => b.label).filter((n) => n !== 'Unknown');
  select.replaceChildren(new Option('All platforms', ''), ...names.map((n) => new Option(n, n)));
  select.value = names.includes(chosen) ? chosen : '';

  const priv = mode === 'private';
  $('mode-badge').textContent = priv ? 'Private data' : mode === 'public' ? 'Tracker data' : 'Demo data';
  const text = $('mode-text');
  if (priv) {
    text.replaceChildren(
      el('strong', '', 'Live data from the application tracker.'),
      document.createTextNode(` Loaded at ${pad(new Date().getHours())}:${pad(new Date().getMinutes())}. The token stays in this tab only.`),
    );
  } else if (mode === 'public') {
    text.replaceChildren(
      el('strong', '', 'Real applications from the tracker.'),
      document.createTextNode(' Company names are shortened to initials; links and notes are left out.'),
    );
  } else {
    text.replaceChildren(
      el('strong', '', 'These numbers are generated, not real.'),
      document.createTextNode(' The tracker has no submitted applications yet. Real rows replace this demo once there are some, with company names shortened to initials.'),
    );
  }
  const toggle = $('mode-toggle');
  toggle.textContent = priv ? 'Back to public view' : 'Open private view';
  toggle.setAttribute('aria-expanded', 'false');
  $('token-form').hidden = true;
  viewEl.setAttribute('aria-busy', 'false');
  render();
}

// ---- Private data -----------------------------------------------------------

const isStatus = (v: unknown): v is Status => (STATUSES as readonly unknown[]).includes(v);

async function loadPrivate(token: string): Promise<'ok' | 'denied' | 'failed'> {
  viewEl.setAttribute('aria-busy', 'true');
  try {
    const res = await fetch('/api/applications', { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (res.status === 401 || res.status === 403) return 'denied';
    if (!res.ok) return 'failed';
    const body = (await res.json()) as { applications?: unknown };
    if (!Array.isArray(body.applications)) return 'failed';
    const str = (v: unknown) => (typeof v === 'string' ? v : '');
    const rows: Application[] = [];
    for (const r of body.applications as Record<string, unknown>[]) {
      if (!r || !/^\d{4}-\d{2}-\d{2}/.test(str(r.applied_at)) || !isStatus(r.status)) continue;
      const applied = str(r.applied_at).slice(0, 10);
      rows.push({
        id: str(r.id), applied_at: applied, company: str(r.company), role: str(r.role), platform: str(r.platform),
        location: str(r.location), work_type: str(r.work_type), seniority: str(r.seniority), source_url: str(r.source_url),
        status: r.status, last_update: /^\d{4}-\d{2}-\d{2}/.test(str(r.last_update)) ? str(r.last_update).slice(0, 10) : applied,
        notes: str(r.notes),
      });
    }
    setData(rows, 'private');
    return 'ok';
  } catch {
    return 'failed';
  } finally {
    viewEl.setAttribute('aria-busy', 'false');
  }
}

const storage = {
  get: () => {
    try {
      return sessionStorage.getItem(TOKEN_KEY) ?? '';
    } catch {
      return '';
    }
  },
  set: (v: string) => {
    try {
      if (v) sessionStorage.setItem(TOKEN_KEY, v);
      else sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage blocked: the token then lives only for this page load */
    }
  },
};

// Public view: the exported tracker rows (company initials only). The generated
// demo stands in only while the tracker has no submitted applications.
const publicApps = publicRows as unknown as Application[];
const showDemo = () => (publicApps.length > 0 ? setData(publicApps, 'public') : setData(demoApplications(today), 'demo'));

// ---- Events -----------------------------------------------------------------

$('mode-toggle').addEventListener('click', () => {
  if (mode === 'private') {
    storage.set('');
    showDemo();
    return;
  }
  const form = $('token-form');
  form.hidden = !form.hidden;
  $('mode-toggle').setAttribute('aria-expanded', String(!form.hidden));
  if (!form.hidden) $<HTMLInputElement>('token').focus();
});

$<HTMLFormElement>('token-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = $<HTMLInputElement>('token');
  const token = input.value.trim();
  const status = $('token-status');
  if (!token) return;
  status.textContent = 'Loading…';
  const result = await loadPrivate(token);
  if (result === 'ok') {
    storage.set(token);
    input.value = '';
    status.textContent = '';
  } else {
    status.textContent = result === 'denied' ? 'That token was not accepted.' : 'Could not load the data. Check the connection and try again.';
  }
});

let searchTimer = 0;
filtersForm.addEventListener('input', (e) => {
  page = 0;
  if ((e.target as HTMLElement).id === 'f-search') {
    clearTimeout(searchTimer);
    searchTimer = window.setTimeout(render, 150);
  } else render();
});
filtersForm.addEventListener('submit', (e) => e.preventDefault());

$('prev').addEventListener('click', () => {
  page--;
  drawTable();
});
$('next').addEventListener('click', () => {
  page++;
  drawTable();
});

$('export').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob(['﻿' + toCsv(sorted())], { type: 'text/csv;charset=utf-8' }));
  const link = el('a');
  link.href = url;
  link.download = `applications-${mode}-${today}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

// Only the line chart depends on its container width.
let lastWidth = 0;
new ResizeObserver(([entry]) => {
  const w = Math.round(entry!.contentRect.width);
  if (w === lastWidth || view.length === 0) return;
  lastWidth = w;
  drawLine(view, period().days);
}).observe($('plot-time'));
window.addEventListener('scroll', hideTip, { passive: true });

// ---- Start ------------------------------------------------------------------

const saved = storage.get();
if (saved) {
  loadPrivate(saved).then((result) => {
    if (result === 'ok') return;
    if (result === 'denied') storage.set('');
    showDemo();
  });
} else showDemo();
