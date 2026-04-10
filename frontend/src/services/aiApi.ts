import { CategorizationResult, DecomposeResult, PriorityResult, WorkloadResult } from '../types/ai';

const API_BASE = 'http://localhost:3000/api/v1/ai';

async function post<T>(endpoint: string, body?: object): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as { success: boolean; data?: T; error?: { message: string } };
  if (!json.success) {
    throw new Error(json.error?.message ?? 'Ошибка AI');
  }
  return json.data as T;
}

export const aiApi = {
  categorize: (taskId: number) => post<CategorizationResult>('/categorize', { taskId }),
  decompose: (taskId: number) => post<DecomposeResult>('/decompose', { taskId }),
  priority: (taskId: number) => post<PriorityResult>('/priority', { taskId }),
  workloadSummary: () => post<WorkloadResult>('/workload-summary'),
};
