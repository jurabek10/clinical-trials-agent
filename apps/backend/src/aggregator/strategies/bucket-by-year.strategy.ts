import type { NormalizedStudy } from '@ct-agent/shared';
import type { BucketMap, GroupedDatum } from './types';

export function bucketByYear(
  studies: NormalizedStudy[],
  opts: { startYear?: number; endYear?: number } = {},
): { data: GroupedDatum[]; buckets: BucketMap } {
  const counts = new Map<number, number>();
  const buckets: BucketMap = new Map();

  for (const s of studies) {
    if (s.startYear === undefined) continue;
    if (opts.startYear !== undefined && s.startYear < opts.startYear) continue;
    if (opts.endYear !== undefined && s.startYear > opts.endYear) continue;
    counts.set(s.startYear, (counts.get(s.startYear) ?? 0) + 1);
    const key = `year=${s.startYear}`;
    if (!buckets.has(key)) buckets.set(key, new Set());
    buckets.get(key)!.add(s.nctId);
  }

  const data: GroupedDatum[] = [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, trial_count]) => ({ year, trial_count }));

  return { data, buckets };
}
