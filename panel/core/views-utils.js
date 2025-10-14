function openViewModal(item) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position:fixed;top:0;left:0;right:0;bottom:0;
    background:rgba(0,0,0,0.6);display:flex;align-items:center;
    justify-content:center;z-index:9999;padding:20px;overflow-y:auto;
  `;

  const stockInfo = buildStockInfoSection(item);

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
      ${buildImageSection(item, false)}

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

  const closeBtn = modal.querySelector('#closeViewBtn');
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    document.body.removeChild(modal);
  });

  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.color = 'var(--error-color)';
  });
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.color = 'var(--secondary-text-color)';
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}

async function openEditModal(item, app, rerenderCallback, organizer = null) {
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
      ${buildImageSection(item, true)}

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

        ${buildDeepLinkSection(canModify, consumeDeepLink)}

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

      <!-- Buton de mutare -->
      <button id="moveItemBtn"
              style="width:100%;padding:12px;background:var(--info-color);color:white;
                     border:none;border-radius:4px;cursor:pointer;font-weight:500;margin-bottom:10px;">
        📦 Mută Obiectul
      </button>

      <button id="deleteItemBtn"
              style="width:100%;padding:12px;background:var(--error-color);color:white;
                     border:none;border-radius:4px;cursor:pointer;font-weight:500;">
        🗑️ Șterge Obiect
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  setupEditModalHandlers(modal, item, app, rerenderCallback, organizer);
}

function attachItemCardInteractions(
  cardElement,
  item,
  app,
  rerenderCallback,
  organizer = null
) {
  let longPressTimer = null;
  let longPressTriggered = false;
  let touchStartTime = 0;

  cardElement.style.userSelect = 'none';
  cardElement.style.webkitUserSelect = 'none';
  cardElement.style.webkitTouchCallout = 'none';

  cardElement.addEventListener('click', (e) => {
    if (
      e.target.closest('.qty-plus-btn') ||
      e.target.closest('.qty-minus-btn')
    ) {
      return;
    }
    openViewModal(item);
  });

  cardElement.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (
      !e.target.closest('.qty-plus-btn') &&
      !e.target.closest('.qty-minus-btn')
    ) {
      openEditModal(item, app, rerenderCallback, organizer);
    }
  });

  cardElement.addEventListener(
    'touchstart',
    (e) => {
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
        openEditModal(item, app, rerenderCallback, organizer);
      }, 500);
    },
    { passive: true }
  );

  cardElement.addEventListener('touchend', (e) => {
    clearTimeout(longPressTimer);

    if (
      !longPressTriggered &&
      Date.now() - touchStartTime < 50 &&
      !e.target.closest('.qty-plus-btn') &&
      !e.target.closest('.qty-minus-btn')
    ) {
      openViewModal(item);
    }
  });

  cardElement.addEventListener('touchmove', () => {
    clearTimeout(longPressTimer);
  });

  cardElement.addEventListener('mouseenter', (e) => {
    if (
      !e.target.closest('.qty-plus-btn') &&
      !e.target.closest('.qty-minus-btn')
    ) {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
    }
  });

  cardElement.addEventListener('mouseleave', (e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
  });
}

function buildStockInfoSection(item) {
  if (item.track_quantity) {
    const isLowStock =
      item.quantity !== null && item.quantity <= item.min_quantity;

    return `
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
    return `
      <div style="background:var(--secondary-background-color);padding:14px;border-radius:8px;margin-bottom:16px;text-align:center;">
        <div style="font-size:0.9em;color:var(--secondary-text-color);">
          📊 Cantitatea nu este urmărită pentru acest obiect
        </div>
      </div>
    `;
  }
}

function buildImageSection(item, isEditable) {
  if (isEditable) {
    return `
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
    `;
  } else {
    return `
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
    `;
  }
}

function buildDeepLinkSection(canModify, consumeDeepLink) {
  if (!canModify) return '';

  return `
    <div style="background:var(--info-color);color:white;padding:14px;border-radius:8px;margin-bottom:16px;">
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
  `;
}

async function openMoveItemModal(item, app, closeEditModal, rerenderCallback) {
  const moveModal = document.createElement('div');
  moveModal.style.cssText = `
    position:fixed;top:0;left:0;right:0;bottom:0;
    background:rgba(0,0,0,0.7);display:flex;align-items:center;
    justify-content:center;z-index:10000;padding:20px;
  `;

  moveModal.innerHTML = `
    <div style="background:var(--card-background-color);border-radius:12px;
                padding:24px;max-width:500px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.3);
                max-height:80vh;overflow-y:auto;">
      <h3 style="margin:0 0 20px 0;display:flex;align-items:center;gap:8px;">
        📦 Mută Obiectul: ${item.name}
      </h3>

      <div style="background:var(--secondary-background-color);padding:12px;border-radius:6px;margin-bottom:16px;">
        <div style="font-size:0.85em;color:var(--secondary-text-color);margin-bottom:4px;">Locație curentă:</div>
        <div style="font-weight:600;">${item.location}</div>
      </div>

      <!-- Selectare Camera -->
      <div style="margin-bottom:16px;" id="roomSection">
        <label style="display:block;font-size:0.9em;margin-bottom:6px;color:var(--secondary-text-color);font-weight:500;">
          1️⃣ Selectează Camera
        </label>
        <select id="moveRoomSelect" style="width:100%;padding:10px;border-radius:4px;border:1px solid var(--divider-color);box-sizing:border-box;">
          <option value="">-- Alege camera --</option>
        </select>
      </div>

      <!-- Selectare Dulap -->
      <div style="margin-bottom:16px;display:none;" id="cupboardSection">
        <label style="display:block;font-size:0.9em;margin-bottom:6px;color:var(--secondary-text-color);font-weight:500;">
          2️⃣ Selectează Dulapul
        </label>
        <select id="moveCupboardSelect" style="width:100%;padding:10px;border-radius:4px;border:1px solid var(--divider-color);box-sizing:border-box;">
          <option value="">-- Alege dulapul --</option>
        </select>
      </div>

      <!-- Selectare Raft -->
      <div style="margin-bottom:16px;display:none;" id="shelfSection">
        <label style="display:block;font-size:0.9em;margin-bottom:6px;color:var(--secondary-text-color);font-weight:500;">
          3️⃣ Selectează Raftul
        </label>
        <select id="moveShelfSelect" style="width:100%;padding:10px;border-radius:4px;border:1px solid var(--divider-color);box-sizing:border-box;">
          <option value="">-- Alege raftul --</option>
        </select>
      </div>

      <!-- Selectare Organizator sau Direct pe Raft -->
      <div style="margin-bottom:16px;display:none;" id="organizerSection">
        <label style="display:block;font-size:0.9em;margin-bottom:6px;color:var(--secondary-text-color);font-weight:500;">
          4️⃣ Selectează Destinația
        </label>
        <select id="moveOrganizerSelect" style="width:100%;padding:10px;border-radius:4px;border:1px solid var(--divider-color);box-sizing:border-box;">
          <option value="">-- Direct pe raft --</option>
        </select>
      </div>

      <!-- Secțiune Cantitate (doar pentru items cu track_quantity) -->
      <div style="margin-bottom:16px;display:none;" id="quantitySection">
        <div style="background:var(--secondary-background-color);padding:12px;border-radius:6px;">
          <div style="font-size:0.9em;color:var(--secondary-text-color);margin-bottom:10px;font-weight:500;">
            📊 Cantitate de mutat
          </div>
          
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;flex-shrink:0;">
              <input type="checkbox" id="moveIntegralCheckbox" checked
                     style="width:18px;height:18px;cursor:pointer;" />
              <span style="font-weight:500;">Integral</span>
            </label>
            
            <div style="flex:1;">
              <input type="number" id="moveQuantityInput" min="1" max="${
                item.quantity || 1
              }" 
                     value="${item.quantity || 1}" disabled
                     style="width:100%;padding:8px;border-radius:4px;border:1px solid var(--divider-color);box-sizing:border-box;" />
            </div>
          </div>
          
          <div style="font-size:0.85em;color:var(--secondary-text-color);">
            Cantitate disponibilă: <strong>${item.quantity || 0}</strong>
          </div>
        </div>
      </div>

      <div id="moveStatus" style="font-size:0.85em;margin-bottom:16px;min-height:20px;text-align:center;"></div>

      <div style="display:flex;gap:10px;">
        <button id="confirmMoveBtn" disabled
                style="flex:1;padding:12px;background:var(--primary-color);color:white;
                       border:none;border-radius:4px;cursor:pointer;font-weight:500;opacity:0.5;">
          ✅ Confirmă Mutarea
        </button>
        <button id="cancelMoveBtn"
                style="flex:1;padding:12px;background:var(--secondary-background-color);
                       color:var(--primary-text-color);border:1px solid var(--divider-color);
                       border-radius:4px;cursor:pointer;">
          Anulează
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(moveModal);

  const roomSelect = moveModal.querySelector('#moveRoomSelect');
  const cupboardSelect = moveModal.querySelector('#moveCupboardSelect');
  const shelfSelect = moveModal.querySelector('#moveShelfSelect');
  const organizerSelect = moveModal.querySelector('#moveOrganizerSelect');
  const confirmBtn = moveModal.querySelector('#confirmMoveBtn');
  const cancelBtn = moveModal.querySelector('#cancelMoveBtn');
  const moveStatus = moveModal.querySelector('#moveStatus');

  const cupboardSection = moveModal.querySelector('#cupboardSection');
  const shelfSection = moveModal.querySelector('#shelfSection');
  const organizerSection = moveModal.querySelector('#organizerSection');
  const quantitySection = moveModal.querySelector('#quantitySection');

  const integralCheckbox = moveModal.querySelector('#moveIntegralCheckbox');
  const quantityInput = moveModal.querySelector('#moveQuantityInput');

  integralCheckbox?.addEventListener('change', (e) => {
    if (e.target.checked) {
      quantityInput.disabled = true;
      quantityInput.value = item.quantity || 1;
    } else {
      quantityInput.disabled = false;
      quantityInput.focus();
    }
  });

  quantityInput?.addEventListener('input', (e) => {
    const value = parseInt(e.target.value) || 0;
    const maxQty = item.quantity || 1;

    if (value >= maxQty) {
      integralCheckbox.checked = true;
      quantityInput.disabled = true;
      quantityInput.value = maxQty;
    }
  });

  try {
    const rooms = await app.api.getRooms();
    rooms.forEach((room) => {
      const option = document.createElement('option');
      option.value = room.name;
      option.textContent = room.name;
      roomSelect.appendChild(option);
    });
  } catch (err) {
    moveStatus.textContent = '❌ Eroare la încărcarea camerelor';
    moveStatus.style.color = 'var(--error-color)';
  }

  roomSelect.addEventListener('change', async (e) => {
    const selectedRoom = e.target.value;
    cupboardSection.style.display = 'none';
    shelfSection.style.display = 'none';
    organizerSection.style.display = 'none';
    confirmBtn.disabled = true;
    confirmBtn.style.opacity = '0.5';

    if (!selectedRoom) return;

    try {
      const cupboards = await app.api.getCupboards(selectedRoom);
      cupboardSelect.innerHTML =
        '<option value="">-- Alege dulapul --</option>';
      cupboards.forEach((cupboard) => {
        const option = document.createElement('option');
        option.value = cupboard.name;
        option.textContent = cupboard.name;
        cupboardSelect.appendChild(option);
      });
      cupboardSection.style.display = 'block';
    } catch (err) {
      moveStatus.textContent = '❌ Eroare la încărcarea dulapurilor';
      moveStatus.style.color = 'var(--error-color)';
    }
  });

  cupboardSelect.addEventListener('change', async (e) => {
    const selectedCupboard = e.target.value;
    shelfSection.style.display = 'none';
    organizerSection.style.display = 'none';
    confirmBtn.disabled = true;
    confirmBtn.style.opacity = '0.5';

    if (!selectedCupboard) return;

    try {
      const shelves = await app.api.getShelves(
        roomSelect.value,
        selectedCupboard
      );
      shelfSelect.innerHTML = '<option value="">-- Alege raftul --</option>';
      shelves.forEach((shelf) => {
        const option = document.createElement('option');
        option.value = shelf.name;
        option.textContent = shelf.name;
        shelfSelect.appendChild(option);
      });
      shelfSection.style.display = 'block';
    } catch (err) {
      moveStatus.textContent = '❌ Eroare la încărcarea rafturilor';
      moveStatus.style.color = 'var(--error-color)';
    }
  });

  shelfSelect.addEventListener('change', async (e) => {
    const selectedShelf = e.target.value;
    organizerSection.style.display = 'none';
    quantitySection.style.display = 'none';
    confirmBtn.disabled = true;
    confirmBtn.style.opacity = '0.5';

    if (!selectedShelf) return;

    try {
      const data = await app.api.getOrganizers(
        roomSelect.value,
        cupboardSelect.value,
        selectedShelf
      );
      organizerSelect.innerHTML =
        '<option value="">-- Direct pe raft --</option>';

      if (data.organizers && data.organizers.length > 0) {
        data.organizers.forEach((organizer) => {
          const option = document.createElement('option');
          option.value = organizer.name;
          option.textContent = `🗃️ ${organizer.name} (${organizer.itemCount} obiecte)`;
          organizerSelect.appendChild(option);
        });
      }

      organizerSection.style.display = 'block';

      if (item.track_quantity && item.quantity !== null) {
        quantitySection.style.display = 'block';
      }

      confirmBtn.disabled = false;
      confirmBtn.style.opacity = '1';
    } catch (err) {
      moveStatus.textContent = '❌ Eroare la încărcarea organizatoarelor';
      moveStatus.style.color = 'var(--error-color)';
    }
  });

  confirmBtn.addEventListener('click', async () => {
    const newRoom = roomSelect.value;
    const newCupboard = cupboardSelect.value;
    const newShelf = shelfSelect.value;
    const newOrganizer = organizerSelect.value || null;

    if (!newRoom || !newCupboard || !newShelf) {
      moveStatus.textContent = '❌ Te rog selectează toate câmpurile';
      moveStatus.style.color = 'var(--error-color)';
      return;
    }

    const locationMatch = item.location?.match(/^(.+?) › (.+?) › (.+?)$/);
    const currentRoom = locationMatch?.[1] || '';
    const currentCupboard = locationMatch?.[2] || '';
    const currentShelf = locationMatch?.[3] || '';

    if (
      currentRoom === newRoom &&
      currentCupboard === newCupboard &&
      currentShelf === newShelf &&
      !newOrganizer
    ) {
      moveStatus.textContent = '⚠️ Obiectul este deja în această locație';
      moveStatus.style.color = 'var(--warning-color)';
      return;
    }

    const isIntegral = integralCheckbox?.checked !== false;
    const moveQty = isIntegral
      ? item.quantity || null
      : parseInt(quantityInput?.value) || null;
    const hasQuantityTracking = item.track_quantity && item.quantity !== null;

    if (hasQuantityTracking && !isIntegral) {
      if (moveQty <= 0 || moveQty > item.quantity) {
        moveStatus.textContent = '❌ Cantitate invalidă';
        moveStatus.style.color = 'var(--error-color)';
        return;
      }
    }

    try {
      moveStatus.textContent = '🔄 Se mută obiectul...';
      moveStatus.style.color = 'var(--primary-color)';
      confirmBtn.disabled = true;

      let existingItems = [];
      try {
        existingItems = await app.api.getItems(
          newRoom,
          newCupboard,
          newShelf,
          newOrganizer
        );
      } catch (err) {
        console.warn('Could not check for existing items:', err);
      }

      const existingItem = existingItems.find(
        (existing) =>
          existing.name === item.name &&
          existing.aliases === item.aliases &&
          existing.track_quantity === item.track_quantity
      );

      if (isIntegral || !hasQuantityTracking) {
        if (
          existingItem &&
          existingItem.track_quantity &&
          existingItem.quantity !== null
        ) {
          const newQuantity =
            (existingItem.quantity || 0) + (item.quantity || 0);

          await app.api.updateItem(existingItem.id, {
            quantity: newQuantity,
          });

          await app.api.deleteItem(item.id);

          moveStatus.textContent = `✅ Obiect combinat cu succes! Cantitate totală: ${newQuantity}`;
          moveStatus.style.color = 'var(--success-color)';
        } else {
          let oldImagePath = '';
          if (item.image && item.image.includes('/api/home_inventar/images/')) {
            const parts = item.image.split('/');
            oldImagePath = parts[parts.length - 1].split('?')[0];
          } else if (item.image && !item.image.startsWith('/local/')) {
            oldImagePath = item.image;
          }

          let newImagePath = '';
          if (oldImagePath) {
            try {
              const response = await fetch(item.image);
              const blob = await response.blob();
              const file = new File([blob], 'moved_image.jpg', {
                type: blob.type,
              });

              newImagePath = await app.api.uploadImage(file, {
                room: newRoom,
                cupboard: newCupboard,
                shelf: newShelf,
                organizer: newOrganizer || null,
                item: item.name,
                old_image: oldImagePath,
              });
            } catch (imgErr) {
              console.warn(
                'Failed to copy image, moving without image:',
                imgErr
              );
            }
          }

          await app.api.updateItem(item.id, {
            room: newRoom,
            cupboard: newCupboard,
            shelf: newShelf,
            organizer: newOrganizer,
            image: newImagePath || oldImagePath,
          });

          moveStatus.textContent = '✅ Obiect mutat cu succes!';
          moveStatus.style.color = 'var(--success-color)';
        }
      } else {
        const remainingQty = item.quantity - moveQty;

        const existingItem = existingItems.find(
          (existing) =>
            existing.name === item.name &&
            existing.aliases === item.aliases &&
            existing.track_quantity === item.track_quantity
        );

        if (
          existingItem &&
          existingItem.track_quantity &&
          existingItem.quantity !== null
        ) {
          const newQuantity = (existingItem.quantity || 0) + moveQty;

          await app.api.updateItem(existingItem.id, {
            quantity: newQuantity,
          });

          moveStatus.textContent = `✅ ${moveQty} unități adăugate la obiectul existent! (${remainingQty} rămase în locația veche)`;
        } else {
          let imagePath = '';
          if (item.image && item.image.includes('/api/home_inventar/images/')) {
            const parts = item.image.split('/');
            imagePath = parts[parts.length - 1].split('?')[0];
          } else if (item.image && !item.image.startsWith('/local/')) {
            imagePath = item.image;
          }

          let newImagePath = '';
          if (imagePath) {
            try {
              const response = await fetch(item.image);
              const blob = await response.blob();
              const file = new File([blob], 'split_image.jpg', {
                type: blob.type,
              });

              newImagePath = await app.api.uploadImage(file, {
                room: newRoom,
                cupboard: newCupboard,
                shelf: newShelf,
                organizer: newOrganizer || null,
                item: item.name,
              });
            } catch (imgErr) {
              console.warn('Failed to copy image for new item:', imgErr);
            }
          }

          await app.api.addItem(newRoom, newCupboard, newShelf, newOrganizer, {
            name: item.name,
            aliases: item.aliases || '',
            image: newImagePath,
            quantity: moveQty,
            min_quantity: item.min_quantity,
            track_quantity: true,
          });

          moveStatus.textContent = `✅ ${moveQty} unități mutate cu succes! (${remainingQty} rămase)`;
        }

        await app.api.updateItem(item.id, {
          quantity: remainingQty,
        });

        moveStatus.style.color = 'var(--success-color)';
      }

      setTimeout(() => {
        document.body.removeChild(moveModal);
        closeEditModal();
        rerenderCallback();
      }, 1500);
    } catch (err) {
      moveStatus.textContent = `❌ Eroare: ${err?.message || 'Mutare eșuată'}`;
      moveStatus.style.color = 'var(--error-color)';
      confirmBtn.disabled = false;
    }
  });

  cancelBtn.addEventListener('click', () => {
    document.body.removeChild(moveModal);
  });

  moveModal.addEventListener('click', (e) => {
    if (e.target === moveModal) {
      document.body.removeChild(moveModal);
    }
  });
}

function setupEditModalHandlers(modal, item, app, rerenderCallback, organizer) {
  const trackQtyCheckbox = modal.querySelector('#trackQty');
  const qtyFields = modal.querySelector('#qtyFields');

  trackQtyCheckbox.addEventListener('change', () => {
    qtyFields.style.display = trackQtyCheckbox.checked ? 'block' : 'none';
  });

  const copyBtn = modal.querySelector('#copyDeepLinkBtn');
  copyBtn?.addEventListener('click', async () => {
    const consumeDeepLink = `homeassistant://navigate/home_inventar/consume/${item.id}`;
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

  modal.querySelector('#moveItemBtn')?.addEventListener('click', () => {
    openMoveItemModal(
      item,
      app,
      () => {
        document.body.removeChild(modal);
      },
      rerenderCallback
    );
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
      let imagePath = '';
      if (item.image && item.image.includes('/api/home_inventar/images/')) {
        const parts = item.image.split('/');
        imagePath = parts[parts.length - 1].split('?')[0];
      } else if (item.image && !item.image.startsWith('/local/')) {
        imagePath = item.image;
      }

      if (imageFile) {
        uploadStatus.textContent = 'Se încarcă imaginea...';
        uploadStatus.style.color = 'var(--primary-color)';

        const locationMatch = item.location?.match(/^(.+?) › (.+?) › (.+?)$/);
        const room = locationMatch?.[1] || '';
        const cupboard = locationMatch?.[2] || '';
        const shelf = locationMatch?.[3] || '';

        imagePath = await app.api.uploadImage(imageFile, {
          room,
          cupboard,
          shelf,
          organizer: organizer || null,
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
        min_quantity,
      });

      uploadStatus.textContent = '✓ Salvat cu succes!';
      uploadStatus.style.color = 'var(--success-color)';

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

  modal.querySelector('#deleteItemBtn').addEventListener('click', async () => {
    if (!confirm(`Ești sigur că vrei să ștergi obiectul "${item.name}"?`))
      return;

    try {
      await app.api.deleteItem(item.id);
      document.body.removeChild(modal);
      rerenderCallback();
    } catch (err) {
      alert(`Eroare: ${err?.message || 'Ștergere eșuată'}`);
    }
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}

export { openViewModal, openEditModal, attachItemCardInteractions };
