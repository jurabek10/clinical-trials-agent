'use client';

import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { VisualizationSpec, ScatterEncoding } from '@ct-agent/shared';

export function ScatterPlotView({ spec }: { spec: VisualizationSpec }) {
  const enc = spec.encoding as ScatterEncoding;
  const data = (spec.data as Record<string, number | string>[]) ?? [];
  return (
    <div className="h-[420px] w-full">
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 10, right: 24, bottom: 24, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            type="number"
            dataKey={enc.x.field}
            name={enc.x.label ?? enc.x.field}
            tick={{ fill: '#475569', fontSize: 12 }}
          />
          <YAxis
            type="number"
            dataKey={enc.y.field}
            name={enc.y.label ?? enc.y.field}
            tick={{ fill: '#475569', fontSize: 12 }}
          />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Scatter data={data} fill="#1554dc" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
