import { useState, useEffect, useRef, memo } from 'react';
import { TaskFilters, Status, Priority } from '../types/task';

interface FilterBarProps {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
}

function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function getWeekEndISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
}

type DueDatePreset = '' | 'overdue' | 'today' | 'this_week';

const selectClass =
  'label-mono px-3 py-2.5 bg-cream border-2 border-ink focus:outline-none focus:bg-ink focus:text-cream cursor-pointer min-w-[150px] appearance-none';

const FilterBarImpl: React.FC<FilterBarProps> = ({ filters, onFiltersChange }) => {
  const [searchInput, setSearchInput] = useState(filters.search ?? '');
  const [dueDatePreset, setDueDatePreset] = useState<DueDatePreset>('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      onFiltersChange({ ...filters, search: searchInput || undefined });
    }, 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as Status | '';
    onFiltersChange({ ...filters, status: value || undefined });
  };

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as Priority | '';
    onFiltersChange({ ...filters, priority: value || undefined });
  };

  const handleDueDatePreset = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as DueDatePreset;
    setDueDatePreset(value);
    const today = getTodayISO();
    const weekEnd = getWeekEndISO();

    const updated = { ...filters };
    delete updated.due_before;
    delete updated.due_after;

    if (value === 'overdue') {
      updated.due_before = today;
    } else if (value === 'today') {
      updated.due_after = today;
      updated.due_before = today;
    } else if (value === 'this_week') {
      updated.due_after = today;
      updated.due_before = weekEnd;
    }

    onFiltersChange(updated);
  };

  const handleClear = () => {
    setSearchInput('');
    setDueDatePreset('');
    onFiltersChange({});
  };

  const hasFilters =
    searchInput !== '' || filters.status || filters.priority || dueDatePreset !== '';

  return (
    <section className="bg-cream border-2 border-ink shadow-brutal p-5 mb-8">
      <div className="label-mono text-slate mb-3">⌕ Фильтры и поиск</div>
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 label-mono text-slate pointer-events-none">
            ⌕
          </span>
          <input
            type="text"
            placeholder="Поиск по названию или описанию..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-cream border-2 border-ink focus:outline-none focus:bg-cream-dark font-display text-sm placeholder:text-slate"
          />
        </div>

        <select value={filters.status ?? ''} onChange={handleStatusChange} className={selectClass}>
          <option value="">Все статусы</option>
          <option value="pending">Ожидает</option>
          <option value="in_progress">В работе</option>
          <option value="done">Готово</option>
        </select>

        <select
          value={filters.priority ?? ''}
          onChange={handlePriorityChange}
          className={selectClass}
        >
          <option value="">Все приоритеты</option>
          <option value="low">Низкий</option>
          <option value="medium">Средний</option>
          <option value="high">Высокий</option>
        </select>

        <select value={dueDatePreset} onChange={handleDueDatePreset} className={selectClass}>
          <option value="">Любой срок</option>
          <option value="overdue">Просроченные</option>
          <option value="today">Сегодня</option>
          <option value="this_week">На неделе</option>
        </select>

        {hasFilters && (
          <button
            onClick={handleClear}
            className="label-mono px-4 py-2.5 bg-ink text-cream border-2 border-ink hover:bg-coral hover:border-coral transition-colors whitespace-nowrap"
          >
            ✕ Сбросить
          </button>
        )}
      </div>
    </section>
  );
};

export const FilterBar = memo(FilterBarImpl);
