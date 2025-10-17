interface BreadcrumbProps {
  onBack: () => void;
  currentLabel: string;
}

export function Breadcrumb({ onBack, currentLabel }: BreadcrumbProps) {
  return (
    <div
      style={{
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: 'var(--secondary-text-color)',
        flexWrap: 'wrap',
      }}
    >
      <button
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--primary-color)',
          cursor: 'pointer',
          fontSize: '1em',
          padding: '4px 8px',
        }}
      >
        ← Înapoi
      </button>
      <span>/</span>
      <span style={{ fontWeight: 600, color: 'var(--primary-text-color)' }}>
        {currentLabel}
      </span>
    </div>
  );
}
