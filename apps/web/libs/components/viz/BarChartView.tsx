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

  // Tilt X-axis labels when tokens are long (e.g. EARLY_PHASE1, DIETARY_SUPPLEMENT)
  // or the bar count is high enough to risk overlap.
  const longestLabel = data.reduce(
    (max, row) => Math.max(max, String(row[enc.x.field] ?? '').length),
    0,
  );
  const tiltLabels = longestLabel > 7 || data.length > 8;

  return (
    <div className="h-[460px] w-full">
      <ResponsiveContainer>
        <BarChart
          data={data}
          margin={{ top: 10, right: 24, bottom: tiltLabels ? 60 : 30, left: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey={enc.x.field}
            tick={{ fill: '#475569', fontSize: 12 }}
            interval={0}
            angle={tiltLabels ? -25 : 0}
            textAnchor={tiltLabels ? 'end' : 'middle'}
            height={tiltLabels ? 70 : 30}
            label={
              enc.x.label
                ? {
                    value: enc.x.label,
                    position: 'insideBottom',
                    offset: tiltLabels ? -55 : -10,
                    fill: '#475569',
                    fontSize: 12,
                  }
                : undefined
            }
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
