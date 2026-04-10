import { useState, useCallback, useRef } from 'react';

type Status = 'idle' | 'loading' | 'done' | 'error';

interface AiActionState<T> {
  status: Status;
  data: T | null;
  error: string | null;
}

interface UseAiActionReturn<T> extends AiActionState<T> {
  run: () => Promise<void>;
  reset: () => void;
}

export function useAiAction<T>(fn: () => Promise<T>): UseAiActionReturn<T> {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const [state, setState] = useState<AiActionState<T>>({
    status: 'idle',
    data: null,
    error: null,
  });

  const run = useCallback(async () => {
    setState({ status: 'loading', data: null, error: null });
    try {
      const data = await fnRef.current();
      setState({ status: 'done', data, error: null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка AI';
      setState({ status: 'idle', data: null, error: msg });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: 'idle', data: null, error: null });
  }, []);

  return { ...state, run, reset };
}
