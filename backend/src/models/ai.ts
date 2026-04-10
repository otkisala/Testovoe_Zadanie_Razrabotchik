import { Priority } from './task';

// ── Request bodies ────────────────────────────────────────────────────────────
export interface AiTaskRequest {
  taskId: number;
}

// ── Response shapes (mirror frontend/src/types/ai.ts) ────────────────────────
export interface CategorizationResult {
  category: string;
  tags: string[];
  reasoning: string;
}

export interface DecomposeResult {
  subtasks: Array<{ title: string; priority: Priority }>;
}

export interface PriorityResult {
  suggested_priority: Priority;
  reasoning: string;
}

export interface WorkloadResult {
  summary: string;
  urgent_count: number;
  overdue_count: number;
  recommendations: string[];
}
