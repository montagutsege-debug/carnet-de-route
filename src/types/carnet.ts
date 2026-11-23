export type TypeEtape =
  | 'aire'
  | 'camping'
  | 'ferme'
  | 'bivouac'
  | 'habitant';

export type MeteoType =
  | 'soleil'
  | 'eclaircies'
  | 'nuageux'
  | 'pluie'
  | 'vent';

export type RevenirChoix = 'oui' | 'peut-etre' | 'non' | '';

export type CategorieVisite =
  | 'Patrimoine'
  | 'Nature & Rando'
  | 'Village'
  | 'Gastronomie'
  | 'Musée'
  | 'Plage & Bord de mer'
  | 'Autre';

export interface ServicesAire {
  eauPotable: boolean;
  eauxGrises: boolean;
  eauxNoires: boolean;
  electricite: boolean;
  wifi: boolean;
  sanitaires: boolean;
  ombrage: boolean;
  commerces: boolean;
  animaux: boolean;
  calmeNocturne: boolean;
}

export interface VisiteEffectuee {
  id: string;
  lieu: string;
  categorie: CategorieVisite;
  notes: string;
  coupDeCoeur: boolean;
}

export interface NouvellePersonne {
  id: string;
  nom: string;
  origine: string;
  contexte: string;
  contact: string;
  souvenir: string;
}

export interface GroundedPlace {
  title: string;
  uri: string;
  reviewSnippets?: string[];
}

export interface SuggestionsAlentours {
  markdown: string;
  places: GroundedPlace[];
  coordinatesKey: string;
  generatedAt: string;
}

export interface FicheDouble {
  numero: number; // 1 to 50
  // Page de gauche — L'aire de camping & l'étape
  nomAire: string;
  commune: string;
  regionPays: string;
  coordonneesGps: string;
  dateArrivee: string;
  dateDepart: string;
  typeEtape: TypeEtape;
  tarifNuit: string;
  kilometrage: string;
  meteo: MeteoType | '';
  note: number; // 0 to 5
  revenir: RevenirChoix;
  coupDeCoeur: boolean;
  services: ServicesAire;
  descriptionAire: string;
  photoUrl: string;
  photoLegende: string;
  // Page de droite — Visites effectuées & Nouvelles personnes
  visites: VisiteEffectuee[];
  rencontres: NouvellePersonne[];
  meilleurSouvenir: string;
  gastronomieAdresse: string;
  suggestionsAlentours?: SuggestionsAlentours | null;
  updatedAt: string;
}

export type ChecklistCategoryId =
  | 'papiers'
  | 'vehicule'
  | 'cellule'
  | 'cuisine'
  | 'confort'
  | 'loisirs';

export interface ChecklistItem {
  id: string;
  category: ChecklistCategoryId;
  label: string;
  checked: boolean;
  isCustom?: boolean;
}

export interface CarnetProfile {
  titreCarnet: string;
  equipage: string;
  vehicule: string;
  saison: string;
}

export interface CarnetData {
  version: number;
  profile: CarnetProfile;
  fiches: FicheDouble[]; // Always length 50
  checklist: ChecklistItem[];
}

export type AppTab = 'sommaire' | 'fiche' | 'carte' | 'checklist' | 'rencontres';
