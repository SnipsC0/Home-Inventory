import type {
  Hass,
  Room,
  Cupboard,
  Shelf,
  Organizer,
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

    const filename = imagePath.startsWith('/api/home_inventar/images/')
      ? imagePath.split('/').pop()?.split('?')[0]
      : imagePath;

    const token = this.hass.auth.data.access_token;
    return `/api/home_inventar/images/${filename}?access_token=${token}`;
  }

  async getConfig(): Promise<Config> {
    return this.hass.callApi('GET', 'home_inventar/config');
  }

  // Rooms
  async getRooms(): Promise<Room[]> {
    return this.hass.callApi('GET', 'home_inventar/rooms');
  }

  async addRoom(name: string): Promise<{ id: number; name: string }> {
    return this.hass.callApi('POST', 'home_inventar/rooms', { name });
  }

  async updateRoom(id: number, data: { name: string }): Promise<void> {
    return this.hass.callApi('PATCH', 'home_inventar/rooms', { id, ...data });
  }

  async deleteRoom(id: number): Promise<void> {
    return this.hass.callApi('DELETE', 'home_inventar/rooms', { id });
  }

  // Cupboards
  async getCupboards(room: string): Promise<Cupboard[]> {
    const data = await this.hass.callApi<Cupboard[]>(
      'GET',
      `home_inventar/cupboards?room=${encodeURIComponent(room)}`
    );
    return data.map((c) => ({ ...c, image: this.getImageUrl(c.image) }));
  }

  async addCupboard(
    room: string,
    name: string,
    image?: string
  ): Promise<{ id: number; name: string }> {
    return this.hass.callApi('POST', 'home_inventar/cupboards', {
      room,
      name,
      image: image || '',
    });
  }

  async updateCupboard(
    id: number,
    data: { name?: string; image?: string }
  ): Promise<void> {
    return this.hass.callApi('PATCH', 'home_inventar/cupboards', {
      id,
      ...data,
    });
  }

  async deleteCupboard(id: number): Promise<void> {
    return this.hass.callApi('DELETE', 'home_inventar/cupboards', { id });
  }

  // Shelves
  async getShelves(room: string, cupboard: string): Promise<Shelf[]> {
    const query = `room=${encodeURIComponent(
      room
    )}&cupboard=${encodeURIComponent(cupboard)}`;
    return this.hass.callApi('GET', `home_inventar/shelves?${query}`);
  }

  async addShelf(
    room: string,
    cupboard: string,
    name: string
  ): Promise<{ id: number; name: string }> {
    return this.hass.callApi('POST', 'home_inventar/shelves', {
      room,
      cupboard,
      name,
    });
  }

  async updateShelf(id: number, data: { name: string }): Promise<void> {
    return this.hass.callApi('PATCH', 'home_inventar/shelves', { id, ...data });
  }

  async deleteShelf(id: number): Promise<void> {
    return this.hass.callApi('DELETE', 'home_inventar/shelves', { id });
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
      `home_inventar/organizers?${query}`
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
    name: string
  ): Promise<{ id: number; name: string }> {
    return this.hass.callApi('POST', 'home_inventar/organizers', {
      room,
      cupboard,
      shelf,
      name,
    });
  }

  async updateOrganizer(
    id: number,
    data: { name?: string; image?: string }
  ): Promise<void> {
    return this.hass.callApi('PATCH', 'home_inventar/organizers', {
      id,
      ...data,
    });
  }

  async deleteOrganizer(id: number): Promise<void> {
    return this.hass.callApi('DELETE', 'home_inventar/organizers', { id });
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
      `home_inventar/items?${query}`
    );
    return data.map((i) => ({ ...i, image: this.getImageUrl(i.image) }));
  }

  async getAllItems(): Promise<Item[]> {
    const data = await this.hass.callApi<Item[]>(
      'GET',
      'home_inventar/all_items'
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
      quantity?: number;
      min_quantity?: number;
      track_quantity: boolean;
    }
  ): Promise<{ id: number; name: string }> {
    const body: any = { room, cupboard, shelf, ...itemData };
    if (organizer) body.organizer = organizer;

    return this.hass.callApi('POST', 'home_inventar/items', body);
  }

  async updateItem(id: number, data: any): Promise<void> {
    return this.hass.callApi('PATCH', `home_inventar/items/${id}`, data);
  }

  async updateItemQuantity(
    id: number,
    data: { quantity?: number; min_quantity?: number; track_quantity?: boolean }
  ): Promise<void> {
    return this.hass.callApi(
      'PATCH',
      `home_inventar/items/${id}/quantity`,
      data
    );
  }

  async deleteItem(id: number): Promise<void> {
    return this.hass.callApi('DELETE', `home_inventar/items/${id}`);
  }

  // Upload
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
    const url = `/api/home_inventar/upload${
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
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Upload eșuat');
    }

    const data = await response.json();
    return data.path;
  }
}
