async function loadViewsUtils() {
  const mod = await import(
    `${window.STATIC_BASE}/core/views-utils.js?v=${window.HomeInventarVersion}`
  );
  return mod.attachItemCardInteractions;
}

export async function renderAllItemsView(app, content) {
  const items = await app.api.getAllItems().catch((err) => {
    showAuthOrError(content, err);
    return [];
  });

  content.innerHTML = `
    <div>
      <div style="margin-bottom:16px;display:flex;align-items:center;gap:8px;color:var(--secondary-text-color);flex-wrap:wrap;">
        <button id="backBtn" style="background:none;border:none;color:var(--primary-color);cursor:pointer;font-size:1em;padding:4px 8px;">← Camere</button>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px;flex-wrap:wrap;">
        <h3 style="margin:0;">📦 Toate Obiectele</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <span style="color:var(--secondary-text-color);font-size:0.9em;" id="itemCount">0 obiecte</span>
        </div>
      </div>

      <!-- Filtre -->
      <div style="background:var(--card-background-color);padding:16px;border-radius:8px;margin-bottom:16px;box-shadow:0 2px 4px rgba(0,0,0,0.05);">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">
          <div>
            <label style="display:block;font-size:0.9em;margin-bottom:6px;color:var(--secondary-text-color);">Caută obiect</label>
            <input id="searchInput" type="text" placeholder="Nume obiect..." 
                   style="width:100%;padding:10px;border-radius:4px;border:1px solid var(--divider-color);box-sizing:border-box;" />
          </div>
          
          <div>
            <label style="display:block;font-size:0.9em;margin-bottom:6px;color:var(--secondary-text-color);">Cameră</label>
            <select id="roomFilter" style="width:100%;padding:10px;border-radius:4px;border:1px solid var(--divider-color);box-sizing:border-box;">
              <option value="all">Toate Camerele</option>
            </select>
          </div>
          
          <div>
            <label style="display:block;font-size:0.9em;margin-bottom:6px;color:var(--secondary-text-color);">Sortare</label>
            <select id="sortSelect" style="width:100%;padding:10px;border-radius:4px;border:1px solid var(--divider-color);box-sizing:border-box;">
              <option value="name-asc">Nume (A-Z)</option>
              <option value="name-desc">Nume (Z-A)</option>
              <option value="newest">Cel mai recent</option>
              <option value="room">Cameră</option>
              <option value="low-stock">Stoc redus</option>
            </select>
          </div>

          <div>
            <label style="display:block;font-size:0.9em;margin-bottom:6px;color:var(--secondary-text-color);">Stare stoc</label>
            <select id="stockFilter" style="width:100%;padding:10px;border-radius:4px;border:1px solid var(--divider-color);box-sizing:border-box;">
              <option value="all">Toate</option>
              <option value="tracked">Cu urmărire</option>
              <option value="low">Stoc redus</option>
              <option value="ok">Stoc OK</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Lista obiecte -->
      <div id="itemsList" style="display:grid;gap:12px;"></div>
    </div>
  `;

  // Populează filtrul de camere
  const roomFilter = content.querySelector('#roomFilter');
  const rooms = [...new Set(items.map((i) => i.room))].sort();
  rooms.forEach((room) => {
    const opt = document.createElement('option');
    opt.value = room;
    opt.textContent = room;
    roomFilter.appendChild(opt);
  });

  // Back button
  content.querySelector('#backBtn')?.addEventListener('click', () => {
    app.state.currentView = 'rooms';
    app.renderView();
  });

  // Funcție de render listă
  function renderItemsList() {
    const searchTerm = content
      .querySelector('#searchInput')
      .value.toLowerCase();
    const roomFilter = content.querySelector('#roomFilter').value;
    const sortBy = content.querySelector('#sortSelect').value;
    const stockFilter = content.querySelector('#stockFilter').value;

    let filtered = items.filter((item) => {
      if (searchTerm) {
        const nameMatch = item.name?.toLowerCase().includes(searchTerm);
        const aliasMatch = item.aliases
          ?.toLowerCase()
          .split(',')
          .some((alias) => alias.trim().includes(searchTerm));
        if (!nameMatch && !aliasMatch) return false;
      }
      if (roomFilter !== 'all' && item.room !== roomFilter) {
        return false;
      }
      if (stockFilter === 'tracked' && !item.track_quantity) {
        return false;
      }
      if (
        stockFilter === 'low' &&
        (!item.track_quantity || item.quantity > item.min_quantity)
      ) {
        return false;
      }
      if (
        stockFilter === 'ok' &&
        item.track_quantity &&
        item.quantity <= item.min_quantity
      ) {
        return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'room':
          return a.room.localeCompare(b.room) || a.name.localeCompare(b.name);
        case 'low-stock':
          const aLow = a.track_quantity && a.quantity <= a.min_quantity ? 1 : 0;
          const bLow = b.track_quantity && b.quantity <= b.min_quantity ? 1 : 0;
          return bLow - aLow || a.name.localeCompare(b.name);
        case 'newest':
        default:
          return 0;
      }
    });

    content.querySelector(
      '#itemCount'
    ).textContent = `${filtered.length} obiecte`;

    const itemsList = content.querySelector('#itemsList');
    if (filtered.length === 0) {
      itemsList.innerHTML = `
        <p style="text-align:center;color:var(--secondary-text-color);padding:40px;">
          Nu s-au găsit obiecte cu aceste filtre.
        </p>
      `;
      return;
    }

    itemsList.innerHTML = filtered
      .map((item) => {
        const isLowStock =
          item.track_quantity &&
          item.quantity !== null &&
          item.quantity <= item.min_quantity;
        const stockBadge = item.track_quantity
          ? `<span style="padding:4px 8px;border-radius:4px;font-size:0.85em;font-weight:500;
                      background:${
                        isLowStock
                          ? 'var(--error-color)'
                          : 'var(--success-color)'
                      };
                      color:white;">
            ${item.quantity ?? '?'} ${
              item.min_quantity ? `/ min ${item.min_quantity}` : ''
            }
          </span>`
          : '';

        return `
        <div class="item-card" data-id="${item.id}" 
             style="display:flex;align-items:center;gap:12px;padding:12px;
                    background:var(--card-background-color);border-radius:8px;
                    box-shadow:0 2px 4px rgba(0,0,0,0.1);
                    ${
                      isLowStock
                        ? 'border-left:4px solid var(--error-color);'
                        : ''
                    }
                    cursor:pointer;transition:transform 0.2s,box-shadow 0.2s;
                    user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;">
          ${
            item.image
              ? `<img src="${item.image}" alt="${item.name}" 
                    style="width:60px;height:60px;object-fit:cover;border-radius:6px;flex-shrink:0;" />`
              : `<div style="width:60px;height:60px;background:var(--divider-color);
                          border-radius:6px;display:flex;align-items:center;
                          justify-content:center;font-size:1.5em;flex-shrink:0;">📦</div>`
          }
          <div style="flex-grow:1;min-width:0;">
            <div style="font-weight:600;margin-bottom:4px;word-wrap:break-word;">${
              item.name
            }</div>
            <div style="font-size:0.85em;color:var(--secondary-text-color);margin-bottom:4px;">
              📍 ${item.location}
            </div>
            ${stockBadge}
          </div>
          <div style="display:flex;gap:8px;flex-shrink:0;align-items:center;">
            ${
              item.track_quantity
                ? `
            <button data-id="${item.id}" class="qty-minus-btn"
                    style="width:36px;height:36px;background:var(--error-color);color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:1.2em;font-weight:bold;display:flex;align-items:center;justify-content:center;">
              −
            </button>
            <button data-id="${item.id}" class="qty-plus-btn"
                    style="width:36px;height:36px;background:var(--success-color);color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:1.2em;font-weight:bold;display:flex;align-items:center;justify-content:center;">
              +
            </button>
            `
                : ''
            }
          </div>
        </div>
      `;
      })
      .join('');

    // Event handlers pentru carduri
    itemsList.querySelectorAll('.item-card').forEach(async (card) => {
      const itemId = card.dataset.id;
      const item = items.find((i) => i.id == itemId);

      const attachItemCardInteractions = await loadViewsUtils();
      attachItemCardInteractions(card, item, app, renderItemsList);
    });

    // Butoane + pentru creștere cantitate
    itemsList.querySelectorAll('.qty-plus-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const item = items.find((i) => i.id == id);

        if (!item || !item.track_quantity) return;

        const newQuantity = (item.quantity || 0) + 1;

        try {
          await app.api.updateItem(item.id, {
            quantity: newQuantity,
          });

          item.quantity = newQuantity;
          renderItemsList();
        } catch (err) {
          alert(`Nu s-a putut actualiza cantitatea: ${err?.message || ''}`);
        }
      });
    });

    // Butoane - pentru scădere cantitate
    itemsList.querySelectorAll('.qty-minus-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const item = items.find((i) => i.id == id);

        if (!item || !item.track_quantity) return;

        const newQuantity = Math.max(0, (item.quantity || 0) - 1);

        try {
          await app.api.updateItem(item.id, {
            quantity: newQuantity,
          });

          item.quantity = newQuantity;
          renderItemsList();
        } catch (err) {
          alert(`Nu s-a putut actualiza cantitatea: ${err?.message || ''}`);
        }
      });
    });
  }

  content
    .querySelector('#searchInput')
    .addEventListener('input', renderItemsList);
  content
    .querySelector('#roomFilter')
    .addEventListener('change', renderItemsList);
  content
    .querySelector('#sortSelect')
    .addEventListener('change', renderItemsList);
  content
    .querySelector('#stockFilter')
    .addEventListener('change', renderItemsList);

  renderItemsList();
}

function showAuthOrError(content, err) {
  if (err?.status === 401 || err?.status === 403) {
    content.innerHTML = `
      <div style="text-align:center;padding:20px;">
        <p style="color:var(--error-color);margin-bottom:16px;">Eroare de autentificare</p>
        <button onclick="location.reload()" 
                style="padding:10px 20px;background:var(--primary-color);color:#fff;
                       border:none;border-radius:4px;cursor:pointer;">
          Reîncarcă Pagina
        </button>
      </div>
    `;
  } else {
    content.innerHTML = `
      <div style="text-align:center;padding:20px;color:var(--error-color);">
        Eroare la încărcarea datelor
      </div>
    `;
  }
}
