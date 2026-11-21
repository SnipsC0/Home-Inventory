import { create } from 'zustand';

interface UndoStore {
  /** Bin entry the toast can restore, or null when hidden. */
  trashId: number | null;
  show: (trashId: number) => void;
  hide: () => void;
}

export const useUndoStore = create<UndoStore>((set) => ({
  trashId: null,
  show: (trashId) => set({ trashId }),
  hide: () => set({ trashId: null }),
}));
