import db from '../database/db';
import { Task, CreateTaskDto, UpdateTaskDto, TaskFilters } from '../models/task';

export const taskRepository = {
  findAll(filters: TaskFilters = {}): Task[] {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filters.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }

    if (filters.priority) {
      conditions.push('priority = ?');
      params.push(filters.priority);
    }

    if (filters.search) {
      conditions.push('(title LIKE ? OR description LIKE ?)');
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (filters.due_before) {
      conditions.push('due_date IS NOT NULL AND due_date <= ?');
      params.push(filters.due_before);
    }

    if (filters.due_after) {
      conditions.push('due_date IS NOT NULL AND due_date >= ?');
      params.push(filters.due_after);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const allowedSortColumns = ['created_at', 'due_date', 'priority', 'title'];
    const sortBy =
      filters.sort_by && allowedSortColumns.includes(filters.sort_by)
        ? filters.sort_by
        : 'created_at';
    const sortOrder =
      filters.sort_order === 'asc' ? 'ASC' : 'DESC';

    const sql = `SELECT * FROM tasks ${whereClause} ORDER BY ${sortBy} ${sortOrder}`;
    return db.prepare(sql).all(...params) as Task[];
  },

  findById(id: number): Task | undefined {
    return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as
      | Task
      | undefined;
  },

  create(data: CreateTaskDto): Task {
    const stmt = db.prepare(`
      INSERT INTO tasks (title, description, priority, status, due_date, category)
      VALUES (@title, @description, @priority, @status, @due_date, @category)
    `);

    const result = stmt.run({
      title: data.title,
      description: data.description ?? null,
      priority: data.priority ?? 'medium',
      status: data.status ?? 'pending',
      due_date: data.due_date ?? null,
      category: data.category ?? null,
    });

    return this.findById(result.lastInsertRowid as number)!;
  },

  update(id: number, data: UpdateTaskDto): Task | undefined {
    const existing = this.findById(id);
    if (!existing) return undefined;

    const fields: string[] = [];
    const params: Record<string, string | number | null> = { id };

    if (data.title !== undefined) {
      fields.push('title = @title');
      params.title = data.title;
    }
    if (data.description !== undefined) {
      fields.push('description = @description');
      params.description = data.description ?? null;
    }
    if (data.priority !== undefined) {
      fields.push('priority = @priority');
      params.priority = data.priority;
    }
    if (data.status !== undefined) {
      fields.push('status = @status');
      params.status = data.status;
    }
    if (data.due_date !== undefined) {
      fields.push('due_date = @due_date');
      params.due_date = data.due_date ?? null;
    }
    if (data.category !== undefined) {
      fields.push('category = @category');
      params.category = data.category ?? null;
    }

    if (fields.length === 0) return existing;

    db.prepare(
      `UPDATE tasks SET ${fields.join(', ')} WHERE id = @id`
    ).run(params);

    return this.findById(id);
  },

  delete(id: number): boolean {
    const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    return result.changes > 0;
  },
};
