import { useEffect, useCallback } from 'react';
import { useAiStream } from '../hooks/useAiStream';
import { WorkloadResult } from '../types/ai';

interface WorkloadSummaryModalProps {
  onClose: () => void;
}

function Spinner({ size = 4 }: { size?: number }) {
  return (
    <span
      className={`inline-block w-${size} h-${size} border-2 border-current border-t-transparent rounded-full animate-spin`}
    />
  );
}

const WorkloadSummaryModal: React.FC<WorkloadSummaryModalProps> = ({ onClose }) => {
  const { status, tokenCount, data, error, cached, run } = useAiStream<WorkloadResult>(
    '/workload-summary',
    useCallback(() => ({}), [])
  );

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white border-2 border-ink shadow-brutal-lg w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-ink bg-ink text-white">
          <div>
            <div className="label-mono text-gray-400 mb-0.5" style={{ fontSize: '10px' }}>
              ◈ AI АНАЛИЗ
            </div>
            <h2 className="font-display font-bold text-xl">Сводка нагрузки</h2>
          </div>
          <button
            onClick={onClose}
            className="label-mono w-9 h-9 flex items-center justify-center border-2 border-white hover:bg-coral hover:border-coral transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5">
          {/* Streaming state */}
          {status === 'streaming' && (
            <div className="flex flex-col items-center gap-4 py-10">
              <Spinner size={8} />
              <div className="label-mono text-slate text-center" style={{ fontSize: '11px' }}>
                ◈ Анализирую задачи...
                {tokenCount > 0 && (
                  <span className="ml-2 text-ink">≈{tokenCount} токенов</span>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-coral text-white label-mono px-4 py-3 border-2 border-ink">
              ⚠ {error}
            </div>
          )}

          {/* Result */}
          {status === 'done' && data && (
            <div className="flex flex-col gap-5 animate-fade-up">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="border-2 border-ink p-3 text-center">
                  <div className="font-display font-bold text-3xl text-coral">{data.urgent_count}</div>
                  <div className="label-mono text-slate mt-1" style={{ fontSize: '11px' }}>Срочных</div>
                </div>
                <div className="border-2 border-ink p-3 text-center">
                  <div className="font-display font-bold text-3xl text-coral">{data.overdue_count}</div>
                  <div className="label-mono text-slate mt-1" style={{ fontSize: '11px' }}>Просроченных</div>
                </div>
              </div>

              {/* Cache badge */}
              {cached && (
                <div className="label-mono text-sage" style={{ fontSize: '10px' }}>
                  ⚡ из кеша (актуально 5 мин)
                </div>
              )}

              {/* Summary */}
              <div className="border-l-4 border-coral pl-4">
                <p className="font-display text-sm text-ink leading-relaxed">{data.summary}</p>
              </div>

              {/* Recommendations */}
              {data.recommendations.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="label-mono text-slate" style={{ fontSize: '11px' }}>РЕКОМЕНДАЦИИ</div>
                  {data.recommendations.map((rec, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <span className="label-mono text-coral font-bold">{i + 1}.</span>
                      <span className="text-sm text-ink">{rec}</span>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={run}
                className="label-mono py-2 border-2 border-ink bg-white hover:bg-cream transition-colors text-sm"
              >
                ↻ Обновить анализ
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkloadSummaryModal;
