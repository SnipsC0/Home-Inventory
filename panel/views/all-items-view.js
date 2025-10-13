// Funcție pentru modal de VIZUALIZARE (read-only)
function openViewModal(item) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position:fixed;top:0;left:0;right:0;bottom:0;
    background:rgba(0,0,0,0.6);display:flex;align-items:center;
    justify-content:center;z-index:9999;padding:20px;overflow-y:auto;
  `;

  // Construiește badge-ul de stoc
  let stockInfo = '';
  if (item.track_quantity) {
    const isLowStock =
      item.quantity !== null && item.quantity <= item.min_quantity;
    stockInfo = `
      <div style="background:var(--secondary-background-color);padding:14px;border-radius:8px;margin-bottom:16px;">
        <div style="font-size:0.85em;color:var(--secondary-text-color);margin-bottom:10px;font-weight:500;">
          📊 Urmărire Cantitate
        </div>
        <div style="display:flex;gap:10px;margin-bottom:10px;">
          <div style="flex:1;background:${
            isLowStock ? 'var(--error-color)' : 'var(--success-color)'
          };
                      color:white;padding:12px;border-radius:6px;text-align:center;">
            <div style="font-size:0.8em;opacity:0.9;margin-bottom:4px;">Cantitate Curentă</div>
            <div style="font-size:1.5em;font-weight:700;">${
              item.quantity ?? '?'
            }</div>
          </div>
          ${
            item.min_quantity
              ? `
          <div style="flex:1;background:var(--primary-color);color:white;padding:12px;border-radius:6px;text-align:center;">
            <div style="font-size:0.8em;opacity:0.9;margin-bottom:4px;">Cantitate Minimă</div>
            <div style="font-size:1.5em;font-weight:700;">${item.min_quantity}</div>
          </div>
          `
              : ''
          }
        </div>
        ${
          isLowStock
            ? `
        <div style="padding:10px;background:var(--error-color);color:white;
                    border-radius:6px;font-size:0.9em;text-align:center;">
          ⚠️ <strong>Stoc redus!</strong> Recomandăm reaprovizionare.
        </div>
        `
            : ''
        }
      </div>
    `;
  } else {
    stockInfo = `
      <div style="background:var(--secondary-background-color);padding:14px;border-radius:8px;margin-bottom:16px;text-align:center;">
        <div style="font-size:0.9em;color:var(--secondary-text-color);">
          📊 Cantitatea nu este urmărită pentru acest obiect
        </div>
      </div>
    `;
  }

  modal.innerHTML = `
    <div style="background:var(--card-background-color);border-radius:12px;
                padding:24px;max-width:500px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.3);
                max-height:90vh;overflow-y:auto;">
      
      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:20px;">
        <h3 style="margin:0;flex:1;font-size:1.3em;">${item.name}</h3>
        <button id="closeViewBtn" 
                style="background:none;border:none;font-size:1.5em;color:var(--secondary-text-color);
                       cursor:pointer;padding:0;line-height:1;margin-left:12px;transition:color 0.2s;">
          ✕
        </button>
      </div>

      <!-- Imagine -->
      ${
        item.image
          ? `
        <div style="margin-bottom:20px;text-align:center;">
          <img src="${item.image}" alt="${item.name}" 
               style="max-width:100%;max-height:300px;border-radius:8px;object-fit:cover;box-shadow:0 2px 8px rgba(0,0,0,0.1);" />
        </div>
      `
          : `
        <div style="margin-bottom:20px;text-align:center;">
          <div style="width:150px;height:150px;background:var(--divider-color);
                      border-radius:8px;display:flex;align-items:center;justify-content:center;
                      font-size:4em;margin:0 auto;">📦</div>
        </div>
      `
      }

      <!-- Locație -->
      <div style="background:var(--secondary-background-color);padding:14px;border-radius:8px;margin-bottom:16px;">
        <div style="font-size:0.85em;color:var(--secondary-text-color);margin-bottom:6px;font-weight:500;">
          📍 Locație
        </div>
        <div style="font-weight:600;font-size:1.05em;">${item.location}</div>
      </div>

      <!-- Aliasuri -->
      ${
        item.aliases
          ? `
        <div style="background:var(--secondary-background-color);padding:14px;border-radius:8px;margin-bottom:16px;">
          <div style="font-size:0.85em;color:var(--secondary-text-color);margin-bottom:6px;font-weight:500;">
            🏷️ Aliasuri
          </div>
          <div style="font-style:italic;color:var(--primary-text-color);">${item.aliases}</div>
        </div>
      `
          : ''
      }

      <!-- Stoc -->
      ${stockInfo}

      <!-- Footer info -->
      <div style="text-align:center;padding-top:16px;border-top:1px solid var(--divider-color);">
        <div style="font-size:0.85em;color:var(--secondary-text-color);">
          💡 Click dreapta sau touch lung pentru editare
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close button
  modal.querySelector('#closeViewBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    document.body.removeChild(modal);
  });

  // Hover effect pentru close button
  const closeBtn = modal.querySelector('#closeViewBtn');
  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.color = 'var(--error-color)';
  });
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.color = 'var(--secondary-text-color)';
  });

  // Click pe backdrop sau modal pentru închidere
  modal.addEventListener('click', (e) => {
    if (
      e.target === modal ||
      e.target.closest('div[style*="max-width:500px"]')
    ) {
      document.body.removeChild(modal);
    }
  });
}

// Funcție helper pentru modal de EDITARE
async function openEditModal(item, app, rerenderCallback) {
  // Verifică permisiunile pentru deep link
  const canModify = await app.api.canModifyStructure();
  const consumeDeepLink = `homeassistant://navigate/home_inventar?consume=${item.id}`;

  const modal = document.createElement('div');
  modal.style.cssText = `
    position:fixed;top:0;left:0;right:0;bottom:0;
    background:rgba(0,0,0,0.5);display:flex;align-items:center;
    justify-content:center;z-index:9999;padding:20px;overflow-y:auto;
  `;

  modal.innerHTML = `
    <div style="background:var(--card-background-color);border-radius:12px;
                padding:24px;max-width:600px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.3);
                max-height:90vh;overflow-y:auto;">
      <h3 style="margin:0 0 20px 0;display:flex;align-items:center;gap:8px;">
        ✏️ Editare: ${item.name}
      </h3>
      
      <!-- Locație -->
      <div style="background:var(--secondary-background-color);padding:12px;border-radius:6px;margin-bottom:16px;">
        <div style="font-size:0.85em;color:var(--secondary-text-color);margin-bottom:4px;">📍 Locație:</div>
        <div style="font-weight:600;">${item.location}</div>
      </div>

      <!-- Imagine curentă -->
      <div style="margin-bottom:16px;text-align:center;">
        ${
          item.image
            ? `<img id="currentImage" src="${item.image}" alt="${item.name}" 
                  style="max-width:400px;max-height:400px;border-radius:8px;object-fit:cover;" />`
            : `<div id="noImagePlaceholder" style="width:120px;height:120px;background:var(--divider-color);
                        border-radius:8px;display:flex;align-items:center;justify-content:center;
                        font-size:3em;margin:0 auto;">📦</div>`
        }
      </div>

      <!-- Upload imagine nouă -->
      <div style="margin-bottom:16px;">
        <label style="display:block;font-size:0.9em;margin-bottom:6px;color:var(--secondary-text-color);">
          ${item.image ? 'Schimbă' : 'Adaugă'} imagine
        </label>
        <input type="file" id="editImageUpload" accept="image/*" 
               style="width:100%;padding:8px;border:1px solid var(--divider-color);border-radius:4px;box-sizing:border-box;" />
        <div id="editUploadStatus" style="font-size:0.85em;margin-top:6px;min-height:18px;"></div>
      </div>

      <!-- Nume -->
      <div style="margin-bottom:16px;">
        <label style="display:block;font-size:0.9em;margin-bottom:6px;color:var(--secondary-text-color);">
          Nume obiect *
        </label>
        <input type="text" id="editName" value="${item.name}" 
               style="width:100%;padding:10px;border-radius:4px;border:1px solid var(--divider-color);box-sizing:border-box;" />
      </div>

      <!-- Aliasuri -->
      <div style="margin-bottom:16px;">
        <label style="display:block;font-size:0.9em;margin-bottom:6px;color:var(--secondary-text-color);">
          Aliasuri (opțional)
          <span style="font-size:0.85em;color:var(--secondary-text-color);">- separate prin virgulă</span>
        </label>
        <input type="text" id="editAliases" value="${item.aliases || ''}" 
               placeholder="ex: cutie albastră, container mare"
               style="width:100%;padding:10px;border-radius:4px;border:1px solid var(--divider-color);box-sizing:border-box;" />
      </div>

      <!-- Separator -->
      <div style="border-top:1px solid var(--divider-color);margin:20px 0;"></div>

      <!-- Tracking cantitate -->
      <div style="margin-bottom:16px;">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
          <input type="checkbox" id="trackQty" ${
            item.track_quantity ? 'checked' : ''
          }
                 style="width:18px;height:18px;cursor:pointer;" />
          <span style="font-weight:500;">Urmărește cantitatea pentru acest obiect</span>
        </label>
      </div>

      <div id="qtyFields" style="display:${
        item.track_quantity ? 'block' : 'none'
      };">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
          <div>
            <label style="display:block;font-size:0.9em;margin-bottom:6px;color:var(--secondary-text-color);">
              Cantitate curentă
            </label>
            <input type="number" id="currentQty" value="${
              item.quantity ?? ''
            }" min="0"
                   placeholder="Ex: 5"
                   style="width:100%;padding:10px;border-radius:4px;border:1px solid var(--divider-color);box-sizing:border-box;" />
          </div>

          <div>
            <label style="display:block;font-size:0.9em;margin-bottom:6px;color:var(--secondary-text-color);">
              Cantitate minimă (alertă)
            </label>
            <input type="number" id="minQty" value="${
              item.min_quantity ?? ''
            }" min="0"
                   placeholder="Ex: 2"
                   style="width:100%;padding:10px;border-radius:4px;border:1px solid var(--divider-color);box-sizing:border-box;" />
          </div>
        </div>

        <!-- Deep Link pentru Consumare -->
        ${
          canModify
            ? `
        <div id="deepLinkSection" style="background:var(--info-color);color:white;padding:14px;border-radius:8px;margin-bottom:16px;">
          <div style="font-weight:600;margin-bottom:10px;display:flex;align-items:center;gap:6px;">
            <span style="font-size:1.2em;">📱</span>
            <span>Deep Link pentru Scădere Cantitate</span>
          </div>
          
          <div style="background:rgba(0,0,0,0.15);padding:10px;border-radius:6px;margin-bottom:10px;">
            <div style="font-size:0.85em;opacity:0.9;margin-bottom:6px;">🔗 Link aplicație:</div>
            <div style="font-family:monospace;font-size:0.75em;word-break:break-all;line-height:1.4;user-select:all;">
              ${consumeDeepLink}
            </div>
          </div>

          <button id="copyDeepLinkBtn"
                  style="width:100%;padding:8px;background:rgba(255,255,255,0.2);
                         color:white;border:1px solid rgba(255,255,255,0.3);
                         border-radius:4px;cursor:pointer;font-size:0.85em;
                         transition:all 0.2s;">
            📋 Copiază Link
          </button>

          <div style="font-size:0.8em;opacity:0.9;margin-top:10px;line-height:1.4;">
            💡 <strong>Cum funcționează:</strong><br/>
            • Generează un cod QR din acest link<br/>
            • Scanează QR-ul când folosești obiectul<br/>
            • Cantitatea se va scădea automat cu 1
          </div>
        </div>
        `
            : ''
        }

        <div style="background:var(--secondary-background-color);padding:12px;border-radius:6px;font-size:0.9em;">
          💡 <strong>Notă:</strong> Vei primi notificări automate când cantitatea ajunge sub minimul setat.
        </div>
      </div>

      <div style="display:flex;gap:10px;margin-top:20px;margin-bottom:10px;">
        <button id="saveQtyBtn" 
                style="flex:1;padding:12px;background:var(--primary-color);color:white;
                       border:none;border-radius:4px;cursor:pointer;font-weight:500;">
          💾 Salvează Modificările
        </button>
        <button id="cancelQtyBtn"
                style="flex:1;padding:12px;background:var(--secondary-background-color);
                       color:var(--primary-text-color);border:1px solid var(--divider-color);
                       border-radius:4px;cursor:pointer;">
          Anulează
        </button>
      </div>

      <button id="deleteItemBtn"
              style="width:100%;padding:12px;background:var(--error-color);color:white;
                     border:none;border-radius:4px;cursor:pointer;font-weight:500;">
        🗑️ Șterge Obiect
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  const trackQtyCheckbox = modal.querySelector('#trackQty');
  const qtyFields = modal.querySelector('#qtyFields');

  trackQtyCheckbox.addEventListener('change', () => {
    qtyFields.style.display = trackQtyCheckbox.checked ? 'block' : 'none';
  });

  // Copy Deep Link
  const copyBtn = modal.querySelector('#copyDeepLinkBtn');
  copyBtn?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(consumeDeepLink);
      copyBtn.textContent = '✓ Copiat!';
      copyBtn.style.background = 'rgba(16, 185, 129, 0.3)';
      setTimeout(() => {
        copyBtn.textContent = '📋 Copiază Link';
        copyBtn.style.background = 'rgba(255,255,255,0.2)';
      }, 2000);
    } catch (err) {
      alert('Nu s-a putut copia: ' + err.message);
    }
  });

  // Preview imagine nouă
  const fileInput = modal.querySelector('#editImageUpload');
  const currentImage = modal.querySelector('#currentImage');
  const placeholder = modal.querySelector('#noImagePlaceholder');

  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (currentImage) {
          currentImage.src = event.target.result;
        } else if (placeholder) {
          const img = document.createElement('img');
          img.id = 'currentImage';
          img.src = event.target.result;
          img.style.cssText =
            'max-width:200px;max-height:200px;border-radius:8px;object-fit:cover;';
          placeholder.parentNode.replaceChild(img, placeholder);
        }
      };
      reader.readAsDataURL(file);
    }
  });

  modal.querySelector('#cancelQtyBtn').addEventListener('click', () => {
    document.body.removeChild(modal);
  });

  modal.querySelector('#saveQtyBtn').addEventListener('click', async () => {
    const name = modal.querySelector('#editName').value.trim();
    const aliases = modal.querySelector('#editAliases').value.trim();
    const trackQuantity = trackQtyCheckbox.checked;
    const quantity = trackQuantity
      ? parseInt(modal.querySelector('#currentQty').value) || null
      : null;
    const min_quantity = trackQuantity
      ? parseInt(modal.querySelector('#minQty').value) || null
      : null;
    const imageFile = modal.querySelector('#editImageUpload').files[0];
    const uploadStatus = modal.querySelector('#editUploadStatus');

    if (!name) {
      return alert('Numele obiectului este obligatoriu.');
    }

    try {
      // Extrage doar filename-ul din URL-ul curent
      let imagePath = '';
      if (item.image && item.image.includes('/api/home_inventar/images/')) {
        const parts = item.image.split('/');
        imagePath = parts[parts.length - 1].split('?')[0];
      } else if (item.image && !item.image.startsWith('/local/')) {
        imagePath = item.image;
      }

      // Upload imagine nouă dacă există
      if (imageFile) {
        uploadStatus.textContent = 'Se încarcă imaginea...';
        uploadStatus.style.color = 'var(--primary-color)';

        // Extrage locația din item.location (format: "Camera › Dulap › Raft")
        const locationMatch = item.location?.match(/^(.+?) › (.+?) › (.+?)$/);
        const room = locationMatch?.[1] || '';
        const cupboard = locationMatch?.[2] || '';
        const shelf = locationMatch?.[3] || '';

        imagePath = await app.api.uploadImage(imageFile, {
          room: room,
          cupboard: cupboard,
          shelf: shelf,
          item: name,
          old_image: imagePath,
        });
        uploadStatus.textContent = '✓ Imagine încărcată';
        uploadStatus.style.color = 'var(--success-color)';
      }

      uploadStatus.textContent = 'Se salvează modificările...';
      uploadStatus.style.color = 'var(--primary-color)';

      await app.api.updateItem(item.id, {
        name,
        aliases,
        image: imagePath,
        track_quantity: trackQuantity,
        quantity,
        min_quantity: min_quantity,
      });

      uploadStatus.textContent = '✓ Salvat cu succes!';
      uploadStatus.style.color = 'var(--success-color)';

      // Update local item
      item.name = name;
      item.aliases = aliases;
      item.image = imagePath ? app.api._getImageUrl(imagePath) : item.image;
      item.track_quantity = trackQuantity;
      item.quantity = quantity;
      item.min_quantity = min_quantity;

      setTimeout(() => {
        document.body.removeChild(modal);
        rerenderCallback();
      }, 500);
    } catch (err) {
      console.error('Error updating item:', err);
      uploadStatus.textContent = `✗ Eroare: ${
        err?.message || 'Salvare eșuată'
      }`;
      uploadStatus.style.color = 'var(--error-color)';
    }
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
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
    itemsList.querySelectorAll('.item-card').forEach((card) => {
      let longPressTimer = null;
      let longPressTriggered = false;
      let touchStartTime = 0;

      const itemId = card.dataset.id;
      const item = items.find((i) => i.id == itemId);

      // ---- DESKTOP: Click simplu = view modal ----
      card.addEventListener('click', (e) => {
        // Ignoră dacă s-a apăsat pe butoanele +/-
        if (
          e.target.closest('.qty-plus-btn') ||
          e.target.closest('.qty-minus-btn')
        ) {
          return;
        }
        openViewModal(item);
      });

      // ---- DESKTOP: Click dreapta = edit modal ----
      card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (
          !e.target.closest('.qty-plus-btn') &&
          !e.target.closest('.qty-minus-btn')
        ) {
          openEditModal(item, app, renderItemsList);
        }
      });

      // ---- MOBILE: Touch lung = edit modal ----
      card.addEventListener(
        'touchstart',
        (e) => {
          // Ignoră dacă e pe butoane
          if (
            e.target.closest('.qty-plus-btn') ||
            e.target.closest('.qty-minus-btn')
          ) {
            return;
          }

          longPressTriggered = false;
          touchStartTime = Date.now();

          longPressTimer = setTimeout(() => {
            longPressTriggered = true;
            openEditModal(item, app, renderItemsList);
          }, 500); // 500ms = long press
        },
        { passive: true }
      );

      card.addEventListener('touchend', (e) => {
        clearTimeout(longPressTimer);

        // Touch scurt = view modal
        if (
          !longPressTriggered &&
          Date.now() - touchStartTime < 300 &&
          !e.target.closest('.qty-plus-btn') &&
          !e.target.closest('.qty-minus-btn')
        ) {
          openViewModal(item);
        }
      });

      card.addEventListener('touchmove', () => {
        clearTimeout(longPressTimer);
      });

      // Hover effects (doar desktop)
      card.addEventListener('mouseenter', (e) => {
        if (
          !e.target.closest('.qty-plus-btn') &&
          !e.target.closest('.qty-minus-btn')
        ) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
        }
      });
      card.addEventListener('mouseleave', (e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
      });
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
