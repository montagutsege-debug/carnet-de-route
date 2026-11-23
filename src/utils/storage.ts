import { CarnetData, FicheDouble } from '../types/carnet';
import { createBlankFiche, createInitialCarnet } from '../data/initialCarnet';

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

export function loadCarnet(): CarnetData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialCarnet();
    const parsed = JSON.parse(raw) as Partial<CarnetData>;
    if (!parsed || !Array.isArray(parsed.fiches) || !Array.isArray(parsed.checklist)) {
      return createInitialCarnet();
    }
    const base = createInitialCarnet();
    const normalizedFiches: FicheDouble[] = Array.from({ length: 50 }, (_, idx) => {
      const existing = parsed.fiches?.find((f) => f && f.numero === idx + 1);
      if (!existing) return createBlankFiche(idx + 1);
      return {
        ...createBlankFiche(idx + 1),
        ...existing,
        numero: idx + 1,
        services: {
          ...createBlankFiche(idx + 1).services,
          ...(existing.services || {}),
        },
        visites: Array.isArray(existing.visites) ? existing.visites : [],
        rencontres: Array.isArray(existing.rencontres) ? existing.rencontres : [],
      };
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
  } catch {
    return createInitialCarnet();
  }
}

export function saveCarnet(data: CarnetData): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
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
