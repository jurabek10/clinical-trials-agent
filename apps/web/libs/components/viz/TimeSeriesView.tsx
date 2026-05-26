'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { VisualizationSpec, TimeSeriesEncoding } from '@ct-agent/shared';

export function TimeSeriesView({ spec }: { spec: VisualizationSpec }) {
  const enc = spec.encoding as TimeSeriesEncoding;
  const data = (spec.data as Record<string, string | number>[]) ?? [];
  return (
    <div className="h-[420px] w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 24, bottom: 24, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey={enc.x.field} tick={{ fill: '#475569', fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fill: '#475569', fontSize: 12 }} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey={enc.y.field}
            name={enc.y.label ?? enc.y.field}
            stroke="#1554dc"
            strokeWidth={2}
            dot={{ r: 3, fill: '#1554dc' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
