import type { NormalizedStudy, QueryPlan } from '@ct-agent/shared';
import { AggregatorService } from '../src/aggregator/aggregator.service';
import { VisualizationService } from '../src/visualization/visualization.service';

const plan: QueryPlan = {
  intent: 'distribution',
  primary_entity: { type: 'condition', value: "Alzheimer's disease" },
  group_by: ['phase'],
  filters: {
    condition: "Alzheimer's disease",
    drug_name: null,
    sponsor: null,
    country: null,
    phase: [],
    status: [],
    start_year: null,
    end_year: null,
  },
  suggested_viz: 'bar_chart',
  title_hint: "Alzheimer's disease trials by phase",
  interpretation: "Count Alzheimer's disease trials by phase.",
};

const studies: NormalizedStudy[] = [
  {
    nctId: 'NCT1',
    briefTitle: 'Study 1',
    overallStatus: 'COMPLETED',
    phases: ['PHASE2'],
    conditions: ["Alzheimer's disease"],
    interventionNames: ['Drug A'],
    interventionTypes: ['DRUG'],
    locationCountries: ['United States'],
    enrollmentCount: 150,
  },
];

describe('VisualizationService', () => {
  const service = new VisualizationService(new AggregatorService());

  it('uses an enrollment-focused title for preferred histograms', () => {
    const { spec } = service.build(
      plan,
      studies,
      { condition: "Alzheimer's disease" },
      'histogram',
    );

    expect(spec.title).toBe("Enrollment distribution for Alzheimer's disease trials");
  });

  it('uses an enrollment-vs-duration title for preferred scatter plots', () => {
    const { spec } = service.build(
      plan,
      studies,
      { condition: "Alzheimer's disease" },
      'scatter_plot',
    );

    expect(spec.title).toBe("Enrollment vs duration for Alzheimer's disease trials");
  });
});
