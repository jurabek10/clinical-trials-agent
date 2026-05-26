import type { NormalizedStudy } from '@ct-agent/shared';
import type { BucketMap, GroupedDatum } from './types';

export function groupByCountry(studies: NormalizedStudy[]): {
  data: GroupedDatum[];
  buckets: BucketMap;
} {
  const counts = new Map<string, number>();
  const buckets: BucketMap = new Map();

  for (const s of studies) {
    if (s.locationCountries.length === 0) continue;
    for (const country of s.locationCountries) {
      counts.set(country, (counts.get(country) ?? 0) + 1);
      const key = `country=${country}`;
      if (!buckets.has(key)) buckets.set(key, new Set());
      buckets.get(key)!.add(s.nctId);
    }
  }

  const data: GroupedDatum[] = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([country, trial_count]) => ({ country, trial_count }));

  return { data, buckets };
}
