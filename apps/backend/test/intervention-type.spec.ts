import type { NormalizedStudy } from '@ct-agent/shared';
import { groupByInterventionType } from '../src/aggregator/strategies/group-by-intervention-type.strategy';
import { comparisonOf } from '../src/aggregator/strategies/comparison.strategy';

function study(p: Partial<NormalizedStudy>): NormalizedStudy {
  return {
    nctId: 'NCT00000000',
    briefTitle: 'A study',
    overallStatus: 'COMPLETED',
    phases: [],
    conditions: [],
    interventionNames: [],
    interventionTypes: [],
    locationCountries: [],
    ...p,
  };
}

describe('groupByInterventionType', () => {
  it('counts each unique intervention type once per study and uppercases tokens', () => {
    const studies = [
      study({ nctId: 'A', interventionTypes: ['DRUG', 'DRUG', 'biological'] }),
      study({ nctId: 'B', interventionTypes: ['Device'] }),
      study({ nctId: 'C', interventionTypes: [] }),
    ];
    const { data, buckets } = groupByInterventionType(studies);
    const map = Object.fromEntries(data.map((d) => [d.intervention_type, d.trial_count]));
    expect(map.DRUG).toBe(1);
    expect(map.BIOLOGICAL).toBe(1);
    expect(map.DEVICE).toBe(1);
    expect(buckets.get('intervention_type=DRUG')?.has('A')).toBe(true);
    expect(buckets.get('intervention_type=DEVICE')?.has('B')).toBe(true);
  });

  it('sorts by count desc', () => {
    const studies = [
      study({ nctId: 'A', interventionTypes: ['DRUG'] }),
      study({ nctId: 'B', interventionTypes: ['DRUG'] }),
      study({ nctId: 'C', interventionTypes: ['BEHAVIORAL'] }),
    ];
    const { data } = groupByInterventionType(studies);
    expect(data[0]).toEqual({ intervention_type: 'DRUG', trial_count: 2 });
    expect(data[1]).toEqual({ intervention_type: 'BEHAVIORAL', trial_count: 1 });
  });
});

describe('comparisonOf with sponsor_class × condition', () => {
  it('pivots sponsor categories across conditions', () => {
    const studies = [
      study({
        nctId: 'A',
        leadSponsorClass: 'INDUSTRY',
        conditions: ['Cancer'],
      }),
      study({
        nctId: 'B',
        leadSponsorClass: 'INDUSTRY',
        conditions: ['Cancer'],
      }),
      study({
        nctId: 'C',
        leadSponsorClass: 'NIH',
        conditions: ['Diabetes'],
      }),
      study({
        nctId: 'D',
        leadSponsorClass: '',
        conditions: ['Diabetes'],
      }),
    ];
    const { data, xField, seriesField } = comparisonOf(studies, 'sponsor_class', 'condition');
    expect(xField).toBe('sponsor_class');
    expect(seriesField).toBe('condition');
    const find = (sc: string, c: string) =>
      data.find((r) => r['sponsor_class'] === sc && r['condition'] === c)?.trial_count;
    expect(find('INDUSTRY', 'Cancer')).toBe(2);
    expect(find('NIH', 'Diabetes')).toBe(1);
    expect(find('UNKNOWN', 'Diabetes')).toBe(1);
  });

  it('handles intervention_type as a comparison dim', () => {
    const studies = [
      study({
        nctId: 'A',
        phases: ['PHASE1'],
        interventionTypes: ['DRUG'],
      }),
      study({
        nctId: 'B',
        phases: ['PHASE1'],
        interventionTypes: ['BIOLOGICAL'],
      }),
      study({
        nctId: 'C',
        phases: ['PHASE2'],
        interventionTypes: ['DRUG'],
      }),
    ];
    const { data } = comparisonOf(studies, 'phase', 'intervention_type');
    const find = (p: string, t: string) =>
      data.find((r) => r['phase'] === p && r['intervention_type'] === t)?.trial_count;
    expect(find('PHASE1', 'DRUG')).toBe(1);
    expect(find('PHASE1', 'BIOLOGICAL')).toBe(1);
    expect(find('PHASE2', 'DRUG')).toBe(1);
  });
});
