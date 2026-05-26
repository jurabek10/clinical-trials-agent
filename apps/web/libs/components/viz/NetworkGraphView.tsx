'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { VisualizationSpec, NetworkData, NetworkNode } from '@ct-agent/shared';

const NODE_COLORS: Record<string, string> = {
  sponsor: '#1554dc',
  drug: '#10b981',
  condition: '#f59e0b',
  investigator: '#ec4899',
  site: '#7c3aed',
};

export function NetworkGraphView({ spec }: { spec: VisualizationSpec }) {
  const data = spec.data as NetworkData;
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 800, h: 480 });

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const update = () => setSize({ w: el.clientWidth, h: 480 });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const graphData = useMemo(
    () => ({
      nodes: data.nodes.map((n) => ({ ...n })),
      links: data.edges.map((e) => ({ source: e.source, target: e.target, weight: e.weight })),
    }),
    [data],
  );

  return (
    <div ref={containerRef} className="h-[480px] w-full rounded-md bg-slate-50 border border-slate-200">
      <ForceGraph2D
        graphData={graphData}
        width={size.w}
        height={size.h}
        backgroundColor="#f8fafc"
        nodeLabel={(n) => {
          const node = n as NetworkNode;
          return `${node.label} (${node.type})`;
        }}
        nodeVal={(n) => {
          const node = n as NetworkNode;
          return Math.sqrt(node.size ?? 1) + 2;
        }}
        nodeColor={(n) => {
          const node = n as NetworkNode;
          return NODE_COLORS[node.type] ?? '#64748b';
        }}
        linkColor={() => 'rgba(100, 116, 139, 0.35)'}
        linkWidth={(l) => Math.min(4, Math.log2(((l as { weight: number }).weight ?? 1) + 1))}
        cooldownTicks={120}
      />
    </div>
  );
}
