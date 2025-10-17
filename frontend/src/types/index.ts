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

export interface Item {
  id: number;
  name: string;
  aliases?: string;
  image?: string;
  quantity?: number;
  min_quantity?: number;
  track_quantity: boolean;
  location: string;
  room?: string;
  cupboard?: string;
  shelf?: string;
}

// API Response Types
export interface OrganizersResponse {
  organizers: Organizer[];
  itemsWithoutOrganizer: number;
}

export interface Config {
  allow_structure_modification: boolean;
  qr_redirect_url?: string;
}

// State Types
export interface AppState {
  currentView:
    | 'rooms'
    | 'cupboards'
    | 'shelves'
    | 'organizers'
    | 'items'
    | 'all-items';
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
  organizer?: string;
  item?: string;
  old_image?: string;
}
