import {
  attachFormToggleHandlers,
  attachCardGridNavigation,
  clearAddFormInputs,
} from '../core/ui-utils.js';

export async function renderRoomsView(app, content) {
  const rooms = await app.api.getRooms().catch((err) => {
    showAuthOrError(content, err);
    return [];
  });

  const canModify = await app.api.canModifyStructure();

  content.innerHTML = `
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px;flex-wrap:wrap;">
        <h3 style="margin:0;">🏠 Camerele din casa</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button id="allItemsBtn" style="padding:8px 16px;background:var(--secondary-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;cursor:pointer;font-weight:500;display:flex;align-items:center;gap:6px;">
            📦 Toate Obiectele
          </button>
          ${
            canModify
              ? '<button id="toggleAddBtn" style="padding:8px 16px;background:var(--primary-color);color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:500;">+ Adaugă Cameră</button>'
              : ''
          }
        </div>
      </div>

      ${
        canModify
          ? `
      <div id="addForm" style="display:none;background:var(--card-background-color);padding:16px;border-radius:8px;margin-bottom:16px;box-shadow:0 2px 4px rgba(0,0,0,0.05);">
        <input id="newRoomName" placeholder="Nume cameră (ex: Bucătărie)" style="width:100%;padding:10px;border-radius:4px;border:1px solid var(--divider-color);margin-bottom:10px;box-sizing:border-box;" />
        <div style="display:flex;gap:10px;">
          <button id="saveBtn" style="flex:1;padding:10px;background:var(--primary-color);color:white;border:none;border-radius:4px;cursor:pointer;font-weight:500;">Salvează</button>
          <button id="cancelBtn" style="flex:1;padding:10px;background:var(--secondary-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;cursor:pointer;">Anulează</button>
        </div>
      </div>
      `
          : ''
      }

      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,250px),1fr));gap:12px;">
        ${
          rooms.length === 0
            ? `<p style="grid-column:1/-1;text-align:center;color:var(--secondary-text-color);padding:40px;">Nu există camere.${
                canModify ? ' Adaugă prima cameră!' : ''
              }</p>`
            : rooms
                .map(
                  (r) => `
            <div style="background:var(--card-background-color);padding:16px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
              <div class="room-card" data-room="${r.name}"
                   style="cursor:pointer;padding:12px;border-radius:6px;text-align:center;transition:background .2s;margin-bottom:12px;"
                   onmouseenter="this.style.background='var(--secondary-background-color)'"
                   onmouseleave="this.style.background='transparent'">
                <div style="font-size:2.5em;margin-bottom:8px;">🏠</div>
                <div style="font-weight:600;margin-bottom:8px;font-size:1.1em;">${
                  r.name
                }</div>
                <div style="font-size:.9em;color:var(--primary-color);">${
                  r.itemCount
                } obiecte</div>
              </div>
              ${
                canModify
                  ? `
              <div style="display:flex;gap:8px;">
                <button class="edit-room-btn" data-id="${r.id}" data-name="${r.name}"
                        style="flex:1;padding:8px;background:var(--primary-color);color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:.9em;">
                  ✏️ Edit
                </button>
                <button class="delete-room-btn" data-id="${r.id}" data-name="${r.name}" data-count="${r.itemCount}"
                        style="flex:1;padding:8px;background:var(--error-color);color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:.9em;">
                  🗑️ Șterge
                </button>
              </div>
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

  const allItemsBtn = content.querySelector('#allItemsBtn');
  if (allItemsBtn) {
    allItemsBtn.addEventListener('click', () => {
      app.state.currentView = 'all-items';
      app.renderView();
    });
  }

  if (canModify) {
    attachFormToggleHandlers(content, 'rooms', {
      addRoom: async () => {
        const input = content.querySelector('#newRoomName');
        const name = (input?.value || '').trim();
        if (!name) return alert('Te rog introdu numele camerei.');

        try {
          await app.api.addRoom(name);
          clearAddFormInputs(content);
          content.querySelector('#addForm').style.display = 'none';
          await app.renderView();
        } catch (err) {
          alert(`Eroare: ${err?.message || 'Camera există deja'}`);
        }
      },
    });

    content.querySelectorAll('.edit-room-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditRoomModal(
          {
            id: btn.dataset.id,
            name: btn.dataset.name,
          },
          app
        );
      });
    });

    content.querySelectorAll('.delete-room-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openDeleteRoomModal(
          {
            id: btn.dataset.id,
            name: btn.dataset.name,
            itemCount: btn.dataset.count,
          },
          app
        );
      });
    });
  }

  attachCardGridNavigation(
    content,
    '.room-card',
    'cupboards',
    (v) => (app.state.selectedRoom = v),
    app.state,
    () => app.renderView()
  );
}

function openEditRoomModal(room, app) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position:fixed;top:0;left:0;right:0;bottom:0;
    background:rgba(0,0,0,0.5);display:flex;align-items:center;
    justify-content:center;z-index:9999;padding:20px;
  `;

  modal.innerHTML = `
    <div style="background:var(--card-background-color);border-radius:12px;
                padding:24px;max-width:400px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.3);">
      <h3 style="margin:0 0 20px 0;">✏️ Editare Cameră: ${room.name}</h3>
      
      <div style="margin-bottom:20px;">
        <label style="display:block;font-size:0.9em;margin-bottom:6px;color:var(--secondary-text-color);">
          Nume cameră
        </label>
        <input type="text" id="editRoomName" value="${room.name}" 
               style="width:100%;padding:10px;border-radius:4px;border:1px solid var(--divider-color);box-sizing:border-box;" />
      </div>

      <div style="display:flex;gap:10px;">
        <button id="saveRoomEditBtn" 
                style="flex:1;padding:12px;background:var(--primary-color);color:white;
                       border:none;border-radius:4px;cursor:pointer;font-weight:500;">
          💾 Salvează
        </button>
        <button id="cancelRoomEditBtn"
                style="flex:1;padding:12px;background:var(--secondary-background-color);
                       color:var(--primary-text-color);border:1px solid var(--divider-color);
                       border-radius:4px;cursor:pointer;">
          Anulează
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#cancelRoomEditBtn').addEventListener('click', () => {
    document.body.removeChild(modal);
  });

  modal
    .querySelector('#saveRoomEditBtn')
    .addEventListener('click', async () => {
      const name = modal.querySelector('#editRoomName').value.trim();
      if (!name) {
        return alert('Numele camerei este obligatoriu.');
      }

      try {
        await app.api.updateRoom(room.id, { name });
        document.body.removeChild(modal);
        await app.renderView();
      } catch (err) {
        alert(`Eroare: ${err?.message || 'Salvare eșuată'}`);
      }
    });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}

function openDeleteRoomModal(room, app) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position:fixed;top:0;left:0;right:0;bottom:0;
    background:rgba(0,0,0,0.5);display:flex;align-items:center;
    justify-content:center;z-index:9999;padding:20px;
  `;

  modal.innerHTML = `
    <div style="background:var(--card-background-color);border-radius:12px;
                padding:24px;max-width:400px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.3);">
      <h3 style="margin:0 0 20px 0;color:var(--error-color);">⚠️ Ștergere Cameră</h3>
      
      <p style="margin-bottom:20px;line-height:1.6;">
        Ești sigur că vrei să ștergi camera <strong>${room.name}</strong>?
        ${
          room.itemCount > 0
            ? `<br/><br/><span style="color:var(--error-color);">⚠️ Această cameră conține ${room.itemCount} obiecte care vor fi șterse!</span>`
            : ''
        }
      </p>

      <div style="display:flex;gap:10px;">
        <button id="confirmDeleteRoomBtn" 
                style="flex:1;padding:12px;background:var(--error-color);color:white;
                       border:none;border-radius:4px;cursor:pointer;font-weight:500;">
          🗑️ Șterge Definitiv
        </button>
        <button id="cancelDeleteRoomBtn"
                style="flex:1;padding:12px;background:var(--secondary-background-color);
                       color:var(--primary-text-color);border:1px solid var(--divider-color);
                       border-radius:4px;cursor:pointer;">
          Anulează
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#cancelDeleteRoomBtn').addEventListener('click', () => {
    document.body.removeChild(modal);
  });

  modal
    .querySelector('#confirmDeleteRoomBtn')
    .addEventListener('click', async () => {
      try {
        await app.api.deleteRoom(room.id);
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
