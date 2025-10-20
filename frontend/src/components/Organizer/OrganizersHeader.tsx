interface Props {
  shelfName: string;
  allowEdit?: boolean;
  onAddOrganizer: () => void;
  onAddDirectItem: () => void;
}

export default function OrganizersHeader({
  shelfName,
  allowEdit,
  onAddOrganizer,
  onAddDirectItem,
}: Props) {
  return (
    <div className="flex flex-wrap gap-3 mb-4 justify-between items-center">
      <h3 className="m-0 text-ha-text text-lg font-semibold">
        🗂️ Conținut raft: {shelfName}
      </h3>

      {allowEdit && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={onAddOrganizer}
            className="px-3 py-2 bg-ha-primary text-white rounded hover:opacity-90 transition"
          >
            + Adaugă Organizator
          </button>
          <button
            onClick={onAddDirectItem}
            className="px-3 py-2 bg-ha-secondary-bg border border-ha-primary text-ha-primary rounded hover:bg-ha-card transition"
          >
            + Adaugă Obiect Direct
          </button>
        </div>
      )}
    </div>
  );
}
