import { useState, useMemo } from 'react';
import Breadcrumb from '../components/Layout/BreadCrumb';
import { useGlobalItems } from '../hooks/items/useItems';
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
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 20;
  const goBack = useAppStore((state) => state.goBack);

  const { data: allItems = [], isLoading } = useGlobalItems(api);

  const normalize = (text: string) =>
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  const filteredItems = useMemo(() => {
    if (!search) return allItems;

    const searchNormalized = normalize(search);

    return allItems.filter((item) => {
      const name = normalize(item.name);
      const aliases = normalize(item.aliases || '');

      // ✅ Căutăm în TOATE locațiile itemului
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
  }, [allItems, search]);

  const displayedItems = useMemo(() => {
    return filteredItems.slice(0, (currentPage + 1) * itemsPerPage);
  }, [filteredItems, currentPage]);

  // Transformăm itemele pentru afișare
  const itemsForDisplay = useMemo(() => {
    const result: Array<{ item: any; location?: any; key: string }> = [];

    displayedItems.forEach((item) => {
      if (item.track_quantity) {
        // Consumabile: un singur card cu multiple locații
        result.push({
          item,
          key: `item-${item.id}`,
        });
      } else {
        // Non-consumabile: câte un card per locație
        item.locations?.forEach((location: any, index: number) => {
          result.push({
            item,
            location,
            key: `item-${item.id}-loc-${index}`,
          });
        });
      }
    });

    return result.sort((a, b) => a.item.name.localeCompare(b.item.name, 'ro'));
  }, [displayedItems]);

  const hasNextPage = displayedItems.length < filteredItems.length;

  const loaderRef = useInfiniteScroll({
    shouldLoad: hasNextPage && !isLoading,
    onLoadMore: () => setCurrentPage((prev) => prev + 1),
  });

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-4">
      <Breadcrumb currentLabel={t.rooms.allItems} onBack={goBack} />

      <div className="flex gap-2">
        <input
          type="text"
          placeholder={t.trackedItems.searchPlaceholder}
          className="flex-1 px-3 py-2 border border-ha-divider bg-ha-secondary-bg text-ha-text rounded"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(140px,1fr))]">
        {!itemsForDisplay.length ? (
          <p className="text-center text-ha-text py-10">
            {t.trackedItems.noItemsFiltered}.
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
