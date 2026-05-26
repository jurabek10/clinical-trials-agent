import type { QueryPlan } from '@ct-agent/shared';

export interface FewShotExample {
  user: string;
  plan: QueryPlan;
}

export const FEW_SHOT_EXAMPLES: FewShotExample[] = [
  {
    user: 'How are trials for Pembrolizumab distributed across phases?',
    plan: {
      intent: 'distribution',
      primary_entity: { type: 'drug', value: 'Pembrolizumab' },
      group_by: ['phase'],
      filters: {
        condition: null,
        drug_name: 'Pembrolizumab',
        sponsor: null,
        country: null,
        phase: [],
        status: [],
        start_year: null,
        end_year: null,
      },
      suggested_viz: 'bar_chart',
      title_hint: 'Pembrolizumab trials by phase',
      interpretation:
        'Count clinical trials for Pembrolizumab grouped by clinical trial phase.',
    },
  },
  {
    user: 'How has the number of trials for Pembrolizumab changed per year since 2015?',
    plan: {
      intent: 'time_trend',
      primary_entity: { type: 'drug', value: 'Pembrolizumab' },
      group_by: ['year'],
      filters: {
        condition: null,
        drug_name: 'Pembrolizumab',
        sponsor: null,
        country: null,
        phase: [],
        status: [],
        start_year: 2015,
        end_year: null,
      },
      suggested_viz: 'time_series',
      title_hint: 'Pembrolizumab trials per year (since 2015)',
      interpretation:
        'Count clinical trials for Pembrolizumab grouped by start year, from 2015 onward.',
    },
  },
  {
    user: 'Show a network of sponsors and drugs for melanoma trials since 2020.',
    plan: {
      intent: 'relationship',
      primary_entity: { type: 'condition', value: 'melanoma' },
      group_by: ['sponsor', 'drug'],
      filters: {
        condition: 'melanoma',
        drug_name: null,
        sponsor: null,
        country: null,
        phase: [],
        status: [],
        start_year: 2020,
        end_year: null,
      },
      suggested_viz: 'network_graph',
      title_hint: 'Sponsor–drug network for melanoma trials (2020+)',
      interpretation:
        'Build a network of sponsors and interventions for melanoma trials starting in 2020 or later.',
    },
  },
  {
    user: 'What are the most common intervention types for Pembrolizumab trials?',
    plan: {
      intent: 'distribution',
      primary_entity: { type: 'drug', value: 'Pembrolizumab' },
      group_by: ['intervention_type'],
      filters: {
        condition: null,
        drug_name: 'Pembrolizumab',
        sponsor: null,
        country: null,
        phase: [],
        status: [],
        start_year: null,
        end_year: null,
      },
      suggested_viz: 'bar_chart',
      title_hint: 'Pembrolizumab trials by intervention type',
      interpretation:
        'Count clinical trials for Pembrolizumab grouped by intervention type (DRUG, BIOLOGICAL, DEVICE, etc.).',
    },
  },
  {
    user: 'Compare sponsor categories across cancer and diabetes trials.',
    plan: {
      intent: 'comparison',
      primary_entity: { type: 'condition', value: null },
      group_by: ['sponsor_class', 'condition'],
      filters: {
        condition: null,
        drug_name: null,
        sponsor: null,
        country: null,
        phase: [],
        status: [],
        start_year: null,
        end_year: null,
      },
      suggested_viz: 'grouped_bar_chart',
      title_hint: 'Sponsor categories: cancer vs diabetes trials',
      interpretation:
        'Compare the distribution of lead sponsor categories (INDUSTRY, NIH, OTHER_GOV, etc.) across cancer and diabetes trials.',
    },
  },
];
