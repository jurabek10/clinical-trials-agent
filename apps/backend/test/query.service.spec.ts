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

describe('QueryService', () => {
  it('returns NO_DATA when fetch succeeds but no studies remain after filtering', async () => {
    const service = new QueryService(
      { get: (_key: string, fallback?: number) => fallback } as ConfigService,
      { plan: jest.fn().mockResolvedValue(basePlan) } as unknown as PlannerService,
      {
        fetchStudies: jest.fn().mockResolvedValue({
          studies: [],
          totalScanned: 0,
          totalAvailable: 0,
        }),
      } as unknown as ClinicalTrialsService,
      { postFilter: jest.fn().mockReturnValue([]) } as unknown as AggregatorService,
      { build: jest.fn() } as unknown as VisualizationService,
      { link: jest.fn() } as unknown as CitationLinkerService,
    );

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
});
