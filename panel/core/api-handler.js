export class Api {
  constructor(hass) {
    this.hass = hass;
    this.config = null;
  }

  async loadConfig() {
    if (this.config) return this.config;

    try {
      this.config = await this.hass.callApi('GET', 'home_inventar/config');
      return this.config;
    } catch (error) {
      console.error('Error loading config:', error);
      this.config = {
        allow_structure_modification: true,
        qr_redirect_url: null,
      };
      return this.config;
    }
  }

  async canModifyStructure() {
    const config = await this.loadConfig();
    return config.allow_structure_modification;
  }

  async getQRRedirectUrl() {
    const config = await this.loadConfig();
    return config.qr_redirect_url;
  }

  _getImageUrl(imagePath) {
    if (!imagePath) {
      return '';
    }

    if (imagePath.includes('access_token=')) {
      return imagePath;
    }

    if (imagePath.startsWith('/local/')) {
      return imagePath;
    }

    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }

    if (imagePath.startsWith('/api/home_inventar/images/')) {
      const token =
        this.hass?.auth?.data?.access_token ||
        this.hass?.connection?.options?.accessToken ||
        '';
      const sep = imagePath.includes('?') ? '&' : '?';
      const finalUrl = `${imagePath}${sep}access_token=${token}`;

      return finalUrl;
    }

    const filename = imagePath.split('/').pop();
    const token =
      this.hass?.auth?.data?.access_token ||
      this.hass?.connection?.options?.accessToken;
    const finalUrl = `/api/home_inventar/images/${filename}?access_token=${token}`;
    return finalUrl;
  }

  async getRooms() {
    return this.hass.callApi('GET', 'home_inventar/rooms');
  }

  async addRoom(name) {
    return this.hass.callApi('POST', 'home_inventar/rooms', { name });
  }

  async updateRoom(roomId, data) {
    return this.hass.callApi('PATCH', 'home_inventar/rooms', {
      id: roomId,
      ...data,
    });
  }

  async deleteRoom(roomId) {
    return this.hass.callApi('DELETE', 'home_inventar/rooms', {
      id: roomId,
    });
  }

  async getCupboards(room) {
    const data = await this.hass.callApi(
      'GET',
      `home_inventar/cupboards?room=${encodeURIComponent(room)}`
    );

    const result = data.map((c) => {
      const processedImage = this._getImageUrl(c.image);
      return { ...c, image: processedImage };
    });

    return result;
  }

  async addCupboard(room, name, image = '') {
    return this.hass.callApi('POST', 'home_inventar/cupboards', {
      room,
      name,
      image,
    });
  }

  async updateCupboard(cupboardId, data) {
    return this.hass.callApi('PATCH', 'home_inventar/cupboards', {
      id: cupboardId,
      ...data,
    });
  }

  async deleteCupboard(cupboardId) {
    return this.hass.callApi('DELETE', 'home_inventar/cupboards', {
      id: cupboardId,
    });
  }

  async getShelves(room, cupboard) {
    const q = `room=${encodeURIComponent(room)}&cupboard=${encodeURIComponent(
      cupboard
    )}`;
    return this.hass.callApi('GET', `home_inventar/shelves?${q}`);
  }

  async addShelf(room, cupboard, name) {
    return this.hass.callApi('POST', 'home_inventar/shelves', {
      room,
      cupboard,
      name,
    });
  }

  async updateShelf(shelfId, data) {
    return this.hass.callApi('PATCH', 'home_inventar/shelves', {
      id: shelfId,
      ...data,
    });
  }

  async deleteShelf(shelfId) {
    return this.hass.callApi('DELETE', 'home_inventar/shelves', {
      id: shelfId,
    });
  }

  async getOrganizers(room, cupboard, shelf) {
    const q = `room=${encodeURIComponent(room)}&cupboard=${encodeURIComponent(
      cupboard
    )}&shelf=${encodeURIComponent(shelf)}`;
    const data = await this.hass.callApi(
      'GET',
      `home_inventar/organizers?${q}`
    );

    if (data.organizers) {
      data.organizers = data.organizers.map((o) => {
        const processedImage = this._getImageUrl(o.image);
        return { ...o, image: processedImage };
      });
    }

    return data;
  }

  async addOrganizer(room, cupboard, shelf, name) {
    return this.hass.callApi('POST', 'home_inventar/organizers', {
      room,
      cupboard,
      shelf,
      name,
    });
  }

  async updateOrganizer(organizerId, data) {
    return this.hass.callApi('PATCH', 'home_inventar/organizers', {
      id: organizerId,
      ...data,
    });
  }

  async deleteOrganizer(organizerId) {
    return this.hass.callApi('DELETE', 'home_inventar/organizers', {
      id: organizerId,
    });
  }

  async getItems(room, cupboard, shelf, organizer = null) {
    let q = `room=${encodeURIComponent(room)}&cupboard=${encodeURIComponent(
      cupboard
    )}&shelf=${encodeURIComponent(shelf)}`;

    if (organizer) {
      q += `&organizer=${encodeURIComponent(organizer)}`;
    }

    const data = await this.hass.callApi('GET', `home_inventar/items?${q}`);

    const result = data.map((i) => {
      const processedImage = this._getImageUrl(i.image);
      return { ...i, image: processedImage };
    });

    return result;
  }

  async getAllItems() {
    const data = await this.hass.callApi('GET', 'home_inventar/all_items');

    const result = data.map((i) => {
      if (i.image) {
        const processedImage = this._getImageUrl(i.image);
        return { ...i, image: processedImage };
      }
      return i;
    });

    return result;
  }

  async addItem(room, cupboard, shelf, organizer, itemData) {
    const body = {
      room,
      cupboard,
      shelf,
      ...itemData,
    };

    if (organizer) {
      body.organizer = organizer;
    }

    return this.hass.callApi('POST', 'home_inventar/items', body);
  }

  async updateItem(itemId, data) {
    return this.hass.callApi('PATCH', `home_inventar/items/${itemId}`, data);
  }

  async updateItemQuantity(itemId, data) {
    return this.hass.callApi(
      'PATCH',
      `home_inventar/items/${itemId}/quantity`,
      data
    );
  }

  async deleteItem(id) {
    return this.hass.callApi('DELETE', `home_inventar/items/${id}`);
  }

  async uploadImage(file, context = {}) {
    const formData = new FormData();
    formData.append('file', file);

    const params = new URLSearchParams();
    if (context.room) params.append('room', context.room);
    if (context.cupboard) params.append('cupboard', context.cupboard);
    if (context.organizer) params.append('organizer', context.organizer);
    if (context.shelf) params.append('shelf', context.shelf);
    if (context.item) params.append('item', context.item);
    if (context.old_image) params.append('old_image', context.old_image);

    const queryString = params.toString();
    const url = `/api/home_inventar/upload${
      queryString ? '?' + queryString : ''
    }`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.hass.auth.data.access_token}` },
      body: formData,
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error(
          'Sesiune expirată. Te rugăm să te autentifici din nou.'
        );
      }
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Upload eșuat');
    }
    const data = await res.json();
    return data.path;
  }
}
