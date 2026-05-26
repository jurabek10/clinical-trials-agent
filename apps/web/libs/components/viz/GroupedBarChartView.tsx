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

const PALETTE = ['#1554dc', '#10b981', '#f59e0b', '#ec4899', '#7c3aed', '#0ea5e9', '#ef4444'];

export function GroupedBarChartView({ spec }: { spec: VisualizationSpec }) {
  const enc = spec.encoding as GroupedBarEncoding;
  const rows = (spec.data as Record<string, string | number>[]) ?? [];

  const { pivot, seriesKeys } = useMemo(() => {
    const xField = enc.x.field;
    const seriesField = enc.series.field;
    const yField = enc.y.field;

    const byX = new Map<string, Record<string, string | number>>();
    const series = new Set<string>();
    for (const r of rows) {
      const xv = String(r[xField]);
      const sv = String(r[seriesField]);
      series.add(sv);
      if (!byX.has(xv)) byX.set(xv, { [xField]: xv });
      byX.get(xv)![sv] = (byX.get(xv)![sv] as number | undefined ?? 0) + (r[yField] as number);
    }
    return {
      pivot: Array.from(byX.values()),
      seriesKeys: Array.from(series).sort(),
    };
  }, [rows, enc]);

  return (
    <div className="h-[420px] w-full">
      <ResponsiveContainer>
        <BarChart data={pivot} margin={{ top: 10, right: 24, bottom: 24, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey={enc.x.field} tick={{ fill: '#475569', fontSize: 12 }} />
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
  );
}
