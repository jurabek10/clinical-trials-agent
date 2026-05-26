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
import type { VisualizationSpec, BarEncoding } from '@ct-agent/shared';

interface BarChartViewProps {
  spec: VisualizationSpec;
}

export function BarChartView({ spec }: BarChartViewProps) {
  const enc = spec.encoding as BarEncoding;
  const data = (spec.data as Record<string, string | number>[]) ?? [];
  return (
    <div className="h-[420px] w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 24, bottom: 24, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey={enc.x.field}
            tick={{ fill: '#475569', fontSize: 12 }}
            label={enc.x.label ? { value: enc.x.label, position: 'insideBottom', offset: -10, fill: '#475569', fontSize: 12 } : undefined}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: '#475569', fontSize: 12 }}
            label={
              enc.y.label
                ? { value: enc.y.label, angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 12 }
                : undefined
            }
          />
          <Tooltip cursor={{ fill: '#f1f5f9' }} />
          <Bar
            dataKey={enc.y.field}
            name={enc.y.label ?? enc.y.field}
            fill="#1554dc"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
