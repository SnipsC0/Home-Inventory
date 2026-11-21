import { useState, useMemo } from 'react';
import { Search, Star, X } from 'lucide-react';
import Breadcrumb from '../components/Layout/BreadCrumb';
import { useGlobalItems } from '../hooks/items/useItems';
import { useFavorites } from '../hooks/items/useFavorites';
import ItemCard from '../components/Item/ItemCard';
import type { ApiService } from '../services/api';
import { useInfiniteScroll } from '../hooks/global/useInfiniteScroll';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../i18n/I18nContext';
import Loading from '../components/Loading';

interface Props {
  api: ApiService;
}

export default function AllItemsView({ api }: Props) {
  const { t, language } = useTranslation();
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const itemsPerPage = 20;
  const goBack = useAppStore((state) => state.goBack);

  const { data: allItems = [], isLoading } = useGlobalItems(api);
  const { ids: favoriteIds } = useFavorites();
  const favoriteCount = useMemo(
    () => allItems.filter((item) => favoriteIds.has(item.id)).length,
    [allItems, favoriteIds]
  );

  const normalize = (text: string) =>
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  const filteredItems = useMemo(() => {
    const baseItems = favoritesOnly
      ? allItems.filter((item) => favoriteIds.has(item.id))
      : allItems;
    if (!search) return baseItems;

    const searchNormalized = normalize(search);

    return baseItems.filter((item) => {
      const name = normalize(item.name);
      const aliases = normalize(item.aliases || '');

      // Search across ALL locations of the item
      const matchesInAnyLocation = item.locations?.some((loc) => {
        const location = normalize(loc.location || '');
        const room = normalize(loc.room || '');
        const cupboard = normalize(loc.cupboard || '');
        const shelf = normalize(loc.shelf || '');
        const organizer = normalize(loc.organizer || '');

        return (
          location.includes(searchNormalized) ||
          room.includes(searchNormalized) ||
          cupboard.includes(searchNormalized) ||
          shelf.includes(searchNormalized) ||
          organizer.includes(searchNormalized)
        );
      });

      return (
        name.includes(searchNormalized) ||
        aliases.includes(searchNormalized) ||
        matchesInAnyLocation
      );
    });
  }, [allItems, search, favoritesOnly, favoriteIds]);

  const displayedItems = useMemo(() => {
    return filteredItems.slice(0, (currentPage + 1) * itemsPerPage);
  }, [filteredItems, currentPage]);

  // Transform items for display
  const itemsForDisplay = useMemo(() => {
    const result: Array<{ item: any; location?: any; key: string }> = [];

    displayedItems.forEach((item) => {
      if (item.track_quantity) {
        // Consumables: a single card with multiple locations
        result.push({
          item,
          key: `item-${item.id}`,
        });
      } else {
        // Non-consumables: one card per location
        item.locations?.forEach((location: any, index: number) => {
          result.push({
            item,
            location,
            key: `item-${item.id}-loc-${index}`,
          });
        });
      }
    });

    return result.sort((a, b) =>
      a.item.name.localeCompare(b.item.name, language)
    );
  }, [displayedItems, language]);

  const hasNextPage = displayedItems.length < filteredItems.length;

  const loaderRef = useInfiniteScroll({
    shouldLoad: hasNextPage && !isLoading,
    onLoadMore: () => setCurrentPage((prev) => prev + 1),
  });

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-4">
      <Breadcrumb currentLabel={t.rooms.allItems} onBack={goBack} />

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-4 inset-y-0 my-auto text-ha-text/50 pointer-events-none"
          />
          <input
            type="text"
            placeholder={t.trackedItems.searchPlaceholder}
            className="field !pl-11 !pr-10 !py-3 !rounded-2xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              aria-label={t.common.clear}
              className="absolute right-2 inset-y-0 my-auto h-fit btn btn-ghost !p-1.5 !rounded-full"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <button
          onClick={() => {
            setFavoritesOnly((v) => !v);
            setCurrentPage(0);
          }}
          aria-pressed={favoritesOnly}
          className={`btn shrink-0 ${favoritesOnly ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Star size={16} fill={favoritesOnly ? 'currentColor' : 'none'} />
          {`${t.favorites.filter} (${favoriteCount})`}
        </button>
      </div>

      <div className="stagger grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(140px,1fr))]">
        {!itemsForDisplay.length ? (
          <p className="col-span-full text-center text-ha-text py-10">
            {favoritesOnly && !search && !favoriteCount
              ? t.favorites.empty
              : `${t.trackedItems.noItemsFiltered}.`}
          </p>
        ) : (
          itemsForDisplay.map(({ item, location, key }) => (
            <ItemCard
              key={key}
              item={item}
              organizer={undefined}
              variant="compact"
              specificLocation={location}
              showMultipleLocations={item.track_quantity && !location}
            />
          ))
        )}
      </div>

      <div
        ref={loaderRef}
        className="h-12 flex items-center justify-center text-ha-text"
      >
        {isLoading && <span>{t.common.loading}</span>}
      </div>
    </div>
  );
}
