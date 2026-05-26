import { z } from 'zod';

export const VizTypeEnum = z.enum([
  'bar_chart',
  'grouped_bar_chart',
  'time_series',
  'histogram',
  'scatter_plot',
  'network_graph',
  'geo_map',
]);

export const FieldRefSchema = z.object({
  field: z.string(),
  label: z.string().optional(),
});

export const VisualizationSpecSchema = z.object({
  type: VizTypeEnum,
  title: z.string(),
  encoding: z.record(z.unknown()),
  data: z.unknown(),
});

export type VisualizationSpecParsed = z.infer<typeof VisualizationSpecSchema>;
