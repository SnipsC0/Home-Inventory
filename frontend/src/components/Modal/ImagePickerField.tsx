import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '../../i18n/I18nContext';
import { withCurrentToken } from '../../services/auth';

/** `file`: newly picked image; `removed`: the current image should be cleared. */
export interface ImagePickerValue {
  file: File | null;
  removed: boolean;
}

interface Props {
  initialImage?: string | null;
  onChange: (value: ImagePickerValue) => void;
  label?: string;
  previewClassName?: string;
}

export default function ImagePickerField({
  initialImage,
  onChange,
  label,
  previewClassName = 'w-3/5 m-auto object-cover rounded border border-ha-divider',
}: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(initialImage || null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    onChange({ file, removed: false });
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
    // Only an image that already exists on the server needs clearing
    onChange({ file: null, removed: !!initialImage });
  };

  return (
    <div className="space-y-2">
      {label && <label className="text-ha-text text-sm block">{label}</label>}

      {preview && (
        <div className="space-y-2">
          <img src={withCurrentToken(preview)} alt={t.common.preview} className={previewClassName} />
          <button
            type="button"
            onClick={handleRemove}
            className="flex items-center gap-1 m-auto text-ha-error text-xs hover:underline"
          >
            <X size={14} />
            {t.common.removeImage}
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="w-full text-ha-text text-sm"
      />
    </div>
  );
}
