import { useState, useEffect, useRef, useCallback } from 'react';
import { Task, CreateTaskDto, UpdateTaskDto, Priority, Status } from '../types/task';
import { CategorizationResult } from '../types/ai';
import { useAiStream } from '../hooks/useAiStream';

interface TaskFormProps {
  task?: Task | null;
  onSubmit: (data: CreateTaskDto | UpdateTaskDto) => Promise<void>;
  onClose: () => void;
}

const defaultFormData: CreateTaskDto = {
  title: '',
  description: '',
  priority: 'medium',
  status: 'pending',
  due_date: '',
  category: '',
};

const categoryLabels: Record<string, string> = {
  work: 'Работа',
  personal: 'Личное',
  shopping: 'Покупки',
  health: 'Здоровье',
  finance: 'Финансы',
  education: 'Учёба',
  home: 'Дом',
  other: 'Другое',
};

const inputClass =
  'w-full px-3 py-2.5 bg-white border-2 border-ink focus:outline-none focus:bg-gray-50 font-display text-sm placeholder:text-slate text-ink';

function Spinner() {
  return (
    <span className="inline-block w-3 h-3 border-2 border-slate border-t-transparent rounded-full animate-spin" />
  );
}

export const TaskForm: React.FC<TaskFormProps> = ({ task, onSubmit, onClose }) => {
  const [formData, setFormData] = useState<CreateTaskDto>(defaultFormData);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isEdit = !!task;

  const suggest = useAiStream<CategorizationResult>(
    '/suggest-category',
    useCallback(
      () => ({ title: formData.title, description: formData.description ?? '' }),
      [formData.title, formData.description]
    )
  );

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description ?? '',
        priority: task.priority,
        status: task.status,
        due_date: task.due_date ?? '',
        category: task.category ?? '',
      });
    } else {
      setFormData(defaultFormData);
    }
    setTitleError('');
    setError(null);
    suggest.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'title' && value.trim()) setTitleError('');

    // Auto-suggest only when creating (not editing) and title has enough text
    if (!isEdit && (name === 'title' || name === 'description')) {
      const newTitle = name === 'title' ? value : formData.title;
      if (newTitle.trim().length >= 3) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          suggest.run();
        }, 900);
      }
    }
  };

  const handleAcceptSuggestion = () => {
    if (!suggest.data) return;
    setFormData((prev) => ({ ...prev, category: suggest.data!.category }));
    suggest.reset();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setTitleError('Название обязательно для заполнения');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        title: formData.title.trim(),
        description: formData.description?.trim() || undefined,
        priority: formData.priority as Priority,
        status: formData.status as Status,
        due_date: formData.due_date || undefined,
        category: formData.category?.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Что-то пошло не так');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const currentCategory = formData.category?.trim();

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-slide-in"
      onClick={handleBackdropClick}
    >
      <div className="bg-white border-2 border-ink shadow-brutal-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-ink bg-ink text-white">
          <div>
            <div className="label-mono text-gray-400 mb-0.5">
              {isEdit ? `№${task?.id.toString().padStart(3, '0')}` : 'Новая запись'}
            </div>
            <h2 className="font-display font-bold text-xl">
              {isEdit ? 'Изменить задачу' : 'Создать задачу'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="label-mono w-9 h-9 flex items-center justify-center border-2 border-white hover:bg-coral hover:border-coral transition-colors text-white"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-5 bg-white">
          {error && (
            <div className="bg-coral text-white label-mono px-4 py-3 border-2 border-ink">
              ⚠ {error}
            </div>
          )}

          {/* Title */}
          <div className="flex flex-col gap-2">
            <label className="label-mono text-slate">
              Название <span className="text-coral">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Что нужно сделать?"
              className={`${inputClass} ${titleError ? 'border-coral bg-red-50' : ''}`}
              autoFocus
            />
            {titleError && <p className="label-mono text-coral">{titleError}</p>}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <label className="label-mono text-slate">Описание</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Детали (необязательно)"
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* AI suggest panel — только при создании */}
          {!isEdit && (
            <div className="flex flex-col gap-2">
              {suggest.status === 'streaming' && (
                <div className="flex items-center gap-2 label-mono text-slate border-2 border-dashed border-ink/30 px-3 py-2" style={{ fontSize: '11px' }}>
                  <Spinner />
                  ◈ AI подбирает категорию
                  {suggest.tokenCount > 0 && <span className="text-ink">≈{suggest.tokenCount} токенов</span>}
                </div>
              )}

              {suggest.status === 'done' && suggest.data && !currentCategory && (
                <div className="flex items-center gap-2 border-2 border-ink/40 px-3 py-2 bg-cream animate-fade-up">
                  <span className="label-mono text-slate" style={{ fontSize: '10px' }}>◈ AI:</span>
                  <span className="label-mono font-bold text-ink capitalize" style={{ fontSize: '11px' }}>
                    {categoryLabels[suggest.data.category] ?? suggest.data.category}
                  </span>
                  {suggest.data.tags.map((t) => (
                    <span key={t} className="label-mono text-slate" style={{ fontSize: '10px' }}>#{t}</span>
                  ))}
                  <div className="ml-auto flex gap-1.5">
                    <button
                      type="button"
                      onClick={handleAcceptSuggestion}
                      className="label-mono px-2 py-1 bg-ink text-cream hover:bg-sage transition-colors"
                      style={{ fontSize: '10px' }}
                    >
                      ✓ Принять
                    </button>
                    <button
                      type="button"
                      onClick={suggest.reset}
                      className="label-mono px-2 py-1 border border-ink hover:bg-cream-dark transition-colors"
                      style={{ fontSize: '10px' }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {suggest.error && (
                <div className="label-mono text-slate border-2 border-dashed border-ink/20 px-3 py-1.5" style={{ fontSize: '10px' }}>
                  ◈ AI недоступен — категорию можно выбрать вручную
                </div>
              )}
            </div>
          )}

          {/* Category */}
          <div className="flex flex-col gap-2">
            <label className="label-mono text-slate">Категория</label>
            <div className="flex gap-2 items-center">
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className={`${inputClass} flex-1`}
              >
                <option value="">— без категории —</option>
                {Object.entries(categoryLabels).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              {currentCategory && (
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, category: '' }))}
                  className="label-mono px-2 py-2.5 border-2 border-ink hover:bg-cream transition-colors text-slate"
                  style={{ fontSize: '10px' }}
                  title="Убрать категорию"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Priority + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="label-mono text-slate">Приоритет</label>
              <select name="priority" value={formData.priority} onChange={handleChange} className={inputClass}>
                <option value="low">Низкий</option>
                <option value="medium">Средний</option>
                <option value="high">Высокий</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="label-mono text-slate">Статус</label>
              <select name="status" value={formData.status} onChange={handleChange} className={inputClass}>
                <option value="pending">Ожидает</option>
                <option value="in_progress">В работе</option>
                <option value="done">Готово</option>
              </select>
            </div>
          </div>

          {/* Due date */}
          <div className="flex flex-col gap-2">
            <label className="label-mono text-slate">Срок выполнения</label>
            <input type="date" name="due_date" value={formData.due_date} onChange={handleChange} className={inputClass} />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 label-mono py-3 bg-white border-2 border-ink hover:bg-ink hover:text-white transition-colors text-ink"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 label-mono py-3 bg-coral text-white border-2 border-ink shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal transition-all disabled:opacity-60"
            >
              {submitting ? 'Сохранение...' : isEdit ? '✓ Сохранить' : '+ Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskForm;
