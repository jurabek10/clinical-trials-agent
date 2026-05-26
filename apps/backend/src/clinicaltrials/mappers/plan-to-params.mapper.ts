import type { QueryPlan, QueryFilters, Phase, Status } from '@ct-agent/shared';

const DEFAULT_FIELDS = [
  'NCTId',
  'BriefTitle',
  'OverallStatus',
  'Phase',
  'StartDate',
  'CompletionDate',
  'LeadSponsorName',
  'LeadSponsorClass',
  'Condition',
  'InterventionName',
  'InterventionType',
  'LocationCountry',
  'EnrollmentCount',
  'StudyType',
];

export interface CTApiParams {
  'query.intr'?: string;
  'query.cond'?: string;
  'query.lead'?: string;
  'query.locn'?: string;
  'filter.overallStatus'?: string;
  'filter.advanced'?: string;
  fields?: string;
  pageSize?: number;
  pageToken?: string;
  format?: 'json';
}

const STATUS_ALIASES: Record<string, Status> = {
  RECRUITING: 'RECRUITING',
  COMPLETED: 'COMPLETED',
  TERMINATED: 'TERMINATED',
  WITHDRAWN: 'WITHDRAWN',
  ACTIVE_NOT_RECRUITING: 'ACTIVE_NOT_RECRUITING',
  ACTIVE: 'ACTIVE_NOT_RECRUITING',
  NOT_YET_RECRUITING: 'NOT_YET_RECRUITING',
  NOT_RECRUITING_YET: 'NOT_YET_RECRUITING',
};

const PHASE_ALIASES: Record<string, Phase> = {
  EARLY_PHASE1: 'EARLY_PHASE1',
  EARLY_PHASE_1: 'EARLY_PHASE1',
  EARLYPHASE1: 'EARLY_PHASE1',
  PHASE1: 'PHASE1',
  PHASE_1: 'PHASE1',
  PHASE2: 'PHASE2',
  PHASE_2: 'PHASE2',
  PHASE3: 'PHASE3',
  PHASE_3: 'PHASE3',
  PHASE4: 'PHASE4',
  PHASE_4: 'PHASE4',
  NA: 'NA',
  'N/A': 'NA',
  NOT_APPLICABLE: 'NA',
};

function canonicalKey(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s-]+/g, '_');
}

export function normalizeStatus(raw: string): Status | null {
  return STATUS_ALIASES[canonicalKey(raw)] ?? null;
}

export function normalizePhase(raw: string): Phase | null {
  const key = canonicalKey(raw).replace(/\s+/g, '');
  return PHASE_ALIASES[key] ?? null;
}

function normalizeList<T>(values: string[], fn: (raw: string) => T | null): T[] {
  const out: T[] = [];
  const seen = new Set<T>();
  for (const v of values) {
    const norm = fn(v);
    if (norm && !seen.has(norm)) {
      seen.add(norm);
      out.push(norm);
    }
  }
  return out;
}

/**
 * Build CT.gov v2 search params from a plan + user-provided filter overrides.
 * User-provided filters override anything the LLM produced. Status/phase values
 * are normalized to canonical CT.gov tokens (e.g. "Recruiting" → "RECRUITING")
 * because the API rejects anything else with 400.
 */
export function planToParams(plan: QueryPlan, override?: QueryFilters): CTApiParams {
  const rawPhase = (override?.phase ?? plan.filters.phase ?? []) as string[];
  const rawStatus = (override?.status ?? plan.filters.status ?? []) as string[];

  const phase = normalizeList(rawPhase, normalizePhase);
  const status = normalizeList(rawStatus, normalizeStatus);

  const params: CTApiParams = {
    fields: DEFAULT_FIELDS.join(','),
    pageSize: 100,
    format: 'json',
  };

  const drug = override?.drug_name ?? plan.filters.drug_name ?? undefined;
  const condition = override?.condition ?? plan.filters.condition ?? undefined;
  const sponsor = override?.sponsor ?? plan.filters.sponsor ?? undefined;
  const country = override?.country ?? plan.filters.country ?? undefined;

  if (drug) params['query.intr'] = drug;
  if (condition) params['query.cond'] = condition;
  if (sponsor) params['query.lead'] = sponsor;
  if (country) params['query.locn'] = country;
  if (status.length > 0) params['filter.overallStatus'] = status.join(',');
  if (phase.length > 0) {
    const phaseExpr = phase.map((p) => `AREA[Phase]${p}`).join(' OR ');
    params['filter.advanced'] = phaseExpr;
  }

  return params;
}

export function effectiveFilters(plan: QueryPlan, override?: QueryFilters): QueryFilters {
  const rawPhase = (override?.phase ?? plan.filters.phase ?? []) as string[];
  const rawStatus = (override?.status ?? plan.filters.status ?? []) as string[];
  return {
    drug_name: override?.drug_name ?? plan.filters.drug_name ?? undefined,
    condition: override?.condition ?? plan.filters.condition ?? undefined,
    sponsor: override?.sponsor ?? plan.filters.sponsor ?? undefined,
    country: override?.country ?? plan.filters.country ?? undefined,
    phase: normalizeList(rawPhase, normalizePhase),
    status: normalizeList(rawStatus, normalizeStatus),
    start_year: override?.start_year ?? plan.filters.start_year ?? undefined,
    end_year: override?.end_year ?? plan.filters.end_year ?? undefined,
  };
}
