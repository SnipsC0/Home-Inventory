// Hass Types
export interface HassConfig {
  external_url?: string;
  internal_url?: string;
  api?: { local_ip: string };
}

export interface HassAuth {
  data: {
    access_token: string;
  };
}

export interface Hass {
  auth: HassAuth;
  config: HassConfig;
  callApi: <T = any>(method: string, path: string, data?: any) => Promise<T>;
}

// Entity Types
export interface Room {
  id: number;
  name: string;
  image?: string;
  itemCount: number;
}

export interface Cupboard {
  id: number;
  name: string;
  image?: string;
  itemCount: number;
}

export interface Shelf {
  id: number;
  name: string;
  image?: string;
  organizerCount: number;
  itemCount: number;
}

export interface Organizer {
  id: number;
  name: string;
  image?: string;
  itemCount: number;
}

export interface AddItemData {
  name: string;
  aliases: string | undefined;
  imageFile: File | null;
  track_quantity: boolean;
  quantity: number | null;
  barcode: string;
  expiration_date: string | null;
  variant?: string;
  merge_location_id?: number;
  new_row?: boolean;
}

export interface UpdateItemData {
  location_id?: number | null;
  room?: string;
  shelf?: string;
  cupboard?: string;
  organizer?: string | null;
  name?: string;
  aliases?: string;
  barcode?: string;
  default_image?: string;
  image?: string | null;
  variant?: string | null;
  variant_barcode?: string | null;
  track_quantity?: boolean;
  min_quantity?: number | null;
  expiration_dates?: string | null;
}

export interface ItemLocation {
  location_id: number;
  quantity: number | null;
  expiration_dates: string | ExpirationBatch[] | null;
  room: string;
  cupboard: string;
  shelf: string;
  organizer: string | null;
  location: string;
  is_low_stock: boolean;
  is_expired: boolean;
  image: string | null;
  variant: string | null;
  room_image?: string | null;
  cupboard_image?: string | null;
  shelf_image?: string | null;
  organizer_image?: string | null;
}

export type ExpirationBatch = {
  quantity: number;
  date: string | null;
};

export interface Item {
  id: number;
  name: string;
  barcode: string | null;
  aliases: string | null;
  track_quantity: boolean;
  min_quantity: number | null;
  default_image: string | null;
  locations: ItemLocation[];
  total_quantity: number | null;
  is_low_stock: boolean;
  variant_barcodes?: VariantBarcode[];
  matched_variant?: string | null;
}

export interface ExpiringBatch {
  id: number;
  name: string;
  variant: string | null;
  location_id: number;
  quantity: number | null;
  date: string;
  days_left: number;
  expired: boolean;
  expiring_soon: boolean;
  location: string;
}

export interface ExpiringBatchesResponse {
  batches: ExpiringBatch[];
  warning_value: number;
  warning_unit: 'days' | 'months';
  warning_until: string;
}

export interface VariantBarcode {
  variant: string;
  barcode: string;
}

// API Response Types
export interface OrganizersResponse {
  organizers: Organizer[];
  itemsWithoutOrganizer: number;
}

export interface Config {
  allow_structure_modification: boolean;
  show_qr_nfc?: boolean;
  qr_redirect_url?: string;
  language: 'ro' | 'en' | 'ru' | 'de';
  expiry_warning_value?: number;
  expiry_warning_unit?: 'days' | 'months';
  trash_retention_days?: number;
}

// QR/NFC deep links
export type LocationTarget = 'cupboard' | 'shelf';

export interface LocateResult {
  target: LocationTarget;
  id: number;
  room: string;
  cupboard: string;
  shelf?: string;
}

// State Types
export interface AppState {
  currentView:
    | 'rooms'
    | 'cupboards'
    | 'shelves'
    | 'organizers'
    | 'items'
    | 'all-items'
    | 'tracked-items'
    | 'expiring'
    | 'trash';
  selectedRoom: string | null;
  selectedCupboard: string | null;
  selectedShelf: string | null;
  selectedOrganizer: string | null;
}

// Upload Context
export interface UploadContext {
  room?: string;
  cupboard?: string;
  shelf?: string;
  organizer?: string | null;
  item?: string;
  old_image?: string;
  create_default_copy?: boolean;
  is_default?: boolean;
}

export type ClickOrTouchEvent =
  | React.MouseEvent<HTMLElement>
  | React.TouchEvent<HTMLElement>;

// Recycle bin
export type TrashKind =
  | 'room'
  | 'cupboard'
  | 'shelf'
  | 'organizer'
  | 'item_master'
  | 'item_location';

export interface TrashSummary {
  cupboards?: number;
  shelves?: number;
  organizers?: number;
  locations?: number;
  items?: number;
  images?: number;
}

export interface TrashEntry {
  id: number;
  kind: TrashKind;
  entity_id: number;
  label: string;
  path: string | null;
  summary: TrashSummary;
  deleted_at: string | null;
  expires_at: string | null;
}

export interface TrashResponse {
  entries: TrashEntry[];
  retention_days: number;
}

export type TrashWarning =
  | { code: 'renamed'; table: string; from: string; to: string }
  | { code: 'item_merged'; name: string }
  | { code: 'barcode_dropped'; name: string; barcode: string }
  | { code: 'variant_barcode_skipped'; variant: string; barcode: string };

export type RestoreResult =
  | { ok: true; warnings: TrashWarning[] }
  | {
      ok: false;
      error: 'parent_missing' | 'not_found' | 'failed';
      parent_trash_id?: number | null;
      parent_label?: string | null;
      message?: string;
    };
