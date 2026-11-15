import { describe, expect, it } from 'vitest';
import { readdirSync } from 'node:fs';
import { groupFiles, matchFile, normalizeName } from '../src/lib/gallery-match';
import { applyFilters, funnel, insights, kpis, perDay, toCsv, type Application } from '../src/lib/metrics';
import { demoApplications } from '../src/lib/demo';

describe('gallery matching', () => {
  it('normalizes case, separators and extension', () => {
    expect(normalizeName('Porto_Trade-1.JPG')).toBe('porto trade 1');
  });

  it('is word-order tolerant and prefers the most specific rule', () => {
    expect(matchFile('Porto Prepaid Region 1.jpg')).toEqual({ group: 'prepaid', rank: 0 });
    expect(matchFile('porto-trade_1.jpg')).toEqual({ group: 'trade', rank: 2 });
    expect(matchFile('Trade 3.jpeg')).toEqual({ group: 'trade', rank: 1 });
    expect(matchFile('PORTO BUSPLAN 2.jpg')).toEqual({ group: 'busplan', rank: 2 });
    expect(matchFile('Busplan Champions 2023.jpg')).toEqual({ group: 'busplan', rank: 0 });
    expect(matchFile('holiday.png').group).toBe('other');
  });

  it('maps every real source file in the required order', () => {
    const files = readdirSync(new URL('../src/assets/gallery/', import.meta.url));
    const g = groupFiles(files);
    expect(g.rural).toEqual(['Region Team.jpg', 'Rural Region.jpg']);
    expect(g.prepaid).toEqual(['Porto Prepaid Region 1.jpg']);
    expect(g.trade).toEqual([
      'Circle 1.jpeg', 'Circle 2.jpeg', 'Circle 3.jpg', 'Circle 4.jpg',
      'Trade 1.JPG', 'Trade 2.JPG', 'Trade 3.jpeg', 'Trade 4.jpeg',
      'Porto Trade 1.jpg',
    ]);
    expect(g.busplan).toEqual(['Busplan Champions 2023.jpg', 'Busplan 1.jpeg', 'Porto Busplan 2.jpg']);
    expect(g.mis).toEqual(['MIS 1.jpeg', 'MIS 2.jpeg', 'MIS 3.jpeg']);
    expect(g.other).toEqual([]);
  });
});

const app = (over: Partial<Application>): Application => ({
  id: 'x', applied_at: '2026-11-10', company: 'Acme', role: 'Data Analyst', platform: 'LinkedIn',
  location: '', work_type: '', seniority: '', source_url: '', status: 'Applied', last_update: '2026-11-10', notes: '',
  ...over,
});

describe('metrics', () => {
  const today = '2026-11-15';

  it('returns nulls, not fake numbers, for an empty dataset', () => {
    expect(kpis([], today)).toEqual({
      total: 0, thisWeek: 0, responseRate: null, interviewRate: null, avgDaysToResponse: null, active: 0,
    });
    expect(insights([], today)).toEqual([]);
  });

  it('computes KPIs', () => {
    const apps = [
      app({ id: '1', applied_at: '2026-11-14' }),
      app({ id: '2', applied_at: '2026-11-01', status: 'Interview', last_update: '2026-11-05' }),
      app({ id: '3', applied_at: '2026-10-01', status: 'Rejected', last_update: '2026-10-07' }),
      app({ id: '4', applied_at: '2026-10-01', status: 'Ghosted' }),
    ];
    const k = kpis(apps, today);
    expect(k.total).toBe(4);
    expect(k.thisWeek).toBe(1);
    expect(k.responseRate).toBe(50);
    expect(k.interviewRate).toBe(25);
    expect(k.avgDaysToResponse).toBe(5);
    expect(k.active).toBe(2);
  });

  it('zero-fills days and carries the cumulative total from before the window', () => {
    const apps = [app({ applied_at: '2026-01-01' }), app({ applied_at: '2026-11-14' }), app({ applied_at: '2026-11-14' })];
    const pts = perDay(apps, 3, today);
    expect(pts.map((p) => p.count)).toEqual([0, 2, 0]);
    expect(pts.map((p) => p.cumulative)).toEqual([1, 3, 3]);
  });

  it('funnel counts stages reached and is monotonic', () => {
    const f = funnel(demoApplications(today)).map((b) => b.count);
    expect(f[0]).toBe(140);
    for (let i = 1; i < f.length; i++) expect(f[i]!).toBeLessThanOrEqual(f[i - 1]!);
  });

  it('derives insights from the data', () => {
    const apps = [
      ...Array.from({ length: 12 }, (_, i) => app({ id: `l${i}`, platform: 'LinkedIn', status: i === 0 ? 'Interview' : 'Applied' })),
      ...Array.from({ length: 6 }, (_, i) => app({ id: `j${i}`, platform: 'JobStreet', status: i < 3 ? 'Interview' : 'Applied' })),
    ];
    const first = insights(apps, today)[0]!;
    expect(first).toContain('LinkedIn accounts for 67% of applications and 25% of interviews');
    expect(first).toContain('JobStreet converts to interview 6.0× as often');
  });

  it('filters and exports CSV safely', () => {
    const apps = [app({ company: 'A, "B"', notes: '=SUM(A1)' }), app({ platform: 'Glints', company: 'Zed' })];
    expect(applyFilters(apps, { search: 'zed', platform: '', status: '', from: '', to: '' })).toHaveLength(1);
    expect(applyFilters(apps, { search: '', platform: 'Glints', status: '', from: '', to: '' })).toHaveLength(1);
    const csv = toCsv(apps);
    expect(csv).toContain('"A, ""B"""');
    expect(csv).toContain("'=SUM(A1)");
  });

  it('demo data is deterministic and uses placeholder companies', () => {
    const a = demoApplications(today);
    expect(a).toEqual(demoApplications(today));
    expect(a.every((x) => /Company [A-D]$/.test(x.company))).toBe(true);
  });
});
