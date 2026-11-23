import {
  CarnetData,
  ChecklistCategoryId,
  ChecklistItem,
  FicheDouble,
  ServicesAire,
} from '../types/carnet';

export const HERO_IMAGE_PATH = '/src/assets/images/hero_carnet_campagne_1795450456996.jpg';
export const BRETAGNE_IMAGE_PATH = '/src/assets/images/etape_bretagne_cote_1795450460399.jpg';
export const VERDON_IMAGE_PATH = '/src/assets/images/etape_verdon_montagne_1795450458526.jpg';

export const DEFAULT_SERVICES: ServicesAire = {
  eauPotable: false,
  eauxGrises: false,
  eauxNoires: false,
  electricite: false,
  wifi: false,
  sanitaires: false,
  ombrage: false,
  commerces: false,
  animaux: false,
  calmeNocturne: false,
};

export const SERVICE_LABELS: { key: keyof ServicesAire; label: string }[] = [
  { key: 'eauPotable', label: 'Eau potable' },
  { key: 'eauxGrises', label: 'Vidange eaux grises' },
  { key: 'eauxNoires', label: 'Vidange cassette WC' },
  { key: 'electricite', label: 'Branchement 220V' },
  { key: 'sanitaires', label: 'Douches & sanitaires' },
  { key: 'wifi', label: 'Accès Wi-Fi' },
  { key: 'ombrage', label: 'Emplacement ombragé' },
  { key: 'commerces', label: 'Commerces à pied' },
  { key: 'animaux', label: 'Animaux acceptés' },
  { key: 'calmeNocturne', label: 'Nuit très calme' },
];

export const TYPE_ETAPE_LABELS: Record<FicheDouble['typeEtape'], string> = {
  aire: 'Aire de camping-car',
  camping: 'Camping',
  ferme: 'Ferme / Vignoble',
  bivouac: 'Bivouac nature',
  habitant: 'Chez l’habitant',
};

export const METEO_LABELS: Record<Exclude<FicheDouble['meteo'], ''>, string> = {
  soleil: 'Ensoleillé',
  eclaircies: 'Éclaircies',
  nuageux: 'Nuageux',
  pluie: 'Pluie',
  vent: 'Venteux',
};

export const CHECKLIST_CATEGORIES: {
  id: ChecklistCategoryId;
  titre: string;
  description: string;
}[] = [
  {
    id: 'papiers',
    titre: 'Papiers & Administratif',
    description: 'Documents de conduite, d’identité et d’assurance indispensables sur la route.',
  },
  {
    id: 'vehicule',
    titre: 'Véhicule & Technique',
    description: 'Contrôles mécaniques, énergie, raccordements et outillage d’étape.',
  },
  {
    id: 'cellule',
    titre: 'Cellule & Sécurité avant de rouler',
    description: 'Vérifications systématiques juste avant de tourner la clé de contact.',
  },
  {
    id: 'cuisine',
    titre: 'Cuisine & Vivres',
    description: 'Réserves d’eau, ustensiles et provisions pour les premiers jours.',
  },
  {
    id: 'confort',
    titre: 'Confort, Vêtements & Pharmacie',
    description: 'Literie, tenue adaptée à la météo et trousse de soins.',
  },
  {
    id: 'loisirs',
    titre: 'Plein air & Loisirs',
    description: 'Équipement de campement, randonnées et moments de détente.',
  },
];

export function createBlankFiche(numero: number): FicheDouble {
  return {
    numero,
    nomAire: '',
    commune: '',
    regionPays: '',
    coordonneesGps: '',
    dateArrivee: '',
    dateDepart: '',
    typeEtape: 'aire',
    tarifNuit: '',
    kilometrage: '',
    meteo: '',
    note: 0,
    revenir: '',
    coupDeCoeur: false,
    services: { ...DEFAULT_SERVICES },
    descriptionAire: '',
    photoUrl: '',
    photoLegende: '',
    visites: [],
    rencontres: [],
    meilleurSouvenir: '',
    gastronomieAdresse: '',
    suggestionsAlentours: null,
    updatedAt: '',
  };
}

export function createInitialChecklist(): ChecklistItem[] {
  const raw: { category: ChecklistCategoryId; label: string; checked?: boolean }[] = [
    // Papiers & Administratif
    { category: 'papiers', label: 'Permis de conduire et carte grise du véhicule', checked: true },
    { category: 'papiers', label: 'Attestation d’assurance et numéro d’assistance dépannage', checked: true },
    { category: 'papiers', label: 'Cartes d’identité ou passeports à jour', checked: true },
    { category: 'papiers', label: 'Carte Vitale et carte européenne d’assurance maladie' },
    { category: 'papiers', label: 'Cartes d’accès aires (Camping-Car Park, France Passion...)' },
    { category: 'papiers', label: 'Double des clés rangé séparément' },

    // Véhicule & Technique
    { category: 'vehicule', label: 'Pression des pneus vérifiée (y compris roue de secours)', checked: true },
    { category: 'vehicule', label: 'Niveaux vérifiés : huile moteur, refroidissement et lave-glace' },
    { category: 'vehicule', label: 'Plein de carburant et niveau d’AdBlue contrôlés' },
    { category: 'vehicule', label: 'Bouteilles de gaz contrôlées et adaptateur étranger si besoin' },
    { category: 'vehicule', label: 'Rallonge électrique 25 m + adaptateur prise P17' },
    { category: 'vehicule', label: 'Tuyau d’eau alimentaire + jeu de raccords universels' },
    { category: 'vehicule', label: 'Cales de mise à niveau et tapis anti-enlisement' },
    { category: 'vehicule', label: 'Gilets haute visibilité, triangle et lampe torche' },

    // Cellule & Sécurité avant de rouler
    { category: 'cellule', label: 'Lanterneaux, fenêtres et soutes verrouillés' },
    { category: 'cellule', label: 'Placards, tiroirs et porte du réfrigérateur bloqués' },
    { category: 'cellule', label: 'Réfrigérateur basculé en mode 12V (ou automatique)' },
    { category: 'cellule', label: 'Marchepied rentré et antenne / parabole repliée' },
    { category: 'cellule', label: 'Vannes d’eaux usées fermées et cassette WC prête' },
    { category: 'cellule', label: 'Robinet de gaz fermé (sauf détendeur homologué route)' },

    // Cuisine & Vivres
    { category: 'cuisine', label: 'Réservoir d’eau propre rempli (ou partiel pour alléger)' },
    { category: 'cuisine', label: 'Cafetière, thé, sel, poivre, huile et provisions de base' },
    { category: 'cuisine', label: 'Vaisselle incassable, couverts, ouvre-boîte et tire-bouchon' },
    { category: 'cuisine', label: 'Liquide vaisselle biodégradable, éponges et torchons' },
    { category: 'cuisine', label: 'Sacs poubelle, essuie-tout et boîtes hermétiques' },

    // Confort, Vêtements & Pharmacie
    { category: 'confort', label: 'Draps, couettes, oreillers et serviettes microfibres' },
    { category: 'confort', label: 'Vêtements adaptés (coupe-vent, pluie, polaire, maillot)' },
    { category: 'confort', label: 'Trousse de premiers secours, ordonnances et médicaments' },
    { category: 'confort', label: 'Crème solaire, lunettes de soleil et répulsif moustiques' },
    { category: 'confort', label: 'Chargeurs 12V/USB, batteries externes et câbles' },
    { category: 'confort', label: 'Papiers toilette spécial cassette et produit sanitaire' },

    // Plein air & Loisirs
    { category: 'loisirs', label: 'Table pliante, fauteuils de camping et tapis de sol' },
    { category: 'loisirs', label: 'Chaussures de randonnée et sacs à dos de journée' },
    { category: 'loisirs', label: 'Appareil photo, jumelles et carnets / stylos' },
    { category: 'loisirs', label: 'Livres, guides régionaux et jeux de société' },
    { category: 'loisirs', label: 'Cadenas pour vélos et sangles de porte-vélos' },
  ];

  return raw.map((item, idx) => ({
    id: `chk-${idx + 1}`,
    category: item.category,
    label: item.label,
    checked: Boolean(item.checked),
    isCustom: false,
  }));
}

export function createInitialCarnet(): CarnetData {
  const fiches: FicheDouble[] = Array.from({ length: 50 }, (_, index) =>
    createBlankFiche(index + 1)
  );

  // Fiche 01 — Exemple complet en Bretagne pour illustrer le carnet
  fiches[0] = {
    numero: 1,
    nomAire: 'Aire panoramique de la Pointe du Raz',
    commune: 'Plogoff',
    regionPays: 'Finistère, Bretagne',
    coordonneesGps: '48.0394° N, 4.7318° O',
    dateArrivee: '2026-05-14',
    dateDepart: '2026-05-16',
    typeEtape: 'aire',
    tarifNuit: '14',
    kilometrage: '42 180',
    meteo: 'eclaircies',
    note: 5,
    revenir: 'oui',
    coupDeCoeur: true,
    services: {
      eauPotable: true,
      eauxGrises: true,
      eauxNoires: true,
      electricite: false,
      wifi: false,
      sanitaires: true,
      ombrage: false,
      commerces: false,
      animaux: true,
      calmeNocturne: true,
    },
    descriptionAire:
      'Emplacements spacieux sur gravier stabilisé face à la lande bretonne. Prévoir les cales sur les places les plus hautes. Coucher de soleil remarquable derrière le phare de la Vieille, silence absolu dès 21 h.',
    photoUrl: BRETAGNE_IMAGE_PATH,
    photoLegende: 'Fin d’après-midi face aux falaises de granit et à la bruyère en fleur.',
    visites: [
      {
        id: 'v-101',
        lieu: 'Sentier côtier GR34 jusqu’à la Baie des Trépassés',
        categorie: 'Nature & Rando',
        notes: 'Boucle de 9 km le long des falaises. Emporter un coupe-vent même par beau temps.',
        coupDeCoeur: true,
      },
      {
        id: 'v-102',
        lieu: 'Port d’Audierne et halle aux poissons',
        categorie: 'Village',
        notes: 'Arrivée des bateaux vers 16 h, ruelles colorées très agréables à pied.',
        coupDeCoeur: false,
      },
    ],
    rencontres: [
      {
        id: 'r-101',
        nom: 'Claire & Bernard Morel',
        origine: 'Annecy (Haute-Savoie)',
        contexte: 'Voisins d’emplacement en fourgon aménagé',
        contact: 'claire.morel@exemple.fr',
        souvenir:
          'Café partagé au matin face à la mer. Ils nous ont conseillé un petit moulin à cidre près de Pont-Croix et une halte très calme dans les Monts d’Arrée.',
      },
    ],
    meilleurSouvenir:
      'La lumière dorée sur le phare de la Vieille à 21 h 30, seuls sur le sentier côtier avec le bruit de la houle.',
    gastronomieAdresse:
      'Kouign-amann encore tiède à la boulangerie du bourg de Plogoff et galette complète à la crêperie du Port à Audierne.',
    updatedAt: '2026-05-16T09:30:00.000Z',
  };

  // Fiche 02 — Exemple complet dans le Verdon
  fiches[1] = {
    numero: 2,
    nomAire: 'Camping des Pins du Verdon',
    commune: 'Castellane',
    regionPays: 'Alpes-de-Haute-Provence',
    coordonneesGps: '43.8467° N, 6.5131° E',
    dateArrivee: '2026-06-08',
    dateDepart: '2026-06-11',
    typeEtape: 'camping',
    tarifNuit: '24',
    kilometrage: '43 490',
    meteo: 'soleil',
    note: 4,
    revenir: 'oui',
    coupDeCoeur: true,
    services: {
      eauPotable: true,
      eauxGrises: true,
      eauxNoires: true,
      electricite: true,
      wifi: true,
      sanitaires: true,
      ombrage: true,
      commerces: true,
      animaux: true,
      calmeNocturne: true,
    },
    descriptionAire:
      'Emplacements en terrasse sous les grands pins maritimes avec vue plongeante sur la vallée. Accueil familial, dépôt de pain frais le matin à 7 h 45. Accès facile pour véhicules jusqu’à 7,5 m.',
    photoUrl: VERDON_IMAGE_PATH,
    photoLegende: 'Matinée fraîche sous les pins avant la descente vers le Verdon.',
    visites: [
      {
        id: 'v-201',
        lieu: 'Route des Crêtes et Belvédère de la Carelle',
        categorie: 'Nature & Rando',
        notes: 'Partir tôt le matin pour observer les vautours fauves au-dessus des gorges.',
        coupDeCoeur: true,
      },
      {
        id: 'v-202',
        lieu: 'Moustiers-Sainte-Marie',
        categorie: 'Patrimoine',
        notes: 'Atelier de faïence fine, chapelle Notre-Dame-de-Beauvoir et ruelles fleuries.',
        coupDeCoeur: true,
      },
    ],
    rencontres: [
      {
        id: 'r-201',
        nom: 'Jean-Luc Garnier',
        origine: 'Castellane (Gardien du camping)',
        contexte: 'Accueil du camping et discussions du soir',
        contact: 'Camping des Pins — emplacement 14',
        souvenir:
          'Nous a indiqué le sentier discret pour descendre à la rivière sans la foule et nous a offert un bocal de miel de lavande de son frère.',
      },
    ],
    meilleurSouvenir:
      'Le petit-déjeuner à l’ombre des pins avec l’odeur de résine et les eaux turquoise en contrebas.',
    gastronomieAdresse:
      'Fromage de chèvre de Banon et fougasse aux olives au marché du samedi matin à Castellane.',
    updatedAt: '2026-06-11T10:15:00.000Z',
  };

  return {
    version: 1,
    profile: {
      titreCarnet: 'Carnet de Route',
      equipage: 'Notre équipage',
      vehicule: 'Fourgon aménagé',
      saison: 'Saison 2026',
    },
    fiches,
    checklist: createInitialChecklist(),
  };
}
