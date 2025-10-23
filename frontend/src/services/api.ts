import { useTranslation } from '../i18n/I18nContext';
import type {
  Hass,
  Room,
  Cupboard,
  Shelf,
  Item,
  OrganizersResponse,
  Config,
  UploadContext,
} from '../types';

export class ApiService {
  constructor(private hass: Hass) {}

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
    return this.hass.callApi('GET', 'home_inventory/config');
  }

  // Rooms
  async getRooms(): Promise<Room[]> {
    return this.hass.callApi('GET', 'home_inventory/rooms');
  }

  async addRoom(name: string): Promise<{ id: number; name: string }> {
    return this.hass.callApi('POST', 'home_inventory/rooms', { name });
  }

  async updateRoom(id: number, data: { name: string }): Promise<void> {
    return this.hass.callApi('PATCH', 'home_inventory/rooms', { id, ...data });
  }

  async deleteRoom(id: number): Promise<void> {
    return this.hass.callApi('DELETE', 'home_inventory/rooms', { id });
  }

  // Cupboards
  async getCupboards(room: string): Promise<Cupboard[]> {
    const data = await this.hass.callApi<Cupboard[]>(
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
    return this.hass.callApi('POST', 'home_inventory/cupboards', {
      room,
      name,
      image: image || '',
    });
  }

  async updateCupboard(
    id: number,
    data: { name?: string; image?: string }
  ): Promise<void> {
    return this.hass.callApi('PATCH', 'home_inventory/cupboards', {
      id,
      ...data,
    });
  }

  async deleteCupboard(id: number): Promise<void> {
    return this.hass.callApi('DELETE', 'home_inventory/cupboards', { id });
  }

  // Shelves
  async getShelves(room: string, cupboard: string): Promise<Shelf[]> {
    const query = `room=${encodeURIComponent(
      room
    )}&cupboard=${encodeURIComponent(cupboard)}`;
    return this.hass.callApi('GET', `home_inventory/shelves?${query}`);
  }

  async addShelf(
    room: string,
    cupboard: string,
    name: string
  ): Promise<{ id: number; name: string }> {
    return this.hass.callApi('POST', 'home_inventory/shelves', {
      room,
      cupboard,
      name,
    });
  }

  async updateShelf(id: number, data: { name: string }): Promise<void> {
    return this.hass.callApi('PATCH', 'home_inventory/shelves', {
      id,
      ...data,
    });
  }

  async deleteShelf(id: number): Promise<void> {
    return this.hass.callApi('DELETE', 'home_inventory/shelves', { id });
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
    const data = await this.hass.callApi<OrganizersResponse>(
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
    return this.hass.callApi('POST', 'home_inventory/organizers', {
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
    return this.hass.callApi('PATCH', 'home_inventory/organizers', {
      id,
      ...data,
    });
  }

  async deleteOrganizer(id: number): Promise<void> {
    return this.hass.callApi('DELETE', 'home_inventory/organizers', { id });
  }

  // Items
  async getItems(
    room: string,
    cupboard: string,
    shelf: string,
    organizer?: string | null
  ): Promise<Item[]> {
    let query = `room=${encodeURIComponent(room)}&cupboard=${encodeURIComponent(
      cupboard
    )}&shelf=${encodeURIComponent(shelf)}`;
    if (organizer) {
      query += `&organizer=${encodeURIComponent(organizer)}`;
    }

    const data = await this.hass.callApi<Item[]>(
      'GET',
      `home_inventory/items?${query}`
    );
    return data.map((i) => ({ ...i, image: this.getImageUrl(i.image) }));
  }

  async getAllItems(): Promise<Item[]> {
    const data = await this.hass.callApi<Item[]>(
      'GET',
      'home_inventory/all_items'
    );
    return data.map((i) => ({ ...i, image: this.getImageUrl(i.image) }));
  }

  async addItem(
    room: string,
    cupboard: string,
    shelf: string,
    organizer: string | null,
    itemData: {
      name: string;
      aliases?: string;
      image?: string;
      quantity?: number | null;
      min_quantity?: number | null;
      track_quantity: boolean;
    }
  ): Promise<{ id: number; name: string }> {
    const body: any = { room, cupboard, shelf, ...itemData };
    if (organizer) body.organizer = organizer;

    return this.hass.callApi('POST', 'home_inventory/items', body);
  }

  async updateItem(id: number, data: any): Promise<void> {
    return this.hass.callApi('PATCH', `home_inventory/items/${id}`, data);
  }

  async updateItemQuantity(
    id: number,
    data: { quantity?: number; min_quantity?: number; track_quantity?: boolean }
  ): Promise<void> {
    return this.hass.callApi(
      'PATCH',
      `home_inventory/items/${id}/quantity`,
      data
    );
  }

  async deleteItem(id: number): Promise<void> {
    return this.hass.callApi('DELETE', `home_inventory/items/${id}`);
  }

  async uploadImage(file: File, context: UploadContext = {}): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const params = new URLSearchParams();
    if (context.room) params.append('room', context.room);
    if (context.cupboard) params.append('cupboard', context.cupboard);
    if (context.shelf) params.append('shelf', context.shelf);
    if (context.organizer) params.append('organizer', context.organizer);
    if (context.item) params.append('item', context.item);
    if (context.old_image) params.append('old_image', context.old_image);

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

    if (!response.ok) {
      const { t } = useTranslation();
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `${t.errors.uploadFailed}`);
    }

    const data = await response.json();
    return data.path;
  }
}
