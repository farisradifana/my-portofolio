// Maps work-sample filenames to a role gallery and a display order.
// Matching is case-insensitive, ignores spaces/underscores/dashes, and is
// word-order tolerant ("Porto Prepaid Region" satisfies "Porto Region Prepaid").

export type GroupId = 'rural' | 'prepaid' | 'trade' | 'busplan' | 'mis' | 'other';

interface Rule {
  group: Exclude<GroupId, 'other'>;
  /** Position of this rule inside its group's gallery. */
  rank: number;
  /** Every word must be present in the filename. */
  words: string[];
}

const RULES: Rule[] = [
  { group: 'rural', rank: 0, words: ['region', 'team'] },
  { group: 'rural', rank: 1, words: ['rural', 'region'] },
  { group: 'prepaid', rank: 0, words: ['porto', 'region', 'prepaid'] },
  { group: 'trade', rank: 0, words: ['circle'] },
  { group: 'trade', rank: 1, words: ['trade'] },
  { group: 'trade', rank: 2, words: ['porto', 'trade'] },
  { group: 'busplan', rank: 0, words: ['busplan', 'champions'] },
  { group: 'busplan', rank: 1, words: ['busplan'] },
  { group: 'busplan', rank: 2, words: ['porto', 'busplan'] },
  { group: 'mis', rank: 0, words: ['mis'] },
];

/** "Porto_Trade-1.JPG" -> "porto trade 1" */
export function normalizeName(filename: string): string {
  return filename
    .replace(/^.*[\\/]/, '')
    .replace(/\.[a-z0-9]+$/i, '')
    .toLowerCase()
    .replace(/[\s_-]+/g, ' ')
    .trim();
}

export interface Match {
  group: GroupId;
  rank: number;
}

export function matchFile(filename: string): Match {
  const words = new Set(normalizeName(filename).split(' '));
  let best: Rule | undefined;
  for (const rule of RULES) {
    if (!rule.words.every((w) => words.has(w))) continue;
    // The most specific rule wins, so "Porto Trade 1" is a Porto Trade, not a plain Trade.
    if (!best || rule.words.length > best.words.length) best = rule;
  }
  return best ? { group: best.group, rank: best.rank } : { group: 'other', rank: 0 };
}

const naturalCompare = new Intl.Collator('en', { numeric: true, sensitivity: 'base' }).compare;

/** Groups filenames and sorts each group by rule rank, then natural filename order. */
export function groupFiles(filenames: string[]): Record<GroupId, string[]> {
  const out: Record<GroupId, string[]> = { rural: [], prepaid: [], trade: [], busplan: [], mis: [], other: [] };
  const ranked = filenames.map((name) => ({ name, ...matchFile(name) }));
  ranked.sort((a, b) => a.rank - b.rank || naturalCompare(normalizeName(a.name), normalizeName(b.name)));
  for (const f of ranked) out[f.group].push(f.name);
  return out;
}
