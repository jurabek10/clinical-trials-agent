import { z } from 'zod';

export const PrimaryEntityTypeEnum = z.enum([
  'drug',
  'condition',
  'sponsor',
  'country',
  'phase',
  'status',
]);

export const GroupByEnum = z.enum([
  'phase',
  'status',
  'country',
  'sponsor_class',
  'intervention_type',
  'year',
  'month',
  'condition',
  'sponsor',
  'drug',
]);

export const SuggestedVizEnum = z.enum([
  'bar_chart',
  'grouped_bar_chart',
  'time_series',
  'histogram',
  'scatter_plot',
  'network_graph',
  'geo_map',
]);

export const IntentEnum = z.enum([
  'distribution',
  'comparison',
  'time_trend',
  'geographic',
  'relationship',
  'ranking',
]);

export const QueryPlanSchema = z.object({
  intent: IntentEnum,
  primary_entity: z.object({
    type: PrimaryEntityTypeEnum,
    value: z.string().nullable(),
  }),
  group_by: z.array(GroupByEnum).min(1).max(2),
  filters: z.object({
    condition: z.string().nullable(),
    drug_name: z.string().nullable(),
    sponsor: z.string().nullable(),
    country: z.string().nullable(),
    phase: z.array(z.string()).default([]),
    status: z.array(z.string()).default([]),
    start_year: z.number().int().min(1900).max(2100).nullable(),
    end_year: z.number().int().min(1900).max(2100).nullable(),
  }),
  suggested_viz: SuggestedVizEnum,
  title_hint: z.string().min(3).max(120),
  interpretation: z.string().min(5).max(240),
});

export type QueryPlan = z.infer<typeof QueryPlanSchema>;
export type PlanFilters = QueryPlan['filters'];
export type GroupBy = z.infer<typeof GroupByEnum>;
export type SuggestedViz = z.infer<typeof SuggestedVizEnum>;
