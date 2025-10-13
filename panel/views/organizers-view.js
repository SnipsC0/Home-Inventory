export async function renderOrganizersView(app, content) {
  const s = app.state;
  if (!s.selectedRoom || !s.selectedCupboard || !s.selectedShelf) {
    s.currentView = 'shelves';
    return app.renderView();
  }

  console.log('=== renderOrganizersView DEBUG ===');
  console.log('Selected location:', {
    room: s.selectedRoom,
    cupboard: s.selectedCupboard,
    shelf: s.selectedShelf,
  });

  // Obține organizatoarele
  const data = await app.api
    .getOrganizers(s.selectedRoom, s.selectedCupboard, s.selectedShelf)
    .catch((err) => {
      console.error('ERROR getOrganizers:', err);
      showAuthOrError(content, err);
      return { organizers: [], itemsWithoutOrganizer: 0 };
    });

  console.log('Organizers data:', data);

  // Obține items-urile fără organizator (direct pe raft)
  const itemsWithoutOrganizer = await app.api
    .getItems(s.selectedRoom, s.selectedCupboard, s.selectedShelf, null)
    .catch((err) => {
      console.error('Error loading items without organizer:', err);
      return [];
    });

  console.log('Items without organizer:', itemsWithoutOrganizer.length);

  const canModify = await app.api.canModifyStructure();
  console.log('Can modify:', canModify);

  content.innerHTML = `
    <div>
      <!-- Breadcrumbs -->
      <div style="margin-bottom:16px;display:flex;align-items:center;gap:8px;color:var(--secondary-text-color);flex-wrap:wrap;">
        <button id="backBtn" style="background:none;border:none;color:var(--primary-color);cursor:pointer;font-size:1em;padding:4px 8px;">← Rafturi</button>
        <span>/</span>
        <span style="font-weight:600;color:var(--primary-text-color);">${
          s.selectedShelf
        }</span>
      </div>

      <!-- ========== SECȚIUNEA ORGANIZATOARE ========== -->
      <div style="margin-bottom:32px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px;flex-wrap:wrap;">
          <h3 style="margin:0;display:flex;align-items:center;gap:8px;">
            <span style="font-size:1.3em;">🗃️</span>
            <span>Organizatoare</span>
          </h3>
          ${
            canModify
              ? '<button id="toggleAddBtn" style="padding:8px 16px;background:var(--primary-color);color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:500;">+ Adaugă Organizator</button>'
              : ''
          }
        </div>

        ${
          canModify
            ? `
        <div id="addForm" style="display:none;background:var(--card-background-color);padding:16px;border-radius:8px;margin-bottom:16px;box-shadow:0 2px 4px rgba(0,0,0,0.05);">
          <input id="newOrganizerName" placeholder="Nume organizator (ex: Cutie Mare)" style="width:100%;padding:10px;border-radius:4px;border:1px solid var(--divider-color);margin-bottom:10px;box-sizing:border-box;" />
          <input id="newOrganizerImage" type="file" accept="image/*" style="width:100%;margin-bottom:10px;padding:6px;" />
          <div id="editOrganizerUploadStatus" style="font-size:.9em;margin-bottom:10px;min-height:20px;"></div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button id="saveBtn" style="flex:1;padding:10px;background:var(--primary-color);color:white;border:none;border-radius:4px;cursor:pointer;font-weight:500;">Salvează</button>
            <button id="cancelBtn" style="flex:1;padding:10px;background:var(--secondary-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;cursor:pointer;">Anulează</button>
          </div>
        </div>
        `
            : ''
        }

        <!-- Grid organizatoare -->
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,200px),1fr));gap:12px;">
          ${
            data.organizers.length === 0
              ? `<p style="grid-column:1/-1;text-align:center;color:var(--secondary-text-color);padding:40px;background:var(--secondary-background-color);border-radius:8px;">
                  Nu există organizatoare pe acest raft.
                  ${canModify ? ' Adaugă primul organizator!' : ''}
                </p>`
              : data.organizers
                  .map(
                    (org) => `
              <div class="organizer-card-container" data-id="${
                org.id
              }" data-name="${org.name}" data-count="${org.itemCount}"
                   style="background:var(--card-background-color);border-radius:8px;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,0.1);cursor:pointer;transition:all .2s;border:2px solid var(--primary-color);"
                   onmouseenter="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)';"
                   onmouseleave="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)';">
                <div class="organizer-card" data-organizer="${org.name}"
                     style="padding:16px;text-align:center;">
                  <div class="organizer-image" style="font-size:2.5em;margin-bottom:8px;">${
                    org.image
                      ? `<img src="${org.image}" alt="${org.name}" style="width:100%;height:120px;object-fit:cover;border-radius:6px;" />`
                      : `🗃️`
                  }</div>
                  <div style="font-weight:600;margin-bottom:8px;font-size:1.05em;">${
                    org.name
                  }</div>
                  <div style="font-size:.85em;color:var(--primary-color);">${
                    org.itemCount
                  } obiecte</div>
                </div>
              </div>`
                  )
                  .join('')
          }
        </div>
      </div>

      <!-- ========== SECȚIUNEA OBIECTE DIRECT PE RAFT ========== -->
      <div style="border-top:2px solid var(--divider-color);padding-top:24px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px;flex-wrap:wrap;">
          <h3 style="margin:0;display:flex;align-items:center;gap:8px;">
            <span style="font-size:1.3em;">📦</span>
            <span>Obiecte Direct pe Raft</span>
          </h3>
          ${
            canModify
              ? '<button id="addItemDirectBtn" style="padding:8px 16px;background:var(--secondary-background-color);color:var(--primary-text-color);border:1px solid var(--primary-color);border-radius:4px;cursor:pointer;font-weight:500;">+ Adaugă Obiect</button>'
              : ''
          }
        </div>

        <!-- Grid items -->
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,200px),1fr));gap:12px;">
          ${
            itemsWithoutOrganizer.length === 0
              ? `<p style="grid-column:1/-1;text-align:center;color:var(--secondary-text-color);padding:40px;background:var(--secondary-background-color);border-radius:8px;">
                  Nu există obiecte direct pe raft.
                  ${
                    canModify
                      ? ' Adaugă primul obiect sau folosește organizatoarele!'
                      : ''
                  }
                </p>`
              : itemsWithoutOrganizer
                  .map((item) => {
                    // Construiește afișarea cantității
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
              <div class="item-card-container" data-id="${
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
    </div>
  `;

  content.querySelector('#backBtn')?.addEventListener('click', () => {
    s.currentView = 'shelves';
    app.renderView();
  });

  if (canModify) {
    console.log('=== Attaching form handlers DIRECTLY ===');

    // Atașăm handler-ele DIRECT fără ui-utils
    const toggleBtn = content.querySelector('#toggleAddBtn');
    const addForm = content.querySelector('#addForm');
    const cancelBtn = content.querySelector('#cancelBtn');
    const saveBtn = content.querySelector('#saveBtn');

    console.log('Form elements found:', {
      toggleBtn: !!toggleBtn,
      addForm: !!addForm,
      cancelBtn: !!cancelBtn,
      saveBtn: !!saveBtn,
    });

    let opened = false;

    toggleBtn?.addEventListener('click', () => {
      console.log('Toggle button clicked!');
      opened = !opened;
      addForm.style.display = opened ? 'block' : 'none';
      if (opened) {
        const firstInput = addForm.querySelector('#newOrganizerName');
        firstInput?.focus();
      }
    });

    cancelBtn?.addEventListener('click', () => {
      console.log('Cancel button clicked!');
      opened = false;
      addForm.style.display = 'none';
      content.querySelector('#newOrganizerName').value = '';
    });

    saveBtn?.addEventListener('click', async () => {
      const input = content.querySelector('#newOrganizerName');
      const fileInput = content.querySelector('#newOrganizerImage');
      const name = (input?.value || '').trim();

      if (!name) {
        alert('Te rog introdu numele organizatorului.');
        return;
      }

      let imagePath = '';
      const imageFile = fileInput.files[0];
      if (imageFile) {
        imagePath = await app.api.uploadImage(imageFile, {
          room: s.selectedRoom,
          cupboard: s.selectedCupboard,
          shelf: s.selectedShelf,
          item: name,
        });
      }

      const result = await app.api.addOrganizer(
        s.selectedRoom,
        s.selectedCupboard,
        s.selectedShelf,
        name
      );

      if (imagePath) {
        await app.api.updateOrganizer(result.id, { image: imagePath });
      }

      addForm.style.display = 'none';
      input.value = '';
      fileInput.value = '';
      await app.renderView();
    });

    console.log('=== Direct handlers attached ===');

    // Buton pentru adăugare item direct pe raft
    content
      .querySelector('#addItemDirectBtn')
      ?.addEventListener('click', () => {
        s.selectedOrganizer = null;
        s.currentView = 'items';
        app.renderView();
      });

    let touchTimer = null;

    content
      .querySelectorAll('.organizer-card-container')
      .forEach((container) => {
        const organizerCard = container.querySelector('.organizer-card');

        container.style.userSelect = 'none';
        container.style.webkitUserSelect = 'none';
        container.style.webkitTouchCallout = 'none';
        container.style.touchAction = 'manipulation';

        let touchTimer = null;

        // ---- Click simplu = navigare în iteme ----
        organizerCard?.addEventListener('click', (e) => {
          e.stopPropagation();
          const organizerName = organizerCard.dataset.organizer;
          s.selectedOrganizer = organizerName;
          s.currentView = 'items';
          app.renderView();
        });

        // ---- Click dreapta (desktop) = edit modal ----
        container.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          clearTimeout(touchTimer);
          openEditOrganizerModal(
            {
              id: container.dataset.id,
              name: container.dataset.name,
              itemCount: container.dataset.count,
            },
            app
          );
        });

        // ---- Touch lung (mobil) = edit modal ----
        let touchStartTime = 0;
        let longPressTriggered = false;

        container.addEventListener(
          'touchstart',
          (e) => {
            longPressTriggered = false;
            touchStartTime = Date.now();

            touchTimer = setTimeout(() => {
              longPressTriggered = true;
              e.preventDefault();
              openEditOrganizerModal(
                {
                  id: container.dataset.id,
                  name: container.dataset.name,
                  itemCount: container.dataset.count,
                },
                app
              );
            }, 550);
          },
          { passive: true }
        );

        container.addEventListener('touchend', (e) => {
          clearTimeout(touchTimer);

          if (!longPressTriggered && Date.now() - touchStartTime < 300) {
            const organizerName = organizerCard.dataset.organizer;
            s.selectedOrganizer = organizerName;
            s.currentView = 'items';
            app.renderView();
          }
        });

        container.addEventListener('touchmove', () => clearTimeout(touchTimer));
      });

    // Click pe item card container pentru edit
    content.querySelectorAll('.item-card-container').forEach((container) => {
      container.addEventListener('click', () => {
        const item = JSON.parse(container.dataset.item);
        openEditItemModal(item, app);
      });
    });
  } else {
    // Dacă nu poate modifica, click pe organizator navighează către items
    content.querySelectorAll('.organizer-card').forEach((card) => {
      const container = card.closest('.organizer-card-container');
      const organizer = {
        id: container.dataset.id,
        name: container.dataset.name,
        itemCount: container.dataset.count,
      };

      card.addEventListener('click', () => {
        s.selectedOrganizer = organizer.name;
        s.currentView = 'items';
        app.renderView();
      });
    });
  }

  console.log('=== renderOrganizersView COMPLETE ===');
}

function openEditOrganizerModal(organizer, app) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position:fixed;top:0;left:0;right:0;bottom:0;
    background:rgba(0,0,0,0.5);display:flex;align-items:center;
    justify-content:center;z-index:9999;padding:20px;
  `;

  modal.innerHTML = `
    <div style="background:var(--card-background-color);border-radius:12px;
                padding:24px;max-width:400px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.3);">
      <h3 style="margin:0 0 20px 0;">✏️ Editare Organizator</h3>

      <div style="margin-bottom:20px;">
        <label style="display:block;font-size:0.9em;margin-bottom:6px;color:var(--secondary-text-color);">
          Nume organizator
        </label>
        <input type="text" id="editOrganizerName" value="${organizer.name}"
              style="width:100%;padding:10px;border-radius:4px;border:1px solid var(--divider-color);
                      box-sizing:border-box;" />
      </div>

      <div style="margin-bottom:20px;">
        <label style="display:block;font-size:0.9em;margin-bottom:6px;color:var(--secondary-text-color);">
          Imagine (opțional)
        </label>
        ${
          organizer.image
            ? `<div style="margin-bottom:10px;display:flex;justify-content:center;">
                <img src="${organizer.image}" style="max-width:100%;max-height:200px;border-radius:8px;border:1px solid var(--divider-color);" />
              </div>`
            : ''
        }
        <input type="file" id="editOrganizerImageInput" accept="image/*"
              style="width:100%;padding:8px;border-radius:4px;border:1px solid var(--divider-color);" />
        <div id="editOrganizerUploadStatus" style="font-size:.9em;margin-bottom:10px;min-height:20px;"></div>
      </div>

      <div style="display:flex;gap:10px;margin-bottom:10px;flex-wrap:wrap;">
        <button id="saveOrganizerEditBtn" 
                style="flex:1;padding:12px;background:var(--primary-color);color:white;
                      border:none;border-radius:4px;cursor:pointer;font-weight:500;">
          💾 Salvează
        </button>
        <button id="cancelOrganizerEditBtn"
                style="flex:1;padding:12px;background:var(--secondary-background-color);
                      color:var(--primary-text-color);border:1px solid var(--divider-color);
                      border-radius:4px;cursor:pointer;">
          Anulează
        </button>
      </div>

      ${
        organizer.itemCount > 0
          ? `
      <div style="background:var(--warning-color);color:white;padding:12px;border-radius:6px;margin-bottom:10px;font-size:0.9em;">
        ⚠️ Acest organizator conține ${organizer.itemCount} obiecte care vor fi șterse!
      </div>
      `
          : ''
      }

      <button id="deleteOrganizerBtn"
              style="width:100%;padding:12px;background:var(--error-color);color:white;
                    border:none;border-radius:4px;cursor:pointer;font-weight:500;">
        🗑️ Șterge Organizator
      </button>
    </div>
  `;
  document.body.appendChild(modal);

  modal
    .querySelector('#cancelOrganizerEditBtn')
    .addEventListener('click', () => {
      document.body.removeChild(modal);
    });

  modal
    .querySelector('#saveOrganizerEditBtn')
    .addEventListener('click', async () => {
      const name = modal.querySelector('#editOrganizerName').value.trim();
      const imageFile = modal.querySelector('#editOrganizerImageInput')
        .files[0];

      const uploadStatus = modal.querySelector('#editOrganizerUploadStatus');
      const updateData = {};
      if (name && name !== organizer.name) updateData.name = name;

      try {
        let imagePath = '';
        if (
          organizer.image &&
          organizer.image.includes('/api/home_inventar/images/')
        ) {
          const parts = organizer.image.split('/');
          imagePath = parts[parts.length - 1].split('?')[0];
        } else if (organizer.image && !organizer.image.startsWith('/local/')) {
          imagePath = organizer.image;
        }

        if (imageFile) {
          uploadStatus.textContent = 'Se încarcă imaginea...';
          uploadStatus.style.color = 'var(--primary-color)';
          imagePath = await app.api.uploadImage(imageFile, {
            room: app.state.selectedRoom,
            cupboard: app.state.selectedCupboard,
            shelf: app.state.selectedShelf,
            item: name || organizer.name,
            old_image: organizer.image,
          });
          uploadStatus.textContent = '✓ Imagine încărcată';
          uploadStatus.style.color = 'var(--success-color)';
          updateData.image = imagePath;
        }

        if (Object.keys(updateData).length === 0) {
          alert('Nicio modificare detectată.');
          return;
        }

        await app.api.updateOrganizer(organizer.id, updateData);
        document.body.removeChild(modal);
        await app.renderView();
      } catch (err) {
        alert(`Eroare: ${err?.message || 'Salvare eșuată'}`);
      }
    });

  modal
    .querySelector('#deleteOrganizerBtn')
    .addEventListener('click', async () => {
      const confirmMsg =
        organizer.itemCount > 0
          ? `Ești sigur că vrei să ștergi organizatorul "${organizer.name}" și cele ${organizer.itemCount} obiecte din el?`
          : `Ești sigur că vrei să ștergi organizatorul "${organizer.name}"?`;

      if (!confirm(confirmMsg)) return;

      try {
        await app.api.deleteOrganizer(organizer.id);
        document.body.removeChild(modal);
        await app.renderView();
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

function openEditItemModal(item, app) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position:fixed;top:0;left:0;right:0;bottom:0;
    background:rgba(0,0,0,0.6);display:flex;align-items:center;
    justify-content:center;z-index:9999;padding:20px;
    overflow-y:auto;
  `;

  modal.innerHTML = `
    <div style="background:var(--card-background-color);border-radius:12px;
                padding:24px;max-width:500px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.3);
                max-height:90vh;overflow-y:auto;">
      <h3 style="margin:0 0 20px 0;">✏️ Editare: ${item.name}</h3>
      
      <div style="margin-bottom:16px;">
        <label style="display:block;font-size:0.9em;margin-bottom:6px;color:var(--secondary-text-color);">
          Nume obiect
        </label>
        <input type="text" id="editItemName" value="${item.name}" 
               style="width:100%;padding:10px;border-radius:4px;border:1px solid var(--divider-color);box-sizing:border-box;" />
      </div>

      <div style="margin-bottom:16px;">
        <label style="display:block;font-size:0.9em;margin-bottom:6px;color:var(--secondary-text-color);">
          Aliasuri (opțional, separate prin virgulă)
        </label>
        <input type="text" id="editItemAliases" value="${item.aliases || ''}" 
               placeholder="Ex: orez basmati, rice"
               style="width:100%;padding:10px;border-radius:4px;border:1px solid var(--divider-color);box-sizing:border-box;" />
      </div>

      <div style="margin-bottom:16px;">
        <label style="display:block;font-size:0.9em;margin-bottom:6px;color:var(--secondary-text-color);">
          📸 Imagine
        </label>
        ${
          item.image
            ? `
          <div style="margin-bottom:10px;">
            <img src="${item.image}" style="max-width:200px;max-height:200px;border-radius:8px;border:2px solid var(--divider-color);" />
          </div>
        `
            : ''
        }
        <input type="file" id="editItemImageInput" accept="image/*" 
               style="width:100%;padding:8px;border-radius:4px;border:1px solid var(--divider-color);box-sizing:border-box;" />
        <div id="editImagePreview" style="margin-top:10px;display:none;">
          <div id="editItemUploadStatus" style="font-size:.9em;margin-bottom:10px;min-height:20px;"></div>
          <img id="editPreviewImg" style="max-width:200px;max-height:200px;border-radius:8px;border:2px solid var(--divider-color);" />
        </div>
      </div>

      <div style="margin-bottom:16px;padding:12px;background:var(--secondary-background-color);border-radius:6px;">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
          <input type="checkbox" id="editTrackQuantityCheckbox" ${
            item.track_quantity ? 'checked' : ''
          } style="cursor:pointer;" />
          <span style="font-weight:500;">📊 Urmărește cantitatea</span>
        </label>
        
        <div id="editQuantityFields" style="display:${
          item.track_quantity ? 'block' : 'none'
        };margin-top:12px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div>
              <label style="display:block;font-size:0.85em;margin-bottom:4px;color:var(--secondary-text-color);">
                Cantitate actuală
              </label>
              <input type="number" id="editQuantityInput" value="${
                item.quantity !== null ? item.quantity : ''
              }" min="0" 
                     style="width:100%;padding:8px;border-radius:4px;border:1px solid var(--divider-color);box-sizing:border-box;" />
            </div>
            <div>
              <label style="display:block;font-size:0.85em;margin-bottom:4px;color:var(--secondary-text-color);">
                Cantitate minimă
              </label>
              <input type="number" id="editMinQuantityInput" value="${
                item.min_quantity !== null ? item.min_quantity : ''
              }" min="0" 
                     style="width:100%;padding:8px;border-radius:4px;border:1px solid var(--divider-color);box-sizing:border-box;" />
            </div>
          </div>
        </div>
      </div>

      <div style="display:flex;gap:10px;margin-bottom:10px;">
        <button id="saveItemEditBtn" 
                style="flex:1;padding:12px;background:var(--primary-color);color:white;
                       border:none;border-radius:4px;cursor:pointer;font-weight:500;">
          💾 Salvează
        </button>
        <button id="cancelItemEditBtn"
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

  const trackCheckbox = modal.querySelector('#editTrackQuantityCheckbox');
  const quantityFields = modal.querySelector('#editQuantityFields');
  trackCheckbox.addEventListener('change', (e) => {
    quantityFields.style.display = e.target.checked ? 'block' : 'none';
  });

  const imageInput = modal.querySelector('#editItemImageInput');
  const imagePreview = modal.querySelector('#editImagePreview');
  const previewImg = modal.querySelector('#editPreviewImg');

  imageInput.addEventListener('change', (e) => {
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

  modal.querySelector('#cancelItemEditBtn').addEventListener('click', () => {
    document.body.removeChild(modal);
  });

  modal
    .querySelector('#saveItemEditBtn')
    .addEventListener('click', async () => {
      const name = modal.querySelector('#editItemName').value.trim();
      const aliases = modal.querySelector('#editItemAliases').value.trim();
      const uploadStatus = modal.querySelector('#editItemUploadStatus');

      const trackQuantity = modal.querySelector(
        '#editTrackQuantityCheckbox'
      ).checked;
      const quantity = trackQuantity
        ? parseInt(modal.querySelector('#editQuantityInput').value) || null
        : null;
      const minQuantity = trackQuantity
        ? parseInt(modal.querySelector('#editMinQuantityInput').value) || null
        : null;

      if (!name) {
        return alert('Numele obiectului este obligatoriu.');
      }

      try {
        const updateData = {
          name,
          aliases: aliases || null,
          track_quantity: trackQuantity,
          quantity,
          min_quantity: minQuantity,
        };

        const imageFile = imageInput.files[0];
        if (imageFile) {
          uploadStatus.textContent = 'Se încarcă imaginea...';
          uploadStatus.style.color = 'var(--primary-color)';
          const imagePath = await app.api.uploadImage(imageFile, {
            room: app.state.selectedRoom,
            cupboard: app.state.selectedCupboard,
            shelf: app.state.selectedShelf,
            organizer: null,
            item: name,
            old_image: item.image,
          });
          uploadStatus.textContent = '✓ Imagine încărcată';
          uploadStatus.style.color = 'var(--success-color)';
          updateData.image = imagePath;
        }

        await app.api.updateItem(item.id, updateData);
        document.body.removeChild(modal);
        await app.renderView();
      } catch (err) {
        alert(`Eroare: ${err?.message || 'Salvare eșuată'}`);
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
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
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
