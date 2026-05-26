import type { NormalizedStudy } from '@ct-agent/shared';
import type { BucketMap, GroupedDatum } from './types';

export function groupByPhase(studies: NormalizedStudy[]): {
  data: GroupedDatum[];
  buckets: BucketMap;
} {
  const counts = new Map<string, number>();
  const buckets: BucketMap = new Map();

  for (const s of studies) {
    const phases = s.phases.length > 0 ? s.phases : ['NA'];
    for (const phase of phases) {
      counts.set(phase, (counts.get(phase) ?? 0) + 1);
      const key = `phase=${phase}`;
      if (!buckets.has(key)) buckets.set(key, new Set());
      buckets.get(key)!.add(s.nctId);
    }
  }

  const order = ['EARLY_PHASE1', 'PHASE1', 'PHASE2', 'PHASE3', 'PHASE4', 'NA'];
  const data: GroupedDatum[] = [...counts.entries()]
    .sort((a, b) => {
      const ai = order.indexOf(a[0]);
      const bi = order.indexOf(b[0]);
      if (ai === -1 && bi === -1) return a[0].localeCompare(b[0]);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    })
    .map(([phase, trial_count]) => ({ phase, trial_count }));

  return { data, buckets };
}
