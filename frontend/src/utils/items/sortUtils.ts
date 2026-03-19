import type { Item } from '../../types';

export const countLowStockItems = (items: Item[]): number =>
  items.filter((i) => i.total_quantity! <= i.min_quantity!).length;

export const sortItemsByName = (items: Item[]) =>
  [...items].sort((a, b) => a.name.localeCompare(b.name, 'ro'));
