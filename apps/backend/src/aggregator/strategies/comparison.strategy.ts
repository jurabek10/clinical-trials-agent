import type { NormalizedStudy } from '@ct-agent/shared';
import type { BucketMap, GroupedDatum } from './types';

export type CompareDim =
  | 'phase'
  | 'status'
  | 'country'
  | 'year'
  | 'sponsor'
  | 'sponsor_class'
  | 'drug'
  | 'condition'
  | 'intervention_type';

function valuesFor(s: NormalizedStudy, dim: CompareDim): string[] {
  switch (dim) {
    case 'phase':
      return s.phases.length > 0 ? s.phases : ['NA'];
    case 'status':
      return [s.overallStatus || 'UNKNOWN'];
    case 'country':
      return s.locationCountries.length > 0 ? s.locationCountries : [];
    case 'year':
      return s.startYear !== undefined ? [String(s.startYear)] : [];
    case 'sponsor':
      return [s.leadSponsorName?.trim() || 'Unknown'];
    case 'sponsor_class':
      return [s.leadSponsorClass?.trim() || 'UNKNOWN'];
    case 'drug':
      return s.interventionNames.length > 0 ? s.interventionNames : [];
    case 'condition':
      return s.conditions.length > 0 ? s.conditions : [];
    case 'intervention_type':
      return s.interventionTypes.length > 0
        ? [...new Set(s.interventionTypes.map((t) => t.trim().toUpperCase()))]
        : [];
  }
}

/**
 * Build a grouped/series bar dataset. The `seriesDim` becomes the series field;
 * the `xDim` becomes the x axis. Output rows: { [xDim]: ..., [seriesDim]: ..., trial_count }.
 */
export function comparisonOf(
  studies: NormalizedStudy[],
  xDim: CompareDim,
  seriesDim: CompareDim,
  seriesFilter?: string[],
): { data: GroupedDatum[]; buckets: BucketMap; xField: string; seriesField: string } {
  const counts = new Map<string, number>(); // key = `${x}||${series}`
  const buckets: BucketMap = new Map();
  const filters = seriesFilter
    ?.map((s) => s.trim())
    .filter(Boolean)
    .map((label) => ({ label, normalized: label.toLowerCase() }));

  for (const s of studies) {
    const xs = valuesFor(s, xDim);
    const ss = valuesFor(s, seriesDim);
    for (const x of xs) {
      for (const ser of ss) {
        const normalizedSeries = ser.toLowerCase();
        const matchedFilter = filters?.find(
          (f) =>
            normalizedSeries.includes(f.normalized) ||
            f.normalized.includes(normalizedSeries),
        );
        if (filters && !matchedFilter) continue;
        const seriesValue = matchedFilter?.label ?? ser;
        const k = `${x}||${seriesValue}`;
        counts.set(k, (counts.get(k) ?? 0) + 1);
        const bkey = `${xDim}=${x};${seriesDim}=${seriesValue}`;
        if (!buckets.has(bkey)) buckets.set(bkey, new Set());
        buckets.get(bkey)!.add(s.nctId);
      }
    }
  }

  const data: GroupedDatum[] = [...counts.entries()]
    .map(([k, trial_count]) => {
      const [x, ser] = k.split('||');
      return { [xDim]: x, [seriesDim]: ser, trial_count };
    })
    .sort((a, b) => {
      const ax = String(a[xDim]);
      const bx = String(b[xDim]);
      if (ax !== bx) return ax.localeCompare(bx);
      return String(a[seriesDim]).localeCompare(String(b[seriesDim]));
    });

  return { data, buckets, xField: xDim, seriesField: seriesDim };
}
