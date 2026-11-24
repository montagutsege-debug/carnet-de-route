import { CarnetData, FicheDouble } from '../types/carnet';
import {
  createBlankFiche,
  createEmptyCarnet,
  createInitialCarnet,
  withPhotos,
} from '../data/initialCarnet';

const STORAGE_KEY = 'carnet_de_route_50_v1';

export function isFicheFilled(fiche: FicheDouble): boolean {
  return Boolean(
    fiche.nomAire.trim() ||
      fiche.commune.trim() ||
      fiche.regionPays.trim() ||
      fiche.dateArrivee ||
      fiche.descriptionAire.trim() ||
      fiche.visites.length > 0 ||
      fiche.rencontres.length > 0 ||
      fiche.meilleurSouvenir.trim() ||
      fiche.gastronomieAdresse.trim() ||
      fiche.photoUrl
  );
}

export function calculateNights(dateArrivee: string, dateDepart: string): number | null {
  if (!dateArrivee || !dateDepart) return null;
  const start = new Date(`${dateArrivee}T00:00:00`);
  const end = new Date(`${dateDepart}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff : null;
}

export function formatFrenchDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function padFicheNumber(num: number): string {
  return String(num).padStart(2, '0');
}

/** Fills any missing fields so data saved by older versions still loads. */
export function normalizeCarnet(parsed: Partial<CarnetData> | null | undefined): CarnetData | null {
  if (!parsed || !Array.isArray(parsed.fiches) || !Array.isArray(parsed.checklist)) {
    return null;
  }
  const base = createInitialCarnet();
  const normalizedFiches: FicheDouble[] = Array.from({ length: 50 }, (_, idx) => {
    const existing = parsed.fiches?.find((f) => f && f.numero === idx + 1);
    if (!existing) return createBlankFiche(idx + 1);
    return withPhotos({
      ...createBlankFiche(idx + 1),
      ...existing,
      numero: idx + 1,
      services: {
        ...createBlankFiche(idx + 1).services,
        ...(existing.services || {}),
      },
      visites: Array.isArray(existing.visites) ? existing.visites : [],
      rencontres: Array.isArray(existing.rencontres) ? existing.rencontres : [],
      // Older saves have no photo list: let withPhotos build it from photoUrl.
      photos: existing.photos as FicheDouble['photos'],
    });
  });

  return {
    version: 1,
    profile: {
      ...base.profile,
      ...(parsed.profile || {}),
    },
    fiches: normalizedFiches,
    checklist: parsed.checklist,
  };
}

// ---------------------------------------------------------------------------
// IndexedDB storage: hundreds of MB available, versus ~5 MB for localStorage,
// which photos would fill after about fifteen fiches.
// ---------------------------------------------------------------------------

const DB_NAME = 'carnet-de-route';
const DB_STORE = 'data';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponible'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(DB_STORE)) {
        request.result.createObjectStore(DB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Ouverture IndexedDB impossible'));
    request.onblocked = () => reject(new Error('IndexedDB bloquée par un autre onglet'));
  });
  // Allow a retry on the next call if opening failed.
  dbPromise.catch(() => {
    dbPromise = null;
  });
  return dbPromise;
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise<T | undefined>((resolve, reject) => {
    const request = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

/** Runs several writes in one transaction: either all of them happen or none. */
async function idbWrite(
  ops: { put?: [string, unknown][]; del?: string[] },
  update?: (store: IDBObjectStore) => void
): Promise<void> {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    const store = tx.objectStore(DB_STORE);
    for (const [key, value] of ops.put ?? []) store.put(value, key);
    for (const key of ops.del ?? []) store.delete(key);
    if (update) update(store);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Écriture impossible'));
    tx.onabort = () => reject(tx.error ?? new Error('Écriture annulée (espace disque insuffisant ?)'));
  });
}

function readLegacyLocalStorage(): CarnetData | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeCarnet(JSON.parse(raw) as Partial<CarnetData>);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Several carnets (one per trip). Each carnet is stored under `carnet:<id>`;
// an index lists them and remembers the one that is open.
// ---------------------------------------------------------------------------

export interface CarnetMeta {
  id: string;
  titre: string;
  saison: string;
  fichesRemplies: number;
  createdAt: string;
  updatedAt: string;
}

export interface CarnetsIndex {
  activeId: string;
  carnets: CarnetMeta[];
}

const INDEX_KEY = 'carnets-index';
const OLD_SINGLE_KEY = 'carnet'; // used by the previous version (one carnet)
const carnetKey = (id: string) => `carnet:${id}`;

function newCarnetId(): string {
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function metaFor(id: string, data: CarnetData, previous?: CarnetMeta): CarnetMeta {
  const now = new Date().toISOString();
  return {
    id,
    titre: data.profile.titreCarnet || 'Carnet de Route',
    saison: data.profile.saison || '',
    fichesRemplies: data.fiches.filter(isFicheFilled).length,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  };
}

/** Updates one carnet's entry in the index, inside an open transaction. */
function updateIndexInStore(
  store: IDBObjectStore,
  change: (index: CarnetsIndex) => CarnetsIndex
) {
  const request = store.get(INDEX_KEY);
  request.onsuccess = () => {
    const current = (request.result as CarnetsIndex | undefined) ?? { activeId: '', carnets: [] };
    store.put(change(current), INDEX_KEY);
  };
}

/**
 * Opens the carnet in use. The first time, moves the data of previous versions
 * (a single carnet in IndexedDB or in localStorage) into the new layout.
 */
export async function openActiveCarnet(): Promise<{ id: string; data: CarnetData }> {
  try {
    const index = await idbGet<CarnetsIndex>(INDEX_KEY);
    if (index && index.carnets.length > 0) {
      const id = index.carnets.some((c) => c.id === index.activeId)
        ? index.activeId
        : index.carnets[0].id;
      const data = normalizeCarnet(await idbGet<Partial<CarnetData>>(carnetKey(id)));
      if (data) return { id, data };
    }

    // First launch with this version: take over the existing carnet, if any.
    const previous =
      normalizeCarnet(await idbGet<Partial<CarnetData>>(OLD_SINGLE_KEY)) ??
      readLegacyLocalStorage() ??
      createInitialCarnet();
    const id = newCarnetId();
    const meta = metaFor(id, previous);
    await idbWrite({
      put: [
        [carnetKey(id), previous],
        [INDEX_KEY, { activeId: id, carnets: [...(index?.carnets ?? []), meta] }],
      ],
      del: [OLD_SINGLE_KEY],
    });
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return { id, data: previous };
  } catch {
    // IndexedDB unavailable (very old browser, some private modes): one carnet only.
    return { id: 'local', data: readLegacyLocalStorage() ?? createInitialCarnet() };
  }
}

/** Saves a carnet (and its line in the list). Rejects if it could not be written. */
export async function saveCarnet(id: string, data: CarnetData): Promise<void> {
  if (id === 'local') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return;
  }
  await idbWrite({ put: [[carnetKey(id), data]] }, (store) =>
    updateIndexInStore(store, (index) => {
      const previous = index.carnets.find((c) => c.id === id);
      const meta = metaFor(id, data, previous);
      return {
        ...index,
        carnets: previous
          ? index.carnets.map((c) => (c.id === id ? meta : c))
          : [...index.carnets, meta],
      };
    })
  );
}

export async function listCarnets(): Promise<CarnetsIndex> {
  return (await idbGet<CarnetsIndex>(INDEX_KEY)) ?? { activeId: '', carnets: [] };
}

/** Creates an empty carnet and returns its id (it is not opened). */
export async function createCarnet(
  titre: string,
  from?: CarnetData
): Promise<string> {
  const id = newCarnetId();
  const data = createEmptyCarnet(titre, {
    profile: from?.profile,
    checklist: from?.checklist,
  });
  await idbWrite({ put: [[carnetKey(id), data]] }, (store) =>
    updateIndexInStore(store, (index) => ({
      ...index,
      carnets: [...index.carnets, metaFor(id, data)],
    }))
  );
  return id;
}

/** Marks a carnet as the open one and returns its content. */
export async function openCarnet(id: string): Promise<CarnetData> {
  const data = normalizeCarnet(await idbGet<Partial<CarnetData>>(carnetKey(id)));
  if (!data) throw new Error('Carnet introuvable');
  await idbWrite({}, (store) => updateIndexInStore(store, (index) => ({ ...index, activeId: id })));
  return data;
}

export async function readCarnet(id: string): Promise<CarnetData | null> {
  return normalizeCarnet(await idbGet<Partial<CarnetData>>(carnetKey(id)));
}

/** Deletes a carnet for good. The open carnet cannot be deleted. */
export async function deleteCarnet(id: string): Promise<void> {
  await idbWrite({ del: [carnetKey(id)] }, (store) =>
    updateIndexInStore(store, (index) => {
      if (index.activeId === id) throw new Error('Impossible de supprimer le carnet ouvert');
      return { ...index, carnets: index.carnets.filter((c) => c.id !== id) };
    })
  );
}

/** Asks the browser not to clear the carnet when disk space runs low. */
export async function requestPersistentStorage(): Promise<void> {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    /* not supported: nothing to do */
  }
}

export function compressImageFile(file: File, maxDimension = 960, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Impossible de lire le fichier image.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format d’image non reconnu.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Contexte graphique indisponible.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function exportCarnetJson(data: CarnetData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const today = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `carnet-de-route-${today}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
