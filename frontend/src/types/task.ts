export type Priority = 'low' | 'medium' | 'high';
export type Status = 'pending' | 'in_progress' | 'done';

export interface Task {
  id: number;
  title: string;
  description?: string;
  priority: Priority;
  status: Status;
  due_date?: string;
  category?: string;
  created_at: string;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  priority?: Priority;
  status?: Status;
  due_date?: string;
  category?: string;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  priority?: Priority;
  status?: Status;
  due_date?: string;
  category?: string;
}

export interface TaskFilters {
  status?: Status | '';
  priority?: Priority | '';
  search?: string;
  due_before?: string;
  due_after?: string;
  sort_by?: 'created_at' | 'due_date' | 'priority' | 'title';
  sort_order?: 'asc' | 'desc';
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
  };
}
