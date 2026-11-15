// Synthetic applications for the public demo mode. Company names are generic
// placeholders; nothing here is derived from real application data.
import type { Application, Status } from './metrics';

/** Small deterministic PRNG (mulberry32) so the demo looks the same on every load. */
function prng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PLATFORMS: [string, number, number][] = [
  // name, share of volume, chance of reaching interview
  ['LinkedIn', 0.46, 0.05],
  ['JobStreet', 0.2, 0.14],
  ['Glints', 0.14, 0.09],
  ['Kalibrr', 0.1, 0.08],
  ['Company Site', 0.1, 0.16],
];
const SECTORS = ['Telco', 'FMCG', 'Fintech', 'Retail', 'Logistics', 'Software', 'Consulting', 'Energy'];
const ROLES = ['Data Analyst', 'Business Intelligence Analyst', 'Business Analyst', 'Data Engineer', 'Reporting Analyst', 'Analytics Engineer'];
const LOCATIONS = ['Jakarta', 'Yogyakarta', 'Bandung', 'Surabaya', 'Singapore', 'Kuala Lumpur'];
const WORK_TYPES = ['Onsite', 'Hybrid', 'Remote'];
const SENIORITY = ['Junior', 'Mid', 'Senior'];

const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function demoApplications(today: string, count = 140): Application[] {
  const rand = prng(20261115);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)]!;
  const end = Date.parse(today + 'T00:00:00Z');
  const companies = SECTORS.flatMap((s) => ['A', 'B', 'C', 'D'].map((l) => `${s} Company ${l}`));
  const apps: Application[] = [];

  for (let i = 0; i < count; i++) {
    let daysAgo = Math.floor(rand() * 90);
    const applied = new Date(end - daysAgo * DAY);
    // Fewer applications on weekends.
    if ((applied.getUTCDay() === 0 || applied.getUTCDay() === 6) && rand() < 0.7) daysAgo = Math.min(89, daysAgo + 2);
    const appliedAt = end - daysAgo * DAY;

    let r = rand();
    const platform = PLATFORMS.find(([, share]) => (r -= share) < 0) ?? PLATFORMS[0]!;
    const interviewChance = platform[2];

    const roll = rand();
    let status: Status;
    if (roll < interviewChance * 0.15) status = 'Offer';
    else if (roll < interviewChance) status = 'Interview';
    else if (roll < interviewChance + 0.07) status = 'Assessment';
    else if (roll < interviewChance + 0.25) status = 'Rejected';
    else if (roll < interviewChance + 0.4) status = 'Viewed';
    else status = daysAgo > 30 && rand() < 0.5 ? 'Ghosted' : 'Applied';

    const wait = status === 'Applied' ? 0 : Math.min(daysAgo, 2 + Math.floor(rand() * 14));
    apps.push({
      id: `demo-${String(i + 1).padStart(3, '0')}`,
      applied_at: iso(appliedAt),
      company: pick(companies),
      role: pick(ROLES),
      platform: platform[0],
      location: pick(LOCATIONS),
      work_type: pick(WORK_TYPES),
      seniority: pick(SENIORITY),
      source_url: '',
      status,
      last_update: iso(appliedAt + wait * DAY),
      notes: '',
    });
  }
  return apps.sort((a, b) => b.applied_at.localeCompare(a.applied_at));
}
