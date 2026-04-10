import { Task } from '../models/task';
import {
  CategorizationResult,
  DecomposeResult,
  PriorityResult,
  WorkloadResult,
} from '../models/ai';

const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'llama3.2:3b';

// ─── Error ────────────────────────────────────────────────────────────────────

export class LlmError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LlmError';
  }
}

// ─── Cache (5 min TTL) ────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  expires: number;
}

class LlmCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private readonly ttl: number;

  constructor(ttlMs = 5 * 60 * 1000) {
    this.ttl = ttlMs;
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  set<T>(key: string, data: T): void {
    this.store.set(key, { data, expires: Date.now() + this.ttl });
  }

  taskKey(prefix: string, task: Task): string {
    return `${prefix}:${task.id}:${task.title}:${task.description ?? ''}:${task.priority}:${task.due_date ?? ''}`;
  }

  workloadKey(taskIds: number[]): string {
    return `workload:${[...taskIds].sort((a, b) => a - b).join(',')}`;
  }
}

export const llmCache = new LlmCache();

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert task management AI assistant. You analyze tasks and return structured JSON only.
Rules:
- Always respond with valid JSON matching the requested schema exactly.
- Never include explanations, markdown, or any text outside the JSON object.
- All reasoning and text fields must be in Russian.
- Enum fields must use only the exact values listed in the schema.`;

// ─── Prompt builders ──────────────────────────────────────────────────────────

function promptCategorize(task: Task): string {
  return `Analyze the task and return JSON categorization.

Schema: {"category": string, "tags": string[], "reasoning": string}
Where category is exactly one of: work, personal, shopping, health, finance, education, home, other

Example:
Task: title="Купить молоко и хлеб", description="Зайти в магазин после работы"
Response: {"category":"shopping","tags":["продукты","магазин"],"reasoning":"Задача связана с покупкой продуктов питания"}

Now analyze:
Task: title="${task.title}", description="${task.description ?? ''}", priority=${task.priority}`;
}

function promptDecompose(task: Task): string {
  return `Break down the task into 3-5 concrete subtasks and return JSON.

Schema: {"subtasks": [{"title": string, "priority": "low"|"medium"|"high"}]}
Requirements: 3-5 subtasks, titles in Russian, concrete and actionable.

Example:
Task: title="Запустить новый сайт", description="Подготовить и опубликовать"
Response: {"subtasks":[{"title":"Подготовить контент для всех страниц","priority":"high"},{"title":"Настроить хостинг и домен","priority":"high"},{"title":"Протестировать корректность отображения","priority":"medium"},{"title":"Опубликовать сайт и проверить доступность","priority":"medium"}]}

Now decompose:
Task: title="${task.title}", description="${task.description ?? ''}"`;
}

function promptPriority(task: Task): string {
  return `Analyze the task and suggest the optimal priority level. Return JSON.

Schema: {"suggested_priority": "low"|"medium"|"high", "reasoning": string}

Example:
Task: title="Оплатить аренду", description="Ежемесячный платёж", due_date=2024-01-05, current_priority=low
Response: {"suggested_priority":"high","reasoning":"Оплата аренды — срочная задача с чётким дедлайном, просрочка грозит штрафом"}

Now analyze:
Task: title="${task.title}", description="${task.description ?? ''}", due_date=${task.due_date ?? 'not set'}, current_priority=${task.priority}`;
}

function promptWorkload(tasks: Task[]): string {
  const today = new Date().toISOString().split('T')[0];
  const urgentCount = tasks.filter((t) => t.priority === 'high' && t.status !== 'done').length;
  const overdueCount = tasks.filter(
    (t) => t.due_date && t.due_date < today && t.status !== 'done'
  ).length;
  const taskList = tasks
    .map(
      (t) =>
        `- [${t.priority}/${t.status}] ${t.title}${t.due_date ? ` (срок: ${t.due_date})` : ''}`
    )
    .join('\n');

  return `Analyze the workload and return JSON summary.

Schema: {"summary": string, "urgent_count": number, "overdue_count": number, "recommendations": string[]}
Requirements: summary is 2-3 sentences in Russian, recommendations array has 2-4 items in Russian.

Example:
Input: 3 tasks total, 1 urgent, 1 overdue
Response: {"summary":"Нагрузка умеренная: одна срочная задача требует немедленного внимания, одна просрочена.","urgent_count":1,"overdue_count":1,"recommendations":["Закрыть просроченную задачу первой","Запланировать срочную задачу на сегодня"]}

Now analyze:
Current date: ${today}
Total tasks: ${tasks.length}
Urgent (high priority, not done): ${urgentCount}
Overdue (past due date, not done): ${overdueCount}

Task list:
${taskList || 'No tasks'}`;
}

function promptCategorizeFromText(title: string, description: string): string {
  return `Analyze the task and return JSON categorization.

Schema: {"category": string, "tags": string[], "reasoning": string}
Where category is exactly one of: work, personal, shopping, health, finance, education, home, other

Example:
Task: title="Купить молоко и хлеб", description="Зайти в магазин после работы"
Response: {"category":"shopping","tags":["продукты","магазин"],"reasoning":"Задача связана с покупкой продуктов питания"}

Now analyze:
Task: title="${title}", description="${description}"`;
}

// ─── JSON validation / coercion ───────────────────────────────────────────────

const VALID_CATEGORIES = ['work', 'personal', 'shopping', 'health', 'finance', 'education', 'home', 'other'] as const;
const VALID_PRIORITIES = ['low', 'medium', 'high'] as const;

function validateCategorization(data: unknown): CategorizationResult {
  const d = (data ?? {}) as Record<string, unknown>;

  const category = VALID_CATEGORIES.includes(d.category as typeof VALID_CATEGORIES[number])
    ? (d.category as CategorizationResult['category'])
    : 'other';

  const tags = Array.isArray(d.tags)
    ? d.tags.filter((t): t is string => typeof t === 'string').slice(0, 5)
    : [];

  const reasoning = typeof d.reasoning === 'string' ? d.reasoning : '';

  return { category, tags, reasoning };
}

function validateDecompose(data: unknown): DecomposeResult {
  const d = (data ?? {}) as Record<string, unknown>;

  const raw = Array.isArray(d.subtasks) ? d.subtasks : [];
  const subtasks = raw
    .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null)
    .map((s) => ({
      title: typeof s.title === 'string' ? s.title.trim() : 'Подзадача',
      priority: VALID_PRIORITIES.includes(s.priority as typeof VALID_PRIORITIES[number])
        ? (s.priority as DecomposeResult['subtasks'][number]['priority'])
        : 'medium',
    }))
    .filter((s) => s.title.length > 0)
    .slice(0, 5);

  // Ensure at least one subtask
  if (subtasks.length === 0) {
    throw new LlmError('Модель не смогла разбить задачу. Попробуйте снова.');
  }

  return { subtasks };
}

function validatePriority(data: unknown): PriorityResult {
  const d = (data ?? {}) as Record<string, unknown>;

  const suggested_priority = VALID_PRIORITIES.includes(
    d.suggested_priority as typeof VALID_PRIORITIES[number]
  )
    ? (d.suggested_priority as PriorityResult['suggested_priority'])
    : 'medium';

  const reasoning = typeof d.reasoning === 'string' ? d.reasoning : '';

  return { suggested_priority, reasoning };
}

function validateWorkload(data: unknown, urgentCount: number, overdueCount: number): WorkloadResult {
  const d = (data ?? {}) as Record<string, unknown>;

  const summary = typeof d.summary === 'string' ? d.summary : 'Нет данных';

  const recommendations = Array.isArray(d.recommendations)
    ? d.recommendations.filter((r): r is string => typeof r === 'string').slice(0, 5)
    : [];

  return {
    summary,
    urgent_count: urgentCount,
    overdue_count: overdueCount,
    recommendations,
  };
}

// ─── JSON parsing ─────────────────────────────────────────────────────────────

function parseJson<T>(raw: string): T {
  const attempt = (str: string): T => {
    return JSON.parse(str) as T;
  };

  // Direct parse
  try {
    return attempt(raw.trim());
  } catch {
    // Try extracting outermost {...}
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return attempt(match[0]);
      } catch {
        // fall through
      }
    }
    throw new LlmError('Модель вернула некорректный JSON. Попробуйте снова.');
  }
}

// ─── Ollama: non-streaming ────────────────────────────────────────────────────

async function callOllama(userPrompt: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        stream: false,
        format: 'json',
        options: { temperature: 0.3 },
      }),
    });
  } catch {
    throw new LlmError('Ollama не запущен. Выполните: ollama serve');
  }
  if (!response.ok) throw new LlmError(`Ollama вернул ошибку ${response.status}`);
  const json = (await response.json()) as { message?: { content?: string } };
  return json.message?.content ?? '';
}

// ─── Ollama: streaming ────────────────────────────────────────────────────────

export async function callOllamaStream(
  userPrompt: string,
  onToken: (token: string) => void,
  signal?: AbortSignal
): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        stream: true,
        format: 'json',
        options: { temperature: 0.3 },
      }),
      signal,
    });
  } catch (err) {
    if (signal?.aborted) throw new LlmError('Запрос отменён');
    throw new LlmError('Ollama не запущен. Выполните: ollama serve');
  }
  if (!response.ok) throw new LlmError(`Ollama вернул ошибку ${response.status}`);

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed) as { message?: { content?: string } };
        const token = parsed.message?.content ?? '';
        if (token) {
          fullText += token;
          onToken(token);
        }
      } catch {
        // skip malformed lines
      }
    }
  }

  return fullText;
}

// ─── Streaming exports (с кешем) ─────────────────────────────────────────────

export type StreamResult<T> = { result: T; cached: boolean };

export async function streamCategorization(
  task: Task,
  onToken: (token: string) => void,
  signal?: AbortSignal
): Promise<StreamResult<CategorizationResult>> {
  const key = llmCache.taskKey('cat', task);
  const cached = llmCache.get<CategorizationResult>(key);
  if (cached) return { result: cached, cached: true };
  const raw = await callOllamaStream(promptCategorize(task), onToken, signal);
  const result = validateCategorization(parseJson(raw));
  llmCache.set(key, result);
  return { result, cached: false };
}

export async function streamDecomposeTask(
  task: Task,
  onToken: (token: string) => void,
  signal?: AbortSignal
): Promise<StreamResult<DecomposeResult>> {
  const key = llmCache.taskKey('dec', task);
  const cached = llmCache.get<DecomposeResult>(key);
  if (cached) return { result: cached, cached: true };
  const raw = await callOllamaStream(promptDecompose(task), onToken, signal);
  const result = validateDecompose(parseJson(raw));
  llmCache.set(key, result);
  return { result, cached: false };
}

export async function streamPriority(
  task: Task,
  onToken: (token: string) => void,
  signal?: AbortSignal
): Promise<StreamResult<PriorityResult>> {
  const key = llmCache.taskKey('pri', task);
  const cached = llmCache.get<PriorityResult>(key);
  if (cached) return { result: cached, cached: true };
  const raw = await callOllamaStream(promptPriority(task), onToken, signal);
  const result = validatePriority(parseJson(raw));
  llmCache.set(key, result);
  return { result, cached: false };
}

export async function streamWorkload(
  tasks: Task[],
  onToken: (token: string) => void,
  signal?: AbortSignal
): Promise<StreamResult<WorkloadResult>> {
  const today = new Date().toISOString().split('T')[0];
  const urgentCount = tasks.filter((t) => t.priority === 'high' && t.status !== 'done').length;
  const overdueCount = tasks.filter(
    (t) => t.due_date && t.due_date < today && t.status !== 'done'
  ).length;
  const key = llmCache.workloadKey(tasks.map((t) => t.id));
  const cached = llmCache.get<WorkloadResult>(key);
  if (cached) return { result: cached, cached: true };
  const raw = await callOllamaStream(promptWorkload(tasks), onToken, signal);
  const result = validateWorkload(parseJson(raw), urgentCount, overdueCount);
  llmCache.set(key, result);
  return { result, cached: false };
}

export async function streamCategorizationFromText(
  title: string,
  description: string,
  onToken: (token: string) => void,
  signal?: AbortSignal
): Promise<StreamResult<CategorizationResult>> {
  const cacheKey = `cat-text:${title}:${description}`;
  const cached = llmCache.get<CategorizationResult>(cacheKey);
  if (cached) return { result: cached, cached: true };
  const raw = await callOllamaStream(promptCategorizeFromText(title, description), onToken, signal);
  const result = validateCategorization(parseJson(raw));
  llmCache.set(cacheKey, result);
  return { result, cached: false };
}

// ─── Non-streaming exports (обратная совместимость) ───────────────────────────

export async function suggestCategorization(task: Task): Promise<CategorizationResult> {
  const key = llmCache.taskKey('cat', task);
  const cached = llmCache.get<CategorizationResult>(key);
  if (cached) return cached;
  const result = validateCategorization(parseJson(await callOllama(promptCategorize(task))));
  llmCache.set(key, result);
  return result;
}

export async function decomposeTask(task: Task): Promise<DecomposeResult> {
  const key = llmCache.taskKey('dec', task);
  const cached = llmCache.get<DecomposeResult>(key);
  if (cached) return cached;
  const result = validateDecompose(parseJson(await callOllama(promptDecompose(task))));
  llmCache.set(key, result);
  return result;
}

export async function suggestPriority(task: Task): Promise<PriorityResult> {
  const key = llmCache.taskKey('pri', task);
  const cached = llmCache.get<PriorityResult>(key);
  if (cached) return cached;
  const result = validatePriority(parseJson(await callOllama(promptPriority(task))));
  llmCache.set(key, result);
  return result;
}

export async function summarizeWorkload(tasks: Task[]): Promise<WorkloadResult> {
  const today = new Date().toISOString().split('T')[0];
  const urgentCount = tasks.filter((t) => t.priority === 'high' && t.status !== 'done').length;
  const overdueCount = tasks.filter(
    (t) => t.due_date && t.due_date < today && t.status !== 'done'
  ).length;
  const key = llmCache.workloadKey(tasks.map((t) => t.id));
  const cached = llmCache.get<WorkloadResult>(key);
  if (cached) return cached;
  const result = validateWorkload(
    parseJson(await callOllama(promptWorkload(tasks))),
    urgentCount,
    overdueCount
  );
  llmCache.set(key, result);
  return result;
}
