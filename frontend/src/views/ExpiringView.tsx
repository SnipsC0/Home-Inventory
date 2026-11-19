import { FC, ReactElement, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock } from 'lucide-react';
import type { ApiService } from '../services/api';
import type { ExpiringBatch, Item, ItemLocation } from '../types';
import { useGlobalItems } from '../hooks/items/useItems';
import ExpiringCard from '../components/Item/ExpiringCard';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../i18n/I18nContext';
import Breadcrumb from '../components/Layout/BreadCrumb';
import Loading from '../components/Loading';

interface Props {
  api: ApiService;
}

type Filter = 'all' | 'expired' | 'soon';

const ExpiringView: FC<Props> = ({ api }): ReactElement => {
  const { t } = useTranslation();
  const goBack = useAppStore((s) => s.goBack);
  const [filter, setFilter] = useState<Filter>('all');

  const { data, isLoading, error } = useQuery({
    queryKey: ['expiring-batches'],
    queryFn: () => api.getExpiringBatches(),
    staleTime: 30_000,
  });

  const batches = useMemo(() => data?.batches ?? [], [data]);
  const expiredCount = useMemo(
    () => batches.filter((b) => b.expired).length,
    [batches]
  );
  const soonCount = useMemo(
    () => batches.filter((b) => b.expiring_soon).length,
    [batches]
  );

  const filtered = useMemo(
    () =>
      batches.filter((b) =>
        filter === 'expired'
          ? b.expired
          : filter === 'soon'
          ? b.expiring_soon
          : true
      ),
    [batches, filter]
  );

  const { data: items = [], isLoading: itemsLoading } = useGlobalItems(api);

  // One card per item location; its batches are grouped inside the card
  const groups = useMemo(() => {
    const byLocation = new Map<
      number,
      { item: Item; location: ItemLocation; batches: ExpiringBatch[] }
    >();
    const index = new Map<number, { item: Item; location: ItemLocation }>();
    items.forEach((item) =>
      item.locations?.forEach((location) =>
        index.set(location.location_id, { item, location })
      )
    );
    filtered.forEach((b) => {
      const found = index.get(b.location_id);
      if (!found) return;
      const group = byLocation.get(b.location_id);
      if (group) group.batches.push(b);
      else byLocation.set(b.location_id, { ...found, batches: [b] });
    });
    // batches arrive sorted by date, so the first one is the earliest
    return [...byLocation.values()].sort((x, y) =>
      x.batches[0].date.localeCompare(y.batches[0].date)
    );
  }, [filtered, items]);

  if (isLoading || itemsLoading) return <Loading />;

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: t.expiring.all, count: batches.length },
    { key: 'expired', label: t.expiring.expired, count: expiredCount },
    { key: 'soon', label: t.expiring.soon, count: soonCount },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Breadcrumb onBack={goBack} currentLabel={t.expiring.title} />

      <div className="flex flex-wrap gap-2">
        {filters.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`btn ${
              filter === key
                ? key === 'expired'
                  ? 'btn-danger'
                  : key === 'soon'
                  ? '!bg-amber-500 text-white'
                  : 'btn-primary'
                : 'btn-secondary'
            }`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {error ? (
        <div className="text-ha-error text-center py-6">
          {t.expiring.loadError}
        </div>
      ) : groups.length === 0 ? (
        <div className="surface text-center py-12">
          <CalendarClock className="w-12 h-12 text-ha-secondary mx-auto mb-3" />
          <p className="text-ha-text font-medium">
            {batches.length === 0
              ? t.expiring.noBatches
              : t.expiring.noBatchesFiltered}
          </p>
        </div>
      ) : (
        <div className="stagger space-y-3">
          {groups.map(({ item, location, batches }) => (
            <ExpiringCard
              key={location.location_id}
              item={item}
              location={location}
              batches={batches}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ExpiringView;
