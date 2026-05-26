'use client';

import { useState } from 'react';
import type { Citation } from '@ct-agent/shared';
import { Badge } from '@/libs/components/ui/badge';

interface CitationListProps {
  citations: Citation[];
}

export function CitationList({ citations }: CitationListProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <ul className="divide-y divide-slate-200">
      {citations.map((c) => {
        const open = expanded.has(c.datum_key);
        return (
          <li key={c.datum_key} className="py-3">
            <button
              type="button"
              onClick={() => toggle(c.datum_key)}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <Badge tone="info" className="font-mono">
                  {c.datum_key}
                </Badge>
                <span className="text-sm text-slate-600">{c.references.length} refs</span>
              </div>
              <span className="text-xs text-slate-400">{open ? '▾' : '▸'}</span>
            </button>
            {open && (
              <ul className="mt-2 ml-1 space-y-2">
                {c.references.map((r, i) => (
                  <li
                    key={`${c.datum_key}-${i}`}
                    className="text-sm text-slate-700 flex flex-col gap-0.5"
                  >
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://clinicaltrials.gov/study/${r.nct_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-brand-600 hover:underline"
                      >
                        {r.nct_id}
                      </a>
                      <span className="text-xs text-slate-400">({r.field})</span>
                    </div>
                    <p className="text-slate-700">{r.excerpt}</p>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
