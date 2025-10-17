import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../store/useAppStore';
import { Breadcrumb } from '../components/Layout/BreadCrumb';
import { Button } from '../components/Button/Button';
import { Card } from '../components/Card/Card';
import type { ApiService } from '../services/api';
import type { Item } from '../types';

interface Props {
  api: ApiService;
}

const ITEMS_PER_PAGE = 30;

export default function AllItemsView({ api }: Props) {
  const queryClient = useQueryClient();
  const goBack = useAppStore((state) => state.goBack);

  const [searchTerm, setSearchTerm] = useState('');
  const [roomFilter, setRoomFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [stockFilter, setStockFilter] = useState('all');

  const [currentPage, setCurrentPage] = useState(0);
  const [displayedItems, setDisplayedItems] = useState<Item[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const { data: allItems = [], isLoading } = useQuery({
    queryKey: ['all-items'],
    queryFn: () => api.getAllItems(),
  });

  // Filter and sort items
  const filteredItems = allItems
    .filter((item) => {
      if (searchTerm) {
        const nameMatch = item.name
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase());
        const aliasMatch = item.aliases
          ?.toLowerCase()
          .split(',')
          .some((alias) => alias.trim().includes(searchTerm.toLowerCase()));
        if (!nameMatch && !aliasMatch) return false;
      }

      if (roomFilter !== 'all' && item.room !== roomFilter) return false;

      if (stockFilter === 'tracked' && !item.track_quantity) return false;
      if (
        stockFilter === 'low' &&
        (!item.track_quantity ||
          item.quantity === null ||
          item.min_quantity === null ||
          item.quantity > item.min_quantity)
      )
        return false;
      if (
        stockFilter === 'ok' &&
        item.track_quantity &&
        item.quantity !== null &&
        item.min_quantity !== null &&
        item.quantity <= item.min_quantity
      )
        return false;

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'room':
          return (
            (a.room || '').localeCompare(b.room || '') ||
            a.name.localeCompare(b.name)
          );
        case 'low-stock': {
          const aLow =
            a.track_quantity &&
            a.quantity !== null &&
            a.min_quantity !== null &&
            a.quantity <= a.min_quantity
              ? 1
              : 0;
          const bLow =
            b.track_quantity &&
            b.quantity !== null &&
            b.min_quantity !== null &&
            b.quantity <= b.min_quantity
              ? 1
              : 0;
          return bLow - aLow || a.name.localeCompare(b.name);
        }
        case 'newest':
        default:
          return 0;
      }
    });

  // Load more items
  const loadMoreItems = useCallback(() => {
    const startIndex = currentPage * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const batch = filteredItems.slice(startIndex, endIndex);

    if (batch.length === 0) {
      setHasMore(false);
      return;
    }

    setDisplayedItems((prev) => [...prev, ...batch]);
    setCurrentPage((prev) => prev + 1);
    setHasMore(endIndex < filteredItems.length);
  }, [currentPage, filteredItems]);

  // Reset when filters change
  useEffect(() => {
    setCurrentPage(0);
    setDisplayedItems([]);
    setHasMore(true);
  }, [searchTerm, roomFilter, sortBy, stockFilter, allItems]);

  // Initial load
  useEffect(() => {
    if (displayedItems.length === 0 && hasMore) {
      loadMoreItems();
    }
  }, [displayedItems.length, hasMore, loadMoreItems]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMoreItems();
        }
      },
      { threshold: 0 }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loadMoreItems]);

  const handleQuantityChange = async (item: Item, newQuantity: number) => {
    try {
      await api.updateItem(item.id, { quantity: newQuantity });
      queryClient.invalidateQueries({ queryKey: ['all-items'] });
    } catch (error) {
      console.error('Error updating quantity:', error);
      alert('Eroare la actualizarea cantității');
    }
  };

  // Get unique rooms for filter
  const rooms = [
    ...new Set(allItems.map((i) => i.room).filter(Boolean)),
  ].sort();

  if (isLoading) {
    return <div>Se încarcă...</div>;
  }

  return (
    <div>
      <Breadcrumb onBack={goBack} currentLabel="Toate Obiectele" />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <h3 style={{ margin: 0 }}>📦 Toate Obiectele</h3>
        <div
          style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <span
            style={{ color: 'var(--secondary-text-color)', fontSize: '0.9em' }}
          >
            {filteredItems.length} obiecte
          </span>
        </div>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: '16px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.9em',
                marginBottom: '6px',
                color: 'var(--secondary-text-color)',
              }}
            >
              Caută obiect
            </label>
            <input
              type="text"
              placeholder="Nume obiect..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid var(--divider-color)',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.9em',
                marginBottom: '6px',
                color: 'var(--secondary-text-color)',
              }}
            >
              Cameră
            </label>
            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid var(--divider-color)',
                boxSizing: 'border-box',
              }}
            >
              <option value="all">Toate Camerele</option>
              {rooms.map((room) => (
                <option key={room} value={room}>
                  {room}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.9em',
                marginBottom: '6px',
                color: 'var(--secondary-text-color)',
              }}
            >
              Sortare
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid var(--divider-color)',
                boxSizing: 'border-box',
              }}
            >
              <option value="name-asc">Nume (A-Z)</option>
              <option value="name-desc">Nume (Z-A)</option>
              <option value="newest">Cel mai recent</option>
              <option value="room">Cameră</option>
              <option value="low-stock">Stoc redus</option>
            </select>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.9em',
                marginBottom: '6px',
                color: 'var(--secondary-text-color)',
              }}
            >
              Stare stoc
            </label>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid var(--divider-color)',
                boxSizing: 'border-box',
              }}
            >
              <option value="all">Toate</option>
              <option value="tracked">Cu urmărire</option>
              <option value="low">Stoc redus</option>
              <option value="ok">Stoc OK</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Items Grid */}
      <div style={{ display: 'grid', gap: '12px' }}>
        {displayedItems.length === 0 ? (
          <p
            style={{
              textAlign: 'center',
              color: 'var(--secondary-text-color)',
              padding: '40px',
            }}
          >
            Nu s-au găsit obiecte cu aceste filtre.
          </p>
        ) : (
          displayedItems.map((item) => {
            const isLowStock =
              item.track_quantity &&
              item.quantity !== null &&
              item.min_quantity !== null &&
              item.quantity <= item.min_quantity;

            return (
              <Card
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  borderLeft: isLowStock
                    ? '4px solid var(--error-color)'
                    : undefined,
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                {/* Image */}
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    style={{
                      width: '60px',
                      height: '60px',
                      objectFit: 'cover',
                      borderRadius: '6px',
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '60px',
                      height: '60px',
                      background: 'var(--divider-color)',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5em',
                      flexShrink: 0,
                    }}
                  >
                    📦
                  </div>
                )}

                {/* Content */}
                <div style={{ flexGrow: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      marginBottom: '4px',
                      wordWrap: 'break-word',
                    }}
                  >
                    {item.name}
                  </div>
                  <div
                    style={{
                      fontSize: '0.85em',
                      color: 'var(--secondary-text-color)',
                      marginBottom: '4px',
                    }}
                  >
                    📍 {item.location}
                  </div>
                  {item.track_quantity && (
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.85em',
                        fontWeight: 500,
                        background: isLowStock
                          ? 'var(--error-color)'
                          : 'var(--success-color)',
                        color: 'white',
                      }}
                    >
                      {item.quantity ?? '?'}
                      {item.min_quantity ? ` / min ${item.min_quantity}` : ''}
                    </span>
                  )}
                </div>

                {/* Quantity buttons */}
                {item.track_quantity && (
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      flexShrink: 0,
                      alignItems: 'center',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() =>
                        handleQuantityChange(
                          item,
                          Math.max(0, (item.quantity || 0) - 1)
                        )
                      }
                      style={{
                        width: '36px',
                        height: '36px',
                        background: 'var(--error-color)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '1.2em',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      −
                    </button>
                    <button
                      onClick={() =>
                        handleQuantityChange(item, (item.quantity || 0) + 1)
                      }
                      style={{
                        width: '36px',
                        height: '36px',
                        background: 'var(--success-color)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '1.2em',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      +
                    </button>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Loading indicator */}
      {hasMore && (
        <div
          style={{
            textAlign: 'center',
            padding: '20px',
            color: 'var(--secondary-text-color)',
          }}
        >
          <div
            style={{
              display: 'inline-block',
              width: '40px',
              height: '40px',
              border: '4px solid var(--divider-color)',
              borderTopColor: 'var(--primary-color)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <div style={{ marginTop: '10px' }}>Se încarcă...</div>
        </div>
      )}

      {/* Sentinel for intersection observer */}
      <div ref={sentinelRef} style={{ height: '1px' }} />

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
