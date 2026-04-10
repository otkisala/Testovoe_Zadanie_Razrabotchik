import {
  Task,
  CreateTaskDto,
  UpdateTaskDto,
  TaskFilters,
  ApiResponse,
} from '../types/task';

const BASE_URL = 'http://localhost:3000/api/v1';

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  const json: ApiResponse<T> = await response.json();

  if (!response.ok || !json.success) {
    const message = json.error?.message ?? `HTTP error ${response.status}`;
    const code = json.error?.code ?? 'UNKNOWN_ERROR';
    throw new Error(`[${code}] ${message}`);
  }

  return json.data as T;
}

function buildQueryString(filters: TaskFilters): string {
  const params = new URLSearchParams();

  if (filters.status) params.set('status', filters.status);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.search) params.set('search', filters.search);
  if (filters.due_before) params.set('due_before', filters.due_before);
  if (filters.due_after) params.set('due_after', filters.due_after);
  if (filters.sort_by) params.set('sort_by', filters.sort_by);
  if (filters.sort_order) params.set('sort_order', filters.sort_order);

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const api = {
  getTasks(filters: TaskFilters = {}): Promise<Task[]> {
    return request<Task[]>(`/tasks${buildQueryString(filters)}`);
  },

  getTask(id: number): Promise<Task> {
    return request<Task>(`/tasks/${id}`);
  },

  createTask(data: CreateTaskDto): Promise<Task> {
    return request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateTask(id: number, data: UpdateTaskDto): Promise<Task> {
    return request<Task>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteTask(id: number): Promise<{ id: number }> {
    return request<{ id: number }>(`/tasks/${id}`, {
      method: 'DELETE',
    });
  },
};
