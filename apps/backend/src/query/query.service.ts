import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { QueryResponse } from '@ct-agent/shared';
import { PlannerService } from '../planner/planner.service';
import { ClinicalTrialsService } from '../clinicaltrials/clinicaltrials.service';
import { AggregatorService } from '../aggregator/aggregator.service';
import { VisualizationService } from '../visualization/visualization.service';
import { CitationLinkerService } from '../visualization/citation-linker.service';
import {
  effectiveFilters,
  planToParams,
} from '../clinicaltrials/mappers/plan-to-params.mapper';
import { QueryRequestDto } from './dto/query-request.dto';
import {
  extractComparisonTerms,
  pickComparisonSeriesDim,
  type FanOutDim,
} from '../common/comparison-terms';
import { noData } from '../common/errors';

const FAN_OUT_DIMS: ReadonlySet<FanOutDim> = new Set(['drug', 'condition', 'sponsor']);

@Injectable()
export class QueryService {
  private readonly logger = new Logger(QueryService.name);
  private readonly defaultMax: number;
  private readonly hardCap: number;

  constructor(
    private readonly config: ConfigService,
    private readonly planner: PlannerService,
    private readonly ct: ClinicalTrialsService,
    private readonly aggregator: AggregatorService,
    private readonly viz: VisualizationService,
    private readonly citationLinker: CitationLinkerService,
  ) {
    this.defaultMax = this.config.get<number>('MAX_STUDIES_DEFAULT', 500);
    this.hardCap = this.config.get<number>('MAX_STUDIES_HARD_CAP', 1000);
  }

  async run(req: QueryRequestDto): Promise<QueryResponse> {
    const t0 = Date.now();
    const assumptions: string[] = [];

    const plan = await this.planner.plan(req.query);
    this.logger.debug(`Plan: ${JSON.stringify(plan)}`);

    const expansion = this.deriveComparisonExpansion(plan, req.filters);
    const filterOverrides = expansion
      ? { ...req.filters, [this.filterKeyFor(expansion.dim)]: expansion.terms.join(' OR ') }
      : req.filters;
    const effective = effectiveFilters(plan, filterOverrides);
    const params = planToParams(plan, filterOverrides);

    const maxStudies = Math.min(
      req.options?.max_studies ?? this.defaultMax,
      this.hardCap,
    );

    const {
      studies: rawStudies,
      totalScanned,
      totalAvailable,
      truncated,
    } = await this.ct.fetchStudies(params, maxStudies);

    const filtered = this.aggregator.postFilter(rawStudies, {
      startYear: effective.start_year,
      endYear: effective.end_year,
    });

    if (effective.start_year !== undefined || effective.end_year !== undefined) {
      const dropped = rawStudies.length - filtered.length;
      if (dropped > 0) {
        assumptions.push(
          `Excluded ${dropped} trial(s) outside the requested year range (start_year/end_year applied post-fetch).`,
        );
      }
    }

    if (totalAvailable !== undefined && totalAvailable > totalScanned) {
      assumptions.push(
        `ClinicalTrials.gov reports ${totalAvailable} matching studies; only the first ${totalScanned} were scanned (cap=${maxStudies}).`,
      );
    } else if (truncated) {
      assumptions.push(
        `Scan stopped at max_studies=${maxStudies}; more matches may exist on ClinicalTrials.gov.`,
      );
    }

    if (expansion) {
      assumptions.push(
        `Comparison series expanded to ${expansion.terms.join(' / ')} via OR-search on ${expansion.dim}.`,
      );
    }

    if (filtered.length === 0) {
      throw noData('No studies matched the query/filter combination.', {
        filters_applied: this.cleanFilters(effective as unknown as Record<string, unknown>),
        total_studies_scanned: totalScanned,
        assumptions,
      });
    }

    const includeCitations = req.options?.include_citations ?? true;
    const { spec, buckets, timeGranularity } = this.viz.build(
      plan,
      filtered,
      effective,
      req.options?.preferred_viz,
    );

    const citations = includeCitations ? this.citationLinker.link(spec, filtered, buckets) : undefined;

    const meta: QueryResponse['meta'] = {
      source: 'clinicaltrials.gov',
      api_version: 'v2',
      filters_applied: this.cleanFilters(effective as unknown as Record<string, unknown>),
      query_interpretation: plan.interpretation,
      total_studies_scanned: totalScanned,
      total_studies_used: filtered.length,
      assumptions,
      generated_at: new Date().toISOString(),
      latency_ms: Date.now() - t0,
      ...(timeGranularity ? { time_granularity: timeGranularity } : {}),
    };

    return {
      visualization: spec,
      meta,
      ...(citations ? { citations } : {}),
    };
  }

  private cleanFilters(f: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(f)) {
      if (v === undefined || v === null) continue;
      if (Array.isArray(v) && v.length === 0) continue;
      out[k] = v;
    }
    return out;
  }

  private deriveComparisonExpansion(
    plan: ReturnType<PlannerService['plan']> extends Promise<infer P> ? P : never,
    userFilters: QueryRequestDto['filters'],
  ): { dim: FanOutDim; terms: string[] } | undefined {
    if (plan.intent !== 'comparison') return undefined;
    const seriesDim = pickComparisonSeriesDim(plan);
    if (!seriesDim || !FAN_OUT_DIMS.has(seriesDim as FanOutDim)) return undefined;
    const dim = seriesDim as FanOutDim;
    if (this.userHasFilter(dim, userFilters)) return undefined;
    const terms = extractComparisonTerms(plan);
    if (!terms || terms.length < 2) return undefined;
    return { dim, terms };
  }

  private userHasFilter(dim: FanOutDim, userFilters: QueryRequestDto['filters']): boolean {
    if (!userFilters) return false;
    if (dim === 'drug') return !!userFilters.drug_name;
    if (dim === 'condition') return !!userFilters.condition;
    if (dim === 'sponsor') return !!userFilters.sponsor;
    return false;
  }

  private filterKeyFor(dim: FanOutDim): 'drug_name' | 'condition' | 'sponsor' {
    if (dim === 'drug') return 'drug_name';
    return dim;
  }
}
