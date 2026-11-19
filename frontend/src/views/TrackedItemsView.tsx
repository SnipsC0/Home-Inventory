import { FC, ReactElement, useState, useMemo, useCallback } from 'react';
import { ApiService } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../i18n/I18nContext';

import { useTrackedItems } from '../hooks/items/useTrackedItems';
import { filterAndSearchItems } from '../utils/items/filterUtils';
import { countLowStockItems } from '../utils/items/sortUtils';
import { getOrganizerFromLocation } from '../utils/items/locationUtils';

import Breadcrumb from '../components/Layout/BreadCrumb';
import TrackedItem from '../components/Item/TrackedItem';
import SelectLocationModal from '../components/Modal/SelectLocationModal';
import ViewItemModal from '../components/Modal/ItemModal/ViewItemModal';
import EditItemModal from '../components/Modal/ItemModal/EditItemModal';
import Loading from '../components/Loading';

import { Search, Package, TrendingDown } from 'lucide-react';
import type { Item, ItemLocation } from '../types';

interface Props {
  api: ApiService;
}

const TrackedItemsView: FC<Props> = ({ api }): ReactElement => {
  const { t } = useTranslation();
  const { trackedItems, isLoading } = useTrackedItems(api);

  const goBack = useAppStore((s) => s.goBack);

  // search & filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'low' | 'ok'>('all');

  // modals
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<ItemLocation | null>(
    null
  );
  const [showLocationModalForItem, setShowLocationModalForItem] =
    useState<Item | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const filteredItems = useMemo(
    () => filterAndSearchItems(trackedItems, searchTerm, filterStatus),
    [trackedItems, searchTerm, filterStatus]
  );

  const lowStockCount = useMemo(
    () => countLowStockItems(trackedItems),
    [trackedItems]
  );

  const handleItemView = useCallback((item: Item) => {
    if (item.locations.length > 1) {
      setShowLocationModalForItem(item);
    } else {
      setSelectedItem(item);
      setSelectedLocation(item.locations[0]);
      setShowViewModal(true);
    }
  }, []);

  const handleSelectLocation = useCallback(
    (location: ItemLocation) => {
      if (!showLocationModalForItem) return;
      setSelectedItem(showLocationModalForItem);
      setSelectedLocation(location);
      setShowLocationModalForItem(null);
      setShowViewModal(true);
    },
    [showLocationModalForItem]
  );

  const handleItemEdit = useCallback((item: Item) => {
    setSelectedItem(item);
    setSelectedLocation(item.locations[0]);
    setShowEditModal(true);
  }, []);

  if (isLoading) return <Loading />;

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-4">
        {/* header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Breadcrumb onBack={goBack} currentLabel={t.trackedItems.title} />

          {lowStockCount > 0 && (
            <div className="count-badge !text-red-600 !bg-red-500/10 !text-sm !px-3 !py-1">
              <TrendingDown className="w-4 h-4" />
              {lowStockCount} {t.trackedItems.belowStock.toLowerCase()}
            </div>
          )}
        </div>

        {/* search + filter bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 inset-y-0 my-auto w-[18px] h-[18px] text-ha-text/50 pointer-events-none" />
            <input
              type="text"
              placeholder={t.trackedItems.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="field !pl-11 !py-3 !rounded-2xl"
            />
          </div>

          <div className="flex gap-2">
            {(['all', 'low', 'ok'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`btn ${
                  filterStatus === status
                    ? status === 'low'
                      ? 'btn-danger'
                      : status === 'ok'
                      ? '!bg-green-500 text-white'
                      : 'btn-primary'
                    : 'btn-secondary'
                }`}
              >
                {status === 'all'
                  ? `${t.trackedItems.all} (${trackedItems.length})`
                  : status === 'low'
                  ? `${t.trackedItems.belowStock} (${lowStockCount})`
                  : `${t.trackedItems.ok} (${trackedItems.length - lowStockCount})`}
              </button>
            ))}
          </div>
        </div>

        {/* items list */}
        {filteredItems.length === 0 ? (
          <div className="surface text-center py-12">
            <Package className="w-12 h-12 text-ha-secondary mx-auto mb-3" />
            <p className="text-ha-text font-medium mb-1">
              {searchTerm || filterStatus !== 'all'
                ? t.trackedItems.noItemsFiltered
                : t.trackedItems.noItems}
            </p>
            <p className="text-ha-secondary text-sm">
              {searchTerm || filterStatus !== 'all'
                ? t.trackedItems.tryModifyFilters
                : t.trackedItems.enableTracking}
            </p>
          </div>
        ) : (
          <div className="stagger space-y-3">
            {filteredItems.map((item) => (
              <TrackedItem
                key={item.id}
                item={item}
                onView={handleItemView}
                onEdit={handleItemEdit}
              />
            ))}
          </div>
        )}
      </div>

      {/* modals */}
      {showLocationModalForItem && (
        <SelectLocationModal
          item={showLocationModalForItem}
          isOpen
          onClose={() => setShowLocationModalForItem(null)}
          onSelectLocation={handleSelectLocation}
          onEditLocation={(location) => {
            setSelectedItem(showLocationModalForItem);
            setSelectedLocation(location);
            setShowLocationModalForItem(null);
            setShowEditModal(true);
          }}
        />
      )}

      {selectedItem && selectedLocation && showViewModal && (
        <ViewItemModal
          isOpen
          onClose={() => {
            setShowViewModal(false);
            setSelectedItem(null);
            setSelectedLocation(null);
          }}
          item={selectedItem}
          location={selectedLocation}
        />
      )}

      {selectedItem && selectedLocation && showEditModal && (
        <EditItemModal
          isOpen
          onClose={() => {
            setShowEditModal(false);
            setSelectedItem(null);
            setSelectedLocation(null);
          }}
          item={selectedItem}
          api={api}
          location={selectedLocation}
          organizer={
            selectedLocation
              ? getOrganizerFromLocation(selectedLocation.location)
              : null
          }
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedItem(null);
            setSelectedLocation(null);
          }}
        />
      )}
    </>
  );
};

export default TrackedItemsView;
