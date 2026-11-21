export type Language = 'ro' | 'en' | 'ru' | 'de';

export const LANGUAGES: Language[] = ['en', 'ro', 'ru', 'de'];

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
    deleteTitle?: string;
    optional: string;
    select: string;
    name: string;
    infoViewPress: string;
    connectingHA: string;
    removeImage: string;
    uploadingImage: string;
    cascadeTitle: string;
    cascadeCupboards: string;
    cascadeShelves: string;
    cascadeOrganizers: string;
    cascadeLocations: string;
    cascadeItems: string;
    cascadeImages: string;
    cascadeNote: string;
    clear: string;
    preview: string;
  };
  rooms: {
    title: string;
    room: string;
    addRoom: string;
    roomName: string;
    allItems: string;
    trackedItems: string;
    expiring: string;
    noExist: string;
    addFirst: string;
    containWarning: string;
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
    moveIn: string;
    cancelMove: string;
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
    lots: string;
    barcode: string;
    scanButton: string;
    scanAppOnly: string;
    findByBarcode: string;
    barcodeNotFound: string;
    scanAgain: string;
    enterBarcodeManually: string;
    variant: string;
    variantPlaceholder: string;
    variantBarcode: string;
    variantBarcodeHint: string;
    barcodeAppliesToItem: string;
    variantBarcodeLinks: string;
    matchedVariant: string;
    existingRowsHint: string;
    addToExisting: string;
    newRow: string;
    locationsCount: string;
    total: string;
    selectLocationHint: string;
    expired: string;
    noDate: string;
    expShort: string;
    expDate: string;
    expDateHint: string;
    datePlaceholder: string;
    aliasesPlaceholder: string;
    noLocation: string;
    addIn: string;
    editItem: string;
    editMainItem: string;
    existingBatches: string;
    batchDatePlaceholder: string;
    addBatch: string;
    confirmDeletion: string;
    deleteMasterConfirm: string;
    deleteMasterBefore: string;
    deleteMasterLocations: string;
    deleteMasterAfter: string;
    deleteMasterList: string;
    totalQuantity: string;
    day: string;
    days: string;
    daysFew?: string;
    expirationDate: string;
    batchNoDate: string;
    undefinedDate: string;
    moveTo: string;
    organizerOptional: string;
    newLocation: string;
    productInLocation: string;
    productInLocations: string;
  };
  expiring: {
    title: string;
    all: string;
    expired: string;
    soon: string;
    noBatches: string;
    noBatchesFiltered: string;
    expiredAgo: string;
    today: string;
    inDays: string;
    quantity: string;
    loadError: string;
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
  favorites: {
    filter: string;
    add: string;
    remove: string;
    empty: string;
  };
  trash: {
    title: string;
    empty: string;
    loadError: string;
    expiresDays: string;
    expiresToday: string;
    restore: string;
    deleteForever: string;
    emptyBin: string;
    emptyConfirm: string;
    deleteForeverConfirm: string;
    movedToBin: string;
    undo: string;
    restored: string;
    restoreFailed: string;
    parentMissing: string;
    restoreParent: string;
    deleteNote: string;
    kinds: {
      room: string;
      cupboard: string;
      shelf: string;
      organizer: string;
      item_master: string;
      item_location: string;
    };
    warnRenamed: string;
    warnItemMerged: string;
    warnBarcodeDropped: string;
    warnVariantBarcodeSkipped: string;
  };
  errors: {
    connectionError: string;
    uploadFailed: string;
    generalError: string;
    sameLocationOrganizer: string;
    sameLocationItem: string;
    preloadMoveLocation: string;
    getRoomsError: string;
    unexpected: string;
    invalidDates: string;
    alreadyInLocation: string;
    unexpectedApi: string;
    unexpectedUploadResponse: string;
    imageUploadFailed: string;
    decodeFailed: string;
    connectFailed: string;
  };
  scanner: {
    title: string;
    videoScan: string;
    uploadImage: string;
    processing: string;
    processingHint: string;
    manualLabel: string;
    manualPlaceholder: string;
    manualHint: string;
    add: string;
    scannedCode: string;
    copyCode: string;
    copied: string;
    history: string;
    clearAll: string;
    historyHint: string;
    onlyNumeric: string;
    readFailed: string;
    loadFailed: string;
    processFailed: string;
    noBarcodeFound: string;
    nativeTitle: string;
    nativeDescription: string;
    nativeCancel: string;
  };
  locationLink: {
    title: string;
    button: string;
    qr: string;
    nfc: string;
    link: string;
    copy: string;
    copied: string;
    download: string;
    notFound: string;
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
      removeImage: 'Elimină poza',
      uploadingImage: 'Se încarcă imaginea...',
      cascadeTitle: 'Se vor șterge definitiv, în cascadă:',
      cascadeCupboards: 'dulapuri',
      cascadeShelves: 'rafturi',
      cascadeOrganizers: 'organizatoare',
      cascadeLocations: 'locații de articole',
      cascadeItems: 'articole (ultima lor locație)',
      cascadeImages: 'poze (cu miniaturile lor)',
      cascadeNote: 'Articolele care mai au și alte locații rămân, doar locația ștearsă dispare.',
      clear: 'Șterge',
      preview: 'Previzualizare',
    },
    rooms: {
      title: 'Camere',
      room: 'Camera',
      addRoom: 'Adaugă Cameră',
      roomName: 'Nume cameră',
      allItems: 'Toate Articolele',
      trackedItems: 'Articole Urmărite',
      expiring: 'Expiră',
      noExist: 'Nu există camere.',
      addFirst: 'Adaugă prima cameră',
      containWarning: 'Această {type} conține {n} elemente care vor fi șterse!',
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
      moveIn: 'Mută în:',
      cancelMove: 'Anulează mutarea',
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
      lots: 'Loturi',
      barcode: 'Cod de bare',
      scanButton: 'Scaneaza codul de bare',
      scanAppOnly:
        'Scanarea cu camera funcționează doar din aplicația Home Assistant.',
      findByBarcode: 'Caută după cod de bare',
      barcodeNotFound: 'Niciun produs găsit cu acest cod de bare.',
      scanAgain: 'Scanează din nou',
      enterBarcodeManually: 'Sau introdu manual codul de bare:',
      variant: 'Variantă',
      variantPlaceholder: 'ex: borcan mic',
      variantBarcode: 'Cod de bare variantă',
      variantBarcodeHint: 'Necesită completarea câmpului „Variantă”.',
      barcodeAppliesToItem: 'Codul de bare se aplică articolului principal, nu celui curent. Dacă vrei să previi asta, scrie o variantă (ex: modelul sau firma produsului).',
      variantBarcodeLinks: 'Acest cod de bare va fi legat de varianta „{variant}” a articolului existent.',
      matchedVariant: 'Variantă potrivită',
      existingRowsHint: 'Acest articol există deja aici. Alege unde adaugi:',
      addToExisting: 'Adaugă la acesta',
      newRow: 'Rând nou',
      locationsCount: 'locații',
      total: 'Total',
      selectLocationHint:
        'Acest articol e în mai multe locații. Alege locația de văzut (click scurt) sau de editat (apăsare lungă):',
      expired: 'Expirat',
      noDate: 'Fără dată',
      expShort: 'Exp',
      expDate: 'Data expirării',
      expDateHint: 'AAAA/LL/ZZ sau gol',
      datePlaceholder: 'AAAA/LL/ZZ',
      aliasesPlaceholder: 'ex: toner negru, cartuș negru',
      noLocation: 'Fără locație',
      addIn: 'Adaugă în {organizer}',
      editItem: 'Editează articolul',
      editMainItem: 'Editează articolul principal',
      existingBatches: 'Loturi existente cu date de expirare:',
      batchDatePlaceholder: 'AAAA/LL/ZZ (gol = fără expirare)',
      addBatch: '+ Adaugă lot (cu sau fără expirare)',
      confirmDeletion: 'Confirmă ștergerea',
      deleteMasterConfirm: 'Sigur vrei să ștergi articolul {name}?',
      deleteMasterBefore: 'Această acțiune va șterge articolul principal și ',
      deleteMasterLocations: 'toate cele {n} locații asociate',
      deleteMasterAfter: ', precum și pozele de pe disc.',
      deleteMasterList: 'Locațiile care vor fi șterse:',
      totalQuantity: 'Cantitate totală',
      day: 'zi',
      days: 'zile',
      expirationDate: 'Data expirării',
      batchNoDate: 'Lot fără dată',
      undefinedDate: 'Nedefinită',
      moveTo: 'Mută în:',
      organizerOptional: 'Organizator (opțional)',
      newLocation: 'Locație nouă:',
      productInLocation: 'Produsul se află într-o locație',
      productInLocations: 'Produsul se află în {n} locații',
    },
    expiring: {
      title: 'Batchuri care expiră',
      all: 'Toate',
      expired: 'Expirate',
      soon: 'Aproape expiră',
      noBatches: 'Nu există batchuri cu dată de expirare.',
      noBatchesFiltered: 'Niciun batch pentru acest filtru.',
      expiredAgo: 'expirat acum {n} z',
      today: 'expiră azi',
      inDays: 'în {n} z',
      quantity: 'Cant.',
      loadError: 'Nu s-au putut încărca batchurile.',
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
    favorites: {
      filter: 'Favorite',
      add: 'Adaugă la favorite',
      remove: 'Elimină din favorite',
      empty: 'Nu ai niciun obiect favorit. Apasă steaua din fereastra unui obiect ca să-l adaugi.',
    },
    trash: {
      title: 'Coș de gunoi',
      empty: 'Coșul este gol.',
      loadError: 'Nu s-a putut încărca coșul.',
      expiresDays: 'Expiră în {n} zile',
      expiresToday: 'Expiră astăzi',
      restore: 'Restaurează',
      deleteForever: 'Șterge definitiv',
      emptyBin: 'Golește coșul',
      emptyConfirm: 'Ștergi definitiv tot ce este în coș, inclusiv pozele? Acțiunea nu poate fi anulată.',
      deleteForeverConfirm: 'Ștergi definitiv „{name}”, inclusiv pozele? Acțiunea nu poate fi anulată.',
      movedToBin: 'Mutat în coș',
      undo: 'Anulează',
      restored: 'Restaurat',
      restoreFailed: 'Restaurarea a eșuat.',
      parentMissing: 'Mai întâi restaurează „{parent}”.',
      restoreParent: 'Restaurează „{parent}”',
      deleteNote: 'Va fi mutat în coș pentru {n} zile și poate fi restaurat.',
      kinds: {
        room: 'Cameră',
        cupboard: 'Dulap',
        shelf: 'Raft',
        organizer: 'Organizator',
        item_master: 'Obiect',
        item_location: 'Locație obiect',
      },
      warnRenamed: '„{from}” exista deja, restaurat ca „{to}”.',
      warnItemMerged: '„{name}” exista deja, locațiile au fost atașate acestuia.',
      warnBarcodeDropped: 'Codul de bare {barcode} al „{name}” este folosit de alt obiect și nu a fost restaurat.',
      warnVariantBarcodeSkipped: 'Codul de bare {barcode} al variantei „{variant}” este deja folosit și a fost omis.',
    },
    errors: {
      connectionError: 'Eroare la conectare',
      uploadFailed: 'Upload eșuat',
      generalError: 'A apărut o eroare',
      sameLocationOrganizer: 'Organizatorul este în aceeași locație',
      sameLocationItem: 'Articolul este în aceeași locație',
      preloadMoveLocation: 'Eroare la preîncărcarea locației curente',
      getRoomsError: 'Eroare la încărcarea camerelor',
      unexpected: 'Eroare neașteptată',
      invalidDates: 'Datele de expirare trebuie să fie în formatul AAAA/LL/ZZ sau goale!',
      alreadyInLocation: 'Articolul se află deja în această locație!',
      unexpectedApi: 'Eroare neașteptată de la API',
      unexpectedUploadResponse: 'Răspuns neașteptat la încărcarea imaginii.',
      imageUploadFailed: 'Încărcarea imaginii a eșuat ({status})',
      decodeFailed: 'Decodarea codului de bare a eșuat',
      connectFailed: 'Nu s-a putut conecta la Home Assistant',
    },
    scanner: {
      title: 'Scanează cod de bare',
      videoScan: 'Scanare video',
      uploadImage: 'Încarcă imagine',
      processing: 'Se procesează imaginea...',
      processingHint: 'Se caută coduri de bare în imagine',
      manualLabel: 'Sau introdu codul manual',
      manualPlaceholder: 'Introdu codul de bare...',
      manualHint: 'Apasă Enter sau bifa pentru a adăuga',
      add: 'Adaugă',
      scannedCode: 'Cod scanat:',
      copyCode: 'Copiază codul',
      copied: 'Copiat!',
      history: 'Istoric scanări',
      clearAll: 'Șterge tot',
      historyHint: 'Click pe un cod pentru a-l selecta și copia',
      onlyNumeric: 'Sunt acceptate doar coduri de bare numerice.',
      readFailed: 'Nu s-a putut citi fișierul.',
      loadFailed: 'Nu s-a putut încărca fișierul.',
      processFailed: 'Nu s-a putut procesa imaginea:',
      noBarcodeFound:
        'Nu s-a găsit niciun cod de bare în imagine.\n\nSfaturi:\n• Asigură-te că lumina este bună\n• Pune codul în centrul imaginii\n• Încearcă să te apropii de cod',
      nativeTitle: 'Scanează cod de bare',
      nativeDescription: 'Îndreaptă camera spre codul de bare',
      nativeCancel: 'Anulează',
    },
    locationLink: {
      title: 'QR / NFC',
      button: 'QR / NFC',
      qr: 'Cod QR',
      nfc: 'Tag NFC',
      link: 'Link',
      copy: 'Copiază',
      copied: 'Copiat!',
      download: 'Descarcă PNG',
      notFound: 'Locația nu mai există.',
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
      removeImage: 'Remove image',
      uploadingImage: 'Uploading image...',
      cascadeTitle: 'The following will be permanently deleted:',
      cascadeCupboards: 'cupboards',
      cascadeShelves: 'shelves',
      cascadeOrganizers: 'organizers',
      cascadeLocations: 'item locations',
      cascadeItems: 'items (their last location)',
      cascadeImages: 'photos (with their thumbnails)',
      cascadeNote: 'Items that also have other locations are kept; only the deleted location is removed.',
      clear: 'Clear',
      preview: 'Preview',
    },
    rooms: {
      title: 'Rooms',
      room: 'Room',
      addRoom: 'Add Room',
      roomName: 'Room name',
      allItems: 'All Items',
      trackedItems: 'Tracked Items',
      expiring: 'Expiring',
      noExist: "There's no room.",
      addFirst: ' Add first room.',
      containWarning: 'This {type} contains {n} items which will be removed!',
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
      moveIn: 'Move to:',
      cancelMove: 'Cancel move',
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
      lots: 'Lots',
      barcode: 'Barcode',
      scanButton: 'Scan the barcode',
      scanAppOnly:
        'Camera scanning only works from the Home Assistant app.',
      findByBarcode: 'Find by barcode',
      barcodeNotFound: 'No item found with this barcode.',
      scanAgain: 'Scan again',
      enterBarcodeManually: 'Or enter the barcode manually:',
      variant: 'Variant',
      variantPlaceholder: 'e.g. small jar',
      variantBarcode: 'Variant barcode',
      variantBarcodeHint: 'Requires the "Variant" field to be filled in.',
      barcodeAppliesToItem: 'The barcode applies to the main item, not the current one. To prevent this, enter a variant (e.g. the product model or brand).',
      variantBarcodeLinks: 'This barcode will be linked to the "{variant}" variant of the existing item.',
      matchedVariant: 'Matched variant',
      existingRowsHint: 'This item already exists here. Choose where to add:',
      addToExisting: 'Add to this one',
      newRow: 'New row',
      locationsCount: 'locations',
      total: 'Total',
      selectLocationHint:
        'This item is in multiple locations. Select the location you want to view (short click) or edit (long press):',
      expired: 'Expired',
      noDate: 'No date',
      expShort: 'Exp',
      expDate: 'Expiration date',
      expDateHint: 'YYYY/MM/DD or empty',
      datePlaceholder: 'YYYY/MM/DD',
      aliasesPlaceholder: 'e.g. black toner, black cartridge',
      noLocation: 'No location',
      addIn: 'Add in {organizer}',
      editItem: 'Edit item',
      editMainItem: 'Edit main item',
      existingBatches: 'Existing batches with expiration dates:',
      batchDatePlaceholder: 'YYYY/MM/DD (empty for no expiration)',
      addBatch: '+ Add batch (with or without expiration)',
      confirmDeletion: 'Confirm deletion',
      deleteMasterConfirm: 'Are you sure you want to delete {name}?',
      deleteMasterBefore: 'This action will delete the main item and ',
      deleteMasterLocations: 'all {n} associated locations',
      deleteMasterAfter: ', as well as the physical images.',
      deleteMasterList: 'Locations that will be deleted:',
      totalQuantity: 'Total quantity',
      day: 'day',
      days: 'days',
      expirationDate: 'Expiration date',
      batchNoDate: 'Batch without date',
      undefinedDate: 'Undefined',
      moveTo: 'Move to:',
      organizerOptional: 'Organizer (optional)',
      newLocation: 'New location:',
      productInLocation: 'Product is in 1 location',
      productInLocations: 'Product is in {n} locations',
    },
    expiring: {
      title: 'Expiring batches',
      all: 'All',
      expired: 'Expired',
      soon: 'Expiring soon',
      noBatches: 'No batches with an expiration date.',
      noBatchesFiltered: 'No batches match this filter.',
      expiredAgo: 'expired {n} d ago',
      today: 'expires today',
      inDays: 'in {n} d',
      quantity: 'Qty',
      loadError: 'Could not load batches.',
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
    favorites: {
      filter: 'Favorites',
      add: 'Add to favorites',
      remove: 'Remove from favorites',
      empty: 'No favorite items yet. Tap the star in an item window to add one.',
    },
    trash: {
      title: 'Recycle bin',
      empty: 'The bin is empty.',
      loadError: 'Could not load the bin.',
      expiresDays: 'Expires in {n} days',
      expiresToday: 'Expires today',
      restore: 'Restore',
      deleteForever: 'Delete forever',
      emptyBin: 'Empty bin',
      emptyConfirm: 'Permanently delete everything in the bin, including photos? This cannot be undone.',
      deleteForeverConfirm: 'Permanently delete "{name}", including its photos? This cannot be undone.',
      movedToBin: 'Moved to bin',
      undo: 'Undo',
      restored: 'Restored',
      restoreFailed: 'Restore failed.',
      parentMissing: 'Restore "{parent}" first.',
      restoreParent: 'Restore "{parent}"',
      deleteNote: 'It will be moved to the bin for {n} days and can be restored.',
      kinds: {
        room: 'Room',
        cupboard: 'Cupboard',
        shelf: 'Shelf',
        organizer: 'Organizer',
        item_master: 'Item',
        item_location: 'Item location',
      },
      warnRenamed: '"{from}" already exists, restored as "{to}".',
      warnItemMerged: '"{name}" already exists, its locations were attached to it.',
      warnBarcodeDropped: 'Barcode {barcode} of "{name}" is used by another item and was not restored.',
      warnVariantBarcodeSkipped: 'Barcode {barcode} of variant "{variant}" is already in use and was skipped.',
    },
    errors: {
      connectionError: 'Connection error',
      uploadFailed: 'Upload failed',
      generalError: 'An error occurred',
      sameLocationOrganizer: 'The organizer is in the same location',
      sameLocationItem: 'The item is in the same location',
      preloadMoveLocation: 'Error at preloaded current location',
      getRoomsError: 'Error at fetching rooms.',
      unexpected: 'Unexpected error',
      invalidDates: 'Expiration dates must be in YYYY/MM/DD format or empty!',
      alreadyInLocation: 'The item is already in this location!',
      unexpectedApi: 'Unexpected API error',
      unexpectedUploadResponse: 'Unexpected upload response format.',
      imageUploadFailed: 'Image upload failed ({status})',
      decodeFailed: 'Barcode decoding failed',
      connectFailed: 'Could not connect to Home Assistant',
    },
    scanner: {
      title: 'Scan Barcode',
      videoScan: 'Video scan',
      uploadImage: 'Upload image',
      processing: 'Processing image...',
      processingHint: 'Looking for barcodes in the image',
      manualLabel: 'Or enter the code manually',
      manualPlaceholder: 'Enter barcode...',
      manualHint: 'Press Enter or the check button to add',
      add: 'Add',
      scannedCode: 'Scanned code:',
      copyCode: 'Copy code',
      copied: 'Copied!',
      history: 'Scan history',
      clearAll: 'Clear all',
      historyHint: 'Click a code to select and copy it',
      onlyNumeric: 'Only numeric barcodes are supported.',
      readFailed: 'Failed to read the file.',
      loadFailed: 'Failed to load the file.',
      processFailed: 'Failed to process the image:',
      noBarcodeFound:
        'No barcode found in the image.\n\nTips:\n• Make sure the lighting is good\n• Position the code in the center of the image\n• Try moving closer to the code',
      nativeTitle: 'Scan Barcode',
      nativeDescription: 'Point the camera at the barcode',
      nativeCancel: 'Cancel',
    },
    locationLink: {
      title: 'QR / NFC',
      button: 'QR / NFC',
      qr: 'QR code',
      nfc: 'NFC tag',
      link: 'Link',
      copy: 'Copy',
      copied: 'Copied!',
      download: 'Download PNG',
      notFound: 'This location no longer exists.',
    },
  },
  ru: {
    common: {
      loading: 'Загрузка...',
      error: 'Ошибка',
      save: 'Сохранить',
      saving: 'Сохранение...',
      cancel: 'Отмена',
      delete: 'Удалить',
      deleting: 'Удаление...',
      edit: 'Изменить',
      add: 'Добавить',
      search: 'Поиск',
      close: 'Закрыть',
      confirm: 'Подтвердить',
      back: 'Назад',
      reload: 'Перезагрузить',
      deleteConfirm: 'Вы уверены, что хотите удалить:',
      deleteTitle: 'Удаление: {type}',
      optional: 'необязательно',
      select: 'Выбрать',
      name: 'Название',
      infoViewPress: 'Долгое нажатие или правый клик для редактирования',
      connectingHA: 'Подключение к Home Assistant...',
      removeImage: 'Удалить изображение',
      uploadingImage: 'Загрузка изображения...',
      cascadeTitle: 'Будет безвозвратно удалено:',
      cascadeCupboards: 'шкафы',
      cascadeShelves: 'полки',
      cascadeOrganizers: 'органайзеры',
      cascadeLocations: 'места хранения предметов',
      cascadeItems: 'предметы (их последнее место)',
      cascadeImages: 'фото (вместе с миниатюрами)',
      cascadeNote: 'Предметы, у которых есть другие места хранения, сохраняются; удаляется только это место.',
      clear: 'Очистить',
      preview: 'Предпросмотр',
    },
    rooms: {
      title: 'Комнаты',
      room: 'Комната',
      addRoom: 'Добавить комнату',
      roomName: 'Название комнаты',
      allItems: 'Все предметы',
      trackedItems: 'Отслеживаемые предметы',
      expiring: 'Срок годности',
      noExist: 'Комнат нет.',
      addFirst: ' Добавьте первую комнату.',
      containWarning: 'Эта {type} содержит {n} предметов, которые будут удалены!',
    },
    cupboards: {
      title: 'Шкафы',
      cupboard: 'Шкаф',
      addCupboard: 'Добавить шкаф',
      cupboardName: 'Название шкафа',
      deleteConfirm: 'Вы уверены, что хотите удалить этот шкаф?',
      noCupboards: 'Шкафов нет.',
      addFirst: 'Добавьте первый шкаф.',
      example: 'напр.: Большой шкаф',
    },
    shelves: {
      title: 'Полки',
      shelf: 'Полка',
      addShelf: 'Добавить полку',
      shelfName: 'Название полки',
      deleteConfirm: 'Вы уверены, что хотите удалить эту полку?',
      noShelves: 'Полок нет',
      addFirst: 'Добавьте первую полку',
    },
    organizers: {
      title: 'Органайзеры',
      organizer: 'Органайзер',
      addOrganizer: 'Добавить органайзер',
      organizerName: 'Название органайзера',
      deleteConfirm: 'Вы уверены, что хотите удалить этот органайзер?',
      withoutOrganizer: 'Без органайзера',
      noOrganizers: 'Органайзеров нет',
      addFirst: 'Добавьте первый органайзер',
      moveOrganizer: 'Переместить органайзер',
      moveIn: 'Переместить в:',
      cancelMove: 'Отменить перемещение',
    },
    items: {
      title: 'Предметы',
      addItem: 'Добавить предмет',
      addFirst: 'Добавьте первый предмет',
      addItemWithoutOrganizer: 'Предмет на полке',
      itemName: 'Название предмета',
      aliases: 'Псевдонимы',
      quantity: 'Количество',
      minQuantity: 'Минимальное количество',
      trackQuantity: 'Отслеживать количество',
      location: 'Место',
      image: 'Изображение',
      deleteConfirm: 'Вы уверены, что хотите удалить этот предмет?',
      noItems: 'Нет предметов',
      lowStock: 'Мало на складе',
      needsRestock: 'Нужно пополнить',
      pieces: 'шт.',
      moveItem: 'Переместить предмет',
      noTrack: 'Количество этого предмета не отслеживается',
      lots: 'Партии',
      barcode: 'Штрихкод',
      scanButton: 'Сканировать штрихкод',
      scanAppOnly:
        'Сканирование камерой работает только в приложении Home Assistant.',
      findByBarcode: 'Найти по штрихкоду',
      barcodeNotFound: 'Предмет с таким штрихкодом не найден.',
      scanAgain: 'Сканировать снова',
      enterBarcodeManually: 'Или введите штрихкод вручную:',
      variant: 'Вариант',
      variantPlaceholder: 'напр.: маленькая банка',
      variantBarcode: 'Штрихкод варианта',
      variantBarcodeHint: 'Требуется заполнить поле «Вариант».',
      barcodeAppliesToItem: 'Штрихкод относится к основному предмету, а не к текущему. Чтобы этого избежать, укажите вариант (например, модель или бренд товара).',
      variantBarcodeLinks: 'Этот штрихкод будет привязан к варианту «{variant}» существующего предмета.',
      matchedVariant: 'Найденный вариант',
      existingRowsHint: 'Такой предмет здесь уже есть. Выберите, куда добавить:',
      addToExisting: 'Добавить к этому',
      newRow: 'Новая запись',
      locationsCount: 'мест',
      total: 'Всего',
      selectLocationHint:
        'Этот предмет находится в нескольких местах. Выберите место для просмотра (короткое нажатие) или редактирования (долгое нажатие):',
      expired: 'Просрочено',
      noDate: 'Без даты',
      expShort: 'Годен до',
      expDate: 'Срок годности',
      expDateHint: 'ГГГГ/ММ/ДД или пусто',
      datePlaceholder: 'ГГГГ/ММ/ДД',
      aliasesPlaceholder: 'напр.: чёрный тонер, чёрный картридж',
      noLocation: 'Нет места',
      addIn: 'Добавить в «{organizer}»',
      editItem: 'Изменить предмет',
      editMainItem: 'Изменить основной предмет',
      existingBatches: 'Существующие партии со сроками годности:',
      batchDatePlaceholder: 'ГГГГ/ММ/ДД (пусто — без срока годности)',
      addBatch: '+ Добавить партию (со сроком годности или без)',
      confirmDeletion: 'Подтвердите удаление',
      deleteMasterConfirm: 'Вы уверены, что хотите удалить «{name}»?',
      deleteMasterBefore: 'Это действие удалит основной предмет и ',
      deleteMasterLocations: 'все связанные места ({n})',
      deleteMasterAfter: ', а также физические изображения.',
      deleteMasterList: 'Места, которые будут удалены:',
      totalQuantity: 'Общее количество',
      day: 'день',
      days: 'дней',
      daysFew: 'дня',
      expirationDate: 'Срок годности',
      batchNoDate: 'Партия без даты',
      undefinedDate: 'Не указано',
      moveTo: 'Переместить в:',
      organizerOptional: 'Органайзер (необязательно)',
      newLocation: 'Новое место:',
      productInLocation: 'Товар находится в 1 месте',
      productInLocations: 'Количество мест, где находится товар: {n}',
    },
    expiring: {
      title: 'Партии с истекающим сроком',
      all: 'Все',
      expired: 'Просрочено',
      soon: 'Скоро истекает',
      noBatches: 'Нет партий со сроком годности.',
      noBatchesFiltered: 'Нет партий, подходящих под фильтр.',
      expiredAgo: 'просрочено {n} дн. назад',
      today: 'истекает сегодня',
      inDays: 'через {n} дн.',
      quantity: 'Кол-во',
      loadError: 'Не удалось загрузить партии.',
    },
    trackedItems: {
      title: 'Отслеживаемые предметы',
      loading: 'Загрузка отслеживаемых предметов...',
      noItems: 'Нет отслеживаемых предметов',
      noItemsFiltered: 'Предметы не найдены',
      tryModifyFilters: 'Попробуйте изменить фильтры',
      enableTracking: 'Включите отслеживание количества для предметов',
      all: 'Все',
      belowStock: 'Ниже запаса',
      ok: 'ОК',
      searchPlaceholder: 'Поиск предметов...',
      locationLabel: 'Место:',
      quantityLabel: 'Количество:',
      needsRestockLabel: 'Нужно пополнить',
    },
    favorites: {
      filter: 'Избранное',
      add: 'Добавить в избранное',
      remove: 'Удалить из избранного',
      empty: 'Избранных предметов пока нет. Нажмите на звезду в окне предмета, чтобы добавить.',
    },
    trash: {
      title: 'Корзина',
      empty: 'Корзина пуста.',
      loadError: 'Не удалось загрузить корзину.',
      expiresDays: 'Удалится через {n} дн.',
      expiresToday: 'Удалится сегодня',
      restore: 'Восстановить',
      deleteForever: 'Удалить навсегда',
      emptyBin: 'Очистить корзину',
      emptyConfirm: 'Удалить навсегда всё содержимое корзины, включая фото? Это действие нельзя отменить.',
      deleteForeverConfirm: 'Удалить навсегда «{name}» вместе с фото? Это действие нельзя отменить.',
      movedToBin: 'Перемещено в корзину',
      undo: 'Отменить',
      restored: 'Восстановлено',
      restoreFailed: 'Не удалось восстановить.',
      parentMissing: 'Сначала восстановите «{parent}».',
      restoreParent: 'Восстановить «{parent}»',
      deleteNote: 'Будет перемещено в корзину на {n} дн. и его можно восстановить.',
      kinds: {
        room: 'Комната',
        cupboard: 'Шкаф',
        shelf: 'Полка',
        organizer: 'Органайзер',
        item_master: 'Предмет',
        item_location: 'Место предмета',
      },
      warnRenamed: '«{from}» уже существует, восстановлено как «{to}».',
      warnItemMerged: '«{name}» уже существует, места привязаны к нему.',
      warnBarcodeDropped: 'Штрихкод {barcode} предмета «{name}» занят другим предметом и не восстановлен.',
      warnVariantBarcodeSkipped: 'Штрихкод {barcode} варианта «{variant}» уже используется и пропущен.',
    },
    errors: {
      connectionError: 'Ошибка соединения',
      uploadFailed: 'Не удалось загрузить',
      generalError: 'Произошла ошибка',
      sameLocationOrganizer: 'Органайзер уже находится в этом месте',
      sameLocationItem: 'Предмет уже находится в этом месте',
      preloadMoveLocation: 'Ошибка при предзагрузке текущего места',
      getRoomsError: 'Ошибка при получении комнат.',
      unexpected: 'Непредвиденная ошибка',
      invalidDates: 'Сроки годности должны быть в формате ГГГГ/ММ/ДД или пустыми!',
      alreadyInLocation: 'Предмет уже находится в этом месте!',
      unexpectedApi: 'Непредвиденная ошибка API',
      unexpectedUploadResponse: 'Неожиданный формат ответа при загрузке.',
      imageUploadFailed: 'Не удалось загрузить изображение ({status})',
      decodeFailed: 'Не удалось распознать штрихкод',
      connectFailed: 'Не удалось подключиться к Home Assistant',
    },
    scanner: {
      title: 'Сканирование штрихкода',
      videoScan: 'Сканирование видео',
      uploadImage: 'Загрузить изображение',
      processing: 'Обработка изображения...',
      processingHint: 'Поиск штрихкодов на изображении',
      manualLabel: 'Или введите код вручную',
      manualPlaceholder: 'Введите штрихкод...',
      manualHint: 'Нажмите Enter или кнопку-галочку, чтобы добавить',
      add: 'Добавить',
      scannedCode: 'Отсканированный код:',
      copyCode: 'Копировать код',
      copied: 'Скопировано!',
      history: 'История сканирования',
      clearAll: 'Очистить всё',
      historyHint: 'Нажмите на код, чтобы выбрать и скопировать его',
      onlyNumeric: 'Поддерживаются только числовые штрихкоды.',
      readFailed: 'Не удалось прочитать файл.',
      loadFailed: 'Не удалось загрузить файл.',
      processFailed: 'Не удалось обработать изображение:',
      noBarcodeFound:
        'Штрихкод на изображении не найден.\n\nСоветы:\n• Убедитесь, что освещение хорошее\n• Расположите код по центру изображения\n• Попробуйте приблизиться к коду',
      nativeTitle: 'Сканирование штрихкода',
      nativeDescription: 'Наведите камеру на штрихкод',
      nativeCancel: 'Отмена',
    },
    locationLink: {
      title: 'QR / NFC',
      button: 'QR / NFC',
      qr: 'QR-код',
      nfc: 'NFC-метка',
      link: 'Ссылка',
      copy: 'Копировать',
      copied: 'Скопировано!',
      download: 'Скачать PNG',
      notFound: 'Этого места больше не существует.',
    },
  },
  de: {
    common: {
      loading: 'Lädt...',
      error: 'Fehler',
      save: 'Speichern',
      saving: 'Wird gespeichert...',
      cancel: 'Abbrechen',
      delete: 'Löschen',
      deleting: 'Wird gelöscht...',
      edit: 'Bearbeiten',
      add: 'Hinzufügen',
      search: 'Suchen',
      close: 'Schließen',
      confirm: 'Bestätigen',
      back: 'Zurück',
      reload: 'Neu laden',
      deleteConfirm: 'Möchtest du Folgendes wirklich löschen:',
      deleteTitle: '{type} löschen',
      optional: 'optional',
      select: 'Auswählen',
      name: 'Name',
      infoViewPress: 'Lange drücken oder Rechtsklick zum Bearbeiten',
      connectingHA: 'Verbindung mit Home Assistant wird hergestellt...',
      removeImage: 'Bild entfernen',
      uploadingImage: 'Bild wird hochgeladen...',
      cascadeTitle: 'Folgendes wird endgültig gelöscht:',
      cascadeCupboards: 'Schränke',
      cascadeShelves: 'Regale',
      cascadeOrganizers: 'Organizer',
      cascadeLocations: 'Artikel-Standorte',
      cascadeItems: 'Artikel (ihr letzter Standort)',
      cascadeImages: 'Fotos (inkl. Vorschaubilder)',
      cascadeNote: 'Artikel, die noch an anderen Standorten liegen, bleiben erhalten; nur der gelöschte Standort wird entfernt.',
      clear: 'Leeren',
      preview: 'Vorschau',
    },
    rooms: {
      title: 'Räume',
      room: 'Raum',
      addRoom: 'Raum hinzufügen',
      roomName: 'Raumname',
      allItems: 'Alle Artikel',
      trackedItems: 'Verfolgte Artikel',
      expiring: 'Ablaufend',
      noExist: 'Es gibt keine Räume.',
      addFirst: ' Ersten Raum hinzufügen.',
      containWarning: 'Dabei werden auch {n} enthaltene Artikel gelöscht!',
    },
    cupboards: {
      title: 'Schränke',
      cupboard: 'Schrank',
      addCupboard: 'Schrank hinzufügen',
      cupboardName: 'Schrankname',
      deleteConfirm: 'Möchtest du diesen Schrank wirklich löschen?',
      noCupboards: 'Keine Schränke vorhanden.',
      addFirst: 'Ersten Schrank hinzufügen.',
      example: 'z. B.: Großer Schrank',
    },
    shelves: {
      title: 'Regale',
      shelf: 'Regal',
      addShelf: 'Regal hinzufügen',
      shelfName: 'Regalname',
      deleteConfirm: 'Möchtest du dieses Regal wirklich löschen?',
      noShelves: 'Keine Regale vorhanden',
      addFirst: 'Erstes Regal hinzufügen',
    },
    organizers: {
      title: 'Organizer',
      organizer: 'Organizer',
      addOrganizer: 'Organizer hinzufügen',
      organizerName: 'Organizer-Name',
      deleteConfirm: 'Möchtest du diesen Organizer wirklich löschen?',
      withoutOrganizer: 'Ohne Organizer',
      noOrganizers: 'Keine Organizer vorhanden',
      addFirst: 'Ersten Organizer hinzufügen',
      moveOrganizer: 'Organizer verschieben',
      moveIn: 'Verschieben nach:',
      cancelMove: 'Verschieben abbrechen',
    },
    items: {
      title: 'Artikel',
      addItem: 'Artikel hinzufügen',
      addFirst: 'Ersten Artikel hinzufügen',
      addItemWithoutOrganizer: 'Artikel direkt im Regal',
      itemName: 'Artikelname',
      aliases: 'Aliasnamen',
      quantity: 'Menge',
      minQuantity: 'Mindestmenge',
      trackQuantity: 'Menge verfolgen',
      location: 'Standort',
      image: 'Bild',
      deleteConfirm: 'Möchtest du diesen Artikel wirklich löschen?',
      noItems: 'Keine Artikel vorhanden',
      lowStock: 'Niedriger Bestand',
      needsRestock: 'Nachschub erforderlich',
      pieces: 'Stück',
      moveItem: 'Artikel verschieben',
      noTrack: 'Die Menge wird für diesen Artikel nicht verfolgt',
      lots: 'Chargen',
      barcode: 'Barcode',
      scanButton: 'Barcode scannen',
      scanAppOnly:
        'Das Scannen mit der Kamera funktioniert nur in der Home Assistant App.',
      findByBarcode: 'Per Barcode suchen',
      barcodeNotFound: 'Kein Artikel mit diesem Barcode gefunden.',
      scanAgain: 'Erneut scannen',
      enterBarcodeManually: 'Oder Barcode manuell eingeben:',
      variant: 'Variante',
      variantPlaceholder: 'z. B. kleines Glas',
      variantBarcode: 'Barcode der Variante',
      variantBarcodeHint: 'Dafür muss das Feld „Variante“ ausgefüllt sein.',
      barcodeAppliesToItem: 'Der Barcode gilt für den Hauptartikel, nicht für diesen Eintrag. Um das zu vermeiden, gib eine Variante ein (z. B. Modell oder Marke).',
      variantBarcodeLinks: 'Dieser Barcode wird mit der Variante „{variant}“ des vorhandenen Artikels verknüpft.',
      matchedVariant: 'Gefundene Variante',
      existingRowsHint: 'Dieser Artikel ist hier schon vorhanden. Wo soll hinzugefügt werden?',
      addToExisting: 'Hier hinzufügen',
      newRow: 'Neuer Eintrag',
      locationsCount: 'Standorte',
      total: 'Gesamt',
      selectLocationHint:
        'Dieser Artikel liegt an mehreren Standorten. Wähle den Standort zum Ansehen (kurz tippen) oder Bearbeiten (lange drücken):',
      expired: 'Abgelaufen',
      noDate: 'Kein Datum',
      expShort: 'MHD',
      expDate: 'Ablaufdatum',
      expDateHint: 'JJJJ/MM/TT oder leer',
      datePlaceholder: 'JJJJ/MM/TT',
      aliasesPlaceholder: 'z. B. schwarzer Toner, schwarze Patrone',
      noLocation: 'Kein Standort',
      addIn: 'In {organizer} hinzufügen',
      editItem: 'Artikel bearbeiten',
      editMainItem: 'Hauptartikel bearbeiten',
      existingBatches: 'Vorhandene Chargen mit Ablaufdatum:',
      batchDatePlaceholder: 'JJJJ/MM/TT (leer = kein Ablaufdatum)',
      addBatch: '+ Charge hinzufügen (mit oder ohne Ablaufdatum)',
      confirmDeletion: 'Löschen bestätigen',
      deleteMasterConfirm: 'Möchtest du {name} wirklich löschen?',
      deleteMasterBefore: 'Dabei werden der Hauptartikel und ',
      deleteMasterLocations: 'alle {n} zugehörigen Standorte',
      deleteMasterAfter: ' sowie die gespeicherten Bilder gelöscht.',
      deleteMasterList: 'Folgende Standorte werden gelöscht:',
      totalQuantity: 'Gesamtmenge',
      day: 'Tag',
      days: 'Tage',
      expirationDate: 'Ablaufdatum',
      batchNoDate: 'Charge ohne Datum',
      undefinedDate: 'Nicht festgelegt',
      moveTo: 'Verschieben nach:',
      organizerOptional: 'Organizer (optional)',
      newLocation: 'Neuer Standort:',
      productInLocation: 'Artikel liegt an 1 Standort',
      productInLocations: 'Artikel liegt an {n} Standorten',
    },
    expiring: {
      title: 'Ablaufende Chargen',
      all: 'Alle',
      expired: 'Abgelaufen',
      soon: 'Läuft bald ab',
      noBatches: 'Keine Chargen mit Ablaufdatum.',
      noBatchesFiltered: 'Keine Chargen passen zu diesem Filter.',
      expiredAgo: 'seit {n} T abgelaufen',
      today: 'läuft heute ab',
      inDays: 'in {n} T',
      quantity: 'Menge',
      loadError: 'Chargen konnten nicht geladen werden.',
    },
    trackedItems: {
      title: 'Verfolgte Artikel',
      loading: 'Verfolgte Artikel werden geladen...',
      noItems: 'Keine verfolgten Artikel',
      noItemsFiltered: 'Keine Artikel gefunden',
      tryModifyFilters: 'Versuch, die Filter anzupassen',
      enableTracking: 'Mengenverfolgung für Artikel aktivieren',
      all: 'Alle',
      belowStock: 'Unter Mindestbestand',
      ok: 'OK',
      searchPlaceholder: 'Artikel suchen...',
      locationLabel: 'Standort:',
      quantityLabel: 'Menge:',
      needsRestockLabel: 'Nachschub erforderlich',
    },
    favorites: {
      filter: 'Favoriten',
      add: 'Zu Favoriten hinzufügen',
      remove: 'Aus Favoriten entfernen',
      empty: 'Noch keine Favoriten. Tippe im Fenster eines Gegenstands auf den Stern, um ihn hinzuzufügen.',
    },
    trash: {
      title: 'Papierkorb',
      empty: 'Der Papierkorb ist leer.',
      loadError: 'Der Papierkorb konnte nicht geladen werden.',
      expiresDays: 'Läuft in {n} Tagen ab',
      expiresToday: 'Läuft heute ab',
      restore: 'Wiederherstellen',
      deleteForever: 'Endgültig löschen',
      emptyBin: 'Papierkorb leeren',
      emptyConfirm: 'Alles im Papierkorb inklusive Fotos endgültig löschen? Das kann nicht rückgängig gemacht werden.',
      deleteForeverConfirm: '„{name}“ inklusive Fotos endgültig löschen? Das kann nicht rückgängig gemacht werden.',
      movedToBin: 'In den Papierkorb verschoben',
      undo: 'Rückgängig',
      restored: 'Wiederhergestellt',
      restoreFailed: 'Wiederherstellung fehlgeschlagen.',
      parentMissing: 'Stelle zuerst „{parent}“ wieder her.',
      restoreParent: '„{parent}“ wiederherstellen',
      deleteNote: 'Wird für {n} Tage in den Papierkorb verschoben und kann wiederhergestellt werden.',
      kinds: {
        room: 'Raum',
        cupboard: 'Schrank',
        shelf: 'Regal',
        organizer: 'Organizer',
        item_master: 'Gegenstand',
        item_location: 'Gegenstandsort',
      },
      warnRenamed: '„{from}“ existiert bereits, wiederhergestellt als „{to}“.',
      warnItemMerged: '„{name}“ existiert bereits, die Orte wurden daran angehängt.',
      warnBarcodeDropped: 'Barcode {barcode} von „{name}“ wird von einem anderen Gegenstand verwendet und wurde nicht wiederhergestellt.',
      warnVariantBarcodeSkipped: 'Barcode {barcode} der Variante „{variant}“ ist bereits vergeben und wurde übersprungen.',
    },
    errors: {
      connectionError: 'Verbindungsfehler',
      uploadFailed: 'Hochladen fehlgeschlagen',
      generalError: 'Ein Fehler ist aufgetreten',
      sameLocationOrganizer: 'Der Organizer befindet sich bereits an diesem Ort',
      sameLocationItem: 'Der Artikel befindet sich bereits an diesem Ort',
      preloadMoveLocation: 'Fehler beim Laden des aktuellen Standorts',
      getRoomsError: 'Fehler beim Laden der Räume.',
      unexpected: 'Unerwarteter Fehler',
      invalidDates: 'Ablaufdaten müssen im Format JJJJ/MM/TT sein oder leer bleiben!',
      alreadyInLocation: 'Der Artikel ist bereits an diesem Standort!',
      unexpectedApi: 'Unerwarteter API-Fehler',
      unexpectedUploadResponse: 'Unerwartetes Antwortformat beim Hochladen.',
      imageUploadFailed: 'Hochladen des Bildes fehlgeschlagen ({status})',
      decodeFailed: 'Barcode konnte nicht gelesen werden',
      connectFailed: 'Verbindung zu Home Assistant nicht möglich',
    },
    scanner: {
      title: 'Barcode scannen',
      videoScan: 'Video-Scan',
      uploadImage: 'Bild hochladen',
      processing: 'Bild wird verarbeitet...',
      processingHint: 'Suche nach Barcodes im Bild',
      manualLabel: 'Oder Code manuell eingeben',
      manualPlaceholder: 'Barcode eingeben...',
      manualHint: 'Enter oder Haken drücken zum Hinzufügen',
      add: 'Hinzufügen',
      scannedCode: 'Gescannter Code:',
      copyCode: 'Code kopieren',
      copied: 'Kopiert!',
      history: 'Scan-Verlauf',
      clearAll: 'Alle löschen',
      historyHint: 'Code anklicken, um ihn auszuwählen und zu kopieren',
      onlyNumeric: 'Nur numerische Barcodes werden unterstützt.',
      readFailed: 'Datei konnte nicht gelesen werden.',
      loadFailed: 'Datei konnte nicht geladen werden.',
      processFailed: 'Bild konnte nicht verarbeitet werden:',
      noBarcodeFound:
        'Kein Barcode im Bild gefunden.\n\nTipps:\n• Für gute Beleuchtung sorgen\n• Den Code mittig im Bild platzieren\n• Näher an den Code herangehen',
      nativeTitle: 'Barcode scannen',
      nativeDescription: 'Kamera auf den Barcode richten',
      nativeCancel: 'Abbrechen',
    },
    locationLink: {
      title: 'QR / NFC',
      button: 'QR / NFC',
      qr: 'QR-Code',
      nfc: 'NFC-Tag',
      link: 'Link',
      copy: 'Kopieren',
      copied: 'Kopiert!',
      download: 'PNG herunterladen',
      notFound: 'Dieser Standort existiert nicht mehr.',
    },
  },
};

export const LANGUAGE_STORAGE_KEY = 'home_inventory_language';

/** Translations for code outside React (API service, hooks); mirrors I18nProvider's stored choice. */
export function getStaticTranslations(): Translations {
  let lang: Language = 'en';
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && (LANGUAGES as string[]).includes(stored)) lang = stored as Language;
  } catch {
    /* storage unavailable */
  }
  return translations[lang];
}
