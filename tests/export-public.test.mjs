import { describe, expect, it } from 'vitest';
import { toPublic } from '../scripts/export-public.mjs';

const publicRole = (company, role) =>
  toPublic([{ id: 'a', applied_at: '2026-01-01', company, role }])[0].role;

describe('public export', () => {
  it('replaces the employer name inside a role with the initials', () => {
    expect(publicRole('Zentra', 'Zentra Accelerator Program')).toBe('ZT Accelerator Program');
    expect(publicRole('Zentra', 'Analyst (ZENTRA)')).toBe('Analyst (ZT)');
  });

  it('also catches the name written without its legal prefix or suffix', () => {
    expect(publicRole('PT. Nusa Karya Tbk', 'Analyst at Nusa Karya')).toBe('Analyst at PT. NK');
    expect(publicRole('PT. Nusa Karya Tbk', 'PT. Nusa Karya Tbk Analyst')).toBe('PT. NK Analyst');
  });

  it('never shows a two-letter name in full', () => {
    const label = (company) => toPublic([{ id: 'a', applied_at: '2026-01-01', company, role: 'Analyst' }])[0].company;
    expect(label('qz')).toBe('Q*');
    expect(label('PT. QZ Tbk')).toBe('PT. Q*');
  });

  it('leaves other roles and partial words alone', () => {
    expect(publicRole('Arta', 'Artanis Data Analyst')).toBe('Artanis Data Analyst');
    expect(publicRole('C++ House (Asia)', 'Data Analyst')).toBe('Data Analyst');
  });
});
