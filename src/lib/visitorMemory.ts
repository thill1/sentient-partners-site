/**
 * Visitor memory — the site remembers who you are between visits.
 * localStorage only; no backend, no tracking beyond this browser.
 */

const KEY = 'sp-visitor-memory-v1';

export interface VisitorMemory {
  industryId?: string;
  industryLabel?: string;
  visits: number;
  lastVisit?: string;
  blueprint?: {
    callsPerWeek: number;
    missedPct: number;
    avgJobValue: number;
    monthlyRecovered: number;
  };
}

function read(): VisitorMemory {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as VisitorMemory;
  } catch {
    void 0;
  }
  return { visits: 0 };
}

function write(memory: VisitorMemory): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(memory));
  } catch {
    void 0;
  }
}

export function getVisitorMemory(): VisitorMemory {
  return read();
}

export function rememberVisit(): VisitorMemory {
  const m = read();
  m.visits += 1;
  m.lastVisit = new Date().toISOString();
  write(m);
  return m;
}

export function rememberIndustry(industryId: string, industryLabel: string): void {
  const m = read();
  m.industryId = industryId;
  m.industryLabel = industryLabel;
  write(m);
}

export function rememberBlueprint(data: NonNullable<VisitorMemory['blueprint']>): void {
  const m = read();
  m.blueprint = data;
  write(m);
}

export function isReturningVisitor(): boolean {
  return read().visits > 1;
}
