import type { NormalizedStudy } from '@ct-agent/shared';
import { groupByPhase } from '../src/aggregator/strategies/group-by-phase.strategy';
import { groupByStatus } from '../src/aggregator/strategies/group-by-status.strategy';
import { groupByCountry } from '../src/aggregator/strategies/group-by-country.strategy';
import { bucketByYear } from '../src/aggregator/strategies/bucket-by-year.strategy';
import { histogramOfEnrollment } from '../src/aggregator/strategies/histogram.strategy';
import { comparisonOf } from '../src/aggregator/strategies/comparison.strategy';
import { buildNetwork } from '../src/aggregator/strategies/build-network.strategy';

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

describe('aggregators', () => {
  it('groupByPhase counts each phase and assigns NA when phases empty', () => {
    const studies = [
      study({ nctId: 'A', phases: ['PHASE1'] }),
      study({ nctId: 'B', phases: ['PHASE1', 'PHASE2'] }),
      study({ nctId: 'C', phases: [] }),
    ];
    const { data, buckets } = groupByPhase(studies);
    const map = Object.fromEntries(data.map((d) => [d.phase, d.trial_count]));
    expect(map.PHASE1).toBe(2);
    expect(map.PHASE2).toBe(1);
    expect(map.NA).toBe(1);
    expect(buckets.get('phase=PHASE1')?.has('A')).toBe(true);
    expect(buckets.get('phase=NA')?.has('C')).toBe(true);
  });

  it('groupByStatus tallies overall status and sorts by count desc', () => {
    const studies = [
      study({ nctId: 'A', overallStatus: 'RECRUITING' }),
      study({ nctId: 'B', overallStatus: 'RECRUITING' }),
      study({ nctId: 'C', overallStatus: 'COMPLETED' }),
    ];
    const { data } = groupByStatus(studies);
    expect(data[0]).toEqual({ status: 'RECRUITING', trial_count: 2 });
    expect(data[1]).toEqual({ status: 'COMPLETED', trial_count: 1 });
  });

  it('groupByCountry counts unique location countries per study', () => {
    const studies = [
      study({ nctId: 'A', locationCountries: ['United States', 'Canada'] }),
      study({ nctId: 'B', locationCountries: ['United States'] }),
    ];
    const { data } = groupByCountry(studies);
    const map = Object.fromEntries(data.map((d) => [d.country, d.trial_count]));
    expect(map['United States']).toBe(2);
    expect(map['Canada']).toBe(1);
  });

  it('bucketByYear ignores studies without startYear and respects range', () => {
    const studies = [
      study({ nctId: 'A', startYear: 2018 }),
      study({ nctId: 'B', startYear: 2019 }),
      study({ nctId: 'C', startYear: 2020 }),
      study({ nctId: 'D' }), // no year
    ];
    const { data } = bucketByYear(studies, { startYear: 2019 });
    expect(data).toEqual([
      { year: 2019, trial_count: 1 },
      { year: 2020, trial_count: 1 },
    ]);
  });

  it('histogramOfEnrollment bins enrollments correctly', () => {
    const studies = [
      study({ nctId: 'A', enrollmentCount: 50 }),
      study({ nctId: 'B', enrollmentCount: 150 }),
      study({ nctId: 'C', enrollmentCount: 175 }),
    ];
    const { data } = histogramOfEnrollment(studies, 100);
    expect(data[0]).toEqual({ bin_start: 0, bin_end: 100, count: 1 });
    expect(data[1]).toEqual({ bin_start: 100, bin_end: 200, count: 2 });
  });

  it('comparisonOf produces grouped rows for two dimensions', () => {
    const studies = [
      study({ nctId: 'A', phases: ['PHASE1'], interventionNames: ['Drug A'] }),
      study({ nctId: 'B', phases: ['PHASE1'], interventionNames: ['Drug A'] }),
      study({ nctId: 'C', phases: ['PHASE2'], interventionNames: ['Drug B'] }),
    ];
    const { data } = comparisonOf(studies, 'phase', 'drug');
    const find = (p: string, d: string) =>
      data.find((r) => r['phase'] === p && r['drug'] === d)?.trial_count;
    expect(find('PHASE1', 'Drug A')).toBe(2);
    expect(find('PHASE2', 'Drug B')).toBe(1);
  });

  it('comparisonOf filters and collapses drug series to requested comparison labels', () => {
    const studies = [
      study({
        nctId: 'A',
        phases: ['PHASE1'],
        interventionNames: ['200 mg Pembrolizumab', 'Chemotherapy'],
      }),
      study({
        nctId: 'B',
        phases: ['PHASE1'],
        interventionNames: ['Nivolumab injection'],
      }),
      study({
        nctId: 'C',
        phases: ['PHASE2'],
        interventionNames: ['Unrelated drug'],
      }),
    ];

    const { data } = comparisonOf(studies, 'phase', 'drug', [
      'Pembrolizumab',
      'Nivolumab',
    ]);

    expect(data).toEqual([
      { phase: 'PHASE1', drug: 'Nivolumab', trial_count: 1 },
      { phase: 'PHASE1', drug: 'Pembrolizumab', trial_count: 1 },
    ]);
  });

  it('buildNetwork creates edges between sponsor and drug and trims to topN', () => {
    const studies = [
      study({
        nctId: 'A',
        leadSponsorName: 'Acme',
        interventionNames: ['Drug X'],
      }),
      study({
        nctId: 'B',
        leadSponsorName: 'Acme',
        interventionNames: ['Drug X'],
      }),
      study({
        nctId: 'C',
        leadSponsorName: 'Acme',
        interventionNames: ['Drug Y'],
      }),
    ];
    const { data, buckets } = buildNetwork(studies, 'sponsor', 'drug', 10);
    const edge = data.edges.find(
      (e) => e.source === 'sponsor:Acme' && e.target === 'drug:Drug X',
    );
    expect(edge?.weight).toBe(2);
    expect(buckets.get('edge:sponsor:Acme->drug:Drug X')?.size).toBe(2);
  });
});
