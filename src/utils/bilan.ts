import { CarnetData, CategorieVisite, FicheDouble, MeteoType, TypeEtape } from '../types/carnet';
import { calculateNights, isFicheFilled } from './storage';
import { parseGpsCoordinates } from './gps';

export interface BilanVoyage {
  etapes: number;
  nuits: number;
  dateDebut: string;
  dateFin: string;
  /** Distance read on the odometer (last reading minus first), if at least two readings. */
  kmCompteur: number | null;
  /** Sum of straight-line distances between consecutive geolocated stages. */
  kmVolOiseau: number | null;
  budgetNuits: number;
  nuitsPayantes: number;
  nuitsGratuites: number;
  /** Stages whose price could not be read (left empty or free text). */
  tarifsInconnus: number;
  noteMoyenne: number | null;
  coupsDeCoeur: number;
  aRefaire: number;
  visites: number;
  rencontres: number;
  photos: number;
  parType: { cle: TypeEtape; valeur: number }[];
  parMeteo: { cle: MeteoType; valeur: number }[];
  parCategorieVisite: { cle: CategorieVisite; valeur: number }[];
  regions: { nom: string; etapes: number }[];
  meilleuresEtapes: FicheDouble[];
}

/** Reads "14", "14,50 €", "12.5" or "Gratuit". Returns null when unreadable. */
export function parseTarif(raw: string): number | null {
  const text = raw.trim().toLowerCase();
  if (!text) return null;
  if (/gratuit|free|offert/.test(text)) return 0;
  const match = text.replace(/\s/g, '').match(/\d+(?:[.,]\d+)?/);
  return match ? parseFloat(match[0].replace(',', '.')) : null;
}

/** Reads an odometer value such as "42 180" or "42180 km". */
export function parseKilometrage(raw: string): number | null {
  const digits = raw.replace(/[\s.  ]/g, '').match(/\d+/);
  return digits ? parseInt(digits[0], 10) : null;
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function compter<K extends string>(valeurs: K[]): { cle: K; valeur: number }[] {
  const map = new Map<K, number>();
  valeurs.forEach((v) => map.set(v, (map.get(v) ?? 0) + 1));
  return [...map.entries()]
    .map(([cle, valeur]) => ({ cle, valeur }))
    .sort((a, b) => b.valeur - a.valeur);
}

/** Filled fiches in travel order: by arrival date, then by fiche number. */
export function fichesDansLOrdre(fiches: FicheDouble[]): FicheDouble[] {
  return fiches
    .filter(isFicheFilled)
    .sort((a, b) => {
      if (a.dateArrivee && b.dateArrivee && a.dateArrivee !== b.dateArrivee) {
        return a.dateArrivee < b.dateArrivee ? -1 : 1;
      }
      return a.numero - b.numero;
    });
}

export function calculerBilan(carnet: CarnetData): BilanVoyage {
  const fiches = fichesDansLOrdre(carnet.fiches);

  let nuits = 0;
  let budgetNuits = 0;
  let nuitsPayantes = 0;
  let nuitsGratuites = 0;
  let tarifsInconnus = 0;

  fiches.forEach((f) => {
    const n = calculateNights(f.dateArrivee, f.dateDepart);
    // A stage with no departure date counts as one night.
    const nuitsEtape = n ?? (f.dateArrivee ? 1 : 0);
    nuits += nuitsEtape;
    const tarif = parseTarif(f.tarifNuit);
    if (tarif === null) {
      if (nuitsEtape > 0) tarifsInconnus += 1;
    } else if (tarif === 0) {
      nuitsGratuites += nuitsEtape;
    } else {
      nuitsPayantes += nuitsEtape;
      budgetNuits += tarif * Math.max(nuitsEtape, 1);
    }
  });

  const dates = fiches.flatMap((f) => [f.dateArrivee, f.dateDepart]).filter(Boolean).sort();

  const releves = fiches
    .map((f) => parseKilometrage(f.kilometrage))
    .filter((v): v is number => v !== null);
  const kmCompteur =
    releves.length >= 2 ? Math.max(...releves) - Math.min(...releves) : null;

  const points = fiches
    .map((f) => parseGpsCoordinates(f.coordonneesGps))
    .filter((p): p is { lat: number; lng: number } => p !== null);
  let kmVolOiseau: number | null = null;
  if (points.length >= 2) {
    kmVolOiseau = 0;
    for (let i = 1; i < points.length; i++) kmVolOiseau += distanceKm(points[i - 1], points[i]);
  }

  const notes = fiches.map((f) => f.note).filter((n) => n > 0);

  const regionsMap = new Map<string, number>();
  fiches.forEach((f) => {
    const nom = f.regionPays.trim();
    if (nom) regionsMap.set(nom, (regionsMap.get(nom) ?? 0) + 1);
  });

  return {
    etapes: fiches.length,
    nuits,
    dateDebut: dates[0] ?? '',
    dateFin: dates[dates.length - 1] ?? '',
    kmCompteur,
    kmVolOiseau: kmVolOiseau === null ? null : Math.round(kmVolOiseau),
    budgetNuits: Math.round(budgetNuits * 100) / 100,
    nuitsPayantes,
    nuitsGratuites,
    tarifsInconnus,
    noteMoyenne: notes.length ? notes.reduce((a, b) => a + b, 0) / notes.length : null,
    coupsDeCoeur: fiches.filter((f) => f.coupDeCoeur).length,
    aRefaire: fiches.filter((f) => f.revenir === 'oui').length,
    visites: fiches.reduce((sum, f) => sum + f.visites.length, 0),
    rencontres: fiches.reduce((sum, f) => sum + f.rencontres.length, 0),
    photos: fiches.reduce((sum, f) => sum + f.photos.length, 0),
    parType: compter(fiches.map((f) => f.typeEtape)),
    parMeteo: compter(fiches.map((f) => f.meteo).filter((m): m is MeteoType => Boolean(m))),
    parCategorieVisite: compter(fiches.flatMap((f) => f.visites.map((v) => v.categorie))),
    regions: [...regionsMap.entries()]
      .map(([nom, etapes]) => ({ nom, etapes }))
      .sort((a, b) => b.etapes - a.etapes),
    meilleuresEtapes: fiches
      .filter((f) => f.coupDeCoeur || f.note >= 4)
      .sort((a, b) => b.note - a.note || Number(b.coupDeCoeur) - Number(a.coupDeCoeur))
      .slice(0, 5),
  };
}

export function formatEuros(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function formatKm(value: number): string {
  return `${new Intl.NumberFormat('fr-FR').format(value)} km`;
}
