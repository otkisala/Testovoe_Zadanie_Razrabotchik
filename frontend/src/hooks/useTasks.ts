import { useState, useEffect, useCallback } from 'react';
import { Task, CreateTaskDto, UpdateTaskDto, TaskFilters } from '../types/task';
import { api } from '../services/api';

interface UseTasksReturn {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  filters: TaskFilters;
  loadTasks: () => Promise<void>;
  createTask: (data: CreateTaskDto) => Promise<Task>;
  updateTask: (id: number, data: UpdateTaskDto) => Promise<Task>;
  deleteTask: (id: number) => Promise<void>;
  setFilters: (filters: TaskFilters) => void;
  clearError: () => void;
}

export function useTasks(): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<TaskFilters>({});

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTasks(filters);
      setTasks(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load tasks';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const createTask = useCallback(async (data: CreateTaskDto): Promise<Task> => {
    const task = await api.createTask(data);
    setTasks((prev) => [task, ...prev]);
    return task;
  }, []);

  const updateTask = useCallback(async (id: number, data: UpdateTaskDto): Promise<Task> => {
    const updated = await api.updateTask(id, data);
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    return updated;
  }, []);

  const deleteTask = useCallback(async (id: number): Promise<void> => {
    await api.deleteTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const setFilters = useCallback((newFilters: TaskFilters) => {
    setFiltersState(newFilters);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    tasks,
    loading,
    error,
    filters,
    loadTasks,
    createTask,
    updateTask,
    deleteTask,
    setFilters,
    clearError,
  };
}
