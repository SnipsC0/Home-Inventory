import { useState, useMemo } from 'react';
import Breadcrumb from '../components/Layout/BreadCrumb';
import { useGlobalItems } from '../hooks/useItems';
import ItemCard from '../components/Item/ItemCard';
import type { ApiService } from '../services/api';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { useAppStore } from '../store/useAppStore';

interface Props {
  api: ApiService;
}

export default function AllItemsView({ api }: Props) {
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
      const location = normalize(item.location || '');

      return (
        name.includes(searchNormalized) ||
        aliases.includes(searchNormalized) ||
        location.includes(searchNormalized)
      );
    });
  }, [allItems, search]);

  const displayedItems = useMemo(() => {
    return filteredItems.slice(0, (currentPage + 1) * itemsPerPage);
  }, [filteredItems, currentPage]);

  const sortedItems = useMemo(() => {
    return [...displayedItems].sort((a, b) =>
      a.name.localeCompare(b.name, 'ro')
    );
  }, [displayedItems]);

  const hasNextPage = displayedItems.length < filteredItems.length;

  const loaderRef = useInfiniteScroll({
    shouldLoad: hasNextPage && !isLoading,
    onLoadMore: () => setCurrentPage((prev) => prev + 1),
  });

  return (
    <div className="space-y-4">
      <Breadcrumb currentLabel="Toate Obiectele" onBack={goBack} />

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Caută obiect..."
          className="flex-1 px-3 py-2 border border-ha-divider bg-ha-secondary-bg text-ha-text rounded"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(140px,1fr))]">
        {!displayedItems.length ? (
          <p className="text-center text-ha-text py-10">
            Nu s-au găsit obiecte.
          </p>
        ) : (
          sortedItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              api={api}
              organizer={null}
              variant="compact"
            />
          ))
        )}
      </div>

      <div
        ref={loaderRef}
        className="h-12 flex items-center justify-center text-ha-text"
      >
        {isLoading && <span>Se încarcă...</span>}
      </div>
    </div>
  );
}
