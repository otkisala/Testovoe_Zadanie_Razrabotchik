import { useState } from 'react';
import { Task } from '../types/task';

interface DeleteConfirmDialogProps {
  task: Task;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  task,
  onConfirm,
  onCancel,
}) => {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setDeleting(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Не удалось удалить задачу';
      setError(msg);
      setDeleting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !deleting) {
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-slide-in"
      onClick={handleBackdropClick}
    >
      <div className="bg-white border-2 border-ink shadow-brutal-lg w-full max-w-md">
        {/* Header */}
        <div className="px-6 py-4 border-b-2 border-ink bg-coral text-white">
          <div className="label-mono text-white/70 mb-0.5">Опасное действие</div>
          <h3 className="font-display font-bold text-xl">Удалить задачу?</h3>
        </div>

        <div className="px-6 py-5 bg-white">
          {/* Task preview */}
          <div className="border-2 border-ink p-3 mb-4 bg-gray-50">
            <div className="label-mono text-slate mb-1">
              №{task.id.toString().padStart(3, '0')}
            </div>
            <div className="font-display font-bold text-ink line-clamp-2">{task.title}</div>
          </div>

          <p className="label-mono text-slate mb-5">
            Это действие нельзя отменить. Задача будет удалена навсегда.
          </p>

          {error && (
            <div className="bg-coral text-white label-mono px-4 py-3 border-2 border-ink mb-4">
              ⚠ {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={deleting}
              className="flex-1 label-mono py-3 bg-white border-2 border-ink hover:bg-ink hover:text-white transition-colors text-ink disabled:opacity-60"
            >
              Отмена
            </button>
            <button
              onClick={handleConfirm}
              disabled={deleting}
              className="flex-1 label-mono py-3 bg-coral text-white border-2 border-ink shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal transition-all disabled:opacity-60"
            >
              {deleting ? 'Удаление...' : '✕ Удалить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmDialog;
