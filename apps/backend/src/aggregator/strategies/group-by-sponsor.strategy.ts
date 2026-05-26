import type { NormalizedStudy } from '@ct-agent/shared';
import type { BucketMap, GroupedDatum } from './types';

export function groupBySponsor(
  studies: NormalizedStudy[],
  topN = 20,
): { data: GroupedDatum[]; buckets: BucketMap } {
  const counts = new Map<string, number>();
  const buckets: BucketMap = new Map();

  for (const s of studies) {
    const sponsor = s.leadSponsorName?.trim() || 'Unknown';
    counts.set(sponsor, (counts.get(sponsor) ?? 0) + 1);
    const key = `sponsor=${sponsor}`;
    if (!buckets.has(key)) buckets.set(key, new Set());
    buckets.get(key)!.add(s.nctId);
  }

  const data: GroupedDatum[] = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([sponsor, trial_count]) => ({ sponsor, trial_count }));

  return { data, buckets };
}

export function groupBySponsorClass(studies: NormalizedStudy[]): {
  data: GroupedDatum[];
  buckets: BucketMap;
} {
  const counts = new Map<string, number>();
  const buckets: BucketMap = new Map();

  for (const s of studies) {
    const sc = s.leadSponsorClass?.trim() || 'UNKNOWN';
    counts.set(sc, (counts.get(sc) ?? 0) + 1);
    const key = `sponsor_class=${sc}`;
    if (!buckets.has(key)) buckets.set(key, new Set());
    buckets.get(key)!.add(s.nctId);
  }

  const data: GroupedDatum[] = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([sponsor_class, trial_count]) => ({ sponsor_class, trial_count }));

  return { data, buckets };
}
