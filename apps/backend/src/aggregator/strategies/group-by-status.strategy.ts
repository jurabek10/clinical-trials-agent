import type { NormalizedStudy } from '@ct-agent/shared';
import type { BucketMap, GroupedDatum } from './types';

export function groupByStatus(studies: NormalizedStudy[]): {
  data: GroupedDatum[];
  buckets: BucketMap;
} {
  const counts = new Map<string, number>();
  const buckets: BucketMap = new Map();

  for (const s of studies) {
    const status = s.overallStatus || 'UNKNOWN';
    counts.set(status, (counts.get(status) ?? 0) + 1);
    const key = `status=${status}`;
    if (!buckets.has(key)) buckets.set(key, new Set());
    buckets.get(key)!.add(s.nctId);
  }

  const data: GroupedDatum[] = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([status, trial_count]) => ({ status, trial_count }));

  return { data, buckets };
}
