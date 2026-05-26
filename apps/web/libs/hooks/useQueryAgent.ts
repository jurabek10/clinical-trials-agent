'use client';

import { useCallback, useRef, useState } from 'react';
import type { QueryRequest, QueryResponse } from '@ct-agent/shared';
import { ApiError, postQuery } from '../api/client';

export type AgentStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UseQueryAgent {
  status: AgentStatus;
  data: QueryResponse | null;
  error: ApiError | null;
  run: (req: QueryRequest) => Promise<void>;
  reset: () => void;
}

export function useQueryAgent(): UseQueryAgent {
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [data, setData] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async (req: QueryRequest) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus('loading');
    setError(null);
    try {
      const res = await postQuery(req, controller.signal);
      if (controller.signal.aborted) return;
      setData(res);
      setStatus('success');
    } catch (err) {
      if (controller.signal.aborted) return;
      if (err instanceof ApiError) {
        setError(err);
      } else if (err instanceof Error) {
        setError(new ApiError('INTERNAL', err.message));
      } else {
        setError(new ApiError('INTERNAL', 'Unknown error'));
      }
      setStatus('error');
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setStatus('idle');
    setData(null);
    setError(null);
  }, []);

  return { status, data, error, run, reset };
}
