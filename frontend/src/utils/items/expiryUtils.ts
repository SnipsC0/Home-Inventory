import type { Config, ExpirationBatch } from '../../types';

/** Batches sorted by expiry date ascending; undated batches last. */
export function sortBatchesByDate(batches: ExpirationBatch[]): ExpirationBatch[] {
  return [...batches].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });
}

export const DEFAULT_EXPIRY_WARNING = { value: 7, unit: 'days' as const };

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Last day (inclusive) of the "expiring soon" window; mirrors the backend. */
export function expiryWindowEnd(
  today: Date,
  value: number,
  unit: 'days' | 'months'
): Date {
  const base = startOfDay(today);
  if (unit === 'months') {
    const monthIndex = base.getMonth() + value;
    const year = base.getFullYear() + Math.floor(monthIndex / 12);
    const month = ((monthIndex % 12) + 12) % 12;
    const lastDay = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(base.getDate(), lastDay));
  }
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + value);
}

export type BatchExpiryStatus = {
  expired: boolean;
  soon: boolean;
  daysLeft: number | null;
};

/** Classify a batch date (YYYY/MM/DD or YYYY-MM-DD) against the configured warning window. */
export function getBatchExpiryStatus(
  date: string | null | undefined,
  config?: Pick<Config, 'expiry_warning_value' | 'expiry_warning_unit'>,
  now: Date = new Date()
): BatchExpiryStatus {
  if (!date) return { expired: false, soon: false, daysLeft: null };
  const [y, m, d] = date.slice(0, 10).split(/[/-]/).map(Number);
  if (!y || !m || !d) return { expired: false, soon: false, daysLeft: null };

  const target = new Date(y, m - 1, d);
  if (target.getMonth() !== m - 1) {
    return { expired: false, soon: false, daysLeft: null }; // nonexistent day
  }
  const today = startOfDay(now);
  const end = expiryWindowEnd(
    today,
    config?.expiry_warning_value ?? DEFAULT_EXPIRY_WARNING.value,
    config?.expiry_warning_unit ?? DEFAULT_EXPIRY_WARNING.unit
  );
  const daysLeft = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  const expired = target < today;
  return { expired, soon: !expired && target <= end, daysLeft };
}
