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
}

// API Response Types
export interface OrganizersResponse {
  organizers: Organizer[];
  itemsWithoutOrganizer: number;
}

export interface Config {
  allow_structure_modification: boolean;
  qr_redirect_url?: string;
  language: 'ro' | 'en';
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
    | 'tracked-items';
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
