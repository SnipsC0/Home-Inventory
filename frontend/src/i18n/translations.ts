export type Language = 'ro' | 'en';

export interface Translations {
  common: {
    loading: string;
    error: string;
    save: string;
    saving: string;
    cancel: string;
    delete: string;
    deleting: string;
    edit: string;
    add: string;
    search: string;
    close: string;
    confirm: string;
    back: string;
    reload: string;
    deleteConfirm: string;
    deleteConfirm2?: string;
    optional: string;
    select: string;
    name: string;
    infoViewPress: string;
    connectingHA: string;
  };
  rooms: {
    title: string;
    room: string;
    addRoom: string;
    roomName: string;
    allItems: string;
    trackedItems: string;
    noExist: string;
    addFirst: string;
    this: string;
    contain: string;
    containItems: string;
  };
  cupboards: {
    title: string;
    cupboard: string;
    addCupboard: string;
    cupboardName: string;
    deleteConfirm: string;
    noCupboards: string;
    addFirst: string;
    example: string;
  };
  shelves: {
    title: string;
    addShelf: string;
    shelf: string;
    shelfName: string;
    deleteConfirm: string;
    noShelves: string;
    addFirst: string;
  };
  organizers: {
    title: string;
    organizer: string;
    addOrganizer: string;
    organizerName: string;
    deleteConfirm: string;
    withoutOrganizer: string;
    noOrganizers: string;
    addFirst: string;
    moveOrganizer: string;
  };
  items: {
    title: string;
    addItem: string;
    addFirst: string;
    addItemWithoutOrganizer: string;
    itemName: string;
    aliases: string;
    quantity: string;
    minQuantity: string;
    trackQuantity: string;
    location: string;
    image: string;
    deleteConfirm: string;
    noItems: string;
    lowStock: string;
    needsRestock: string;
    pieces: string;
    moveItem: string;
    noTrack: string;
  };
  trackedItems: {
    title: string;
    loading: string;
    noItems: string;
    noItemsFiltered: string;
    tryModifyFilters: string;
    enableTracking: string;
    all: string;
    belowStock: string;
    ok: string;
    searchPlaceholder: string;
    locationLabel: string;
    quantityLabel: string;
    needsRestockLabel: string;
  };
  errors: {
    connectionError: string;
    uploadFailed: string;
    generalError: string;
    sameLocationOrganizer: string;
    sameLocationItem: string;
    preloadMoveLocation: string;
    getRoomsError: string;
  };
}

export const translations: Record<Language, Translations> = {
  ro: {
    common: {
      loading: 'Se încarcă...',
      error: 'Eroare',
      save: 'Salvează',
      saving: 'Se salvează...',
      cancel: 'Anulează',
      delete: 'Șterge',
      deleting: 'Se șterge...',
      edit: 'Editează',
      add: 'Adaugă',
      search: 'Caută',
      close: 'Închide',
      confirm: 'Confirmă',
      back: 'Înapoi',
      reload: 'Reîncarcă',
      deleteConfirm: 'Sigur vrei să ștergi această',
      deleteConfirm2: 'Sigur vrei să ștergi acest',
      optional: 'opțional',
      select: 'Selectează',
      name: 'Nume',
      infoViewPress: 'Apasă lungă sau click dreapta pentru editare',
      connectingHA: 'Se conectează la Home Assistant...',
    },
    rooms: {
      title: 'Camere',
      room: 'Camera',
      addRoom: 'Adaugă Cameră',
      roomName: 'Nume cameră',
      allItems: 'Toate Articolele',
      trackedItems: 'Articole Urmărite',
      noExist: 'Nu există camere.',
      addFirst: 'Adaugă prima cameră',
      this: 'Această',
      contain: 'conține',
      containItems: 'elemente care vor fi șterse',
    },
    cupboards: {
      title: 'Dulapuri',
      cupboard: 'Dulap',
      addCupboard: 'Adaugă Dulap',
      cupboardName: 'Nume dulap',
      deleteConfirm: 'Sigur vrei să ștergi acest dulap?',
      noCupboards: 'Nu există dulapuri',
      addFirst: 'Adaugă primul dulap',
      example: 'ex: Dulap mare',
    },
    shelves: {
      title: 'Rafturi',
      shelf: 'Raft',
      addShelf: 'Adaugă Raft',
      shelfName: 'Nume raft',
      deleteConfirm: 'Sigur vrei să ștergi acest raft?',
      noShelves: 'Nu există rafturi',
      addFirst: 'Adaugă primul raft',
    },
    organizers: {
      title: 'Organizatoare',
      organizer: 'Organizator',
      addOrganizer: 'Adaugă Organizator',
      organizerName: 'Nume organizator',
      deleteConfirm: 'Sigur vrei să ștergi acest organizator?',
      withoutOrganizer: 'Fără Organizator',
      noOrganizers: 'Nu există organizatoare',
      addFirst: 'Adaugă primul organizator',
      moveOrganizer: 'Mută organizatorul',
    },
    items: {
      title: 'Articole',
      addItem: 'Adaugă Articol',
      addFirst: 'Adaugă primul articol',
      addItemWithoutOrganizer: 'Obiect direct pe raft',
      itemName: 'Nume articol',
      aliases: 'Aliasuri',
      quantity: 'Cantitate',
      minQuantity: 'Cantitate minimă',
      trackQuantity: 'Urmărește cantitatea',
      location: 'Locație',
      image: 'Imagine',
      deleteConfirm: 'Sigur vrei să ștergi acest articol?',
      noItems: 'Nu există articole',
      lowStock: 'Stoc scăzut',
      needsRestock: 'Necesită reaprovizionare',
      pieces: 'bucăți',
      moveItem: 'Mută articolul',
      noTrack: 'Cantitatea nu este urmărită pentru acest obiect',
    },
    trackedItems: {
      title: 'Articole Urmărite',
      loading: 'Se încarcă articolele urmărite...',
      noItems: 'Niciun articol urmărit',
      noItemsFiltered: 'Nu s-au găsit articole',
      tryModifyFilters: 'Încearcă să modifici filtrele',
      enableTracking: 'Activează urmărirea cantității pentru articole',
      all: 'Toate',
      belowStock: 'Sub stoc',
      ok: 'OK',
      searchPlaceholder: 'Caută articole...',
      locationLabel: 'Locație:',
      quantityLabel: 'Cantitate:',
      needsRestockLabel: 'Necesită reaprovizionare',
    },
    errors: {
      connectionError: 'Eroare la conectare',
      uploadFailed: 'Upload eșuat',
      generalError: 'A apărut o eroare',
      sameLocationOrganizer: 'Organizatorul este în aceeași locație',
      sameLocationItem: 'Articolul este în aceeași locație',
      preloadMoveLocation: 'Eroare la preîncărcarea locației curente',
      getRoomsError: 'Eroare la încărcarea camerelor',
    },
  },
  en: {
    common: {
      loading: 'Loading...',
      error: 'Error',
      save: 'Save',
      saving: 'Saving...',
      cancel: 'Cancel',
      delete: 'Delete',
      deleting: 'Removing...',
      edit: 'Edit',
      add: 'Add',
      search: 'Search',
      close: 'Close',
      confirm: 'Confirm',
      back: 'Back',
      reload: 'Reload',
      deleteConfirm: 'Are you sure you want to delete this',
      optional: 'optional',
      select: 'Select',
      name: 'Name',
      infoViewPress: 'Touch longer or right click to edit',
      connectingHA: 'Connecting to Home Assistant...',
    },
    rooms: {
      title: 'Rooms',
      room: 'Room',
      addRoom: 'Add Room',
      roomName: 'Room name',
      allItems: 'All Items',
      trackedItems: 'Tracked Items',
      noExist: "There's no room.",
      addFirst: ' Add first room.',
      this: 'This',
      contain: 'contain',
      containItems: 'items which will be removed',
    },
    cupboards: {
      title: 'Cupboards',
      cupboard: 'Cupboard',
      addCupboard: 'Add Cupboard',
      cupboardName: 'Cupboard name',
      deleteConfirm: 'Are you sure you want to delete this cupboard?',
      noCupboards: 'No cupboards.',
      addFirst: 'Add first cupboard.',
      example: 'e.g: Big cupboard',
    },
    shelves: {
      title: 'Shelves',
      shelf: 'Shelf',
      addShelf: 'Add Shelf',
      shelfName: 'Shelf name',
      deleteConfirm: 'Are you sure you want to delete this shelf?',
      noShelves: "There's no shelves",
      addFirst: 'Add first shelf',
    },
    organizers: {
      title: 'Organizers',
      organizer: 'Organizer',
      addOrganizer: 'Add Organizer',
      organizerName: 'Organizer name',
      deleteConfirm: 'Are you sure you want to delete this organizer?',
      withoutOrganizer: 'Without Organizer',
      noOrganizers: "There's no organizers",
      addFirst: 'Add first organizer',
      moveOrganizer: 'Move the organizer',
    },
    items: {
      title: 'Items',
      addItem: 'Add Item',
      addFirst: 'Add first item',
      addItemWithoutOrganizer: 'Item on shelf',
      itemName: 'Item name',
      aliases: 'Aliases',
      quantity: 'Quantity',
      minQuantity: 'Minimum quantity',
      trackQuantity: 'Track quantity',
      location: 'Location',
      image: 'Image',
      deleteConfirm: 'Are you sure you want to delete this item?',
      noItems: 'No items',
      lowStock: 'Low stock',
      needsRestock: 'Needs restock',
      pieces: 'pieces',
      moveItem: 'Move the item',
      noTrack: 'The quantity is not tracked for this item',
    },
    trackedItems: {
      title: 'Tracked Items',
      loading: 'Loading tracked items...',
      noItems: 'No tracked items',
      noItemsFiltered: 'No items found',
      tryModifyFilters: 'Try modifying the filters',
      enableTracking: 'Enable quantity tracking for items',
      all: 'All',
      belowStock: 'Below stock',
      ok: 'OK',
      searchPlaceholder: 'Search items...',
      locationLabel: 'Location:',
      quantityLabel: 'Quantity:',
      needsRestockLabel: 'Needs restock',
    },
    errors: {
      connectionError: 'Connection error',
      uploadFailed: 'Upload failed',
      generalError: 'An error occurred',
      sameLocationOrganizer: 'The organizer is in the same location',
      sameLocationItem: 'The item is in the same location',
      preloadMoveLocation: 'Error at preloaded current location',
      getRoomsError: 'Error at fetching rooms.',
    },
  },
};
