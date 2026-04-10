import { memo } from 'react';
import { Task, UpdateTaskDto, CreateTaskDto } from '../types/task';
import { TaskCard } from './TaskCard';

interface TaskListProps {
  tasks: Task[];
  loading: boolean;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onUpdate: (id: number, data: UpdateTaskDto) => Promise<Task>;
  onCreateTask: (data: CreateTaskDto) => Promise<Task>;
}

const TaskListImpl: React.FC<TaskListProps> = ({
  tasks,
  loading,
  onEdit,
  onDelete,
  onUpdate,
  onCreateTask,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-white border-2 border-ink shadow-brutal p-5 animate-pulse"
          >
            <div className="h-3 bg-cream-dark w-16 mb-4" />
            <div className="h-6 bg-cream-dark w-3/4 mb-3" />
            <div className="h-4 bg-cream-dark w-full mb-2" />
            <div className="h-4 bg-cream-dark w-2/3 mb-4" />
            <div className="flex gap-2">
              <div className="h-8 bg-cream-dark flex-1" />
              <div className="h-8 bg-cream-dark flex-1" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="border-2 border-dashed border-ink/30 py-24 px-6 text-center">
        <div className="font-mono text-6xl mb-6 text-ink/20">∅</div>
        <h3 className="font-display font-bold text-2xl text-ink mb-2">Пусто</h3>
        <p className="label-mono text-slate">
          Измените фильтры или создайте новую задачу
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {tasks.map((task, i) => (
        <TaskCard
          key={task.id}
          task={task}
          index={i}
          onEdit={onEdit}
          onDelete={onDelete}
          onUpdate={onUpdate}
          onCreateTask={onCreateTask}
        />
      ))}
    </div>
  );
};

export const TaskList = memo(TaskListImpl);
