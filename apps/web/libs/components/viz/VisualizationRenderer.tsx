'use client';

import dynamic from 'next/dynamic';
import type { VisualizationSpec } from '@ct-agent/shared';
import { BarChartView } from './BarChartView';
import { GroupedBarChartView } from './GroupedBarChartView';
import { TimeSeriesView } from './TimeSeriesView';
import { HistogramView } from './HistogramView';
import { ScatterPlotView } from './ScatterPlotView';
import { GeoMapView } from './GeoMapView';

// react-force-graph is client-only; load without SSR.
const NetworkGraphView = dynamic(
  () => import('./NetworkGraphView').then((m) => m.NetworkGraphView),
  { ssr: false, loading: () => <ChartLoading label="Loading network graph…" /> },
);

interface VisualizationRendererProps {
  visualization: VisualizationSpec;
}

export function VisualizationRenderer({ visualization }: VisualizationRendererProps) {
  switch (visualization.type) {
    case 'bar_chart':
      return <BarChartView spec={visualization} />;
    case 'grouped_bar_chart':
      return <GroupedBarChartView spec={visualization} />;
    case 'time_series':
      return <TimeSeriesView spec={visualization} />;
    case 'histogram':
      return <HistogramView spec={visualization} />;
    case 'scatter_plot':
      return <ScatterPlotView spec={visualization} />;
    case 'geo_map':
      return <GeoMapView spec={visualization} />;
    case 'network_graph':
      return <NetworkGraphView spec={visualization} />;
    default:
      return (
        <pre className="text-xs bg-slate-50 rounded p-3 overflow-auto max-h-96">
          {JSON.stringify(visualization, null, 2)}
        </pre>
      );
  }
}

function ChartLoading({ label }: { label: string }) {
  return (
    <div className="h-[420px] grid place-items-center text-sm text-slate-400">{label}</div>
  );
}
