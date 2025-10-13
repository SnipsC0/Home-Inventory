import {
  attachFormToggleHandlers,
  attachCardGridNavigation,
} from '../core/ui-utils.js';

export async function renderShelvesView(app, content) {
  const s = app.state;
  if (!s.selectedRoom || !s.selectedCupboard) {
    s.currentView = 'rooms';
    return app.renderView();
  }

  const shelves = await app.api
    .getShelves(s.selectedRoom, s.selectedCupboard)
    .catch((err) => {
      showAuthOrError(content, err);
      return [];
    });

  const canModify = await app.api.canModifyStructure();
  const qrRedirectUrl = await app.api.getQRRedirectUrl();

  content.innerHTML = `
    <div>
      <div style="margin-bottom:16px;display:flex;align-items:center;gap:8px;color:var(--secondary-text-color);flex-wrap:wrap;">
        <button id="backBtn" style="background:none;border:none;color:var(--primary-color);cursor:pointer;font-size:1em;padding:4px 8px;">← Dulapuri</button>
        <span>/</span>
        <span style="font-weight:600;color:var(--primary-text-color);">${
          s.selectedCupboard
        }</span>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px;flex-wrap:wrap;">
        <h3 style="margin:0;">📚 Rafturi</h3>
        ${
          canModify
            ? '<button id="toggleAddBtn" style="padding:8px 16px;background:var(--primary-color);color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:500;">+ Adaugă Raft</button>'
            : ''
        }
      </div>

      ${
        canModify && qrRedirectUrl
          ? `
      <div style="background:var(--info-color);color:white;padding:16px;border-radius:8px;margin-bottom:16px;">
        <div style="font-weight:600;margin-bottom:12px;">📱 Deep Link pentru QR Code al acestui dulap:</div>
        
        <div style="background:rgba(0,0,0,0.2);padding:12px;border-radius:6px;margin-bottom:12px;">
          <div style="font-size:0.85em;opacity:0.9;margin-bottom:6px;">📍 Locație:</div>
          <div style="font-weight:600;font-size:1.05em;margin-bottom:2px;">🏠 ${
            s.selectedRoom
          }</div>
          <div style="font-weight:600;font-size:1.05em;">🗄️ ${
            s.selectedCupboard
          }</div>
        </div>

        <div style="background:rgba(255,255,255,0.15);padding:10px;border-radius:6px;font-family:monospace;font-size:0.75em;word-break:break-all;line-height:1.5;margin-bottom:12px;">
          ${qrRedirectUrl}?data=${btoa(
              JSON.stringify({
                room: s.selectedRoom,
                cupboard: s.selectedCupboard,
              })
            )}
        </div>
        
        <div style="font-size:0.85em;opacity:0.95;line-height:1.5;">
          💡 <strong>Cum funcționează:</strong><br/>
          • Click pe butonul "📱 QR" din pagina dulapuri<br/>
          • Codul QR va conține exact acest link<br/>
          • Scanează cu aplicația Home Assistant<br/>
          • Vei fi redirecționat automat la rafturile acestui dulap
        </div>
      </div>
      `
          : ''
      }

      ${
        canModify
          ? `
      <div id="addForm" style="display:none;background:var(--card-background-color);padding:16px;border-radius:8px;margin-bottom:16px;box-shadow:0 2px 4px rgba(0,0,0,0.05);">
        <input id="newShelfName" placeholder="Nume raft (ex: Raft 1)" style="width:100%;padding:10px;border-radius:4px;border:1px solid var(--divider-color);margin-bottom:10px;box-sizing:border-box;" />
        <div style="display:flex;gap:10px;">
          <button id="saveBtn" style="flex:1;padding:10px;background:var(--primary-color);color:white;border:none;border-radius:4px;cursor:pointer;font-weight:500;">Salvează</button>
          <button id="cancelBtn" style="flex:1;padding:10px;background:var(--secondary-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:4px;cursor:pointer;">Anulează</button>
        </div>
      </div>
      `
          : ''
      }

      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,180px),1fr));gap:12px;">
        ${
          shelves.length === 0
            ? `<p style="grid-column:1/-1;text-align:center;color:var(--secondary-text-color);padding:40px;">Nu există rafturi.${
                canModify ? ' Adaugă primul raft!' : ''
              }</p>`
            : shelves
                .map(
                  (shelf) => `
          <div style="background:var(--card-background-color);padding:16px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
            <div class="shelf-card" data-shelf="${shelf.name}"
                 style="cursor:pointer;padding:12px;border-radius:6px;text-align:center;transition:background .2s;margin-bottom:12px;"
                 onmouseenter="this.style.background='var(--secondary-background-color)'"
                 onmouseleave="this.style.background='transparent'">
              <div style="font-size:2.5em;margin-bottom:8px;">📋</div>
              <div style="font-weight:600;margin-bottom:8px;font-size:1.1em;">${
                shelf.name
              }</div>
              ${
                shelf.organizerCount > 0
                  ? `<div style="font-size:.85em;color:var(--secondary-text-color);">${shelf.organizerCount} organizatoare</div>`
                  : ''
              }
              <div style="font-size:.9em;color:var(--primary-color);">${
                shelf.itemCount
              } obiecte</div>
            </div>
            ${
              canModify
                ? `
            <div style="display:flex;gap:8px;margin-bottom:8px;">
              <button class="edit-shelf-btn" data-id="${shelf.id}" data-name="${shelf.name}"
                      style="flex:1;padding:8px;background:var(--primary-color);color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:.9em;">
                ✏️ Edit
              </button>
            </div>
            <button class="delete-shelf-btn" data-id="${shelf.id}" data-name="${shelf.name}" data-count="${shelf.itemCount}"
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
    app.state.currentView = 'cupboards';
    app.renderView();
  });

  if (canModify) {
    attachFormToggleHandlers(content, 'shelves', {
      addShelf: async () => {
        const input = content.querySelector('#newShelfName');
        const name = (input?.value || '').trim();
        if (!name) return alert('Te rog introdu numele raftului.');
        try {
          await app.api.addShelf(s.selectedRoom, s.selectedCupboard, name);
          content.querySelector('#addForm').style.display = 'none';
          await app.renderView();
        } catch (err) {
          alert(`Eroare: ${err?.message || 'Raftul există deja'}`);
        }
      },
    });

    // Edit buttons
    content.querySelectorAll('.edit-shelf-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditShelfModal(
          {
            id: btn.dataset.id,
            name: btn.dataset.name,
          },
          app
        );
      });
    });

    // Delete buttons
    content.querySelectorAll('.delete-shelf-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openDeleteShelfModal(
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
    '.shelf-card',
    'organizers',
    (v) => (app.state.selectedShelf = v),
    app.state,
    () => app.renderView()
  );
}

function openEditShelfModal(shelf, app) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position:fixed;top:0;left:0;right:0;bottom:0;
    background:rgba(0,0,0,0.5);display:flex;align-items:center;
    justify-content:center;z-index:9999;padding:20px;
  `;

  modal.innerHTML = `
    <div style="background:var(--card-background-color);border-radius:12px;
                padding:24px;max-width:400px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.3);">
      <h3 style="margin:0 0 20px 0;">✏️ Editare Raft: ${shelf.name}</h3>
      
      <div style="margin-bottom:20px;">
        <label style="display:block;font-size:0.9em;margin-bottom:6px;color:var(--secondary-text-color);">
          Nume raft
        </label>
        <input type="text" id="editShelfName" value="${shelf.name}" 
               style="width:100%;padding:10px;border-radius:4px;border:1px solid var(--divider-color);box-sizing:border-box;" />
      </div>

      <div style="display:flex;gap:10px;">
        <button id="saveShelfEditBtn" 
                style="flex:1;padding:12px;background:var(--primary-color);color:white;
                       border:none;border-radius:4px;cursor:pointer;font-weight:500;">
          💾 Salvează
        </button>
        <button id="cancelShelfEditBtn"
                style="flex:1;padding:12px;background:var(--secondary-background-color);
                       color:var(--primary-text-color);border:1px solid var(--divider-color);
                       border-radius:4px;cursor:pointer;">
          Anulează
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#cancelShelfEditBtn').addEventListener('click', () => {
    document.body.removeChild(modal);
  });

  modal
    .querySelector('#saveShelfEditBtn')
    .addEventListener('click', async () => {
      const name = modal.querySelector('#editShelfName').value.trim();
      if (!name) {
        return alert('Numele raftului este obligatoriu.');
      }

      try {
        await app.api.updateShelf(shelf.id, { name });
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

function openDeleteShelfModal(shelf, app) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position:fixed;top:0;left:0;right:0;bottom:0;
    background:rgba(0,0,0,0.5);display:flex;align-items:center;
    justify-content:center;z-index:9999;padding:20px;
  `;

  modal.innerHTML = `
    <div style="background:var(--card-background-color);border-radius:12px;
                padding:24px;max-width:400px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.3);">
      <h3 style="margin:0 0 20px 0;color:var(--error-color);">⚠️ Ștergere Raft</h3>
      
      <p style="margin-bottom:20px;line-height:1.6;">
        Ești sigur că vrei să ștergi raftul <strong>${shelf.name}</strong>?
        ${
          shelf.itemCount > 0
            ? `<br/><br/><span style="color:var(--error-color);">⚠️ Acest raft conține ${shelf.itemCount} obiecte care vor fi șterse!</span>`
            : ''
        }
      </p>

      <div style="display:flex;gap:10px;">
        <button id="confirmDeleteShelfBtn" 
                style="flex:1;padding:12px;background:var(--error-color);color:white;
                       border:none;border-radius:4px;cursor:pointer;font-weight:500;">
          🗑️ Șterge Definitiv
        </button>
        <button id="cancelDeleteShelfBtn"
                style="flex:1;padding:12px;background:var(--secondary-background-color);
                       color:var(--primary-text-color);border:1px solid var(--divider-color);
                       border-radius:4px;cursor:pointer;">
          Anulează
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#cancelDeleteShelfBtn').addEventListener('click', () => {
    document.body.removeChild(modal);
  });

  modal
    .querySelector('#confirmDeleteShelfBtn')
    .addEventListener('click', async () => {
      try {
        await app.api.deleteShelf(shelf.id);
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
