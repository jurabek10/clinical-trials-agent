'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { VisualizationSpec } from '@ct-agent/shared';

export function HistogramView({ spec }: { spec: VisualizationSpec }) {
  const rows = (spec.data as { bin_start: number; bin_end: number; count: number }[]) ?? [];
  const data = rows.map((r) => ({
    ...r,
    label: `${r.bin_start}–${r.bin_end}`,
  }));
  return (
    <div className="h-[420px] w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 24, bottom: 24, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fill: '#475569', fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="count" name="Trials" fill="#1554dc" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
