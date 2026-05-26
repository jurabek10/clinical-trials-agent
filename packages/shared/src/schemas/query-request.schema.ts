import { z } from 'zod';

const PhaseEnum = z.enum(['EARLY_PHASE1', 'PHASE1', 'PHASE2', 'PHASE3', 'PHASE4', 'NA']);
const StatusEnum = z.enum([
  'RECRUITING',
  'COMPLETED',
  'TERMINATED',
  'ACTIVE_NOT_RECRUITING',
  'WITHDRAWN',
  'NOT_YET_RECRUITING',
]);
const VizEnum = z.enum([
  'bar_chart',
  'grouped_bar_chart',
  'time_series',
  'histogram',
  'scatter_plot',
  'network_graph',
  'geo_map',
]);

export const QueryRequestSchema = z
  .object({
    query: z.string().trim().min(1).max(500),
    filters: z
      .object({
        condition: z.string().trim().min(1).optional(),
        drug_name: z.string().trim().min(1).optional(),
        sponsor: z.string().trim().min(1).optional(),
        phase: z.array(PhaseEnum).optional(),
        status: z.array(StatusEnum).optional(),
        country: z.string().trim().min(1).optional(),
        start_year: z.number().int().min(1900).max(2100).optional(),
        end_year: z.number().int().min(1900).max(2100).optional(),
      })
      .optional(),
    options: z
      .object({
        max_studies: z.number().int().min(10).max(1000).optional(),
        include_citations: z.boolean().optional(),
        preferred_viz: VizEnum.optional(),
      })
      .optional(),
  })
  .superRefine((val, ctx) => {
    const sy = val.filters?.start_year;
    const ey = val.filters?.end_year;
    if (sy !== undefined && ey !== undefined && sy > ey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'start_year must be <= end_year',
        path: ['filters', 'start_year'],
      });
    }
  });

export type QueryRequestInput = z.infer<typeof QueryRequestSchema>;
