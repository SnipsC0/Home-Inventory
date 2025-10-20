interface Props {
  allowEdit?: boolean;
  onAllItemsClick: () => void;
  onAddRoom: () => void;
}

export default function RoomsHeader({
  allowEdit,
  onAddRoom,
  onAllItemsClick,
}: Props) {
  return (
    <div className="flex flex-wrap gap-3 mb-4 justify-between items-center">
      <h3 className="m-0 text-ha-text text-lg font-semibold">
        🏠 Camerele din casă
      </h3>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={onAllItemsClick}
          className="px-3 py-2 bg-ha-secondary-bg border border-ha-divider text-ha-text rounded hover:bg-ha-card transition"
        >
          📦 Toate Obiectele
        </button>

        {allowEdit && (
          <button
            onClick={onAddRoom}
            className="px-3 py-2 bg-ha-primary text-white rounded hover:opacity-90 transition"
          >
            + Adaugă Cameră
          </button>
        )}
      </div>
    </div>
  );
}
