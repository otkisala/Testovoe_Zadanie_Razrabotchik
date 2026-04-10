import { useState, useCallback, useTransition, lazy, Suspense } from 'react';
import { Task, CreateTaskDto, UpdateTaskDto, TaskFilters } from './types/task';
import { useTasks } from './hooks/useTasks';
import { FilterBar } from './components/FilterBar';
import { TaskList } from './components/TaskList';

// Lazy-load modals — not needed on initial render
const TaskForm = lazy(() => import('./components/TaskForm'));
const DeleteConfirmDialog = lazy(() => import('./components/DeleteConfirmDialog'));
const WorkloadSummaryModal = lazy(() => import('./components/WorkloadSummaryModal'));

function pluralizeTasks(n: number): string {
  if (n === 0) return 'нет задач';
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} задача`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} задачи`;
  return `${n} задач`;
}

export default function App() {
  const {
    tasks,
    loading,
    error,
    filters,
    createTask,
    updateTask,
    deleteTask,
    setFilters,
    clearError,
  } = useTasks();

  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [showWorkload, setShowWorkload] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleNewTask = useCallback(() => {
    setEditingTask(null);
    setShowForm(true);
  }, []);

  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    setShowForm(true);
  }, []);

  const handleDeleteTask = useCallback((task: Task) => {
    setDeletingTask(task);
  }, []);

  const handleFormSubmit = useCallback(
    async (data: CreateTaskDto | UpdateTaskDto) => {
      if (editingTask) {
        await updateTask(editingTask.id, data as UpdateTaskDto);
      } else {
        await createTask(data as CreateTaskDto);
      }
    },
    [editingTask, updateTask, createTask]
  );

  const handleFormClose = useCallback(() => {
    setShowForm(false);
    setEditingTask(null);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (deletingTask) {
      await deleteTask(deletingTask.id);
      setDeletingTask(null);
    }
  }, [deletingTask, deleteTask]);

  const handleDeleteCancel = useCallback(() => {
    setDeletingTask(null);
  }, []);

  const handleFiltersChange = useCallback(
    (next: TaskFilters) => {
      startTransition(() => setFilters(next));
    },
    [setFilters]
  );

  return (
    <div className="min-h-screen text-ink">
      {/* Header */}
      <header className="px-4 sm:px-6 lg:px-12 pt-10 pb-6 border-b-2 border-ink">
        <div className="max-w-7xl mx-auto grid grid-cols-12 gap-4 items-end">
          <div className="col-span-12 lg:col-span-8">
            <h1 className="font-display font-bold text-6xl sm:text-7xl lg:text-8xl leading-[0.85] tracking-tight">
              Зада<span className="text-coral">чи.</span>
            </h1>
          </div>
          <div className="col-span-12 lg:col-span-4 flex lg:justify-end items-end pb-2 gap-3">
            <button
              onClick={() => setShowWorkload(true)}
              className="label-mono flex items-center gap-2 px-4 py-3 border-2 border-ink bg-white hover:bg-cream shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal transition-all"
              style={{ fontSize: '11px' }}
            >
              ◈ AI Сводка
            </button>
            <button
              onClick={handleNewTask}
              className="group flex items-center gap-4 bg-coral text-cream font-display font-bold text-xl px-8 py-5 border-2 border-ink shadow-brutal hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-lg active:translate-x-0 active:translate-y-0 active:shadow-brutal-sm transition-all"
            >
              <span className="text-3xl leading-none group-hover:rotate-90 transition-transform duration-200 font-bold">
                +
              </span>
              Новая задача
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 sm:px-6 lg:px-12 py-10">
        <div className="max-w-7xl mx-auto">
          {/* Error banner */}
          {error && (
            <div className="bg-coral text-cream border-2 border-ink shadow-brutal px-5 py-4 mb-6 flex items-center justify-between label-mono">
              <span>⚠ {error}</span>
              <button
                onClick={clearError}
                className="w-7 h-7 flex items-center justify-center border-2 border-cream hover:bg-cream hover:text-coral transition-colors"
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>
          )}

          <FilterBar filters={filters} onFiltersChange={handleFiltersChange} />

          {/* Section header */}
          <div className="flex items-end justify-between mb-5 border-b-2 border-ink pb-2">
            <h2 className="font-display font-bold text-2xl">
              Список задач
              {isPending && <span className="ml-3 label-mono text-slate">обновление...</span>}
            </h2>
            <span className="label-mono text-slate">
              {pluralizeTasks(tasks.length).toUpperCase()}
            </span>
          </div>

          <TaskList
            tasks={tasks}
            loading={loading}
            onEdit={handleEditTask}
            onDelete={handleDeleteTask}
            onUpdate={updateTask}
            onCreateTask={createTask}
          />
        </div>
      </main>

      {/* Lazy-loaded modals */}
      <Suspense fallback={null}>
        {showForm && (
          <TaskForm task={editingTask} onSubmit={handleFormSubmit} onClose={handleFormClose} />
        )}
        {deletingTask && (
          <DeleteConfirmDialog
            task={deletingTask}
            onConfirm={handleDeleteConfirm}
            onCancel={handleDeleteCancel}
          />
        )}
        {showWorkload && <WorkloadSummaryModal onClose={() => setShowWorkload(false)} />}
      </Suspense>
    </div>
  );
}
