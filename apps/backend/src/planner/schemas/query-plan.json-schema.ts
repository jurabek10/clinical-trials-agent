/**
 * JSON Schema for OpenAI structured outputs (response_format.json_schema, strict mode).
 *
 * Hand-authored to mirror QueryPlanSchema (Zod) in shape, while complying with OpenAI's
 * strict-mode constraints:
 *   - every object has additionalProperties: false
 *   - every property is listed in `required` (no optional fields)
 *   - nullables use type: [<base>, 'null'] rather than anyOf
 *   - no minLength/maxLength/minItems/maxItems (Zod still enforces those post-parse)
 *
 * Keep this in sync with packages/shared/src/schemas/query-plan.schema.ts.
 */
export const QUERY_PLAN_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'intent',
    'primary_entity',
    'group_by',
    'filters',
    'suggested_viz',
    'title_hint',
    'interpretation',
  ],
  properties: {
    intent: {
      type: 'string',
      enum: [
        'distribution',
        'comparison',
        'time_trend',
        'geographic',
        'relationship',
        'ranking',
      ],
    },
    primary_entity: {
      type: 'object',
      additionalProperties: false,
      required: ['type', 'value'],
      properties: {
        type: {
          type: 'string',
          enum: ['drug', 'condition', 'sponsor', 'country', 'phase', 'status'],
        },
        value: { type: ['string', 'null'] },
      },
    },
    group_by: {
      type: 'array',
      items: {
        type: 'string',
        enum: [
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
        ],
      },
    },
    filters: {
      type: 'object',
      additionalProperties: false,
      required: [
        'condition',
        'drug_name',
        'sponsor',
        'country',
        'phase',
        'status',
        'start_year',
        'end_year',
      ],
      properties: {
        condition: { type: ['string', 'null'] },
        drug_name: { type: ['string', 'null'] },
        sponsor: { type: ['string', 'null'] },
        country: { type: ['string', 'null'] },
        phase: { type: 'array', items: { type: 'string' } },
        status: { type: 'array', items: { type: 'string' } },
        start_year: { type: ['integer', 'null'] },
        end_year: { type: ['integer', 'null'] },
      },
    },
    suggested_viz: {
      type: 'string',
      enum: [
        'bar_chart',
        'grouped_bar_chart',
        'time_series',
        'histogram',
        'scatter_plot',
        'network_graph',
        'geo_map',
      ],
    },
    title_hint: { type: 'string' },
    interpretation: { type: 'string' },
  },
} as const;
