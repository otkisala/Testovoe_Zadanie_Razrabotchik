import { useState, useCallback, useRef } from 'react';

export type StreamStatus = 'idle' | 'streaming' | 'done';

export interface AiStreamState<T> {
  status: StreamStatus;
  tokenCount: number;
  data: T | null;
  error: string | null;
  cached: boolean;
}

export interface UseAiStreamReturn<T> extends AiStreamState<T> {
  run: () => void;
  reset: () => void;
}

type SseEvent<T> =
  | { type: 'progress'; tokens: number }
  | { type: 'done'; result: T; cached: boolean }
  | { type: 'error'; message: string };

export function useAiStream<T>(
  endpoint: string,
  getBody: () => object
): UseAiStreamReturn<T> {
  const [state, setState] = useState<AiStreamState<T>>({
    status: 'idle',
    tokenCount: 0,
    data: null,
    error: null,
    cached: false,
  });

  const abortRef = useRef<AbortController | null>(null);
  const getBodyRef = useRef(getBody);
  getBodyRef.current = getBody;

  const run = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ status: 'streaming', tokenCount: 0, data: null, error: null, cached: false });

    try {
      const res = await fetch(`/api/v1/ai/stream${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getBodyRef.current()),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;
          try {
            const event = JSON.parse(jsonStr) as SseEvent<T>;
            if (event.type === 'progress') {
              setState((prev) => ({ ...prev, tokenCount: event.tokens }));
            } else if (event.type === 'done') {
              setState({
                status: 'done',
                tokenCount: 0,
                data: event.result,
                error: null,
                cached: event.cached,
              });
            } else if (event.type === 'error') {
              setState({
                status: 'idle',
                tokenCount: 0,
                data: null,
                error: event.message,
                cached: false,
              });
            }
          } catch {
            // skip malformed SSE line
          }
        }
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setState({
        status: 'idle',
        tokenCount: 0,
        data: null,
        error: err instanceof Error ? err.message : 'Ошибка AI',
        cached: false,
      });
    }
  }, [endpoint]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState({ status: 'idle', tokenCount: 0, data: null, error: null, cached: false });
  }, []);

  return { ...state, run, reset };
}
