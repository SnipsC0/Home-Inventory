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
      Date.now() - touchStartTime < 300 &&
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

function setupEditModalHandlers(modal, item, app, rerenderCallback, organizer) {
  const trackQtyCheckbox = modal.querySelector('#trackQty');
  const qtyFields = modal.querySelector('#qtyFields');

  console.log(item);

  trackQtyCheckbox.addEventListener('change', () => {
    qtyFields.style.display = trackQtyCheckbox.checked ? 'block' : 'none';
  });

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
