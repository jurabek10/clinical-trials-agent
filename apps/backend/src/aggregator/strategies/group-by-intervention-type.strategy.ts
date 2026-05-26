import type { NormalizedStudy } from '@ct-agent/shared';
import type { BucketMap, GroupedDatum } from './types';

/**
 * Count each unique intervention type once per study. CT.gov uses categorical
 * tokens like DRUG, BIOLOGICAL, DEVICE, BEHAVIORAL, GENETIC, PROCEDURE, etc.
 */
export function groupByInterventionType(studies: NormalizedStudy[]): {
  data: GroupedDatum[];
  buckets: BucketMap;
} {
  const counts = new Map<string, number>();
  const buckets: BucketMap = new Map();

  for (const s of studies) {
    const types = s.interventionTypes.length > 0 ? [...new Set(s.interventionTypes)] : [];
    if (types.length === 0) continue;
    for (const t of types) {
      const token = t.trim().toUpperCase() || 'UNKNOWN';
      counts.set(token, (counts.get(token) ?? 0) + 1);
      const key = `intervention_type=${token}`;
      if (!buckets.has(key)) buckets.set(key, new Set());
      buckets.get(key)!.add(s.nctId);
    }
  }

  const data: GroupedDatum[] = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([intervention_type, trial_count]) => ({ intervention_type, trial_count }));

  return { data, buckets };
}
