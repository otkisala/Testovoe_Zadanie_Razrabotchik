interface AiResultPanelProps {
  label: string;
  content: React.ReactNode;
  cached?: boolean;
  onAccept: () => void;
  onReject: () => void;
}

export const AiResultPanel: React.FC<AiResultPanelProps> = ({
  label,
  content,
  cached = false,
  onAccept,
  onReject,
}) => {
  return (
    <div className="border-2 border-ink bg-cream p-3 flex flex-col gap-2 animate-fade-up">
      <div className="flex items-center justify-between">
        <span className="label-mono text-slate" style={{ fontSize: '10px' }}>
          {label}
        </span>
        {cached && (
          <span
            className="label-mono text-sage border border-sage px-1"
            style={{ fontSize: '9px' }}
          >
            ⚡ КЕШ
          </span>
        )}
      </div>
      <div className="text-sm text-ink leading-snug">{content}</div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={onAccept}
          className="flex-1 label-mono py-1.5 bg-ink text-cream border-2 border-ink hover:bg-sage transition-colors"
          style={{ fontSize: '10px' }}
        >
          ✓ Принять
        </button>
        <button
          onClick={onReject}
          className="flex-1 label-mono py-1.5 bg-white border-2 border-ink hover:bg-cream-dark transition-colors"
          style={{ fontSize: '10px' }}
        >
          ✕ Отклонить
        </button>
      </div>
    </div>
  );
};
