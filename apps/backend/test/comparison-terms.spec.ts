import { extractDrugComparisonTerms } from '../src/common/comparison-terms';
import type { QueryPlan } from '@ct-agent/shared';

function plan(p: Partial<QueryPlan>): QueryPlan {
  return {
    intent: 'comparison',
    primary_entity: { type: 'drug', value: 'Pembrolizumab' },
    group_by: ['phase', 'drug'],
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
    suggested_viz: 'grouped_bar_chart',
    title_hint: 'Phase distribution comparison for Pembrolizumab and Nivolumab',
    interpretation:
      'Compare the distribution of clinical trial phases for Pembrolizumab and Nivolumab.',
    ...p,
  };
}

describe('extractDrugComparisonTerms', () => {
  it('extracts two drug labels from comparison text', () => {
    expect(extractDrugComparisonTerms(plan({}))).toEqual([
      'Pembrolizumab',
      'Nivolumab',
    ]);
  });
});
