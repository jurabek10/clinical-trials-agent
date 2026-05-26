import type { QueryPlan } from '@ct-agent/shared';
import {
  effectiveFilters,
  normalizePhase,
  normalizeStatus,
  planToParams,
} from '../src/clinicaltrials/mappers/plan-to-params.mapper';

function plan(overrides: Partial<QueryPlan['filters']> = {}): QueryPlan {
  return {
    intent: 'ranking',
    primary_entity: { type: 'condition', value: 'Alzheimer' },
    group_by: ['country'],
    filters: {
      condition: null,
      drug_name: null,
      sponsor: null,
      country: null,
      phase: [],
      status: [],
      start_year: null,
      end_year: null,
      ...overrides,
    },
    suggested_viz: 'bar_chart',
    title_hint: 'Test',
    interpretation: 'Test plan.',
  };
}

describe('plan-to-params normalization', () => {
  it('normalizeStatus accepts mixed-case and natural phrasings', () => {
    expect(normalizeStatus('Recruiting')).toBe('RECRUITING');
    expect(normalizeStatus('recruiting')).toBe('RECRUITING');
    expect(normalizeStatus('NOT YET RECRUITING')).toBe('NOT_YET_RECRUITING');
    expect(normalizeStatus('active-not-recruiting')).toBe('ACTIVE_NOT_RECRUITING');
    expect(normalizeStatus('completed')).toBe('COMPLETED');
  });

  it('normalizeStatus returns null for unknown values', () => {
    expect(normalizeStatus('foo')).toBeNull();
    expect(normalizeStatus('')).toBeNull();
  });

  it('normalizePhase accepts "Phase 2", "phase2", "PHASE_2"', () => {
    expect(normalizePhase('Phase 2')).toBe('PHASE2');
    expect(normalizePhase('phase2')).toBe('PHASE2');
    expect(normalizePhase('PHASE_2')).toBe('PHASE2');
    expect(normalizePhase('Early Phase 1')).toBe('EARLY_PHASE1');
    expect(normalizePhase('N/A')).toBe('NA');
  });

  it('planToParams normalizes status from LLM output before hitting the API', () => {
    const p = planToParams(plan({ status: ['Recruiting'] as unknown as never }));
    expect(p['filter.overallStatus']).toBe('RECRUITING');
  });

  it('planToParams normalizes phase tokens and joins with OR', () => {
    const p = planToParams(plan({ phase: ['Phase 2', 'Phase 3'] as unknown as never }));
    expect(p['filter.advanced']).toBe('AREA[Phase]PHASE2 OR AREA[Phase]PHASE3');
  });

  it('planToParams drops unrecognized status tokens instead of forwarding them', () => {
    const p = planToParams(plan({ status: ['Bogus'] as unknown as never }));
    expect(p['filter.overallStatus']).toBeUndefined();
  });

  it('planToParams deduplicates after normalization', () => {
    const p = planToParams(
      plan({ status: ['Recruiting', 'RECRUITING'] as unknown as never }),
    );
    expect(p['filter.overallStatus']).toBe('RECRUITING');
  });

  it('effectiveFilters surfaces canonical tokens to meta.filters_applied', () => {
    const f = effectiveFilters(plan({ status: ['Recruiting'] as unknown as never }));
    expect(f.status).toEqual(['RECRUITING']);
  });

  it('user-provided filter override wins over the plan', () => {
    const p = planToParams(plan({ status: ['Recruiting'] as unknown as never }), {
      status: ['COMPLETED'],
    });
    expect(p['filter.overallStatus']).toBe('COMPLETED');
  });
});
