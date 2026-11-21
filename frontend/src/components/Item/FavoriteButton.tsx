import { Star } from 'lucide-react';
import { useTranslation } from '../../i18n/I18nContext';
import { useFavorites, useToggleFavorite } from '../../hooks/items/useFavorites';

interface Props {
  itemId: number;
  size?: number;
}

export default function FavoriteButton({ itemId, size = 18 }: Props) {
  const { t } = useTranslation();
  const { ids } = useFavorites();
  const toggle = useToggleFavorite();
  const isFavorite = ids.has(itemId);
  const label = isFavorite ? t.favorites.remove : t.favorites.add;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggle.mutate({ itemId, favorite: !isFavorite });
      }}
      aria-label={label}
      aria-pressed={isFavorite}
      title={label}
      className={`btn btn-ghost !p-2 !rounded-full ${
        isFavorite ? 'text-amber-400' : 'opacity-70 hover:opacity-100'
      }`}
    >
      <Star size={size} fill={isFavorite ? 'currentColor' : 'none'} />
    </button>
  );
}
