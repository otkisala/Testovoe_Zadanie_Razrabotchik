import { useState } from 'react';
import { createPortal } from 'react-dom';
import { DecomposeResult } from '../types/ai';
import { Priority, CreateTaskDto } from '../types/task';

interface DecomposeModalProps {
  parentTask: { id: number; title: string };
  result: DecomposeResult;
  onCreateTasks: (tasks: CreateTaskDto[]) => Promise<void>;
  onClose: () => void;
}

const priorityLabel: Record<Priority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
};

const DecomposeModal: React.FC<DecomposeModalProps> = ({
  parentTask,
  result,
  onCreateTasks,
  onClose,
}) => {
  const [selected, setSelected] = useState<boolean[]>(result.subtasks.map(() => true));
  const [creating, setCreating] = useState(false);

  const toggle = (i: number) =>
    setSelected((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  const toggleAll = (val: boolean) => setSelected(result.subtasks.map(() => val));
  const selectedCount = selected.filter(Boolean).length;

  const handleCreate = async () => {
    const tasks: CreateTaskDto[] = result.subtasks
      .filter((_, i) => selected[i])
      .map((sub) => ({
        title: sub.title,
        priority: sub.priority,
        status: 'pending' as const,
      }));

    setCreating(true);
    try {
      await onCreateTasks(tasks);
      onClose();
    } finally {
      setCreating(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const modal = (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white border-2 border-ink shadow-brutal-lg w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-ink bg-ink text-white">
          <div>
            <div className="label-mono text-gray-400 mb-0.5" style={{ fontSize: '10px' }}>
              ⊞ ДЕКОМПОЗИЦИЯ
            </div>
            <h2 className="font-display font-bold text-xl">Подзадачи</h2>
          </div>
          <button
            onClick={onClose}
            className="label-mono w-9 h-9 flex items-center justify-center border-2 border-white hover:bg-coral hover:border-coral transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          <p className="label-mono text-slate" style={{ fontSize: '11px' }}>
            Из: {parentTask.title}
          </p>

          <div className="flex gap-4">
            <button
              onClick={() => toggleAll(true)}
              className="label-mono text-slate hover:text-ink transition-colors"
              style={{ fontSize: '11px' }}
            >
              Выбрать все
            </button>
            <button
              onClick={() => toggleAll(false)}
              className="label-mono text-slate hover:text-ink transition-colors"
              style={{ fontSize: '11px' }}
            >
              Снять все
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {result.subtasks.map((sub, i) => (
              <label
                key={i}
                className={`flex items-start gap-3 p-3 border-2 cursor-pointer transition-colors ${
                  selected[i] ? 'border-ink bg-cream' : 'border-ink/30 bg-white'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected[i]}
                  onChange={() => toggle(i)}
                  className="mt-0.5 accent-coral"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-display text-sm font-medium text-ink">{sub.title}</div>
                  <div className="label-mono text-slate mt-1" style={{ fontSize: '10px' }}>
                    ◆ {priorityLabel[sub.priority]}
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 label-mono py-3 bg-white border-2 border-ink hover:bg-ink hover:text-white transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || selectedCount === 0}
              className="flex-1 label-mono py-3 bg-coral text-white border-2 border-ink shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal transition-all disabled:opacity-60"
            >
              {creating ? 'Создание...' : `+ Создать ${selectedCount}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default DecomposeModal;
