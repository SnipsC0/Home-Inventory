import { useState } from 'react';
import { useTranslation } from '../../i18n/I18nContext';

interface Props {
  uploadStatus: string;
  onSubmit: (name: string, file: File | null) => void;
  onCancel: () => void;
  pending?: boolean;
}

export default function CupboardAddForm({
  uploadStatus,
  onSubmit,
  onCancel,
  pending,
}: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="bg-ha-card p-4 mb-4 rounded-lg shadow-ha space-y-3">
      <input
        type="text"
        placeholder={`${t.cupboards.cupboardName} (${t.cupboards.example})`}
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full px-3 py-2 border border-ha-divider bg-ha-secondary-bg text-ha-text rounded"
      />

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="w-full text-sm text-ha-text"
      />

      <div className="text-sm text-ha-text min-h-[20px]">{uploadStatus}</div>

      <div className="flex gap-2">
        <button
          disabled={pending}
          onClick={() => onSubmit(name, file)}
          className="flex-1 py-2 bg-ha-primary text-white rounded hover:opacity-90 transition disabled:opacity-50"
        >
          {pending ? t.common.saving : t.common.save}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 py-2 bg-ha-secondary-bg border border-ha-divider text-ha-text rounded hover:bg-ha-card transition"
        >
          {t.common.cancel}
        </button>
      </div>
    </div>
  );
}
