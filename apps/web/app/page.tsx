'use client';

import { useState } from 'react';
import { QueryInput } from '@/libs/components/query/QueryInput';
import { ResultPanel } from '@/libs/components/query/ResultPanel';
import { useQueryAgent } from '@/libs/hooks/useQueryAgent';

export default function HomePage() {
  const { run, data, error, status } = useQueryAgent();
  const [lastQuery, setLastQuery] = useState<string>('');

  const onSubmit = async (query: string) => {
    setLastQuery(query);
    await run({ query });
  };

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
          Ask a question about clinical trials
        </h1>
        <p className="text-slate-600 max-w-2xl">
          Powered by the ClinicalTrials.gov v2 API. The LLM translates your question into a
          structured plan; all numbers come from deterministic aggregation in TypeScript.
        </p>
      </section>

      <QueryInput onSubmit={onSubmit} loading={status === 'loading'} />

      <ResultPanel status={status} data={data} error={error} lastQuery={lastQuery} />
    </div>
  );
}
