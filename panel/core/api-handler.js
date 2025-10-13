export class Api {
  constructor(hass) {
    this.hass = hass;
    this.config = null;
    console.log('=== API Handler v2.2 initialized ===');
    console.log('HASS available:', !!this.hass);
    console.log('HASS auth available:', !!this.hass?.auth);
    console.log('Token available:', !!this.hass?.auth?.data?.access_token);
    if (this.hass?.auth?.data?.access_token) {
      console.log(
        'Token preview:',
        this.hass.auth.data.access_token.substring(0, 30) + '...'
      );
    }
  }

  // Încarcă configurația de la server
  async loadConfig() {
    if (this.config) return this.config;

    try {
      this.config = await this.hass.callApi('GET', 'home_inventar/config');
      console.log('Config loaded:', this.config);
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

  // Verifică dacă modificarea structurii este permisă
  async canModifyStructure() {
    const config = await this.loadConfig();
    return config.allow_structure_modification;
  }

  // Obține URL-ul de redirect pentru QR
  async getQRRedirectUrl() {
    const config = await this.loadConfig();
    return config.qr_redirect_url;
  }

  // Convertește path-ul imaginii pentru afișare cu token de autentificare
  _getImageUrl(imagePath) {
    console.log('>>> _getImageUrl v2.2 called with:', imagePath);

    if (!imagePath) {
      console.log('>>> Empty image path');
      return '';
    }

    if (imagePath.includes('access_token=')) {
      console.log('>>> Token already present, returning as-is');
      return imagePath;
    }

    if (imagePath.startsWith('/local/')) {
      console.log('>>> Old local image');
      return imagePath;
    }

    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      console.log('>>> Absolute URL');
      return imagePath;
    }

    if (imagePath.startsWith('/api/home_inventar/images/')) {
      const token =
        this.hass?.auth?.data?.access_token ||
        this.hass?.connection?.options?.accessToken ||
        '';
      const sep = imagePath.includes('?') ? '&' : '?';
      const finalUrl = `${imagePath}${sep}access_token=${token}`;
      console.log(
        '>>> Already full path, added token only:',
        finalUrl.substring(0, 100) + '...'
      );
      return finalUrl;
    }

    const filename = imagePath.split('/').pop();
    const token =
      this.hass?.auth?.data?.access_token ||
      this.hass?.connection?.options?.accessToken;
    const finalUrl = `/api/home_inventar/images/${filename}?access_token=${token}`;
    console.log('>>> Built new image URL:', finalUrl.substring(0, 100) + '...');
    return finalUrl;
  }

  // ==================== ROOMS ====================
  async getRooms() {
    return this.hass.callApi('GET', 'home_inventar/rooms');
  }

  async addRoom(name) {
    return this.hass.callApi('POST', 'home_inventar/rooms', { name });
  }

  async updateRoom(roomId, data) {
    console.log('=== updateRoom called ===', roomId, data);
    return this.hass.callApi('PATCH', 'home_inventar/rooms', {
      id: roomId,
      ...data,
    });
  }

  async deleteRoom(roomId) {
    console.log('=== deleteRoom called ===', roomId);
    return this.hass.callApi('DELETE', 'home_inventar/rooms', {
      id: roomId,
    });
  }

  // ==================== CUPBOARDS ====================
  async getCupboards(room) {
    console.log('=== getCupboards v2.0 ===');
    const data = await this.hass.callApi(
      'GET',
      `home_inventar/cupboards?room=${encodeURIComponent(room)}`
    );
    console.log('Raw cupboards data:', data);

    const result = data.map((c) => {
      console.log(`Processing cupboard: ${c.name}, image: ${c.image}`);
      const processedImage = this._getImageUrl(c.image);
      console.log(`Result image: ${processedImage?.substring(0, 80)}...`);
      return { ...c, image: processedImage };
    });

    console.log('Final cupboards:', result);
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
    console.log('=== updateCupboard called ===', cupboardId, data);
    return this.hass.callApi('PATCH', 'home_inventar/cupboards', {
      id: cupboardId,
      ...data,
    });
  }

  async deleteCupboard(cupboardId) {
    console.log('=== deleteCupboard called ===', cupboardId);
    return this.hass.callApi('DELETE', 'home_inventar/cupboards', {
      id: cupboardId,
    });
  }

  // ==================== SHELVES ====================
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
    console.log('=== updateShelf called ===', shelfId, data);
    return this.hass.callApi('PATCH', 'home_inventar/shelves', {
      id: shelfId,
      ...data,
    });
  }

  async deleteShelf(shelfId) {
    console.log('=== deleteShelf called ===', shelfId);
    return this.hass.callApi('DELETE', 'home_inventar/shelves', {
      id: shelfId,
    });
  }

  // ==================== ORGANIZERS ====================
  async getOrganizers(room, cupboard, shelf) {
    console.log('=== getOrganizers v2.1 ===');
    const q = `room=${encodeURIComponent(room)}&cupboard=${encodeURIComponent(
      cupboard
    )}&shelf=${encodeURIComponent(shelf)}`;
    const data = await this.hass.callApi(
      'GET',
      `home_inventar/organizers?${q}`
    );
    console.log('Raw organizers data:', data);

    // Procesează imaginile pentru organizatoare
    if (data.organizers) {
      data.organizers = data.organizers.map((o) => {
        console.log(`Processing organizer: ${o.name}, image: ${o.image}`);
        const processedImage = this._getImageUrl(o.image);
        console.log(`Result image: ${processedImage?.substring(0, 80)}...`);
        return { ...o, image: processedImage };
      });
    }

    console.log('Final organizers:', data);
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
    console.log('=== updateOrganizer called ===', organizerId, data);
    return this.hass.callApi('PATCH', 'home_inventar/organizers', {
      id: organizerId,
      ...data,
    });
  }

  async deleteOrganizer(organizerId) {
    console.log('=== deleteOrganizer called ===', organizerId);
    return this.hass.callApi('DELETE', 'home_inventar/organizers', {
      id: organizerId,
    });
  }

  // ==================== ITEMS ====================
  async getItems(room, cupboard, shelf, organizer = null) {
    console.log('=== getItems v2.1 ===');
    let q = `room=${encodeURIComponent(room)}&cupboard=${encodeURIComponent(
      cupboard
    )}&shelf=${encodeURIComponent(shelf)}`;

    // Adaugă organizer doar dacă nu e null
    if (organizer) {
      q += `&organizer=${encodeURIComponent(organizer)}`;
    }

    const data = await this.hass.callApi('GET', `home_inventar/items?${q}`);
    console.log('Raw items data:', data);

    const result = data.map((i) => {
      console.log(`Processing item: ${i.name}, image: ${i.image}`);
      const processedImage = this._getImageUrl(i.image);
      console.log(`Result image: ${processedImage?.substring(0, 80)}...`);
      return { ...i, image: processedImage };
    });

    console.log('Final items:', result);
    return result;
  }

  async getAllItems() {
    console.log('=== getAllItems v2.0 ===');
    const data = await this.hass.callApi('GET', 'home_inventar/all_items');
    console.log('Raw all items data:', data);

    const result = data.map((i) => {
      if (i.image) {
        console.log(`Processing item: ${i.name}, image: ${i.image}`);
        const processedImage = this._getImageUrl(i.image);
        console.log(`Result image: ${processedImage?.substring(0, 80)}...`);
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

    // Adaugă organizer doar dacă nu e null
    if (organizer) {
      body.organizer = organizer;
    }

    return this.hass.callApi('POST', 'home_inventar/items', body);
  }

  async updateItem(itemId, data) {
    console.log('=== updateItem called ===', itemId, data);
    return this.hass.callApi('PATCH', `home_inventar/items/${itemId}`, data);
  }

  async updateItemQuantity(itemId, data) {
    console.log('=== updateItemQuantity called ===', itemId, data);
    return this.hass.callApi(
      'PATCH',
      `home_inventar/items/${itemId}/quantity`,
      data
    );
  }

  async deleteItem(id) {
    console.log('=== deleteItem called ===', id);
    return this.hass.callApi('DELETE', `home_inventar/items/${id}`);
  }

  // ==================== UPLOAD ====================
  async uploadImage(file, context = {}) {
    const formData = new FormData();
    formData.append('file', file);

    // Construiește query string cu context pentru denumire inteligentă
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
    console.log('Upload response:', data);
    return data.path;
  }
}
