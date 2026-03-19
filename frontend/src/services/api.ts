import type {
  Hass,
  Room,
  Cupboard,
  Shelf,
  Item,
  OrganizersResponse,
  Config,
  UploadContext,
  UpdateItemData,
  AddItemData,
} from '../types';

export class ApiService {
  constructor(private hass: Hass) {}

  private async safeCall<T = void>(
    method: string,
    path: string,
    body?: any
  ): Promise<T> {
    try {
      const token = (this.hass as any)?.auth?.data?.access_token;
      if (!token) throw new Error('Missing authentication token');

      const response = await fetch(`/api/${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const text = await response.text();
      if (!response.ok) {
        let message = `${response.status} ${response.statusText}`;
        try {
          const json = JSON.parse(text);
          if (json?.error) message = json.error;
        } catch {}
        throw new Error(message);
      }

      if (!text) return undefined as T;

      return JSON.parse(text) as T;
    } catch (err: any) {
      console.error(
        `❌ API Error [${method}] /api/${path}:`,
        err.message || err
      );
      alert(err.message || 'Unexpected API error');
      return undefined as T;
    }
  }

  private getImageUrl(imagePath?: string): string {
    if (!imagePath) return '';
    if (imagePath.includes('access_token=')) return imagePath;
    if (imagePath.startsWith('/local/')) return imagePath;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }

    const filename = imagePath.startsWith('/api/home_inventory/images/')
      ? imagePath.split('/').pop()?.split('?')[0]
      : imagePath;

    const token = this.hass.auth.data.access_token;
    return `/api/home_inventory/images/${filename}?access_token=${token}`;
  }

  async getConfig(): Promise<Config> {
    return this.safeCall('GET', 'home_inventory/config');
  }

  // Rooms
  async getRooms(): Promise<Room[]> {
    return this.safeCall('GET', 'home_inventory/rooms');
  }

  async addRoom(name: string): Promise<{ id: number; name: string }> {
    return this.safeCall('POST', 'home_inventory/rooms', { name: name });
  }

  async updateRoom(id: number, data: { name: string }): Promise<void> {
    return this.safeCall('PATCH', 'home_inventory/rooms', { id, ...data });
  }

  async deleteRoom(id: number): Promise<void> {
    return this.safeCall('DELETE', 'home_inventory/rooms', { id });
  }

  // Cupboards
  async getCupboards(room: string): Promise<Cupboard[]> {
    const data = await this.safeCall<Cupboard[]>(
      'GET',
      `home_inventory/cupboards?room=${encodeURIComponent(room)}`
    );
    return data.map((c) => ({ ...c, image: this.getImageUrl(c.image) }));
  }

  async addCupboard(
    room: string,
    name: string,
    image?: string
  ): Promise<{ id: number; name: string }> {
    return this.safeCall('POST', 'home_inventory/cupboards', {
      room,
      name,
      image: image || '',
    });
  }

  async updateCupboard(
    id: number,
    data: { name?: string; image?: string }
  ): Promise<void> {
    return this.safeCall('PATCH', 'home_inventory/cupboards', {
      id,
      ...data,
    });
  }

  async deleteCupboard(id: number): Promise<void> {
    return this.safeCall('DELETE', 'home_inventory/cupboards', { id });
  }

  // Shelves
  async getShelves(room: string, cupboard: string): Promise<Shelf[]> {
    const query = `room=${encodeURIComponent(
      room
    )}&cupboard=${encodeURIComponent(cupboard)}`;
    return this.safeCall('GET', `home_inventory/shelves?${query}`);
  }

  async addShelf(
    room: string,
    cupboard: string,
    name: string
  ): Promise<{ id: number; name: string }> {
    return this.safeCall('POST', 'home_inventory/shelves', {
      room,
      cupboard,
      name,
    });
  }

  async updateShelf(id: number, data: { name: string }): Promise<void> {
    return this.safeCall('PATCH', 'home_inventory/shelves', {
      id,
      ...data,
    });
  }

  async deleteShelf(id: number): Promise<void> {
    return this.safeCall('DELETE', 'home_inventory/shelves', { id });
  }

  // Organizers
  async getOrganizers(
    room: string,
    cupboard: string,
    shelf: string
  ): Promise<OrganizersResponse> {
    const query = `room=${encodeURIComponent(
      room
    )}&cupboard=${encodeURIComponent(cupboard)}&shelf=${encodeURIComponent(
      shelf
    )}`;
    const data = await this.safeCall<OrganizersResponse>(
      'GET',
      `home_inventory/organizers?${query}`
    );

    return {
      ...data,
      organizers: data.organizers.map((o) => ({
        ...o,
        image: this.getImageUrl(o.image),
      })),
    };
  }

  async addOrganizer(
    room: string,
    cupboard: string,
    shelf: string,
    name: string,
    image?: string
  ): Promise<{ id: number; name: string }> {
    return this.safeCall('POST', 'home_inventory/organizers', {
      room,
      cupboard,
      shelf,
      name,
      image: image || '',
    });
  }

  async updateOrganizer(
    id: number,
    data: { name?: string; image?: string }
  ): Promise<void> {
    return this.safeCall('PATCH', 'home_inventory/organizers', {
      id,
      ...data,
    });
  }

  async deleteOrganizer(id: number): Promise<void> {
    return this.safeCall('DELETE', 'home_inventory/organizers', { id });
  }

  // Items

  async getAllItems(): Promise<Item[]> {
    const data = await this.safeCall<Item[]>('GET', 'home_inventory/all_items');
    return data.map((item) => ({
      ...item,
      default_image: item.default_image && this.getImageUrl(item.default_image),
      locations:
        item.locations?.map((loc) => ({
          ...loc,
          image: loc.image && this.getImageUrl(loc.image),
          expiration_dates: loc.expiration_dates
            ? JSON.parse(loc.expiration_dates as string)
            : null,
        })) || [],
    }));
  }

  async addItem(
    room: string,
    cupboard: string,
    shelf: string,
    organizer: string | null,
    itemData: AddItemData
  ): Promise<{ id: number; name: string }> {
    const body: any = { room, cupboard, shelf, organizer, ...itemData };

    return this.safeCall('POST', 'home_inventory/items', body);
  }

  async updateItem(id: number, data: UpdateItemData): Promise<void> {
    return this.safeCall('PATCH', `home_inventory/items/${id}`, data);
  }

  async updateItemMaster(
    id: number,
    data: {
      name?: string;
      aliases?: string | null;
      barcode?: string | null;
      default_image?: string | null;
      min_quantity?: number | null;
    }
  ): Promise<void> {
    return this.safeCall('PATCH', `home_inventory/items_master/${id}`, data);
  }

  async deleteItemMaster(id: number): Promise<void> {
    return this.safeCall('DELETE', `home_inventory/items_master/${id}`);
  }

  async getItemLocations(itemId: number): Promise<any[]> {
    return this.safeCall('GET', `home_inventory/items?item_id=${itemId}`);
  }

  async updateItemQuantity(
    id: number,
    data: { quantity?: number; min_quantity?: number; track_quantity?: boolean }
  ): Promise<void> {
    return this.safeCall('PATCH', `home_inventory/items/${id}/quantity`, data);
  }

  async deleteItem(locationId: number): Promise<void> {
    return this.safeCall('DELETE', `home_inventory/items/${locationId}`);
  }

  async uploadImage(
    file: File,
    context: UploadContext = {}
  ): Promise<string | { path: string; default_path: string } | null> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const params = new URLSearchParams();
      if (context.room) params.append('room', context.room);
      if (context.cupboard) params.append('cupboard', context.cupboard);
      if (context.shelf) params.append('shelf', context.shelf);
      if (context.organizer) params.append('organizer', context.organizer);
      if (context.item) params.append('item', context.item);
      if (context.old_image) params.append('old_image', context.old_image);
      if (context.create_default_copy)
        params.append('create_default_copy', 'true');
      if (context.is_default) params.append('is_default', 'true');

      const queryString = params.toString();
      const url = `/api/home_inventory/upload${
        queryString ? '?' + queryString : ''
      }`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.hass.auth.data.access_token}`,
        },
        body: formData,
      });

      const rawText = await response.text();
      let data: any = null;

      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = null;
      }

      if (!response.ok) {
        const message =
          typeof data === 'object' && data?.error
            ? data.error
            : rawText || `Image upload failed (${response.status})`;

        console.error('❌ Image upload error:', message);
        alert(message);
        return null;
      }

      if (!data?.path) {
        console.warn('⚠️ Upload response missing "path" field:', data);
        alert('Unexpected upload response format.');
        return null;
      }

      // Return full object if default_path exists, otherwise just path string
      if (data.default_path) {
        return { path: data.path, default_path: data.default_path };
      }

      return data.path;
    } catch (err: any) {
      const msg = err?.message || 'Image upload failed';
      console.error('❌ Upload exception:', msg);
      alert(msg);
      return null;
    }
  }

  async decodeBarcode(imageData: string): Promise<{
    success: boolean;
    barcodes?: Array<{ data: string; type: string }>;
    error?: string;
  } | null> {
    try {
      const response = await fetch('/api/home_inventory/decode_barcode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.hass.auth.data.access_token}`,
        },
        body: JSON.stringify({ image: imageData }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        const message = error.error || 'Failed to decode barcode';
        console.error('❌ Barcode decode error:', message);
        alert(message);
        return null;
      }

      return response.json();
    } catch (err: any) {
      const msg = err?.message || 'Barcode decode failed';
      console.error('❌ Barcode exception:', msg);
      alert(msg);
      return null;
    }
  }

  // ✨ OPȚIONAL: Health check pentru barcode scanner ✨
  async checkBarcodeHealth(): Promise<{
    available: boolean;
    library: string | null;
    message: string;
  }> {
    const response = await fetch('/api/home_inventory/barcode_health', {
      method: 'GET',
    });

    if (!response.ok) {
      return {
        available: false,
        library: null,
        message: 'Barcode service unavailable',
      };
    }

    return response.json();
  }
}
