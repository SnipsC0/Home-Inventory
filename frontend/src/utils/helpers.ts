import { ItemLocation } from '../types';

// Keeps only digits (max 8) and auto-inserts "/" to produce YYYY/MM/DD.
// Pass the previous value so the trailing "/" is not re-added while deleting.
export const formatDateInput = (value: string, prev = ''): string => {
  const d = value.replace(/\D/g, '').slice(0, 8);
  const deleting = value.length < prev.length;
  const clamp = (s: string, max: number) =>
    s.length < 2 ? s : String(Math.min(Math.max(+s, 1), max)).padStart(2, '0');
  const slash = (s: string) => (deleting ? s : `${s}/`);
  if (d.length < 4) return d;
  if (d.length === 4) return slash(d);
  const y = d.slice(0, 4);
  const mm = clamp(d.slice(4, 6), 12);
  if (d.length === 5) return `${y}/${mm}`;
  if (d.length === 6) return slash(`${y}/${mm}`);
  return `${y}/${mm}/${clamp(d.slice(6), 31)}`;
};

export const validateDate =(dateStr: string): boolean => {
  if (dateStr === '') return true;
  const regex = /^(\d{1,4})\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])$/;
  if (!regex.test(dateStr)) return false;
  // reject days that do not exist in the month (e.g. 2026/11/31)
  const [y, m, d] = dateStr.split('/').map(Number);
  return d <= new Date(y, m, 0).getDate();
};
