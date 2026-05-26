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

/**
 * Geo "map" rendered as a horizontal ranked-by-country bar chart.
 * Keeps the visualization frontend-friendly without shipping a full world
 * topology; the canonical encoding (location → country, value → trial_count)
 * is preserved by the spec.
 */
export function GeoMapView({ spec }: { spec: VisualizationSpec }) {
  const rows = (spec.data as { country: string; trial_count: number }[]) ?? [];
  const data = rows.slice(0, 20);
  return (
    <div className="h-[480px] w-full">
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 24, bottom: 24, left: 96 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" allowDecimals={false} tick={{ fill: '#475569', fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="country"
            tick={{ fill: '#475569', fontSize: 12 }}
            width={120}
          />
          <Tooltip cursor={{ fill: '#f1f5f9' }} />
          <Bar
            dataKey="trial_count"
            name="Trials"
            fill="#1554dc"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
