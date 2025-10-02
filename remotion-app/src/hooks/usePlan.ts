import {useEffect, useState} from 'react';
import {staticFile} from 'remotion';
import {parsePlan} from '../data/planSchema';
import type {Plan} from '../types';

interface UsePlanOptions {
  enabled?: boolean;
}

interface UsePlanResult {
  plan: Plan | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
}

export const usePlan = (planPath: string, options: UsePlanOptions = {}): UsePlanResult => {
  const {enabled = true} = options;
  const [plan, setPlan] = useState<Plan | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    enabled ? 'loading' : 'idle'
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let isMounted = true;
    setStatus('loading');

    const load = async () => {
      try {
        const url = staticFile(planPath);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Không thể đọc plan từ ${planPath} (status ${response.status})`);
        }

        const json = await response.json();
        const parsed = parsePlan(json);

        if (isMounted) {
          setPlan(parsed);
          setStatus('ready');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        if (isMounted) {
          setError(message);
          setStatus('error');
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [enabled, planPath]);

  return {plan, status, error};
};
