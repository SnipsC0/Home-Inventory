import { attachFormToggleHandlers } from '../core/ui-utils.js';
import { downloadQRCode } from '../core/qr-generator.js';

export async function renderCupboardsView(app, content) {
  const room = app.state.selectedRoom;
  if (!room) {
    app.state.currentView = 'rooms';
    return app.renderView();
  }

  const cupboards = await app.api.getCupboards(room).catch((err) => {
    showAuthOrError(content, err);
    return [];
  });

  const canModify = await app.api.canModifyStructure();
  const qrRedirectUrl = await app.api.getQRRedirectUrl();

  content.innerHTML = `
    <div>
      <div style="margin-bottom:16px;display:flex;align-items:center;gap:8px;color:var(--secondary-text-color);flex-wrap:wrap;">
        <button id="backBtn" style="background:none;border:none;color:var(--primary-color);cursor:pointer;font-size:1em;padding:4px 8px;">← Camere</button>
        <span>/</span>
        <span style="font-weight:600;color:var(--primary-text-color);">${room}</span>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px;flex-wrap:wrap;">
        <h3 style="margin:0;">🗄️ Dulapuri</h3>
        ${
          canModify
            ? '<button id="toggleAddBtn" style="padding:8px 16px;background:var(--primary-color);color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:500;">+ Adaugă Dulap</button>'
            : ''
        }
      </div>

      ${
        canModify
          ? `
      <div id="addForm" style="display:none;background:var(--card-background-color);padding:16px;border-radius:8px;margin-bottom:16px;box-shadow:0 2px 4px rgba(0,0,0,0.05);">
        <input id="newCupboardName" placeholder="Nume dulap (ex: Dulap mare)" style="width:100%;padding:10px;border-radius:4px;border:1px solid var(--divider-color);margin-bottom:10px;box-sizing:border-box;" />
        <input type="file" id="cupboardImageUpload" accept="image/*" style="width:100%;margin-bottom:10px;" />
        <div id="uploadStatus" style="font-size:.9em;margin-bottom:10px;min-height:20px;"></div>
        <div style="display:flex;gap:10px;">
          <button id="saveBtn" style="flex:1;padding:10px;background:var(--primary-color);color:white;border:none;border-radius:4px;cursor:pointer;font-weight:500;">Salvează</button>
          <button id="cancelBtn" style="flex:1;padding:10px;background:var(--secondary-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;cursor:pointer;">Anulează</button>
        </div>
      </div>
      `
          : ''
      }

      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr));gap:12px;">
        ${
          cupboards.length === 0
            ? `<p style="grid-column:1/-1;text-align:center;color:var(--secondary-text-color);padding:40px;">Nu există dulapuri.${
                canModify ? ' Adaugă primul dulap!' : ''
              }</p>`
            : cupboards
                .map(
                  (c) => `
          <div style="background:var(--card-background-color);padding:16px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
            ${
              c.image
                ? `<img src="${app.api._getImageUrl(c.image)}" alt="${
                    c.name
                  }" style="width:100%;height:50%;object-fit:cover;border-radius:6px;margin-bottom:12px;" loading="lazy"/>`
                : `<div style="width:100%;height:150px;background:var(--divider-color);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:3em;margin-bottom:12px;">🗄️</div>`
            }
            <div class="cupboard-card" data-cupboard="${c.name}"
                 style="cursor:pointer;padding:12px;border-radius:6px;text-align:center;transition:background .2s;margin-bottom:12px;"
                 onmouseenter="this.style.background='var(--secondary-background-color)'"
                 onmouseleave="this.style.background='transparent'">
              <div style="font-weight:600;margin-bottom:6px;font-size:1.05em;">${
                c.name
              }</div>
              <div style="font-size:.9em;color:var(--primary-color);">${
                c.itemCount
              } obiecte</div>
            </div>
            ${
              canModify
                ? `
            <div style="display:flex;gap:8px;margin-bottom:8px;">
              <button class="edit-cupboard-btn" data-id="${c.id}" data-name="${
                    c.name
                  }" data-image="${c.image || ''}"
                      style="flex:1;padding:8px;background:var(--primary-color);color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:.9em;">
                ✏️ Edit
              </button>
              <button class="qr-btn" data-room="${room}" data-cupboard="${
                    c.name
                  }"
                      style="flex:1;padding:8px;background:var(--secondary-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;cursor:pointer;font-size:.9em;">
                📱 QR
              </button>
            </div>
            <button class="delete-cupboard-btn" data-id="${c.id}" data-name="${
                    c.name
                  }" data-count="${c.itemCount}"
                    style="width:100%;padding:8px;background:var(--error-color);color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:.9em;">
              🗑️ Șterge
            </button>
            `
                : ''
            }
          </div>`
                )
                .join('')
        }
      </div>
    </div>
  `;

  content.querySelector('#backBtn')?.addEventListener('click', () => {
    app.state.currentView = 'rooms';
    app.renderView();
  });

  if (canModify) {
    attachFormToggleHandlers(content, 'cupboards', {
      addCupboard: async () => {
        const input = content.querySelector('#newCupboardName');
        const fileInput = content.querySelector('#cupboardImageUpload');
        const status = content.querySelector('#uploadStatus');
        const name = (input?.value || '').trim();
        if (!name) return alert('Te rog introdu numele dulapului.');

        try {
          let imagePath = '';
          if (fileInput?.files?.length) {
            status.textContent = 'Se încarcă imaginea...';
            imagePath = await app.api.uploadImage(fileInput.files[0], {
              room: room,
              cupboard: name,
            });
            status.textContent = '✓ Imagine încărcată';
          }

          await app.api.addCupboard(room, name, imagePath);
          content.querySelector('#addForm').style.display = 'none';
          await app.renderView();
        } catch (err) {
          alert(`Eroare: ${err?.message || 'Dulapul există deja'}`);
        }
      },
    });

    content.querySelectorAll('.edit-cupboard-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cupboard = {
          id: btn.dataset.id,
          name: btn.dataset.name,
          image: btn.dataset.image,
        };
        openEditCupboardModal(cupboard, room, app, content);
      });
    });

    content.querySelectorAll('.delete-cupboard-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openDeleteCupboardModal(
          {
            id: btn.dataset.id,
            name: btn.dataset.name,
            itemCount: btn.dataset.count,
          },
          app
        );
      });
    });

    content.querySelectorAll('.qr-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        downloadQRCode(btn.dataset.room, btn.dataset.cupboard);
      });
    });
  }

  content.querySelectorAll('.cupboard-card').forEach((card) => {
    card.addEventListener('click', () => {
      app.state.selectedCupboard = card.dataset.cupboard;
      app.state.currentView = 'shelves';
      app.renderView();
    });
  });
}

function openEditCupboardModal(cupboard, room, app, content) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position:fixed;top:0;left:0;right:0;bottom:0;
    background:rgba(0,0,0,0.5);display:flex;align-items:center;
    justify-content:center;z-index:9999;padding:20px;
  `;

  modal.innerHTML = `
    <div style="background:var(--card-background-color);border-radius:12px;
                padding:24px;max-width:500px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.3);">
      <h3 style="margin:0 0 20px 0;">✏️ Editare Dulap: ${cupboard.name}</h3>
      
      <div style="margin-bottom:16px;text-align:center;">
        ${
          cupboard.image
            ? `<img id="currentCupboardImage" src="${cupboard.image}" alt="${cupboard.name}" 
                  style="max-width:400px;max-height:300px;border-radius:8px;object-fit:cover;" loading="lazy"/>`
            : `<div id="noImagePlaceholder" style="width:150px;height:150px;background:var(--divider-color);
                        border-radius:8px;display:flex;align-items:center;justify-content:center;
                        font-size:3em;margin:0 auto;">🗄️</div>`
        }
      </div>

      <div style="margin-bottom:16px;">
        <label style="display:block;font-size:0.9em;margin-bottom:6px;color:var(--secondary-text-color);">
          ${cupboard.image ? 'Schimbă' : 'Adaugă'} imagine
        </label>
        <input type="file" id="editCupboardImageUpload" accept="image/*" 
               style="width:100%;padding:8px;border:1px solid var(--divider-color);border-radius:4px;box-sizing:border-box;" />
        <div id="editCupboardUploadStatus" style="font-size:0.85em;margin-top:6px;min-height:18px;"></div>
      </div>

      <div style="margin-bottom:20px;">
        <label style="display:block;font-size:0.9em;margin-bottom:6px;color:var(--secondary-text-color);">
          Nume dulap
        </label>
        <input type="text" id="editCupboardName" value="${cupboard.name}" 
               style="width:100%;padding:10px;border-radius:4px;border:1px solid var(--divider-color);box-sizing:border-box;" />
      </div>

      <div style="display:flex;gap:10px;">
        <button id="saveCupboardEditBtn" 
                style="flex:1;padding:12px;background:var(--primary-color);color:white;
                       border:none;border-radius:4px;cursor:pointer;font-weight:500;">
          💾 Salvează
        </button>
        <button id="cancelCupboardEditBtn"
                style="flex:1;padding:12px;background:var(--secondary-background-color);
                       color:var(--primary-text-color);border:1px solid var(--divider-color);
                       border-radius:4px;cursor:pointer;">
          Anulează
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const fileInput = modal.querySelector('#editCupboardImageUpload');
  const currentImage = modal.querySelector('#currentCupboardImage');
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
          img.id = 'currentCupboardImage';
          img.src = event.target.result;
          img.style.cssText =
            'max-width:200px;max-height:200px;border-radius:8px;object-fit:cover;';
          placeholder.parentNode.replaceChild(img, placeholder);
        }
      };
      reader.readAsDataURL(file);
    }
  });

  modal
    .querySelector('#cancelCupboardEditBtn')
    .addEventListener('click', () => {
      document.body.removeChild(modal);
    });

  modal
    .querySelector('#saveCupboardEditBtn')
    .addEventListener('click', async () => {
      const name = modal.querySelector('#editCupboardName').value.trim();
      const imageFile = modal.querySelector('#editCupboardImageUpload')
        .files[0];
      const uploadStatus = modal.querySelector('#editCupboardUploadStatus');

      if (!name) {
        return alert('Numele dulapului este obligatoriu.');
      }

      try {
        let imagePath = '';
        if (
          cupboard.image &&
          cupboard.image.includes('/api/home_inventar/images/')
        ) {
          const parts = cupboard.image.split('/');
          imagePath = parts[parts.length - 1].split('?')[0];
        } else if (cupboard.image && !cupboard.image.startsWith('/local/')) {
          imagePath = cupboard.image;
        }

        if (imageFile) {
          uploadStatus.textContent = 'Se încarcă imaginea...';
          uploadStatus.style.color = 'var(--primary-color)';
          imagePath = await app.api.uploadImage(imageFile, {
            room: room,
            cupboard: name,
            old_image: imagePath,
          });
          uploadStatus.textContent = '✓ Imagine încărcată';
          uploadStatus.style.color = 'var(--success-color)';
        }

        await app.api.updateCupboard(cupboard.id, {
          name,
          image: imagePath,
        });

        document.body.removeChild(modal);
        await app.renderView();
      } catch (err) {
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

function openDeleteCupboardModal(cupboard, app) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position:fixed;top:0;left:0;right:0;bottom:0;
    background:rgba(0,0,0,0.5);display:flex;align-items:center;
    justify-content:center;z-index:9999;padding:20px;
  `;

  modal.innerHTML = `
    <div style="background:var(--card-background-color);border-radius:12px;
                padding:24px;max-width:400px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.3);">
      <h3 style="margin:0 0 20px 0;color:var(--error-color);">⚠️ Ștergere Dulap</h3>
      
      <p style="margin-bottom:20px;line-height:1.6;">
        Ești sigur că vrei să ștergi dulapul <strong>${cupboard.name}</strong>?
        ${
          cupboard.itemCount > 0
            ? `<br/><br/><span style="color:var(--error-color);">⚠️ Acest dulap conține ${cupboard.itemCount} obiecte care vor fi șterse!</span>`
            : ''
        }
      </p>

      <div style="display:flex;gap:10px;">
        <button id="confirmDeleteCupboardBtn" 
                style="flex:1;padding:12px;background:var(--error-color);color:white;
                       border:none;border-radius:4px;cursor:pointer;font-weight:500;">
          🗑️ Șterge Definitiv
        </button>
        <button id="cancelDeleteCupboardBtn"
                style="flex:1;padding:12px;background:var(--secondary-background-color);
                       color:var(--primary-text-color);border:1px solid var(--divider-color);
                       border-radius:4px;cursor:pointer;">
          Anulează
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal
    .querySelector('#cancelDeleteCupboardBtn')
    .addEventListener('click', () => {
      document.body.removeChild(modal);
    });

  modal
    .querySelector('#confirmDeleteCupboardBtn')
    .addEventListener('click', async () => {
      try {
        await app.api.deleteCupboard(cupboard.id);
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
