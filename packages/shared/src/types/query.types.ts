import type { VizType } from '../enums/viz-type.enum';
import type { Phase } from '../enums/phase.enum';
import type { Status } from '../enums/status.enum';
import type { VisualizationSpec } from './visualization.types';
import type { Citation } from './citation.types';

export interface QueryFilters {
  condition?: string;
  drug_name?: string;
  sponsor?: string;
  phase?: Phase[];
  status?: Status[];
  country?: string;
  start_year?: number;
  end_year?: number;
}

export interface QueryOptions {
  max_studies?: number;
  include_citations?: boolean;
  preferred_viz?: VizType;
}

export interface QueryRequest {
  query: string;
  filters?: QueryFilters;
  options?: QueryOptions;
}

export interface QueryMeta {
  source: 'clinicaltrials.gov';
  api_version: 'v2';
  filters_applied: Record<string, unknown>;
  query_interpretation: string;
  total_studies_scanned: number;
  total_studies_used: number;
  assumptions: string[];
  generated_at: string;
  latency_ms: number;
  time_granularity?: 'year' | 'month';
}

export interface QueryResponse {
  visualization: VisualizationSpec;
  meta: QueryMeta;
  citations?: Citation[];
}

export type ErrorCode =
  | 'INVALID_INPUT'
  | 'PLAN_VALIDATION_FAILED'
  | 'UPSTREAM_FAILURE'
  | 'NO_DATA'
  | 'INTERNAL';

export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}
