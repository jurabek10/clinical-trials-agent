import {
  extractComparisonTerms,
  extractDrugComparisonTerms,
  pickComparisonSeriesDim,
} from '../src/common/comparison-terms';
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

describe('extractComparisonTerms', () => {
  it('extracts two drug labels from comparison text', () => {
    expect(extractComparisonTerms(plan({}))).toEqual([
      'Pembrolizumab',
      'Nivolumab',
    ]);
  });

  it('extracts two condition labels from "across X and Y trials"', () => {
    const p = plan({
      group_by: ['sponsor_class', 'condition'],
      primary_entity: { type: 'condition', value: null },
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
      title_hint: 'Sponsor categories: cancer vs diabetes trials',
      interpretation:
        'Compare the distribution of lead sponsor categories across cancer and diabetes trials.',
    });
    expect(extractComparisonTerms(p)).toEqual(['cancer', 'diabetes']);
  });

  it('handles "comparing X to Y"', () => {
    const p = plan({
      title_hint: 'Comparing imatinib to dasatinib in CML trials',
      interpretation: 'Comparing imatinib to dasatinib across CML trials.',
    });
    expect(extractComparisonTerms(p)).toEqual(['imatinib', 'dasatinib']);
  });

  it('returns undefined when no pair can be extracted', () => {
    const p = plan({
      title_hint: 'Pembrolizumab trials by phase',
      interpretation: 'Count Pembrolizumab trials grouped by phase.',
    });
    expect(extractComparisonTerms(p)).toBeUndefined();
  });

  it('extractDrugComparisonTerms remains as a back-compat alias', () => {
    expect(extractDrugComparisonTerms(plan({}))).toEqual([
      'Pembrolizumab',
      'Nivolumab',
    ]);
  });
});

describe('pickComparisonSeriesDim', () => {
  it('returns the second dim of a two-dim group_by', () => {
    expect(
      pickComparisonSeriesDim(plan({ group_by: ['sponsor_class', 'condition'] })),
    ).toBe('condition');
  });

  it('returns the canonical other dim when only one is supplied', () => {
    expect(pickComparisonSeriesDim(plan({ group_by: ['phase'] }))).toBe('drug');
    expect(pickComparisonSeriesDim(plan({ group_by: ['drug'] }))).toBe('phase');
  });
});
