import type { NormalizedStudy } from '@ct-agent/shared';
import type { BucketMap } from './types';

export interface HistogramBin {
  bin_start: number;
  bin_end: number;
  count: number;
}

export function histogramOfEnrollment(
  studies: NormalizedStudy[],
  binSize = 100,
): { data: HistogramBin[]; buckets: BucketMap } {
  const values: { v: number; id: string }[] = [];
  for (const s of studies) {
    if (typeof s.enrollmentCount === 'number' && s.enrollmentCount >= 0) {
      values.push({ v: s.enrollmentCount, id: s.nctId });
    }
  }
  if (values.length === 0) return { data: [], buckets: new Map() };

  const max = Math.max(...values.map((x) => x.v));
  const binCount = Math.max(1, Math.ceil((max + 1) / binSize));

  const bins: HistogramBin[] = [];
  const buckets: BucketMap = new Map();
  for (let i = 0; i < binCount; i++) {
    const bin_start = i * binSize;
    const bin_end = bin_start + binSize;
    bins.push({ bin_start, bin_end, count: 0 });
    buckets.set(`bin=${bin_start}-${bin_end}`, new Set());
  }
  for (const { v, id } of values) {
    const i = Math.min(Math.floor(v / binSize), binCount - 1);
    bins[i].count += 1;
    buckets.get(`bin=${bins[i].bin_start}-${bins[i].bin_end}`)!.add(id);
  }
  return { data: bins, buckets };
}
