'use client';

import { useState, type KeyboardEvent } from 'react';
import { Button } from '@/libs/components/ui/button';
import { Textarea } from '@/libs/components/ui/textarea';
import { config } from '@/libs/config';

interface QueryInputProps {
  onSubmit: (query: string) => void;
  loading: boolean;
}

export function QueryInput({ onSubmit, loading }: QueryInputProps) {
  const [value, setValue] = useState('');

  const submit = () => {
    const q = value.trim();
    if (!q || loading) return;
    onSubmit(q);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <section className="flex flex-col gap-3">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKey}
        rows={3}
        placeholder='e.g. "How are trials for Pembrolizumab distributed across phases?"'
        disabled={loading}
        maxLength={500}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {config.examplePrompts.slice(0, 5).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => !loading && setValue(p)}
              className="text-xs text-slate-600 rounded-full border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="hidden sm:inline">⌘ + Enter to submit</span>
          <Button onClick={submit} disabled={loading || value.trim().length === 0}>
            {loading ? 'Querying…' : 'Run query'}
          </Button>
        </div>
      </div>
    </section>
  );
}
