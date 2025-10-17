export function attachBackButton(rootEl, targetView, state, onChange) {
  const backBtn = rootEl.querySelector('#backBtn');
  backBtn?.addEventListener('click', () => {
    state.currentView = targetView;
    if (targetView === 'rooms') {
      state.selectedRoom = null;
      state.selectedCupboard = null;
      state.selectedShelf = null;
    } else if (targetView === 'cupboards') {
      state.selectedCupboard = null;
      state.selectedShelf = null;
    } else if (targetView === 'shelves') {
      state.selectedShelf = null;
    }
    onChange();
  });
}

export function attachFormToggleHandlers(rootEl, viewType, handlers) {
  const toggleBtn = rootEl.querySelector('#toggleAddBtn');
  const addForm = rootEl.querySelector('#addForm');
  const cancelBtn = rootEl.querySelector('#cancelBtn');
  const saveBtn = rootEl.querySelector('#saveBtn');

  if (!addForm) return;

  let opened = false;

  toggleBtn?.addEventListener('click', () => {
    opened = !opened;
    addForm.style.display = opened ? 'block' : 'none';
    if (opened) {
      const firstInput = addForm.querySelector(
        'input[type="text"], input:not([type="file"])'
      );
      firstInput?.focus();
    }
  });

  cancelBtn?.addEventListener('click', () => {
    opened = false;
    addForm.style.display = 'none';
    clearAddFormInputs(rootEl);
  });

  saveBtn?.addEventListener('click', () => {
    if (viewType === 'rooms') handlers.addRoom();
    if (viewType === 'cupboards') handlers.addCupboard();
    if (viewType === 'shelves') handlers.addShelf();
    if (viewType === 'organizers') handlers.addOrganizer();
    if (viewType === 'items') handlers.addItem();
  });
}

export function attachCardGridNavigation(
  container,
  selector,
  nextView,
  selectFn,
  state,
  onChange
) {
  container.querySelectorAll(selector).forEach((card) => {
    card.addEventListener('click', () => {
      const value =
        card.dataset.room ||
        card.dataset.cupboard ||
        card.dataset.shelf ||
        card.dataset.organizer;
      selectFn(value);
      state.currentView = nextView;
      onChange();
    });

    card.addEventListener('mouseenter', (e) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    });
    card.addEventListener('mouseleave', (e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    });
  });
}

export function clearAddFormInputs(rootEl) {
  rootEl.querySelectorAll('#addForm input').forEach((input) => {
    if (input.type === 'file') input.value = '';
    else input.value = '';
  });
  const status = rootEl.querySelector('#uploadStatus');
  if (status) status.textContent = '';
}
