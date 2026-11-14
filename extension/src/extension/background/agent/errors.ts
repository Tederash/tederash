export interface DescribedError {
  code:
    | 'AUTH'
    | 'RATE_LIMIT'
    | 'MODEL_UNAVAILABLE'
    | 'TOOL_VALIDATION'
    | 'NETWORK'
    | 'ABORTED'
    | 'PROVIDER';
  /** Plain language, safe to show the user. */
  message: string;
  retryable: boolean;
  /** Seconds suggested by the provider before retrying (429). */
  retryAfter?: number;
}

function statusOf(err: unknown): number | undefined {
  const e = err as { statusCode?: number; status?: number; cause?: unknown };
  return e?.statusCode ?? e?.status ?? (e?.cause ? statusOf(e.cause) : undefined);
}

function textOf(err: unknown): string {
  if (!err) return '';
  if (typeof err === 'string') return err;
  const e = err as { message?: string; responseBody?: string };
  return `${e.message ?? ''} ${e.responseBody ?? ''}`;
}

function retryAfterOf(err: unknown): number | undefined {
  const headers = (err as { responseHeaders?: Record<string, string> })?.responseHeaders;
  const raw = headers?.['retry-after'];
  const n = raw ? Number.parseFloat(raw) : Number.NaN;
  return Number.isFinite(n) ? n : undefined;
}

/** Maps provider/SDK errors to a stable code and a message a user can act on. */
export function describeProviderError(err: unknown): DescribedError {
  const status = statusOf(err);
  const text = textOf(err).toLowerCase();
  const name = (err as { name?: string })?.name ?? '';

  if (name === 'AbortError' || text.includes('aborted')) {
    return { code: 'ABORTED', message: 'Stopped.', retryable: false };
  }
  if (status === 401 || status === 403 || text.includes('invalid api key')) {
    return {
      code: 'AUTH',
      message: 'The AI service rejected the API key. Check the key in the assistant settings.',
      retryable: false,
    };
  }
  if (status === 429 || text.includes('rate limit')) {
    return {
      code: 'RATE_LIMIT',
      message: 'The AI service is busy right now (rate limit).',
      retryable: true,
      retryAfter: retryAfterOf(err),
    };
  }
  if (text.includes('model_not_found') || text.includes('does not exist')) {
    return {
      code: 'MODEL_UNAVAILABLE',
      message: 'The selected AI model is not available for this key.',
      retryable: true,
    };
  }
  if (text.includes('tool call validation') || text.includes('did not match schema')) {
    return {
      code: 'TOOL_VALIDATION',
      message: 'The AI model sent an invalid action request.',
      retryable: true,
    };
  }
  if (name === 'TypeError' || text.includes('failed to fetch') || text.includes('network')) {
    return {
      code: 'NETWORK',
      message: 'Could not reach the AI service. Check your internet connection.',
      retryable: true,
    };
  }
  return {
    code: 'PROVIDER',
    message: 'The AI service returned an error.',
    retryable: status === undefined || status >= 500,
  };
}
