import { FC, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  CheckCircle,
  Clock,
  MapPin,
  Package,
} from 'lucide-react';
import ViewItemModal from '../Modal/ItemModal/ViewItemModal';
import EditItemModal from '../Modal/ItemModal/EditItemModal';
import SmartImage from '../SmartImage';
import { useInteractions } from '../../hooks/global/useInteractions';
import { useApi } from '../../contexts/ApiContext';
import { useTranslation } from '../../i18n/I18nContext';
import { getOrganizerFromLocation } from '../../utils/items/locationUtils';
import type { ExpiringBatch, Item, ItemLocation } from '../../types';

interface Props {
  item: Item;
  location: ItemLocation;
  batches: ExpiringBatch[];
}

const ExpiringCard: FC<Props> = ({ item, location, batches }) => {
  const { t } = useTranslation();
  const api = useApi();
  const [showView, setShowView] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const handlers = useInteractions({
    onSingleClick: () => setShowView(true),
    onRightClick: () => setShowEdit(true),
    onLongPress: () => setShowEdit(true),
    excludeSelector: '.qty-btn',
  });

  const imageSrc = location.image || item.default_image;
  const hasExpired = batches.some((b) => b.expired);

  const daysLabel = (b: ExpiringBatch) =>
    b.days_left < 0
      ? t.expiring.expiredAgo.replace('{n}', String(-b.days_left))
      : b.days_left === 0
      ? t.expiring.today
      : t.expiring.inDays.replace('{n}', String(b.days_left));

  const StatusIcon = hasExpired
    ? AlertCircle
    : batches.some((b) => b.expiring_soon)
    ? Clock
    : CheckCircle;
  const statusColor = hasExpired
    ? 'text-red-500'
    : batches.some((b) => b.expiring_soon)
    ? 'text-amber-500'
    : 'text-green-500';

  return (
    <>
      <div
        {...handlers}
        className={`surface surface-interactive p-4 select-none ${
          hasExpired ? '!border-ha-error/60' : ''
        }`}
      >
        <div className="flex gap-4 items-center">
          {/* Image */}
          {imageSrc ? (
            <SmartImage
              src={imageSrc}
              alt={item.name}
              wrapperClassName="w-28 h-36 rounded-xl flex-shrink-0"
              width={480}
              fallback={<Package size={40} strokeWidth={1.5} />}
            />
          ) : (
            <div className="w-28 h-36 flex items-center justify-center rounded-xl flex-shrink-0 bg-ha-secondary-bg text-ha-text/30">
              <Package size={40} strokeWidth={1.5} />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-ha-text text-lg truncate">
                  {item.name}
                </h3>
                {(location.variant || item.aliases) && (
                  <p className="text-sm text-ha-secondary truncate">
                    {location.variant || item.aliases}
                  </p>
                )}
              </div>
              <StatusIcon className={`w-5 h-5 shrink-0 ${statusColor}`} />
            </div>

            <div className="text-sm font-semibold text-ha-text flex items-center gap-1 mb-2 min-w-0">
              <MapPin className="w-4 h-4 shrink-0" />
              <span className="truncate">{location.location}</span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {batches.map((b, i) => (
                <div
                  key={`${b.date}-${i}`}
                  className="px-2.5 py-1.5 rounded-lg bg-ha-secondary-bg/70"
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-ha-text">
                    <span className="flex items-center gap-2 min-w-0">
                      <CalendarClock size={14} className="text-ha-primary" />
                      {b.date}
                      <ArrowRight size={'1rem'} />
                      <span
                        className={`text-lg ${
                          b.expired
                            ? 'text-ha-error'
                            : b.expiring_soon
                            ? 'text-amber-500'
                            : 'text-green-600'
                        }`}
                      >
                        {b.quantity ?? '-'}
                      </span>
                    </span>
                    <span
                      className={`font-medium shrink-0 ${
                        b.expired
                          ? 'text-red-600'
                          : b.expiring_soon
                          ? 'text-amber-600'
                          : 'text-ha-secondary'
                      }`}
                    >
                      {daysLabel(b)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showView && (
        <ViewItemModal
          isOpen
          onClose={() => setShowView(false)}
          item={item}
          location={location}
        />
      )}

      {showEdit && (
        <EditItemModal
          isOpen
          onClose={() => setShowEdit(false)}
          item={item}
          api={api}
          organizer={getOrganizerFromLocation(location.location)}
          location={location}
          onSuccess={() => setShowEdit(false)}
        />
      )}
    </>
  );
};

export default ExpiringCard;
