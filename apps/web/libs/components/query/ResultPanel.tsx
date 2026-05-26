'use client';

import type { QueryResponse } from '@ct-agent/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/libs/components/ui/card';
import { Badge } from '@/libs/components/ui/badge';
import { VisualizationRenderer } from '@/libs/components/viz/VisualizationRenderer';
import { CitationList } from '@/libs/components/citations/CitationList';
import { ApiError } from '@/libs/api/client';
import { formatLatency, formatNumber, humanize } from '@/libs/utils';
import type { AgentStatus } from '@/libs/hooks/useQueryAgent';

interface ResultPanelProps {
  status: AgentStatus;
  data: QueryResponse | null;
  error: ApiError | null;
  lastQuery: string;
}

export function ResultPanel({ status, data, error, lastQuery }: ResultPanelProps) {
  if (status === 'idle') return null;

  if (status === 'loading') {
    return (
      <Card>
        <CardContent className="py-10 flex flex-col items-center gap-3 text-slate-500">
          <div className="h-6 w-6 rounded-full border-2 border-slate-300 border-t-brand-500 animate-spin" />
          <p className="text-sm">Planning, fetching, and aggregating…</p>
          {lastQuery && <p className="text-xs text-slate-400 italic">“{lastQuery}”</p>}
        </CardContent>
      </Card>
    );
  }

  if (status === 'error' && error) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge tone="danger">{error.code}</Badge>
            <CardTitle className="text-base">Request failed</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-700">{error.message}</p>
          {error.details ? (
            <pre className="mt-3 text-xs bg-slate-50 rounded-md p-3 overflow-auto max-h-48">
              {JSON.stringify(error.details, null, 2)}
            </pre>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  if (status === 'success' && data) {
    const { visualization, meta, citations } = data;
    return (
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="info">{humanize(visualization.type)}</Badge>
              <CardTitle>{visualization.title}</CardTitle>
            </div>
            <CardDescription>{meta.query_interpretation}</CardDescription>
          </CardHeader>
          <CardContent>
            <VisualizationRenderer visualization={visualization} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Run metadata</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <Stat label="Source" value={`${meta.source} (${meta.api_version})`} />
              <Stat label="Studies scanned" value={formatNumber(meta.total_studies_scanned)} />
              <Stat label="Studies used" value={formatNumber(meta.total_studies_used)} />
              <Stat label="Latency" value={formatLatency(meta.latency_ms)} />
            </dl>
            {Object.keys(meta.filters_applied).length > 0 && (
              <div className="mt-4">
                <div className="text-xs font-medium text-slate-500 mb-1">Filters applied</div>
                <pre className="text-xs bg-slate-50 rounded-md p-3 overflow-auto">
                  {JSON.stringify(meta.filters_applied, null, 2)}
                </pre>
              </div>
            )}
            {meta.assumptions.length > 0 && (
              <div className="mt-4">
                <div className="text-xs font-medium text-slate-500 mb-1">Assumptions</div>
                <ul className="text-sm text-slate-700 list-disc list-inside space-y-1">
                  {meta.assumptions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {citations && citations.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Deep citations</CardTitle>
                <Badge tone="default">{citations.length}</Badge>
              </div>
              <CardDescription>
                Each datum links to up to 5 contributing NCT IDs with a short excerpt from the
                source field.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CitationList citations={citations} />
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return null;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-base font-medium text-slate-800">{value}</dd>
    </div>
  );
}
