export const VizType = {
  BAR_CHART: 'bar_chart',
  GROUPED_BAR_CHART: 'grouped_bar_chart',
  TIME_SERIES: 'time_series',
  HISTOGRAM: 'histogram',
  SCATTER_PLOT: 'scatter_plot',
  NETWORK_GRAPH: 'network_graph',
  GEO_MAP: 'geo_map',
} as const;

export type VizType = (typeof VizType)[keyof typeof VizType];

export const VIZ_TYPES: VizType[] = Object.values(VizType);
