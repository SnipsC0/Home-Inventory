import { FC, ReactElement, useState, useMemo } from 'react';
import { ApiService } from '../services/api';
import { useGlobalItems, useUpdateItemMutation } from '../hooks/useItems';
import { Item } from '../types';
import {
  Search,
  Package,
  AlertCircle,
  TrendingDown,
  CheckCircle,
} from 'lucide-react';
import ViewItemModal from '../components/Modal/ViewItemModal';
import EditItemModal from '../components/Modal/EditItemModal/EditItemModal';
import Breadcrumb from '../components/Layout/BreadCrumb';
import { useAppStore } from '../store/useAppStore';

interface Props {
  api: ApiService;
}

const TrackedItemsView: FC<Props> = ({ api }): ReactElement => {
  const { data: allItems = [], isLoading } = useGlobalItems(api);
  const goBack = useAppStore((state) => state.goBack);

  const updateItem = useUpdateItemMutation(api);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'low' | 'ok'>('all');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  const trackedItems = useMemo(() => {
    return allItems.filter(
      (item: Item) =>
        item.track_quantity &&
        item.quantity !== null &&
        item.quantity !== undefined &&
        item.min_quantity !== null
    );
  }, [allItems]);

  const filteredItems = useMemo(() => {
    let items = trackedItems;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      items = items.filter(
        (item: Item) =>
          item.name.toLowerCase().includes(searchLower) ||
          item.aliases?.toLowerCase().includes(searchLower) ||
          item.location?.toLowerCase().includes(searchLower)
      );
    }

    if (filterStatus === 'low') {
      items = items.filter((item: Item) => item.quantity! < item.min_quantity!);
    } else if (filterStatus === 'ok') {
      items = items.filter(
        (item: Item) => item.quantity! >= item.min_quantity!
      );
    }

    return items.sort((a, b) => {
      const aIsLow = a.quantity! < a.min_quantity!;
      const bIsLow = b.quantity! < b.min_quantity!;
      if (aIsLow && !bIsLow) return -1;
      if (!aIsLow && bIsLow) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [trackedItems, searchTerm, filterStatus]);

  const lowStockCount = useMemo(() => {
    return trackedItems.filter(
      (item: Item) => item.quantity! < item.min_quantity!
    ).length;
  }, [trackedItems]);

  const getStatusColor = (item: Item) => {
    if (item.quantity! < item.min_quantity!) {
      return 'border-l-4 border-ha-error';
    }
    return 'border-l-4 border-transparent';
  };

  const getStatusIcon = (item: Item) => {
    if (item.quantity! < item.min_quantity!) {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  };

  const handleItemClick = (item: Item, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.qty-btn')) return;
    setSelectedItem(item);
    setShowViewModal(true);
  };

  const handleItemContextMenu = (item: Item, e: React.MouseEvent) => {
    e.preventDefault();
    if ((e.target as HTMLElement).closest('.qty-btn')) return;
    setSelectedItem(item);
    setShowEditModal(true);
  };

  const handleTouchStart = (item: Item, e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('.qty-btn')) return;
    const timer = setTimeout(() => {
      setSelectedItem(item);
      setShowEditModal(true);
    }, 500);
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) clearTimeout(longPressTimer);
    setLongPressTimer(null);
  };

  const handleQuantityChange = (item: Item, newQuantity: number) => {
    if (newQuantity < 0) return;
    updateItem.mutate({ id: item.id, data: { quantity: newQuantity } });
  };

  const getOrganizerFromLocation = (location: string) => {
    const parts = location.split(' / ');
    return parts.length > 3 ? parts[3] : null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] flex-col gap-4 text-ha-text">
        <div className="w-10 h-10 border-4 border-ha-divider border-t-ha-primary rounded-full animate-spin" />
        <div>Se încarcă articolele urmărite...</div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-ha-text flex items-center gap-2">
            <Package className="w-6 h-6" />
            <Breadcrumb onBack={goBack} currentLabel="Articole Urmărite" />
          </h1>
          {lowStockCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
              <TrendingDown className="w-4 h-4" />
              {lowStockCount} sub stoc
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-ha-secondary" />
            <input
              type="text"
              placeholder="Caută articole..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-ha-card border border-ha-divider rounded-lg text-ha-text placeholder-ha-secondary focus:outline-none focus:ring-2 focus:ring-ha-primary"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterStatus === 'all'
                  ? 'bg-ha-primary text-white'
                  : 'bg-ha-card text-ha-text border border-ha-divider hover:bg-ha-divider'
              }`}
            >
              Toate ({trackedItems.length})
            </button>
            <button
              onClick={() => setFilterStatus('low')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterStatus === 'low'
                  ? 'bg-red-500 text-white'
                  : 'bg-ha-card text-ha-text border border-ha-divider hover:bg-ha-divider'
              }`}
            >
              Sub stoc ({lowStockCount})
            </button>
            <button
              onClick={() => setFilterStatus('ok')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterStatus === 'ok'
                  ? 'bg-green-500 text-white'
                  : 'bg-ha-card text-ha-text border border-ha-divider hover:bg-ha-divider'
              }`}
            >
              OK ({trackedItems.length - lowStockCount})
            </button>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-12 bg-ha-card rounded-lg border border-ha-divider">
            <Package className="w-12 h-12 text-ha-secondary mx-auto mb-3" />
            <p className="text-ha-text font-medium mb-1">
              {searchTerm || filterStatus !== 'all'
                ? 'Nu s-au găsit articole'
                : 'Niciun articol urmărit'}
            </p>
            <p className="text-ha-secondary text-sm">
              {searchTerm || filterStatus !== 'all'
                ? 'Încearcă să modifici filtrele'
                : 'Activează urmărirea cantității pentru articole'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item: Item) => (
              <div
                key={item.id}
                onClick={(e) => handleItemClick(item, e)}
                onContextMenu={(e) => handleItemContextMenu(item, e)}
                onTouchStart={(e) => handleTouchStart(item, e)}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchEnd}
                className={`p-4 rounded-lg border-2 transition bg-ha-card cursor-pointer select-none ${getStatusColor(
                  item
                )}`}
              >
                <div className="flex gap-4 items-center">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-40 h-55 object-cover rounded-lg flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget
                          .parentElement as HTMLElement;
                        if (parent) {
                          parent.innerHTML =
                            '<div style="display:flex;align-items:center;justify-content:center;width:80px;height:120px;font-size:3em;">📦</div>';
                        }
                      }}
                    />
                  ) : (
                    <div className="w-40 h-50 flex border-[1px] rounded-lg">
                      <div className="bg-ha-secondary-bg flex items-center justify-center m-auto text-4xl rounded-lg flex-shrink-0">
                        📦
                      </div>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-ha-text text-lg truncate">
                          {item.name}
                        </h3>
                        {item.aliases && (
                          <p className="text-sm text-ha-secondary truncate">
                            {item.aliases}
                          </p>
                        )}
                      </div>
                      {getStatusIcon(item)}
                    </div>

                    <div className="text-sm text-ha-secondary mb-3 truncate flex flex-col">
                      <span className="font-semibold">Locație:</span>
                      <span className="italic">{item.location}</span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-ha-secondary">
                          Cantitate:{' '}
                          <span className="font-semibold text-ha-text">
                            {item.quantity}
                          </span>{' '}
                          / {item.min_quantity}
                        </span>
                      </div>

                      {item.quantity! < item.min_quantity! && (
                        <div className="flex items-center gap-1 text-xs text-red-600 font-medium">
                          <AlertCircle className="w-3 h-3" />
                          Necesită reaprovizionare (
                          {item.min_quantity! - item.quantity!} bucăți)
                        </div>
                      )}
                    </div>

                    <div
                      className="flex gap-4 justify-start items-center mt-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        disabled={item.quantity === 0}
                        className="qty-btn w-11 h-11 bg-ha-error text-white rounded flex items-center justify-center text-lg font-bold hover:opacity-90 transition disabled:opacity-50"
                        onClick={() =>
                          handleQuantityChange(
                            item,
                            Math.max(0, (item.quantity || 0) - 1)
                          )
                        }
                      >
                        -
                      </button>
                      <button
                        className="qty-btn w-11 h-11 bg-ha-primary text-white rounded flex items-center justify-center text-lg font-bold hover:opacity-90 transition"
                        onClick={() =>
                          handleQuantityChange(item, (item.quantity || 0) + 1)
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedItem && showViewModal && (
        <ViewItemModal
          isOpen={true}
          onClose={() => {
            setShowViewModal(false);
            setSelectedItem(null);
          }}
          item={selectedItem}
        />
      )}
      {selectedItem && showEditModal && (
        <EditItemModal
          isOpen={true}
          onClose={() => {
            setShowEditModal(false);
            setSelectedItem(null);
          }}
          item={selectedItem}
          api={api}
          organizer={getOrganizerFromLocation(selectedItem.location)}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedItem(null);
          }}
        />
      )}
    </>
  );
};

export default TrackedItemsView;
