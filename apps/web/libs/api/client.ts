import type { QueryRequest, QueryResponse, ErrorResponse } from '@ct-agent/shared';
import { config } from '../config';

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function postQuery(req: QueryRequest, signal?: AbortSignal): Promise<QueryResponse> {
  const url = `${config.apiBaseUrl}/api/query`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req),
      signal,
    });
  } catch (err) {
    throw new ApiError(
      'NETWORK',
      err instanceof Error ? err.message : 'Network request failed',
    );
  }

  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // non-JSON body
  }

  if (!res.ok) {
    const err = (body as ErrorResponse | null)?.error;
    throw new ApiError(
      err?.code ?? 'INTERNAL',
      err?.message ?? `Request failed: ${res.status}`,
      err?.details,
      res.status,
    );
  }

  return body as QueryResponse;
}
