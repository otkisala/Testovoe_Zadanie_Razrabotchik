import { memo, lazy, Suspense, useCallback } from 'react';
import { Task, Priority, Status, UpdateTaskDto, CreateTaskDto } from '../types/task';
import { useAiStream } from '../hooks/useAiStream';
import { CategorizationResult, DecomposeResult, PriorityResult } from '../types/ai';
import { AiResultPanel } from './AiResultPanel';

const DecomposeModal = lazy(() => import('./DecomposeModal'));

interface TaskCardProps {
  task: Task;
  index?: number;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onUpdate: (id: number, data: UpdateTaskDto) => Promise<Task>;
  onCreateTask: (data: CreateTaskDto) => Promise<Task>;
}

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  low: { label: 'Низкий', className: 'bg-sage text-cream' },
  medium: { label: 'Средний', className: 'bg-amber text-ink' },
  high: { label: 'Высокий', className: 'bg-coral text-cream' },
};

const statusConfig: Record<Status, { label: string; className: string }> = {
  pending: { label: 'Ожидает', className: 'bg-cream-dark text-ink' },
  in_progress: { label: 'В работе', className: 'bg-ink text-cream' },
  done: { label: 'Готово', className: 'bg-sage text-cream' },
};

const categoryLabels: Record<string, string> = {
  work: 'Работа', personal: 'Личное', shopping: 'Покупки',
  health: 'Здоровье', finance: 'Финансы', education: 'Учёба',
  home: 'Дом', other: 'Другое',
};

function isOverdue(dueDate: string): boolean {
  return dueDate < new Date().toISOString().split('T')[0];
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  const months = ['ЯНВ', 'ФЕВ', 'МАР', 'АПР', 'МАЙ', 'ИЮН', 'ИЮЛ', 'АВГ', 'СЕН', 'ОКТ', 'НОЯ', 'ДЕК'];
  return `${parseInt(day).toString().padStart(2, '0')} ${months[parseInt(month) - 1]} ${year}`;
}

function Spinner() {
  return (
    <span
      className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"
      style={{ verticalAlign: 'middle' }}
    />
  );
}

const TaskCardImpl: React.FC<TaskCardProps> = ({
  task,
  index = 0,
  onEdit,
  onDelete,
  onUpdate,
  onCreateTask,
}) => {
  const priority = priorityConfig[task.priority];
  const status = statusConfig[task.status];
  const overdue = task.due_date && task.status !== 'done' && isOverdue(task.due_date);

  const categorize = useAiStream<CategorizationResult>(
    '/categorize',
    useCallback(() => ({ taskId: task.id }), [task.id])
  );
  const priorityAi = useAiStream<PriorityResult>(
    '/priority',
    useCallback(() => ({ taskId: task.id }), [task.id])
  );
  const decompose = useAiStream<DecomposeResult>(
    '/decompose',
    useCallback(() => ({ taskId: task.id }), [task.id])
  );

  const handleCategorizeAccept = useCallback(() => {
    if (!categorize.data) return;
    onUpdate(task.id, { category: categorize.data.category });
    categorize.reset();
  }, [categorize.data, categorize.reset, task.id, onUpdate]);

  const handlePriorityAccept = useCallback(() => {
    if (!priorityAi.data) return;
    onUpdate(task.id, { priority: priorityAi.data.suggested_priority });
    priorityAi.reset();
  }, [priorityAi.data, priorityAi.reset, task.id, onUpdate]);

  const handleCreateTasks = useCallback(
    async (tasks: CreateTaskDto[]) => {
      for (const t of tasks) await onCreateTask(t);
    },
    [onCreateTask]
  );

  const anyStreaming =
    categorize.status === 'streaming' ||
    priorityAi.status === 'streaming' ||
    decompose.status === 'streaming';

  const streamingTokens =
    categorize.tokenCount || priorityAi.tokenCount || decompose.tokenCount;

  const aiError = categorize.error ?? priorityAi.error ?? decompose.error;

  return (
    <article
      className="bg-white border-2 border-ink shadow-brutal p-5 flex flex-col gap-4 transition-all duration-150 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-lg animate-fade-up"
      style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
    >
      {/* Top row */}
      <div className="flex items-center justify-between">
        <span className="label-mono text-slate">№{task.id.toString().padStart(3, '0')}</span>
        <span className={`label-mono px-2 py-1 border-2 border-ink ${status.className}`}>
          {status.label}
        </span>
      </div>

      {/* Category badge */}
      {task.category && (
        <div className="flex">
          <span className="label-mono px-2 py-0.5 border border-ink/30 text-slate bg-cream-dark" style={{ fontSize: '10px' }}>
            ◈ {categoryLabels[task.category] ?? task.category}
          </span>
        </div>
      )}

      {/* Title */}
      <h3
        className={`font-display font-bold text-xl leading-tight line-clamp-2 ${
          task.status === 'done' ? 'line-through text-slate' : 'text-ink'
        }`}
      >
        {task.title}
      </h3>

      {/* Description */}
      {task.description && (
        <p className="text-sm text-ink-soft line-clamp-2 leading-relaxed">{task.description}</p>
      )}

      {/* Meta row */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
        <span className={`label-mono px-2 py-1 border-2 border-ink ${priority.className}`}>
          ◆ {priority.label}
        </span>
        {task.due_date && (
          <span className={`label-mono ${overdue ? 'text-coral font-bold' : 'text-slate'}`}>
            {overdue ? '⚠ ПРОСРОЧЕНО · ' : '→ '}
            {formatDate(task.due_date)}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 pt-3 border-t-2 border-ink/10">
        <button
          onClick={() => onEdit(task)}
          className="flex-1 label-mono py-2 border-2 border-ink bg-cream hover:bg-ink hover:text-cream transition-colors duration-150"
        >
          Изменить
        </button>
        <button
          onClick={() => onDelete(task)}
          className="flex-1 label-mono py-2 border-2 border-ink bg-cream hover:bg-coral hover:text-cream transition-colors duration-150"
        >
          Удалить
        </button>
      </div>

      {/* AI buttons */}
      <div className="flex gap-1.5">
        {(
          [
            { stream: categorize, label: '◈ Категория' },
            { stream: priorityAi, label: '⚡ Приоритет' },
            { stream: decompose, label: '⊞ Разбить' },
          ] as const
        ).map(({ stream, label }) => (
          <button
            key={label}
            onClick={stream.run}
            disabled={anyStreaming}
            className="flex-1 label-mono py-1.5 border-2 border-ink/40 bg-white hover:border-ink hover:bg-cream transition-colors disabled:opacity-40 flex items-center justify-center gap-1"
            style={{ fontSize: '10px' }}
          >
            {stream.status === 'streaming' ? (
              <>
                <Spinner /> генерирует
              </>
            ) : (
              label
            )}
          </button>
        ))}
      </div>

      {/* Streaming progress */}
      {anyStreaming && streamingTokens > 0 && (
        <div className="label-mono text-slate flex items-center gap-1.5" style={{ fontSize: '10px' }}>
          <span
            className="inline-block w-2 h-2 border border-slate border-t-transparent rounded-full animate-spin"
          />
          ≈{streamingTokens} токенов
        </div>
      )}

      {/* AI error */}
      {aiError && (
        <div className="label-mono text-coral" style={{ fontSize: '11px' }}>
          ⚠ {aiError}
        </div>
      )}

      {/* Categorize result */}
      {categorize.status === 'done' && categorize.data && (
        <AiResultPanel
          label="◈ КАТЕГОРИЗАЦИЯ"
          cached={categorize.cached}
          content={
            <div className="flex flex-col gap-1">
              <span className="font-bold capitalize">{categorize.data.category}</span>
              <span className="text-slate" style={{ fontSize: '11px' }}>
                {categorize.data.tags.map((t) => `#${t}`).join(' ')}
              </span>
              <span className="text-ink-soft italic" style={{ fontSize: '11px' }}>
                {categorize.data.reasoning}
              </span>
            </div>
          }
          onAccept={handleCategorizeAccept}
          onReject={categorize.reset}
        />
      )}

      {/* Priority result */}
      {priorityAi.status === 'done' && priorityAi.data && (
        <AiResultPanel
          label="⚡ РЕКОМЕНДАЦИЯ ПРИОРИТЕТА"
          cached={priorityAi.cached}
          content={
            <div className="flex flex-col gap-1">
              <span className="font-bold">
                {priorityConfig[priorityAi.data.suggested_priority].label}
              </span>
              <span className="text-ink-soft italic" style={{ fontSize: '11px' }}>
                {priorityAi.data.reasoning}
              </span>
            </div>
          }
          onAccept={handlePriorityAccept}
          onReject={priorityAi.reset}
        />
      )}

      {/* Decompose modal */}
      <Suspense fallback={null}>
        {decompose.status === 'done' && decompose.data && (
          <DecomposeModal
            parentTask={{ id: task.id, title: task.title }}
            result={decompose.data}
            onCreateTasks={handleCreateTasks}
            onClose={decompose.reset}
          />
        )}
      </Suspense>
    </article>
  );
};

export const TaskCard = memo(TaskCardImpl);
