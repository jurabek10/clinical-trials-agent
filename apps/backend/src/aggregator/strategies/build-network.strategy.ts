import type { NetworkData, NetworkNode, NetworkEdge, NodeType, NormalizedStudy } from '@ct-agent/shared';
import type { BucketMap } from './types';

export type NetworkDim = 'sponsor' | 'drug' | 'condition';

function nodesFor(s: NormalizedStudy, dim: NetworkDim): { id: string; label: string }[] {
  switch (dim) {
    case 'sponsor': {
      const name = s.leadSponsorName?.trim();
      return name ? [{ id: `sponsor:${name}`, label: name }] : [];
    }
    case 'drug':
      return s.interventionNames.map((n) => ({ id: `drug:${n}`, label: n }));
    case 'condition':
      return s.conditions.map((c) => ({ id: `condition:${c}`, label: c }));
  }
}

function nodeType(dim: NetworkDim): NodeType {
  return dim;
}

/**
 * Build a bipartite network from two entity dimensions on each study.
 * Trims to top-N edges by weight to keep the graph readable.
 */
export function buildNetwork(
  studies: NormalizedStudy[],
  sourceDim: NetworkDim,
  targetDim: NetworkDim,
  topN = 100,
): { data: NetworkData; buckets: BucketMap } {
  const edgeWeights = new Map<string, number>();
  const edgeStudies = new Map<string, Set<string>>();
  const nodeMap = new Map<string, NetworkNode>();

  for (const s of studies) {
    const sources = nodesFor(s, sourceDim);
    const targets = nodesFor(s, targetDim);
    for (const src of sources) {
      if (!nodeMap.has(src.id)) {
        nodeMap.set(src.id, { id: src.id, label: src.label, type: nodeType(sourceDim) });
      }
      for (const tgt of targets) {
        if (!nodeMap.has(tgt.id)) {
          nodeMap.set(tgt.id, { id: tgt.id, label: tgt.label, type: nodeType(targetDim) });
        }
        const key = `${src.id}->${tgt.id}`;
        edgeWeights.set(key, (edgeWeights.get(key) ?? 0) + 1);
        if (!edgeStudies.has(key)) edgeStudies.set(key, new Set());
        edgeStudies.get(key)!.add(s.nctId);
      }
    }
  }

  const allEdges: NetworkEdge[] = [...edgeWeights.entries()]
    .map(([key, weight]) => {
      const [source, target] = key.split('->');
      return { source, target, weight };
    })
    .sort((a, b) => b.weight - a.weight);

  const keepEdges = allEdges.slice(0, topN);
  const keepNodeIds = new Set<string>();
  for (const e of keepEdges) {
    keepNodeIds.add(e.source);
    keepNodeIds.add(e.target);
  }

  const nodes: NetworkNode[] = [...nodeMap.values()].filter((n) => keepNodeIds.has(n.id));
  // Sum degree as a size hint.
  const degree = new Map<string, number>();
  for (const e of keepEdges) {
    degree.set(e.source, (degree.get(e.source) ?? 0) + e.weight);
    degree.set(e.target, (degree.get(e.target) ?? 0) + e.weight);
  }
  for (const n of nodes) n.size = degree.get(n.id) ?? 1;

  const buckets: BucketMap = new Map();
  for (const e of keepEdges) {
    const bk = `edge:${e.source}->${e.target}`;
    buckets.set(bk, edgeStudies.get(`${e.source}->${e.target}`) ?? new Set());
  }

  return { data: { nodes, edges: keepEdges }, buckets };
}
