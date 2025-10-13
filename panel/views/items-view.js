import { attachFormToggleHandlers } from '../core/ui-utils.js';

// Modal unificat pentru editare item (identic cu all-items-view.js și organizers-view.js)
async function openEditItemModal(item, app, organizer) {
  const canModify = await app.api.canModifyStructure();
  const consumeDeepLink = `homeassistant://navigate/home_inventar?consume=${item.id}`;

  const modal = document.createElement('div');
  modal.style.cssText = `
    position:fixed;top:0;left:0;right:0;bottom:0;
    background:rgba(0,0,0,0.6);display:flex;align-items:center;
    justify-content:center;z-index:9999;padding:20px;
    overflow-y:auto;
  `;

  // Construiește locația
  const location = organizer
    ? `${app.state.selectedRoom} › ${app.state.selectedCupboard} › ${app.state.selectedShelf} › ${organizer}`
    : `${app.state.selectedRoom} › ${app.state.selectedCupboard} › ${app.state.selectedShelf}`;

  modal.innerHTML = `
    <div style="background:var(--card-background-color);border-radius:12px;
                padding:24px;max-width:600px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.3);
                max-height:90vh;overflow-y:auto;">
      <h3 style="margin:0 0 20px 0;">✏️ Editare: ${item.name}</h3>
      
      <!-- Locație -->
      <div style="background:var(--secondary-background-color);padding:12px;border-radius:6px;margin-bottom:16px;">
        <div style="font-size:0.85em;color:var(--secondary-text-color);margin-bottom:4px;">📍 Locație:</div>
        <div style="font-weight:600;">${location}</div>
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
                         border-radius:4px;cursor:pointer;font-size:0.85em;">
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
            'max-width:400px;max-height:400px;border-radius:8px;object-fit:cover;';
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
    const imageFile = fileInput.files[0];
    const uploadStatus = modal.querySelector('#editUploadStatus');

    if (!name) return alert('Numele obiectului este obligatoriu.');

    try {
      const updateData = {
        name,
        aliases: aliases || null,
        track_quantity: trackQuantity,
        quantity,
        min_quantity,
      };

      if (imageFile) {
        uploadStatus.textContent = 'Se încarcă imaginea...';
        uploadStatus.style.color = 'var(--primary-color)';

        const imagePath = await app.api.uploadImage(imageFile, {
          room: app.state.selectedRoom,
          cupboard: app.state.selectedCupboard,
          shelf: app.state.selectedShelf,
          organizer: organizer || null, // <-- ADĂUGAT
          item: name,
          old_image: item.image,
        });
        updateData.image = imagePath;
        uploadStatus.textContent = '✓ Imagine încărcată';
        uploadStatus.style.color = 'var(--success-color)';
      }

      uploadStatus.textContent = 'Se salvează modificările...';
      await app.api.updateItem(item.id, updateData);

      document.body.removeChild(modal);
      await app.renderView();
    } catch (err) {
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
      await app.renderView();
    } catch (err) {
      alert(`Eroare: ${err?.message || 'Ștergere eșuată'}`);
    }
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) document.body.removeChild(modal);
  });
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

  const canModify = await app.api.canModifyStructure();

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
        ${
          canModify
            ? '<button id="toggleAddBtn" style="padding:8px 16px;background:var(--primary-color);color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:500;">+ Adaugă Obiect</button>'
            : ''
        }
      </div>

      <!-- Form de adăugare -->
      ${
        canModify
          ? `
      <div id="addForm" style="display:none;background:var(--card-background-color);padding:16px;border-radius:8px;margin-bottom:16px;box-shadow:0 2px 4px rgba(0,0,0,0.05);">
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
      `
          : ''
      }

      <!-- Grid cu items -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,200px),1fr));gap:12px;">
        ${
          items.length === 0
            ? `<p style="grid-column:1/-1;text-align:center;color:var(--secondary-text-color);padding:40px;">
                Nu există obiecte ${
                  organizer ? 'în acest organizator' : 'direct pe acest raft'
                }.
                ${canModify ? ' Adaugă primul obiect!' : ''}
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

  // Back button
  content.querySelector('#backBtn')?.addEventListener('click', () => {
    s.currentView = 'organizers';
    s.selectedOrganizer = null;
    app.renderView();
  });

  if (canModify) {
    // Toggle track quantity fields
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

    // Form handlers
    attachFormToggleHandlers(content, 'items', {
      addItem: async () => {
        const nameInput = content.querySelector('#newItemName');
        const name = (nameInput?.value || '').trim();
        if (!name) return alert('Te rog introdu numele obiectului.');

        const trackQuantity = content.querySelector(
          '#trackQuantityCheckbox'
        ).checked;
        const quantity = trackQuantity
          ? parseInt(content.querySelector('#quantityInput').value) || null
          : null;
        const minQuantity = trackQuantity
          ? parseInt(content.querySelector('#minQuantityInput').value) || null
          : null;

        const imageFile = imageInput?.files[0];
        let imagePath = '';

        try {
          if (imageFile) {
            imagePath = await app.api.uploadImage(imageFile, {
              room: s.selectedRoom,
              cupboard: s.selectedCupboard,
              shelf: s.selectedShelf,
              organizer: organizer || null, // <-- ADĂUGAT
              item: name,
            });
          }

          await app.api.addItem(
            s.selectedRoom,
            s.selectedCupboard,
            s.selectedShelf,
            organizer,
            {
              name,
              image: imagePath,
              quantity,
              min_quantity: minQuantity,
              track_quantity: trackQuantity,
            }
          );

          content.querySelector('#addForm').style.display = 'none';
          await app.renderView();
        } catch (err) {
          alert(`Eroare: ${err?.message || 'Adăugare eșuată'}`);
        }
      },
    });

    // Click pe item card pentru edit
    content.querySelectorAll('.item-card').forEach((card) => {
      card.addEventListener('click', () => {
        const item = JSON.parse(card.dataset.item);
        openEditItemModal(item, app, organizer);
      });
    });
  }
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
