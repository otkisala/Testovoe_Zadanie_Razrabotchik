import { Request, Response, NextFunction } from 'express';
import { taskRepository } from '../repositories/taskRepository';
import {
  LlmError,
  suggestCategorization,
  decomposeTask,
  suggestPriority,
  summarizeWorkload,
  streamCategorization,
  streamDecomposeTask,
  streamPriority,
  streamWorkload,
  streamCategorizationFromText,
} from '../services/llmService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function handleLlmError(err: unknown, res: Response, next: NextFunction): void {
  if (err instanceof LlmError) {
    res.status(503).json({
      success: false,
      error: { message: err.message, code: 'AI_ERROR' },
    });
  } else {
    next(err);
  }
}

function startSse(res: Response): (data: object) => void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // отключить буферизацию nginx
  return (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
}

function validateTaskId(
  req: Request,
  res: Response
): number | null {
  const { taskId } = req.body as { taskId?: unknown };
  if (!taskId || typeof taskId !== 'number') {
    res.status(400).json({
      success: false,
      error: { message: 'taskId is required', code: 'VALIDATION_ERROR' },
    });
    return null;
  }
  return taskId;
}

// ─── Non-streaming (legacy) ───────────────────────────────────────────────────

export const aiController = {
  async categorize(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const taskId = validateTaskId(req, res);
      if (taskId === null) return;
      const task = taskRepository.findById(taskId);
      if (!task) {
        res.status(404).json({ success: false, error: { message: `Task ${taskId} not found`, code: 'NOT_FOUND' } });
        return;
      }
      res.json({ success: true, data: await suggestCategorization(task) });
    } catch (err) { handleLlmError(err, res, next); }
  },

  async decompose(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const taskId = validateTaskId(req, res);
      if (taskId === null) return;
      const task = taskRepository.findById(taskId);
      if (!task) {
        res.status(404).json({ success: false, error: { message: `Task ${taskId} not found`, code: 'NOT_FOUND' } });
        return;
      }
      res.json({ success: true, data: await decomposeTask(task) });
    } catch (err) { handleLlmError(err, res, next); }
  },

  async priority(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const taskId = validateTaskId(req, res);
      if (taskId === null) return;
      const task = taskRepository.findById(taskId);
      if (!task) {
        res.status(404).json({ success: false, error: { message: `Task ${taskId} not found`, code: 'NOT_FOUND' } });
        return;
      }
      res.json({ success: true, data: await suggestPriority(task) });
    } catch (err) { handleLlmError(err, res, next); }
  },

  async workloadSummary(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({ success: true, data: await summarizeWorkload(taskRepository.findAll()) });
    } catch (err) { handleLlmError(err, res, next); }
  },

  // ─── SSE Streaming ──────────────────────────────────────────────────────────

  async streamCategorize(req: Request, res: Response): Promise<void> {
    const taskId = validateTaskId(req, res);
    if (taskId === null) return;
    const task = taskRepository.findById(taskId);
    if (!task) {
      res.status(404).json({ success: false, error: { message: `Task ${taskId} not found`, code: 'NOT_FOUND' } });
      return;
    }
    const send = startSse(res);
    const abort = new AbortController();
    res.on('close', () => abort.abort());
    try {
      let tokenCount = 0;
      const { result, cached } = await streamCategorization(
        task,
        () => { tokenCount++; if (tokenCount % 5 === 0) send({ type: 'progress', tokens: tokenCount }); },
        abort.signal
      );
      send({ type: 'done', result, cached });
    } catch (err) {
      send({ type: 'error', message: err instanceof LlmError ? err.message : 'Внутренняя ошибка' });
    }
    res.end();
  },

  async streamDecompose(req: Request, res: Response): Promise<void> {
    const taskId = validateTaskId(req, res);
    if (taskId === null) return;
    const task = taskRepository.findById(taskId);
    if (!task) {
      res.status(404).json({ success: false, error: { message: `Task ${taskId} not found`, code: 'NOT_FOUND' } });
      return;
    }
    const send = startSse(res);
    const abort = new AbortController();
    res.on('close', () => abort.abort());
    try {
      let tokenCount = 0;
      const { result, cached } = await streamDecomposeTask(
        task,
        () => { tokenCount++; if (tokenCount % 5 === 0) send({ type: 'progress', tokens: tokenCount }); },
        abort.signal
      );
      send({ type: 'done', result, cached });
    } catch (err) {
      send({ type: 'error', message: err instanceof LlmError ? err.message : 'Внутренняя ошибка' });
    }
    res.end();
  },

  async streamPriority(req: Request, res: Response): Promise<void> {
    const taskId = validateTaskId(req, res);
    if (taskId === null) return;
    const task = taskRepository.findById(taskId);
    if (!task) {
      res.status(404).json({ success: false, error: { message: `Task ${taskId} not found`, code: 'NOT_FOUND' } });
      return;
    }
    const send = startSse(res);
    const abort = new AbortController();
    res.on('close', () => abort.abort());
    try {
      let tokenCount = 0;
      const { result, cached } = await streamPriority(
        task,
        () => { tokenCount++; if (tokenCount % 5 === 0) send({ type: 'progress', tokens: tokenCount }); },
        abort.signal
      );
      send({ type: 'done', result, cached });
    } catch (err) {
      send({ type: 'error', message: err instanceof LlmError ? err.message : 'Внутренняя ошибка' });
    }
    res.end();
  },

  // Suggest category by title+description — для формы создания (taskId не нужен)
  async streamSuggestCategory(req: Request, res: Response): Promise<void> {
    const { title, description } = req.body as { title?: string; description?: string };
    if (!title || typeof title !== 'string' || !title.trim()) {
      res.status(400).json({
        success: false,
        error: { message: 'title is required', code: 'VALIDATION_ERROR' },
      });
      return;
    }
    const send = startSse(res);
    const abort = new AbortController();
    res.on('close', () => abort.abort());
    try {
      let tokenCount = 0;
      const { result, cached } = await streamCategorizationFromText(
        title.trim(),
        (description ?? '').trim(),
        () => { tokenCount++; if (tokenCount % 5 === 0) send({ type: 'progress', tokens: tokenCount }); },
        abort.signal
      );
      send({ type: 'done', result, cached });
    } catch (err) {
      send({ type: 'error', message: err instanceof LlmError ? err.message : 'Внутренняя ошибка' });
    }
    res.end();
  },

  async streamWorkload(_req: Request, res: Response): Promise<void> {
    const send = startSse(res);
    const abort = new AbortController();
    res.on('close', () => abort.abort());
    try {
      let tokenCount = 0;
      const { result, cached } = await streamWorkload(
        taskRepository.findAll(),
        () => { tokenCount++; if (tokenCount % 5 === 0) send({ type: 'progress', tokens: tokenCount }); },
        abort.signal
      );
      send({ type: 'done', result, cached });
    } catch (err) {
      send({ type: 'error', message: err instanceof LlmError ? err.message : 'Внутренняя ошибка' });
    }
    res.end();
  },
};
