import type { ConfigService } from '@nestjs/config';
import type { QueryPlan } from '@ct-agent/shared';
import { QueryService } from '../src/query/query.service';
import { AppError } from '../src/common/errors';
import type { PlannerService } from '../src/planner/planner.service';
import type { ClinicalTrialsService } from '../src/clinicaltrials/clinicaltrials.service';
import type { AggregatorService } from '../src/aggregator/aggregator.service';
import type { VisualizationService } from '../src/visualization/visualization.service';
import type { CitationLinkerService } from '../src/visualization/citation-linker.service';

const basePlan: QueryPlan = {
  intent: 'distribution',
  primary_entity: { type: 'drug', value: 'Pembrolizumab' },
  group_by: ['phase'],
  filters: {
    condition: null,
    drug_name: 'Pembrolizumab',
    sponsor: null,
    country: null,
    phase: [],
    status: [],
    start_year: null,
    end_year: null,
  },
  suggested_viz: 'bar_chart',
  title_hint: 'Pembrolizumab trials by phase',
  interpretation: 'Count Pembrolizumab trials grouped by phase.',
};

function makeConfig(): ConfigService {
  return {
    get: <T>(_key: string, fallback?: T) => fallback,
  } as unknown as ConfigService;
}

function makeServiceWith(overrides: {
  plan: QueryPlan;
  fetchResult: {
    studies: unknown[];
    totalScanned: number;
    totalAvailable?: number;
    truncated: boolean;
  };
  postFilterResult?: unknown[];
  build?: ReturnType<jest.Mock>;
}) {
  const filtered = overrides.postFilterResult ?? overrides.fetchResult.studies;
  const planFn = jest.fn().mockResolvedValue(overrides.plan);
  const fetchFn = jest.fn().mockResolvedValue(overrides.fetchResult);
  const ct = { fetchStudies: fetchFn } as unknown as ClinicalTrialsService;
  const agg = {
    postFilter: jest.fn().mockReturnValue(filtered),
  } as unknown as AggregatorService;
  const buildResult = overrides.build ?? {
    spec: {
      type: 'bar_chart',
      title: 't',
      encoding: { x: { field: 'phase' }, y: { field: 'trial_count' } },
      data: [{ phase: 'PHASE1', trial_count: 1 }],
    },
    buckets: new Map(),
  };
  const viz = {
    build: jest.fn().mockReturnValue(buildResult),
  } as unknown as VisualizationService;
  const cit = { link: jest.fn().mockReturnValue([]) } as unknown as CitationLinkerService;
  const service = new QueryService(
    makeConfig(),
    { plan: planFn } as unknown as PlannerService,
    ct,
    agg,
    viz,
    cit,
  );
  return { service, planFn, fetchFn, viz };
}

describe('QueryService', () => {
  it('returns NO_DATA when fetch succeeds but no studies remain after filtering', async () => {
    const { service } = makeServiceWith({
      plan: basePlan,
      fetchResult: { studies: [], totalScanned: 0, totalAvailable: 0, truncated: false },
      postFilterResult: [],
    });

    try {
      await service.run({ query: 'How are trials for Pembrolizumab distributed across phases?' });
      throw new Error('Expected NO_DATA error');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).getResponse()).toMatchObject({
        error: {
          code: 'NO_DATA',
          message: 'No studies matched the query/filter combination.',
        },
      });
    }
  });

  it('surfaces a truncation assumption when the fetch hit max_studies with more pages available', async () => {
    const { service } = makeServiceWith({
      plan: basePlan,
      fetchResult: {
        studies: [{ nctId: 'NCT1' }],
        totalScanned: 500,
        totalAvailable: undefined,
        truncated: true,
      },
    });

    const res = await service.run({
      query: 'Pembrolizumab phases',
      options: { max_studies: 500 },
    });
    expect(res.meta.assumptions.some((a) => a.includes('Scan stopped at max_studies=500'))).toBe(
      true,
    );
  });

  it('does NOT add the truncation assumption when fetch completed naturally', async () => {
    const { service } = makeServiceWith({
      plan: basePlan,
      fetchResult: {
        studies: [{ nctId: 'NCT1' }],
        totalScanned: 12,
        totalAvailable: 12,
        truncated: false,
      },
    });

    const res = await service.run({ query: 'Pembrolizumab phases' });
    expect(res.meta.assumptions.some((a) => a.includes('Scan stopped'))).toBe(false);
  });

  it('OR-expands condition for "cancer vs diabetes" comparison and records the assumption', async () => {
    const conditionComparePlan: QueryPlan = {
      intent: 'comparison',
      primary_entity: { type: 'condition', value: null },
      group_by: ['sponsor_class', 'condition'],
      filters: {
        condition: null,
        drug_name: null,
        sponsor: null,
        country: null,
        phase: [],
        status: [],
        start_year: null,
        end_year: null,
      },
      suggested_viz: 'grouped_bar_chart',
      title_hint: 'Sponsor categories: cancer vs diabetes trials',
      interpretation:
        'Compare the distribution of lead sponsor categories across cancer and diabetes trials.',
    };
    const { service, fetchFn } = makeServiceWith({
      plan: conditionComparePlan,
      fetchResult: {
        studies: [{ nctId: 'NCT1', conditions: ['Breast Cancer'] }],
        totalScanned: 1,
        totalAvailable: 1,
        truncated: false,
      },
    });

    const res = await service.run({
      query: 'Compare sponsor categories across cancer and diabetes trials.',
    });
    const params = fetchFn.mock.calls[0][0] as Record<string, string>;
    expect(params['query.cond']).toBe('cancer OR diabetes');
    expect(
      res.meta.assumptions.some((a) => a.includes('Comparison series expanded to cancer / diabetes')),
    ).toBe(true);
  });

  it('does NOT OR-expand when the user already supplied the filter', async () => {
    const conditionComparePlan: QueryPlan = {
      ...basePlan,
      intent: 'comparison',
      group_by: ['sponsor_class', 'condition'],
      title_hint: 'cancer vs diabetes',
      interpretation: 'Compare sponsor categories across cancer and diabetes trials.',
    };
    const { service, fetchFn } = makeServiceWith({
      plan: conditionComparePlan,
      fetchResult: {
        studies: [{ nctId: 'NCT1' }],
        totalScanned: 1,
        totalAvailable: 1,
        truncated: false,
      },
    });

    await service.run({
      query: 'Compare sponsor categories across cancer and diabetes trials.',
      filters: { condition: 'oncology' },
    });
    const params = fetchFn.mock.calls[0][0] as Record<string, string>;
    expect(params['query.cond']).toBe('oncology');
  });
});
