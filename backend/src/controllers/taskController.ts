import { Request, Response, NextFunction } from 'express';
import { taskRepository } from '../repositories/taskRepository';
import { CreateTaskDto, UpdateTaskDto, TaskFilters, Priority, Status } from '../models/task';

export const taskController = {
  getAll(req: Request, res: Response, next: NextFunction): void {
    try {
      const filters: TaskFilters = {};

      if (req.query.status) {
        const validStatuses: Status[] = ['pending', 'in_progress', 'done'];
        const s = req.query.status as string;
        if (!validStatuses.includes(s as Status)) {
          res.status(400).json({
            success: false,
            error: { message: `Invalid status: ${s}`, code: 'VALIDATION_ERROR' },
          });
          return;
        }
        filters.status = s as Status;
      }

      if (req.query.priority) {
        const validPriorities: Priority[] = ['low', 'medium', 'high'];
        const p = req.query.priority as string;
        if (!validPriorities.includes(p as Priority)) {
          res.status(400).json({
            success: false,
            error: { message: `Invalid priority: ${p}`, code: 'VALIDATION_ERROR' },
          });
          return;
        }
        filters.priority = p as Priority;
      }

      if (req.query.search) {
        filters.search = req.query.search as string;
      }

      if (req.query.due_before) {
        filters.due_before = req.query.due_before as string;
      }

      if (req.query.due_after) {
        filters.due_after = req.query.due_after as string;
      }

      if (req.query.sort_by) {
        filters.sort_by = req.query.sort_by as TaskFilters['sort_by'];
      }

      if (req.query.sort_order) {
        filters.sort_order = req.query.sort_order as TaskFilters['sort_order'];
      }

      const tasks = taskRepository.findAll(filters);
      res.json({ success: true, data: tasks });
    } catch (err) {
      next(err);
    }
  },

  getById(req: Request, res: Response, next: NextFunction): void {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: { message: 'Invalid task ID', code: 'VALIDATION_ERROR' },
        });
        return;
      }

      const task = taskRepository.findById(id);
      if (!task) {
        res.status(404).json({
          success: false,
          error: { message: `Task with id ${id} not found`, code: 'NOT_FOUND' },
        });
        return;
      }

      res.json({ success: true, data: task });
    } catch (err) {
      next(err);
    }
  },

  create(req: Request, res: Response, next: NextFunction): void {
    try {
      const body = req.body as CreateTaskDto;

      if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
        res.status(400).json({
          success: false,
          error: { message: 'Title is required and must be a non-empty string', code: 'VALIDATION_ERROR' },
        });
        return;
      }

      const validPriorities: Priority[] = ['low', 'medium', 'high'];
      if (body.priority && !validPriorities.includes(body.priority)) {
        res.status(400).json({
          success: false,
          error: { message: `Invalid priority: ${body.priority}`, code: 'VALIDATION_ERROR' },
        });
        return;
      }

      const validStatuses: Status[] = ['pending', 'in_progress', 'done'];
      if (body.status && !validStatuses.includes(body.status)) {
        res.status(400).json({
          success: false,
          error: { message: `Invalid status: ${body.status}`, code: 'VALIDATION_ERROR' },
        });
        return;
      }

      const task = taskRepository.create({
        title: body.title.trim(),
        description: body.description,
        priority: body.priority,
        status: body.status,
        due_date: body.due_date,
      });

      res.status(201).json({ success: true, data: task });
    } catch (err) {
      next(err);
    }
  },

  update(req: Request, res: Response, next: NextFunction): void {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: { message: 'Invalid task ID', code: 'VALIDATION_ERROR' },
        });
        return;
      }

      const body = req.body as UpdateTaskDto;

      if (body.title !== undefined) {
        if (typeof body.title !== 'string' || body.title.trim() === '') {
          res.status(400).json({
            success: false,
            error: { message: 'Title must be a non-empty string', code: 'VALIDATION_ERROR' },
          });
          return;
        }
        body.title = body.title.trim();
      }

      const validPriorities: Priority[] = ['low', 'medium', 'high'];
      if (body.priority && !validPriorities.includes(body.priority)) {
        res.status(400).json({
          success: false,
          error: { message: `Invalid priority: ${body.priority}`, code: 'VALIDATION_ERROR' },
        });
        return;
      }

      const validStatuses: Status[] = ['pending', 'in_progress', 'done'];
      if (body.status && !validStatuses.includes(body.status)) {
        res.status(400).json({
          success: false,
          error: { message: `Invalid status: ${body.status}`, code: 'VALIDATION_ERROR' },
        });
        return;
      }

      const task = taskRepository.update(id, body);
      if (!task) {
        res.status(404).json({
          success: false,
          error: { message: `Task with id ${id} not found`, code: 'NOT_FOUND' },
        });
        return;
      }

      res.json({ success: true, data: task });
    } catch (err) {
      next(err);
    }
  },

  delete(req: Request, res: Response, next: NextFunction): void {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: { message: 'Invalid task ID', code: 'VALIDATION_ERROR' },
        });
        return;
      }

      const deleted = taskRepository.delete(id);
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: { message: `Task with id ${id} not found`, code: 'NOT_FOUND' },
        });
        return;
      }

      res.json({ success: true, data: { id } });
    } catch (err) {
      next(err);
    }
  },
};
