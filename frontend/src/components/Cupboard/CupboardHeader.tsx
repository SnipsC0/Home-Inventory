interface Props {
  allowEdit?: boolean;
  onToggleForm: () => void;
}

export default function CupboardHeader({ allowEdit, onToggleForm }: Props) {
  return (
    <div className="flex flex-wrap gap-3 mb-4 justify-between items-center">
      <h3 className="m-0 text-ha-text text-lg font-semibold">🗄️ Dulapuri</h3>

      {allowEdit && (
        <button
          onClick={onToggleForm}
          className="px-3 py-2 bg-ha-primary text-white rounded hover:opacity-90 transition"
        >
          + Adaugă Dulap
        </button>
      )}
    </div>
  );
}
