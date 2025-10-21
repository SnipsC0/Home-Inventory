interface BreadcrumbProps {
  onBack: () => void;
  currentLabel: string;
}

export default function Breadcrumb({ onBack, currentLabel }: BreadcrumbProps) {
  return (
    <div className="mb-4 flex items-center gap-2 text-ha-text flex-wrap">
      <button
        onClick={onBack}
        className="text-ha-primary hover:underline px-1 py-1 transition"
      >
        ← Înapoi
      </button>
      <span className="text-ha-text opacity-60">/</span>
      <span className="font-semibold text-ha-text">{currentLabel}</span>
    </div>
  );
}
