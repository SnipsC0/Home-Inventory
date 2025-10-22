import { useTranslation } from '../../../i18n/I18nContext';

interface ImageUploaderProps {
  preview: string | null;
  onChange: (file: File | null) => void;
}

export default function ImageUploader({
  preview,
  onChange,
}: ImageUploaderProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      {preview && (
        <img
          src={preview}
          alt="Preview"
          className="max-w-full max-h-[20rem] object-cover rounded-sm m-auto border border-ha-divider"
        />
      )}

      <div>
        <label className="text-ha-text text-sm block mb-1">
          {t.items.image} ({t.common.optional})
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => onChange(e.target.files?.[0] || null)}
          className="w-full text-ha-text text-sm"
        />
      </div>
    </div>
  );
}
