'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { VisualizationSpec, GroupedBarEncoding } from '@ct-agent/shared';

const PALETTE = [
  '#1554dc',
  '#10b981',
  '#f59e0b',
  '#ec4899',
  '#7c3aed',
  '#0ea5e9',
  '#ef4444',
  '#14b8a6',
];

// When a query (e.g. sponsor_class × condition over many conditions) produces
// more series than the legend can sanely render, keep only the top-N by total
// count. Anything else is dropped from the visible chart but stays available
// via the `meta.assumptions` line and the citations list.
const MAX_SERIES = 8;

export function GroupedBarChartView({ spec }: { spec: VisualizationSpec }) {
  const enc = spec.encoding as GroupedBarEncoding;
  const rows = (spec.data as Record<string, string | number>[]) ?? [];

  const { pivot, seriesKeys, droppedCount, totalSeriesCount } = useMemo(() => {
    const xField = enc.x.field;
    const seriesField = enc.series.field;
    const yField = enc.y.field;

    // Per-series totals → used to pick the top-N.
    const seriesTotals = new Map<string, number>();
    for (const r of rows) {
      const sv = String(r[seriesField]);
      seriesTotals.set(sv, (seriesTotals.get(sv) ?? 0) + (r[yField] as number));
    }
    const totalSeriesCount = seriesTotals.size;
    const keep = new Set(
      [...seriesTotals.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_SERIES)
        .map(([k]) => k),
    );

    const byX = new Map<string, Record<string, string | number>>();
    for (const r of rows) {
      const sv = String(r[seriesField]);
      if (!keep.has(sv)) continue;
      const xv = String(r[xField]);
      if (!byX.has(xv)) byX.set(xv, { [xField]: xv });
      byX.get(xv)![sv] =
        ((byX.get(xv)![sv] as number | undefined) ?? 0) + (r[yField] as number);
    }

    return {
      pivot: Array.from(byX.values()),
      seriesKeys: Array.from(keep).sort(),
      droppedCount: Math.max(0, totalSeriesCount - keep.size),
      totalSeriesCount,
    };
  }, [rows, enc]);

  const tiltX = pivot.some((row) => String(row[enc.x.field] ?? '').length > 7);

  return (
    <div className="flex flex-col gap-2">
      {droppedCount > 0 && (
        <p className="text-xs text-slate-500">
          Showing top {seriesKeys.length} of {totalSeriesCount}{' '}
          <span className="font-mono">{enc.series.field}</span> values by total trial count.
          {' '}({droppedCount} more in the response payload.)
        </p>
      )}
      <div className="h-[460px] w-full">
        <ResponsiveContainer>
          <BarChart
            data={pivot}
            margin={{ top: 10, right: 24, bottom: tiltX ? 60 : 24, left: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey={enc.x.field}
              tick={{ fill: '#475569', fontSize: 12 }}
              interval={0}
              angle={tiltX ? -25 : 0}
              textAnchor={tiltX ? 'end' : 'middle'}
              height={tiltX ? 70 : 30}
            />
            <YAxis allowDecimals={false} tick={{ fill: '#475569', fontSize: 12 }} />
            <Tooltip cursor={{ fill: '#f1f5f9' }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {seriesKeys.map((s, i) => (
              <Bar
                key={s}
                dataKey={s}
                fill={PALETTE[i % PALETTE.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
