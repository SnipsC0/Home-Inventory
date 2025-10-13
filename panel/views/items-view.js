import { attachFormToggleHandlers } from '../core/ui-utils.js';

async function loadViewsUtils() {
  const mod = await import(
    `${window.STATIC_BASE}/core/views-utils.js?v=${window.HomeInventarVersion}`
  );
  return mod.attachItemCardInteractions;
}

export async function renderItemsView(app, content) {
  const s = app.state;

  if (!s.selectedRoom || !s.selectedCupboard || !s.selectedShelf) {
    s.currentView = 'organizers';
    return app.renderView();
  }

  const organizer = s.selectedOrganizer;

  const items = await app.api
    .getItems(s.selectedRoom, s.selectedCupboard, s.selectedShelf, organizer)
    .catch((err) => {
      showAuthOrError(content, err);
      return [];
    });

  content.innerHTML = `
    <div>
      <!-- Breadcrumbs -->
      <div style="margin-bottom:16px;display:flex;align-items:center;gap:8px;color:var(--secondary-text-color);flex-wrap:wrap;">
        <button id="backBtn" style="background:none;border:none;color:var(--primary-color);cursor:pointer;font-size:1em;padding:4px 8px;">
          ← Organizatoare
        </button>
        <span>/</span>
        <span style="font-weight:600;color:var(--primary-text-color);">
          ${organizer ? organizer : '📋 Direct pe raft'}
        </span>
      </div>

      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px;flex-wrap:wrap;">
        <h3 style="margin:0;">
          ${organizer ? `🗃️ ${organizer}` : '📋 Obiecte pe raft'}
        </h3>          
        <button id="toggleAddBtn" style="padding:8px 16px;background:var(--primary-color);color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:500;">+ Adaugă Obiect</button>
      </div>

      <!-- Form de adăugare -->
      <div id="addForm" style="display:none;background:var(--card-background-color);padding:16px;border-radius:8px;margin-bottom:16px;box-shadow:0 2px 4px rgba(0,0,0,0.05);">
        <div id="quickNotice" style="display:none; background:var(--primary-color); color:white; padding:6px 10px; border-radius:6px; margin-bottom:10px; font-size:0.85em; font-weight:500;"></div>
        <input id="newItemName" placeholder="Nume obiect (ex: Orez)" style="width:100%;padding:10px;border-radius:4px;border:1px solid var(--divider-color);margin-bottom:10px;box-sizing:border-box;" />
        
        <!-- Imagine -->
        <div style="margin-bottom:10px;">
          <label style="display:block;font-size:0.9em;margin-bottom:6px;color:var(--secondary-text-color);">
            📸 Imagine (opțional)
          </label>
          <input type="file" id="itemImageInput" accept="image/*" style="width:100%;padding:8px;border-radius:4px;border:1px solid var(--divider-color);box-sizing:border-box;" />
          <div id="imagePreview" style="margin-top:10px;display:none;">
            <img id="previewImg" style="max-width:200px;max-height:200px;border-radius:8px;border:2px solid var(--divider-color);" />
          </div>
        </div>

        <!-- Tracking cantitate -->
        <div style="margin-bottom:10px;padding:12px;background:var(--secondary-background-color);border-radius:6px;">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
            <input type="checkbox" id="trackQuantityCheckbox" style="cursor:pointer;" />
            <span style="font-weight:500;">📊 Urmărește cantitatea</span>
          </label>
          
          <div id="quantityFields" style="display:none;margin-top:12px;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <div>
                <label style="display:block;font-size:0.85em;margin-bottom:4px;color:var(--secondary-text-color);">
                  Cantitate actuală
                </label>
                <input type="number" id="quantityInput" min="0" placeholder="Ex: 5" style="width:100%;padding:8px;border-radius:4px;border:1px solid var(--divider-color);box-sizing:border-box;" />
              </div>
              <div>
                <label style="display:block;font-size:0.85em;margin-bottom:4px;color:var(--secondary-text-color);">
                  Cantitate minimă
                </label>
                <input type="number" id="minQuantityInput" min="0" placeholder="Ex: 1" style="width:100%;padding:8px;border-radius:4px;border:1px solid var(--divider-color);box-sizing:border-box;" />
              </div>
            </div>
          </div>
        </div>

        <div style="display:flex;gap:10px;">
          <button id="saveBtn" style="flex:1;padding:10px;background:var(--primary-color);color:white;border:none;border-radius:4px;cursor:pointer;font-weight:500;">Salvează</button>
          <button id="cancelBtn" style="flex:1;padding:10px;background:var(--secondary-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;cursor:pointer;">Anulează</button>
        </div>
      </div>

      <!-- Grid cu items -->
      <div data-items-grid style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,200px),1fr));gap:12px;">
        ${
          items.length === 0
            ? `<p style="grid-column:1/-1;text-align:center;color:var(--secondary-text-color);padding:40px;">
                Nu există obiecte ${
                  organizer ? 'în acest organizator' : 'direct pe acest raft'
                }.
                ' Adaugă primul obiect!'
              </p>`
            : items
                .map((item) => {
                  let quantityDisplay = '';
                  if (item.track_quantity && item.quantity !== null) {
                    if (item.min_quantity !== null && item.min_quantity > 0) {
                      quantityDisplay = ` <span style="color:${
                        item.quantity <= item.min_quantity
                          ? 'var(--error-color)'
                          : 'var(--primary-color)'
                      };font-weight:600;">${item.quantity}/${
                        item.min_quantity
                      }</span>`;
                    } else {
                      quantityDisplay = ` <span style="color:var(--primary-color);font-weight:600;">${item.quantity}</span>`;
                    }
                  }

                  return `
          <div class="item-card" data-id="${
            item.id
          }" data-item='${JSON.stringify(item).replace(/'/g, '&#39;')}'
               style="background:var(--card-background-color);border-radius:8px;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,0.1);cursor:pointer;transition:all .2s;"
               onmouseenter="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)';"
               onmouseleave="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)';">
            ${
              item.image
                ? `
              <div style="width:100%;height:150px;background:var(--secondary-background-color);position:relative;overflow:hidden;">
                <img src="${item.image}" alt="${item.name}" 
                     style="width:100%;height:100%;object-fit:cover;"
                     onerror="this.style.display='none';this.parentElement.innerHTML='<div style=\\'display:flex;align-items:center;justify-content:center;height:100%;font-size:3em;\\'>📦</div>';" />
              </div>
            `
                : `
              <div style="width:100%;height:150px;background:var(--secondary-background-color);display:flex;align-items:center;justify-content:center;font-size:3em;">
                📦
              </div>
            `
            }
            
            <div style="padding:12px;">
              <div style="font-weight:600;font-size:1.05em;">
                ${item.name}${quantityDisplay}
              </div>
              
              ${
                item.aliases
                  ? `
                <div style="font-size:0.8em;color:var(--secondary-text-color);margin-top:6px;font-style:italic;">
                  aka: ${item.aliases}
                </div>
              `
                  : ''
              }
            </div>
          </div>
        `;
                })
                .join('')
        }
      </div>
    </div>
  `;

  content.querySelector('#backBtn')?.addEventListener('click', () => {
    s.currentView = 'organizers';
    s.selectedOrganizer = null;
    app.renderView();
  });

  const trackCheckbox = content.querySelector('#trackQuantityCheckbox');
  const quantityFields = content.querySelector('#quantityFields');

  trackCheckbox?.addEventListener('change', (e) => {
    quantityFields.style.display = e.target.checked ? 'block' : 'none';
  });

  // Image preview
  const imageInput = content.querySelector('#itemImageInput');
  const imagePreview = content.querySelector('#imagePreview');
  const previewImg = content.querySelector('#previewImg');

  imageInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        previewImg.src = ev.target.result;
        imagePreview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    } else {
      imagePreview.style.display = 'none';
    }
  });

  content.querySelectorAll('.item-card').forEach(async (card) => {
    const item = JSON.parse(card.dataset.item);
    const attachItemCardInteractions = await loadViewsUtils();
    attachItemCardInteractions(
      card,
      item,
      app,
      () => app.renderView(),
      organizer
    );
  });

  attachFormToggleHandlers(content, 'items', {
    addItem: async () => {
      const nameInput = content.querySelector('#newItemName');
      const imageFileInput = imageInput; // deja definit mai sus
      const quantityInput = content.querySelector('#quantityInput');
      const minQuantityInput = content.querySelector('#minQuantityInput');

      // ✅ 1. Stocăm valorile într-un BACKUP LOCAL
      const nameValue = (nameInput?.value || '').trim();
      if (!nameValue) return alert('Te rog introdu numele obiectului.');

      const trackQuantity = trackCheckbox.checked;
      const quantityValue = trackQuantity
        ? parseInt(quantityInput.value) || null
        : null;
      const minQuantityValue = trackQuantity
        ? parseInt(minQuantityInput.value) || null
        : null;
      const imageFileValue = imageFileInput?.files[0] || null; // stocăm FIȘIERUL
      let imagePath = '';

      // ✅ 2. Resetăm UI-ul imediat (UX instant, fără așteptare rețea)
      nameInput.value = '';
      if (imageFileInput) {
        imageFileInput.value = '';
        imagePreview.style.display = 'none';
      }
      trackCheckbox.checked = false;
      quantityFields.style.display = 'none';
      quantityInput.value = '';
      minQuantityInput.value = '';

      // ✅ 3. Afișăm mesaj rapid
      const notice = content.querySelector('#quickNotice');
      notice.textContent =
        'Se adaugă obiectul... Poți continua adăugarea altor obiecte.';
      notice.style.display = 'block';
      setTimeout(() => (notice.style.display = 'none'), 2000);

      // ✅ 4. FACEM upload și addItem în fundal FOLOSIND BACKUP-ul din memorie
      try {
        if (imageFileValue) {
          imagePath = await app.api.uploadImage(imageFileValue, {
            room: s.selectedRoom,
            cupboard: s.selectedCupboard,
            shelf: s.selectedShelf,
            organizer: organizer || null,
            item: nameValue,
          });
        }

        await app.api.addItem(
          s.selectedRoom,
          s.selectedCupboard,
          s.selectedShelf,
          organizer,
          {
            name: nameValue,
            image: imagePath,
            quantity: quantityValue,
            min_quantity: minQuantityValue,
            track_quantity: trackQuantity,
          }
        );

        // ✅ 5. Reîmprospătăm doar lista din grid, formularul rămâne neatins
        await refreshItemsGrid(app, content, organizer);
      } catch (err) {
        alert(`Eroare: ${err?.message || 'Adăugare eșuată'}`);
      }
    },
  });
}

async function refreshItemsGrid(app, content, organizer) {
  const s = app.state;
  const grid = content.querySelector('[data-items-grid]');
  if (!grid) return;

  const updatedItems = await app.api.getItems(
    s.selectedRoom,
    s.selectedCupboard,
    s.selectedShelf,
    organizer
  );

  if (!updatedItems || updatedItems.length === 0) {
    grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--secondary-text-color);padding:40px;">
      Nu există obiecte ${
        organizer ? 'în acest organizator' : 'direct pe acest raft'
      }.
    </p>`;
    return;
  }

  grid.innerHTML = updatedItems
    .map((item) => {
      let quantityDisplay = '';
      if (item.track_quantity && item.quantity !== null) {
        if (item.min_quantity !== null && item.min_quantity > 0) {
          quantityDisplay = ` <span style="color:${
            item.quantity <= item.min_quantity
              ? 'var(--error-color)'
              : 'var(--primary-color)'
          };font-weight:600;">${item.quantity}/${item.min_quantity}</span>`;
        } else {
          quantityDisplay = ` <span style="color:var(--primary-color);font-weight:600;">${item.quantity}</span>`;
        }
      }

      return `
      <div class="item-card" data-id="${item.id}" data-item='${JSON.stringify(
        item
      ).replace(/'/g, '&#39;')}'
          style="background:var(--card-background-color);border-radius:8px;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,0.1);cursor:pointer;transition:all .2s;">
          ${
            item.image
              ? `<div style="width:100%;height:150px;background:var(--secondary-background-color);position:relative;overflow:hidden;">
                <img src="${item.image}" style="width:100%;height:100%;object-fit:cover;" />
              </div>`
              : `<div style="width:100%;height:150px;background:var(--secondary-background-color);display:flex;align-items:center;justify-content:center;font-size:3em;">📦</div>`
          }
          <div style="padding:12px;">
            <div style="font-weight:600;font-size:1.05em;">${
              item.name
            }${quantityDisplay}</div>
          </div>
      </div>`;
    })
    .join('');

  // Reatașăm interacțiunile
  grid.querySelectorAll('.item-card').forEach(async (card) => {
    const item = JSON.parse(card.dataset.item);
    const attachItemCardInteractions = await loadViewsUtils();
    attachItemCardInteractions(
      card,
      item,
      app,
      () => refreshItemsGrid(app, content, organizer),
      organizer
    );
  });
}

function showAuthOrError(content, err) {
  if (err?.status === 401 || err?.status === 403) {
    content.innerHTML = `
      <div style="text-align:center;padding:20px;">
        <p style="color:var(--error-color);margin-bottom:16px;">Eroare de autentificare</p>
        <button onclick="location.reload()" style="padding:10px 20px;background:var(--primary-color);color:#fff;border:none;border-radius:4px;cursor:pointer;">Reîncarcă Pagina</button>
      </div>
    `;
  } else {
    content.innerHTML = `<div style="text-align:center;padding:20px;color:var(--error-color);">Eroare la încărcarea datelor</div>`;
  }
}
