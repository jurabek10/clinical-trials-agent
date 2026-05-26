import { Injectable } from '@nestjs/common';
import type {
  NormalizedStudy,
  QueryFilters,
  QueryPlan,
  VisualizationSpec,
  VizType,
  NetworkData,
} from '@ct-agent/shared';
import { AggregatorService } from '../aggregator/aggregator.service';
import type { BucketMap } from '../aggregator/strategies/types';
import type { CompareDim } from '../aggregator/strategies/comparison.strategy';
import type { NetworkDim } from '../aggregator/strategies/build-network.strategy';
import { extractDrugComparisonTerms } from '../common/comparison-terms';

export interface BuildResult {
  spec: VisualizationSpec;
  buckets: BucketMap;
  timeGranularity?: 'year' | 'month';
}

@Injectable()
export class VisualizationService {
  constructor(private readonly aggregator: AggregatorService) {}

  build(
    plan: QueryPlan,
    studies: NormalizedStudy[],
    effective: QueryFilters,
    preferredViz?: VizType,
  ): BuildResult {
    const chosen = this.chooseVizType(plan, preferredViz);
    const title = this.makeTitle(plan, effective, chosen, preferredViz);

    switch (chosen) {
      case 'bar_chart':
        return this.buildBar(plan, studies, title);
      case 'grouped_bar_chart':
        return this.buildGroupedBar(plan, studies, title);
      case 'time_series':
        return this.buildTimeSeries(plan, studies, title, effective);
      case 'histogram':
        return this.buildHistogram(studies, title);
      case 'scatter_plot':
        return this.buildScatter(studies, title);
      case 'network_graph':
        return this.buildNetwork(plan, studies, title);
      case 'geo_map':
        return this.buildGeo(studies, title);
    }
  }

  private chooseVizType(plan: QueryPlan, preferred?: VizType): VizType {
    // User preference wins, but only if it's plausible for the intent.
    if (preferred) return preferred;

    if (plan.group_by[0] === 'country') {
      return 'geo_map';
    }

    switch (plan.intent) {
      case 'distribution':
        return 'bar_chart';
      case 'comparison':
        return 'grouped_bar_chart';
      case 'time_trend':
        return 'time_series';
      case 'geographic':
        return 'geo_map';
      case 'relationship':
        return 'network_graph';
      case 'ranking':
        return 'bar_chart';
      default:
        return plan.suggested_viz;
    }
  }

  private buildBar(
    plan: QueryPlan,
    studies: NormalizedStudy[],
    title: string,
  ): BuildResult {
    const dim = plan.group_by[0];
    let data: ReturnType<AggregatorService['byPhase']>['data'];
    let buckets: BucketMap;
    let xField: string;

    switch (dim) {
      case 'phase':
        ({ data, buckets } = this.aggregator.byPhase(studies));
        xField = 'phase';
        break;
      case 'status':
        ({ data, buckets } = this.aggregator.byStatus(studies));
        xField = 'status';
        break;
      case 'country':
        ({ data, buckets } = this.aggregator.byCountry(studies));
        xField = 'country';
        break;
      case 'sponsor':
        ({ data, buckets } = this.aggregator.bySponsor(studies));
        xField = 'sponsor';
        break;
      case 'sponsor_class':
        ({ data, buckets } = this.aggregator.bySponsorClass(studies));
        xField = 'sponsor_class';
        break;
      case 'intervention_type':
        ({ data, buckets } = this.aggregator.byInterventionType(studies));
        xField = 'intervention_type';
        break;
      default:
        ({ data, buckets } = this.aggregator.byPhase(studies));
        xField = 'phase';
    }

    return {
      spec: {
        type: 'bar_chart',
        title,
        encoding: {
          x: { field: xField, label: this.label(xField) },
          y: { field: 'trial_count', label: 'Number of trials' },
        },
        data,
      },
      buckets,
    };
  }

  private buildGroupedBar(
    plan: QueryPlan,
    studies: NormalizedStudy[],
    title: string,
  ): BuildResult {
    const [xDim, seriesDim] = this.pickComparisonDims(plan);
    const seriesFilter = this.seriesFilterFromPlan(plan, seriesDim);
    const { data, buckets, xField, seriesField } = this.aggregator.comparison(
      studies,
      xDim,
      seriesDim,
      seriesFilter,
    );

    return {
      spec: {
        type: 'grouped_bar_chart',
        title,
        encoding: {
          x: { field: xField, label: this.label(xField) },
          y: { field: 'trial_count', label: 'Number of trials' },
          series: { field: seriesField, label: this.label(seriesField) },
        },
        data,
      },
      buckets,
    };
  }

  private buildTimeSeries(
    plan: QueryPlan,
    studies: NormalizedStudy[],
    title: string,
    effective: QueryFilters,
  ): BuildResult {
    const { data, buckets } = this.aggregator.byYear(studies, {
      startYear: effective.start_year,
      endYear: effective.end_year,
    });
    return {
      spec: {
        type: 'time_series',
        title,
        encoding: {
          x: { field: 'year', label: 'Year' },
          y: { field: 'trial_count', label: 'Number of trials' },
        },
        data,
      },
      buckets,
      timeGranularity: 'year',
    };
  }

  private buildHistogram(studies: NormalizedStudy[], title: string): BuildResult {
    const { data, buckets } = this.aggregator.histogramEnrollment(studies, 100);
    const rows = data.map((d) => ({
      bin_start: d.bin_start,
      bin_end: d.bin_end,
      count: d.count,
    })) as unknown as Record<string, number>[];
    return {
      spec: {
        type: 'histogram',
        title,
        encoding: {
          x: { field: 'enrollment', bin: { size: 100 } },
          y: { field: 'count', label: 'Number of trials' },
        },
        data: rows,
      },
      buckets,
    };
  }

  private buildScatter(studies: NormalizedStudy[], title: string): BuildResult {
    const data: Record<string, number | string>[] = [];
    const buckets: BucketMap = new Map();
    for (const s of studies) {
      if (s.enrollmentCount === undefined || !s.startDate || !s.completionDate) continue;
      const start = Date.parse(s.startDate);
      const end = Date.parse(s.completionDate);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
      const durationMonths = Math.round((end - start) / (1000 * 60 * 60 * 24 * 30));
      data.push({
        enrollment: s.enrollmentCount,
        duration_months: durationMonths,
        nct_id: s.nctId,
      });
      const k = `nct=${s.nctId}`;
      buckets.set(k, new Set([s.nctId]));
    }
    return {
      spec: {
        type: 'scatter_plot',
        title,
        encoding: {
          x: { field: 'duration_months', label: 'Duration (months)' },
          y: { field: 'enrollment', label: 'Enrollment' },
        },
        data,
      },
      buckets,
    };
  }

  private buildNetwork(
    plan: QueryPlan,
    studies: NormalizedStudy[],
    title: string,
  ): BuildResult {
    const [srcDim, tgtDim] = this.pickNetworkDims(plan);
    const { data, buckets } = this.aggregator.network(studies, srcDim, tgtDim, 100);
    const network: NetworkData = data;
    return {
      spec: {
        type: 'network_graph',
        title,
        encoding: {
          nodes: { id_field: 'id', label_field: 'label', group_field: 'type' },
          edges: {
            source_field: 'source',
            target_field: 'target',
            weight_field: 'weight',
          },
        },
        data: network,
      },
      buckets,
    };
  }

  private buildGeo(studies: NormalizedStudy[], title: string): BuildResult {
    const { data, buckets } = this.aggregator.byCountry(studies);
    const remapped = data.map((d) => ({
      country: d.country,
      trial_count: d.trial_count,
    }));
    return {
      spec: {
        type: 'geo_map',
        title,
        encoding: {
          location: { field: 'country' },
          value: { field: 'trial_count' },
        },
        data: remapped,
      },
      buckets,
    };
  }

  private pickComparisonDims(plan: QueryPlan): [CompareDim, CompareDim] {
    const dims = plan.group_by.filter((d) => this.isCompareDim(d)) as CompareDim[];
    if (dims.length >= 2) return [dims[0], dims[1]];
    if (dims.length === 1) return [dims[0], 'drug'];
    return ['phase', 'drug'];
  }

  private pickNetworkDims(plan: QueryPlan): [NetworkDim, NetworkDim] {
    const dims = plan.group_by.filter((d) => this.isNetworkDim(d)) as NetworkDim[];
    if (dims.length >= 2) return [dims[0], dims[1]];
    if (dims.length === 1) {
      // pair with a sensible counterpart
      const other: NetworkDim = dims[0] === 'sponsor' ? 'drug' : 'sponsor';
      return [dims[0], other];
    }
    return ['sponsor', 'drug'];
  }

  private isCompareDim(d: string): d is CompareDim {
    return [
      'phase',
      'status',
      'country',
      'year',
      'sponsor',
      'sponsor_class',
      'drug',
      'condition',
      'intervention_type',
    ].includes(d);
  }

  private isNetworkDim(d: string): d is NetworkDim {
    return ['sponsor', 'drug', 'condition'].includes(d);
  }

  private seriesFilterFromPlan(plan: QueryPlan, seriesDim: CompareDim): string[] | undefined {
    if (seriesDim === 'drug') {
      return extractDrugComparisonTerms(plan);
    }
    return undefined;
  }

  private label(field: string): string {
    switch (field) {
      case 'phase':
        return 'Phase';
      case 'status':
        return 'Status';
      case 'country':
        return 'Country';
      case 'sponsor':
        return 'Sponsor';
      case 'sponsor_class':
        return 'Sponsor class';
      case 'year':
        return 'Year';
      case 'drug':
        return 'Drug';
      case 'condition':
        return 'Condition';
      case 'intervention_type':
        return 'Intervention type';
      default:
        return field;
    }
  }

  private makeTitle(
    plan: QueryPlan,
    effective: QueryFilters,
    chosen: VizType,
    preferredViz?: VizType,
  ): string {
    const subject = effective.drug_name ?? effective.condition ?? plan.primary_entity.value ?? 'trials';
    if (preferredViz === 'histogram') {
      return `Enrollment distribution for ${subject} trials`;
    }
    if (preferredViz === 'scatter_plot') {
      return `Enrollment vs duration for ${subject} trials`;
    }
    if (plan.title_hint) return plan.title_hint;
    if (chosen === 'histogram') return `Enrollment distribution for ${subject} trials`;
    if (chosen === 'scatter_plot') return `Enrollment vs duration for ${subject} trials`;
    return `Clinical trials related to ${subject}`;
  }
}
