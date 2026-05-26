import { Injectable } from '@nestjs/common';
import type { Citation, NormalizedStudy, VisualizationSpec, NetworkData } from '@ct-agent/shared';
import type { BucketMap } from '../aggregator/strategies/types';

const MAX_REFS_PER_DATUM = 5;
const MAX_TOTAL_CITATIONS = 50;
const MAX_EXCERPT_LEN = 200;

@Injectable()
export class CitationLinkerService {
  link(
    spec: VisualizationSpec,
    studies: NormalizedStudy[],
    buckets: BucketMap,
  ): Citation[] {
    const byId = new Map<string, NormalizedStudy>();
    for (const s of studies) byId.set(s.nctId, s);

    const datumKeys = this.deriveDatumKeys(spec);
    const citations: Citation[] = [];

    for (const key of datumKeys) {
      if (citations.length >= MAX_TOTAL_CITATIONS) break;
      const ids = buckets.get(key);
      if (!ids || ids.size === 0) continue;
      const refIds = [...ids].slice(0, MAX_REFS_PER_DATUM);
      const references = refIds
        .map((id) => byId.get(id))
        .filter((s): s is NormalizedStudy => !!s)
        .map((s) => this.makeReference(s, key));
      if (references.length > 0) {
        citations.push({ datum_key: key, references });
      }
    }

    return citations;
  }

  private deriveDatumKeys(spec: VisualizationSpec): string[] {
    if (spec.type === 'network_graph') {
      const net = spec.data as NetworkData;
      return net.edges.map((e) => `edge:${e.source}->${e.target}`);
    }

    const rows = spec.data as Record<string, string | number>[];
    switch (spec.type) {
      case 'bar_chart':
      case 'geo_map': {
        const enc = spec.encoding as { x?: { field: string }; location?: { field: string } };
        const field = enc.x?.field ?? enc.location?.field ?? '';
        return rows.map((r) => `${field}=${r[field]}`);
      }
      case 'grouped_bar_chart': {
        const enc = spec.encoding as {
          x: { field: string };
          series: { field: string };
        };
        return rows.map(
          (r) => `${enc.x.field}=${r[enc.x.field]};${enc.series.field}=${r[enc.series.field]}`,
        );
      }
      case 'time_series':
        return rows.map((r) => `year=${r['year']}`);
      case 'histogram':
        return rows.map((r) => `bin=${r['bin_start']}-${r['bin_end']}`);
      case 'scatter_plot':
        return rows.map((r) => `nct=${r['nct_id']}`);
      default:
        return [];
    }
  }

  private makeReference(
    s: NormalizedStudy,
    datumKey: string,
  ): { nct_id: string; excerpt: string; field: string } {
    const title = s.briefTitle ?? '';
    if (datumKey.startsWith('phase=')) {
      return {
        nct_id: s.nctId,
        excerpt: this.truncate(title || s.phases.join(', ')),
        field: 'BriefTitle',
      };
    }
    if (datumKey.startsWith('status=')) {
      return {
        nct_id: s.nctId,
        excerpt: this.truncate(`${s.overallStatus} — ${title}`),
        field: 'OverallStatus',
      };
    }
    if (datumKey.startsWith('country=')) {
      return {
        nct_id: s.nctId,
        excerpt: this.truncate(title),
        field: 'BriefTitle',
      };
    }
    if (datumKey.startsWith('year=')) {
      return {
        nct_id: s.nctId,
        excerpt: this.truncate(`${s.startDate ?? ''} — ${title}`),
        field: 'StartDate',
      };
    }
    if (datumKey.startsWith('edge:')) {
      return {
        nct_id: s.nctId,
        excerpt: this.truncate(title),
        field: 'BriefTitle',
      };
    }
    return {
      nct_id: s.nctId,
      excerpt: this.truncate(title),
      field: 'BriefTitle',
    };
  }

  private truncate(s: string): string {
    if (!s) return '';
    if (s.length <= MAX_EXCERPT_LEN) return s;
    return s.slice(0, MAX_EXCERPT_LEN - 1).trimEnd() + '…';
  }
}
