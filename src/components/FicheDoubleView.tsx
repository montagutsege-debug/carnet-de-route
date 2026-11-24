import { ChangeEvent, FormEvent, useRef, useState } from 'react';
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  Loader2,
  LocateFixed,
  Plus,
  Printer,
  RotateCcw,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import {
  CategorieVisite,
  FicheDouble,
  MeteoType,
  NouvellePersonne,
  PhotoFiche,
  RevenirChoix,
  ServicesAire,
  TypeEtape,
  VisiteEffectuee,
} from '../types/carnet';
import {
  MAX_PHOTOS_PAR_FICHE,
  METEO_LABELS,
  SERVICE_LABELS,
  TYPE_ETAPE_LABELS,
} from '../data/initialCarnet';
import {
  calculateNights,
  compressImageFile,
  isFicheFilled,
  padFicheNumber,
} from '../utils/storage';
import { ResilientImage } from './ResilientImage';
import { SuggestionsAlentoursPanel } from './SuggestionsAlentoursPanel';

interface FicheDoubleViewProps {
  fiche: FicheDouble;
  allFiches: FicheDouble[];
  onSelectFiche: (numero: number) => void;
  onUpdateFiche: (updated: FicheDouble) => void;
  onResetFiche: (numero: number) => void;
  onBackToSommaire: () => void;
}

const CATEGORIES_VISITE: CategorieVisite[] = [
  'Patrimoine',
  'Nature & Rando',
  'Village',
  'Gastronomie',
  'Musée',
  'Plage & Bord de mer',
  'Autre',
];

export function FicheDoubleView({
  fiche,
  allFiches,
  onSelectFiche,
  onUpdateFiche,
  onResetFiche,
  onBackToSommaire,
}: FicheDoubleViewProps) {
  const [mobilePage, setMobilePage] = useState<'gauche' | 'droite'>('gauche');
  const [confirmClear, setConfirmClear] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [locatingGps, setLocatingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Add Visit form state
  const [showAddVisit, setShowAddVisit] = useState(false);
  const [visitLieu, setVisitLieu] = useState('');
  const [visitCategorie, setVisitCategorie] = useState<CategorieVisite>('Patrimoine');
  const [visitNotes, setVisitNotes] = useState('');
  const [visitCoupDeCoeur, setVisitCoupDeCoeur] = useState(false);

  // Add Person form state
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [personNom, setPersonNom] = useState('');
  const [personOrigine, setPersonOrigine] = useState('');
  const [personContexte, setPersonContexte] = useState('');
  const [personContact, setPersonContact] = useState('');
  const [personSouvenir, setPersonSouvenir] = useState('');

  const nights = calculateNights(fiche.dateArrivee, fiche.dateDepart);
  const numLabel = padFicheNumber(fiche.numero);

  const patch = (partial: Partial<FicheDouble>) => {
    onUpdateFiche({
      ...fiche,
      ...partial,
      updatedAt: new Date().toISOString(),
    });
  };

  const toggleService = (key: keyof ServicesAire) => {
    patch({
      services: {
        ...fiche.services,
        [key]: !fiche.services[key],
      },
    });
  };

  const handleLocateGps = () => {
    if (!('geolocation' in navigator)) {
      setGpsError('La géolocalisation n’est pas prise en charge par ce navigateur.');
      return;
    }

    setLocatingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const latDir = latitude >= 0 ? 'N' : 'S';
        const lonDir = longitude >= 0 ? 'E' : 'O';
        const formatted = `${Math.abs(latitude).toFixed(4)}° ${latDir}, ${Math.abs(longitude).toFixed(4)}° ${lonDir}`;
        patch({ coordonneesGps: formatted });
        setLocatingGps(false);
      },
      (error) => {
        setLocatingGps(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGpsError(
            'Autorisation refusée. Autorisez la localisation dans votre navigateur, ou sur Mac dans Réglages Système › Confidentialité et sécurité › Service de localisation.'
          );
        } else if (error.code === error.TIMEOUT) {
          setGpsError('Délai dépassé pour obtenir la position GPS.');
        } else {
          setGpsError('Impossible de déterminer la position actuelle.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  /** Updates the photo list and keeps photoUrl/photoLegende on the main photo. */
  const setPhotos = (photos: PhotoFiche[]) => {
    patch({
      photos,
      photoUrl: photos[0]?.url ?? '',
      photoLegende: photos[0]?.legende ?? '',
    });
  };

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setPhotoError(null);
    const place = MAX_PHOTOS_PAR_FICHE - fiche.photos.length;
    if (place <= 0) {
      setPhotoError(`Maximum ${MAX_PHOTOS_PAR_FICHE} photos par fiche.`);
      e.target.value = '';
      return;
    }
    const added: PhotoFiche[] = [];
    let failed = 0;
    for (const file of files.slice(0, place)) {
      try {
        const url = await compressImageFile(file);
        added.push({
          id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          url,
          legende: '',
        });
      } catch {
        failed += 1;
      }
    }
    if (added.length > 0) setPhotos([...fiche.photos, ...added]);
    if (failed > 0) {
      setPhotoError('Certaines images n’ont pas pu être chargées. Choisissez des fichiers JPG ou PNG.');
    } else if (files.length > place) {
      setPhotoError(
        `Seules ${place} photo${place > 1 ? 's ont été ajoutées' : ' a été ajoutée'} : maximum ${MAX_PHOTOS_PAR_FICHE} par fiche.`
      );
    }
    e.target.value = '';
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos(fiche.photos.filter((p) => p.id !== id));
  };

  const handleMakeMainPhoto = (id: string) => {
    const photo = fiche.photos.find((p) => p.id === id);
    if (!photo) return;
    setPhotos([photo, ...fiche.photos.filter((p) => p.id !== id)]);
  };

  const handlePhotoCaption = (id: string, legende: string) => {
    setPhotos(fiche.photos.map((p) => (p.id === id ? { ...p, legende } : p)));
  };

  const handleAddVisit = (e: FormEvent) => {
    e.preventDefault();
    if (!visitLieu.trim()) return;
    const newVisit: VisiteEffectuee = {
      id: `v-${Date.now()}`,
      lieu: visitLieu.trim(),
      categorie: visitCategorie,
      notes: visitNotes.trim(),
      coupDeCoeur: visitCoupDeCoeur,
    };
    patch({ visites: [...fiche.visites, newVisit] });
    setVisitLieu('');
    setVisitNotes('');
    setVisitCoupDeCoeur(false);
    setShowAddVisit(false);
  };

  const handleDeleteVisit = (id: string) => {
    patch({ visites: fiche.visites.filter((v) => v.id !== id) });
  };

  const handleToggleVisitFavorite = (id: string) => {
    patch({
      visites: fiche.visites.map((v) =>
        v.id === id ? { ...v, coupDeCoeur: !v.coupDeCoeur } : v
      ),
    });
  };

  const handleAddPerson = (e: FormEvent) => {
    e.preventDefault();
    if (!personNom.trim()) return;
    const newPerson: NouvellePersonne = {
      id: `r-${Date.now()}`,
      nom: personNom.trim(),
      origine: personOrigine.trim(),
      contexte: personContexte.trim(),
      contact: personContact.trim(),
      souvenir: personSouvenir.trim(),
    };
    patch({ rencontres: [...fiche.rencontres, newPerson] });
    setPersonNom('');
    setPersonOrigine('');
    setPersonContexte('');
    setPersonContact('');
    setPersonSouvenir('');
    setShowAddPerson(false);
  };

  const handleDeletePerson = (id: string) => {
    patch({ rencontres: fiche.rencontres.filter((r) => r.id !== id) });
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
      {/* Top Fiche Navigator Toolbar */}
      <div className="no-print flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#DFDDD4]">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onBackToSommaire}
            className="text-sm text-[#5C6268] hover:text-[#1C1F22] transition-colors whitespace-nowrap cursor-pointer"
          >
            ← Sommaire
          </button>
          <span aria-hidden="true" className="text-[#C8C5BC]">/</span>

          <div className="inline-flex items-center gap-1 bg-[#FAF9F6] border border-[#DCD9D0] rounded-lg p-1">
            <button
              type="button"
              disabled={fiche.numero <= 1}
              onClick={() => {
                setGpsError(null);
                onSelectFiche(fiche.numero - 1);
              }}
              aria-label="Fiche précédente"
              className="p-2 rounded-md text-[#1C1F22] hover:bg-[#ECEAE2] disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <select
              aria-label="Choisir une fiche de 1 à 50"
              value={fiche.numero}
              onChange={(e) => {
                setConfirmClear(false);
                setGpsError(null);
                onSelectFiche(Number(e.target.value));
              }}
              className="px-2 py-1.5 text-sm font-mono tabular-nums bg-transparent text-[#1C1F22] font-medium focus:outline-none cursor-pointer max-w-[240px]"
            >
              {allFiches.map((f) => {
                const filled = isFicheFilled(f);
                const label = filled
                  ? f.nomAire || f.commune || 'Étape complétée'
                  : 'Vierge';
                return (
                  <option key={f.numero} value={f.numero}>
                    Fiche {padFicheNumber(f.numero)} / 50 — {label.slice(0, 26)}
                  </option>
                );
              })}
            </select>

            <button
              type="button"
              disabled={fiche.numero >= 50}
              onClick={() => {
                setGpsError(null);
                onSelectFiche(fiche.numero + 1);
              }}
              aria-label="Fiche suivante"
              className="p-2 rounded-md text-[#1C1F22] hover:bg-[#ECEAE2] disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => patch({ coupDeCoeur: !fiche.coupDeCoeur })}
            aria-pressed={fiche.coupDeCoeur}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md border transition-colors whitespace-nowrap cursor-pointer ${
              fiche.coupDeCoeur
                ? 'bg-[#1E4D3B] text-white border-[#1E4D3B]'
                : 'bg-[#FAF9F6] text-[#3A3F45] border-[#DCD9D0] hover:border-[#1E4D3B]'
            }`}
          >
            <Heart
              className={`w-3.5 h-3.5 ${fiche.coupDeCoeur ? 'fill-white text-white' : ''}`}
            />
            {fiche.coupDeCoeur ? 'Coup de cœur' : 'Marquer coup de cœur'}
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#3A3F45] bg-[#FAF9F6] border border-[#DCD9D0] hover:border-[#1C1F22] rounded-md transition-colors whitespace-nowrap cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimer la fiche
          </button>

          {!confirmClear ? (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#5C6268] hover:text-red-700 transition-colors whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Vider
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 bg-[#FAF9F6] border border-red-200 px-3 py-1.5 rounded-md">
              <span className="text-xs text-[#1C1F22]">Effacer cette fiche ?</span>
              <button
                type="button"
                onClick={() => {
                  onResetFiche(fiche.numero);
                  setConfirmClear(false);
                }}
                className="text-xs font-semibold text-red-700 hover:underline cursor-pointer"
              >
                Confirmer
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="text-xs text-[#5C6268] hover:text-[#1C1F22] cursor-pointer"
              >
                Annuler
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Left / Right Page Switcher */}
      <div className="no-print lg:hidden flex items-center p-1 bg-[#E9E7DF] rounded-lg">
        <button
          type="button"
          onClick={() => setMobilePage('gauche')}
          className={`flex-1 py-2.5 px-3 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            mobilePage === 'gauche'
              ? 'bg-[#FAF9F6] text-[#1C1F22] shadow-xs'
              : 'text-[#5C6268]'
          }`}
        >
          Page gauche · Aire de camping
        </button>
        <button
          type="button"
          onClick={() => setMobilePage('droite')}
          className={`flex-1 py-2.5 px-3 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            mobilePage === 'droite'
              ? 'bg-[#FAF9F6] text-[#1C1F22] shadow-xs'
              : 'text-[#5C6268]'
          }`}
        >
          Page droite · Visites &amp; Rencontres
        </button>
      </div>

      {/* Authentic Open Double-Page Notebook Spread */}
      <article className="print-spread grid grid-cols-1 lg:grid-cols-2 bg-[#FAF9F6] border border-[#D8D5CC] rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(28,31,34,0.04)]">
        {/* ================= PAGE DE GAUCHE : AIRE DE CAMPING ================= */}
        <section
          aria-label="Page de gauche : Aire de camping et détails de l’étape"
          className={`spread-page-left p-6 sm:p-8 lg:p-10 lg:border-r border-[#E2E0D8] space-y-7 ${
            mobilePage === 'droite' ? 'hidden lg:block' : 'block'
          }`}
        >
          <header className="flex items-baseline justify-between gap-4 pb-4 border-b border-[#E5E3DA]">
            <div>
              <p className="text-xs font-mono text-[#5C6268] tabular-nums">
                Fiche N° {numLabel} / 50 · Page de gauche
              </p>
              <h1 className="mt-1 font-serif text-2xl sm:text-[26px] font-semibold text-[#1C1F22]">
                Aire de camping &amp; étape
              </h1>
            </div>
            {nights !== null && (
              <span className="font-mono text-xs tabular-nums text-[#1E4D3B] font-medium shrink-0">
                {nights === 0 ? 'Halte journée' : `${nights} nuit${nights > 1 ? 's' : ''}`}
              </span>
            )}
          </header>

          {/* Lieu & Identité de l'étape */}
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-[#4E545A]">
                Nom de l’aire, du camping ou du lieu de bivouac
              </span>
              <input
                type="text"
                value={fiche.nomAire}
                onChange={(e) => patch({ nomAire: e.target.value })}
                placeholder="Ex. Aire panoramique de la Pointe du Raz"
                className="mt-1.5 w-full px-3.5 py-2.5 text-base font-serif bg-white border border-[#DCD9D0] rounded-md text-[#1C1F22] placeholder:text-[#9AA0A6] focus:outline-none focus:border-[#1E4D3B]"
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs font-medium text-[#4E545A]">Commune / Village</span>
                <input
                  type="text"
                  value={fiche.commune}
                  onChange={(e) => patch({ commune: e.target.value })}
                  placeholder="Ex. Plogoff"
                  className="mt-1.5 w-full px-3 py-2 text-sm bg-white border border-[#DCD9D0] rounded-md text-[#1C1F22] placeholder:text-[#9AA0A6] focus:outline-none focus:border-[#1E4D3B]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-[#4E545A]">
                  Département / Région / Pays
                </span>
                <input
                  type="text"
                  value={fiche.regionPays}
                  onChange={(e) => patch({ regionPays: e.target.value })}
                  placeholder="Ex. Finistère, Bretagne"
                  className="mt-1.5 w-full px-3 py-2 text-sm bg-white border border-[#DCD9D0] rounded-md text-[#1C1F22] placeholder:text-[#9AA0A6] focus:outline-none focus:border-[#1E4D3B]"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs font-medium text-[#4E545A]">Date d’arrivée</span>
                <input
                  type="date"
                  value={fiche.dateArrivee}
                  onChange={(e) => patch({ dateArrivee: e.target.value })}
                  className="mt-1.5 w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-[#DCD9D0] rounded-md text-[#1C1F22] focus:outline-none focus:border-[#1E4D3B]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-[#4E545A]">Date de départ</span>
                <input
                  type="date"
                  value={fiche.dateDepart}
                  onChange={(e) => patch({ dateDepart: e.target.value })}
                  className="mt-1.5 w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-[#DCD9D0] rounded-md text-[#1C1F22] focus:outline-none focus:border-[#1E4D3B]"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-2 block">
                <label
                  htmlFor={`gps-${fiche.numero}`}
                  className="text-xs font-medium text-[#4E545A]"
                >
                  Coordonnées GPS
                </label>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <input
                    id={`gps-${fiche.numero}`}
                    type="text"
                    value={fiche.coordonneesGps}
                    onChange={(e) => {
                      setGpsError(null);
                      patch({ coordonneesGps: e.target.value });
                    }}
                    placeholder="48.0394° N, 4.7318° O"
                    className="flex-1 min-w-0 px-3 py-2 text-xs font-mono tabular-nums bg-white border border-[#DCD9D0] rounded-md text-[#1C1F22] placeholder:text-[#9AA0A6] focus:outline-none focus:border-[#1E4D3B]"
                  />
                  <button
                    type="button"
                    onClick={handleLocateGps}
                    disabled={locatingGps}
                    title="Insérer la position GPS actuelle"
                    aria-label="Récupérer les coordonnées GPS de l’ordinateur"
                    className="no-print inline-flex items-center justify-center w-9 h-9 shrink-0 rounded-md border border-[#DCD9D0] bg-white text-[#1E4D3B] hover:bg-[#1E4D3B] hover:text-white hover:border-[#1E4D3B] disabled:opacity-60 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E4D3B]"
                  >
                    {locatingGps ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <LocateFixed className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {gpsError && (
                  <p role="alert" className="mt-1 text-[11px] text-red-700 leading-snug">
                    {gpsError}
                  </p>
                )}
              </div>

              <label className="block">
                <span className="text-xs font-medium text-[#4E545A]">Tarif / nuit (€)</span>
                <input
                  type="text"
                  value={fiche.tarifNuit}
                  onChange={(e) => patch({ tarifNuit: e.target.value })}
                  placeholder="Gratuit ou 14"
                  className="mt-1.5 w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-[#DCD9D0] rounded-md text-[#1C1F22] placeholder:text-[#9AA0A6] focus:outline-none focus:border-[#1E4D3B]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-[#4E545A]">Compteur (km)</span>
                <input
                  type="text"
                  value={fiche.kilometrage}
                  onChange={(e) => patch({ kilometrage: e.target.value })}
                  placeholder="42 180"
                  className="mt-1.5 w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-[#DCD9D0] rounded-md text-[#1C1F22] placeholder:text-[#9AA0A6] focus:outline-none focus:border-[#1E4D3B]"
                />
              </label>
            </div>
          </div>

          {/* Type d'étape */}
          <div className="space-y-2 pt-2 border-t border-[#EAE8E0]">
            <p className="text-xs font-medium text-[#4E545A]">Type de halte</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(TYPE_ETAPE_LABELS) as TypeEtape[]).map((typeKey) => {
                const active = fiche.typeEtape === typeKey;
                return (
                  <button
                    key={typeKey}
                    type="button"
                    onClick={() => patch({ typeEtape: typeKey })}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-[#1E4D3B] text-white border-[#1E4D3B]'
                        : 'bg-white text-[#4E545A] border-[#DCD9D0] hover:border-[#1E4D3B]'
                    }`}
                  >
                    {TYPE_ETAPE_LABELS[typeKey]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Services & Équipements */}
          <div className="space-y-2.5 pt-2 border-t border-[#EAE8E0]">
            <p className="text-xs font-medium text-[#4E545A]">Services &amp; cadre sur place</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
              {SERVICE_LABELS.map((srv) => {
                const checked = fiche.services[srv.key];
                return (
                  <button
                    key={srv.key}
                    type="button"
                    onClick={() => toggleService(srv.key)}
                    className="flex items-center gap-2.5 py-1.5 text-left text-sm text-[#1C1F22] hover:text-[#1E4D3B] transition-colors cursor-pointer min-h-[38px]"
                  >
                    <span
                      aria-hidden="true"
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        checked
                          ? 'bg-[#1E4D3B] border-[#1E4D3B] text-white'
                          : 'bg-white border-[#C5C2B8]'
                      }`}
                    >
                      {checked && <Check className="w-3 h-3" strokeWidth={2.5} />}
                    </span>
                    <span className={checked ? 'font-medium text-[#1C1F22]' : 'text-[#5C6268]'}>
                      {srv.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Météo, Note & Revenir */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-3 border-t border-[#EAE8E0]">
            <div className="space-y-2">
              <p className="text-xs font-medium text-[#4E545A]">Météo dominante</p>
              <select
                aria-label="Météo dominante"
                value={fiche.meteo}
                onChange={(e) => patch({ meteo: e.target.value as MeteoType | '' })}
                className="w-full px-3 py-2 text-sm bg-white border border-[#DCD9D0] rounded-md text-[#1C1F22] focus:outline-none focus:border-[#1E4D3B]"
              >
                <option value="">Non renseignée</option>
                {(Object.keys(METEO_LABELS) as Exclude<FicheDouble['meteo'], ''>[]).map((m) => (
                  <option key={m} value={m}>
                    {METEO_LABELS[m]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-[#4E545A]">Note de l’aire</p>
              <div className="flex items-center gap-1 pt-1" role="group" aria-label="Note sur 5">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = star <= fiche.note;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => patch({ note: fiche.note === star ? 0 : star })}
                      aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
                      className="p-1 rounded hover:bg-[#ECEAE2] transition-colors cursor-pointer"
                    >
                      <Star
                        className={`w-5 h-5 transition-colors ${
                          active
                            ? 'fill-[#B47B2B] text-[#B47B2B]'
                            : 'text-[#C5C2B8] hover:text-[#B47B2B]'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-[#4E545A]">Revenir ici ?</p>
              <div className="inline-flex items-center p-0.5 bg-[#ECEAE2] rounded-md">
                {(
                  [
                    { val: 'oui', label: 'Oui' },
                    { val: 'peut-etre', label: 'Peut-être' },
                    { val: 'non', label: 'Non' },
                  ] as { val: RevenirChoix; label: string }[]
                ).map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() =>
                      patch({ revenir: fiche.revenir === opt.val ? '' : opt.val })
                    }
                    className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                      fiche.revenir === opt.val
                        ? 'bg-white text-[#1C1F22] shadow-xs'
                        : 'text-[#5C6268] hover:text-[#1C1F22]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description de l'aire */}
          <div className="space-y-1.5 pt-2 border-t border-[#EAE8E0]">
            <label htmlFor={`desc-aire-${fiche.numero}`} className="block text-xs font-medium text-[#4E545A]">
              Description de l’aire, accès, emplacement &amp; conseils pratiques
            </label>
            <textarea
              id={`desc-aire-${fiche.numero}`}
              rows={4}
              value={fiche.descriptionAire}
              onChange={(e) => patch({ descriptionAire: e.target.value })}
              placeholder="Notez la qualité du terrain, l’accès, le calme, la vue depuis le pare-brise ou le numéro du meilleur emplacement..."
              className="notebook-lines w-full px-3.5 py-2 text-sm bg-white border border-[#DCD9D0] rounded-md text-[#1C1F22] placeholder:text-[#9AA0A6] focus:outline-none focus:border-[#1E4D3B] resize-y"
            />
          </div>

          {/* Photos souvenirs */}
          <div className="space-y-3 pt-2 border-t border-[#EAE8E0]">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-[#4E545A]">
                Photos souvenirs de l’étape
                {fiche.photos.length > 0 && (
                  <span className="ml-1.5 font-mono text-[#82888E] tabular-nums">
                    {fiche.photos.length} / {MAX_PHOTOS_PAR_FICHE}
                  </span>
                )}
              </p>
              {fiche.photos.length > 0 && fiche.photos.length < MAX_PHOTOS_PAR_FICHE && (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="no-print inline-flex items-center gap-1.5 text-xs font-medium text-[#1E4D3B] hover:underline cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Ajouter des photos
                </button>
              )}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>

            {photoError && <p className="text-xs text-red-700">{photoError}</p>}

            {fiche.photos.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {fiche.photos.map((photo, index) => (
                  <figure
                    key={photo.id}
                    className={`space-y-1.5 ${index === 0 ? 'col-span-2' : ''}`}
                  >
                    <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-[#DCD9D0]">
                      <ResilientImage
                        src={photo.url}
                        alt={photo.legende || fiche.nomAire || `Photo de la fiche ${numLabel}`}
                        fallbackTitle={fiche.nomAire || `Étape ${numLabel}`}
                      />
                      {index === 0 && fiche.photos.length > 1 && (
                        <span className="absolute left-2 top-2 px-2 py-0.5 rounded bg-[#1C1F22]/75 text-[10px] font-medium text-white">
                          Photo principale
                        </span>
                      )}
                      <div className="no-print absolute right-2 top-2 flex gap-1.5">
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={() => handleMakeMainPhoto(photo.id)}
                            aria-label="Choisir comme photo principale"
                            title="Choisir comme photo principale"
                            className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-white/90 text-[#1C1F22] hover:bg-white shadow-sm cursor-pointer"
                          >
                            <Star className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(photo.id)}
                          aria-label="Retirer cette photo"
                          title="Retirer cette photo"
                          className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-white/90 text-[#1C1F22] hover:bg-white hover:text-red-700 shadow-sm cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={photo.legende}
                      onChange={(e) => handlePhotoCaption(photo.id, e.target.value)}
                      placeholder="Légende..."
                      aria-label={`Légende de la photo ${index + 1}`}
                      className="w-full px-2 py-1 text-xs italic bg-transparent border-b border-[#E5E3DA] text-[#4E545A] placeholder:text-[#9AA0A6] focus:outline-none focus:border-[#1E4D3B]"
                    />
                  </figure>
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="no-print w-full py-6 px-4 rounded-lg border border-dashed border-[#CECBC0] bg-[#F5F4EE] hover:border-[#1E4D3B] text-center transition-colors cursor-pointer"
              >
                <Camera className="w-5 h-5 text-[#7A8086] mx-auto mb-1.5" strokeWidth={1.5} />
                <p className="text-xs font-medium text-[#4E545A]">
                  Ajouter des photos de l’étape (jusqu’à {MAX_PHOTOS_PAR_FICHE})
                </p>
                <p className="text-[11px] text-[#82888E] mt-0.5">
                  Vous pouvez en choisir plusieurs à la fois ; elles sont redimensionnées
                  automatiquement
                </p>
              </button>
            )}
          </div>
        </section>

        {/* ================= PAGE DE DROITE : VISITES & RENCONTRES ================= */}
        <section
          aria-label="Page de droite : Visites effectuées et nouvelles personnes rencontrées"
          className={`spread-page-right p-6 sm:p-8 lg:p-10 space-y-8 ${
            mobilePage === 'gauche' ? 'hidden lg:block' : 'block'
          }`}
        >
          <header className="flex items-baseline justify-between gap-4 pb-4 border-b border-[#E5E3DA]">
            <div>
              <p className="text-xs font-mono text-[#5C6268] tabular-nums">
                Fiche N° {numLabel} / 50 · Page de droite
              </p>
              <h2 className="mt-1 font-serif text-2xl sm:text-[26px] font-semibold text-[#1C1F22]">
                Visites &amp; nouvelles personnes
              </h2>
            </div>
            <span className="font-mono text-xs tabular-nums text-[#5C6268] shrink-0">
              {fiche.visites.length} vis. · {fiche.rencontres.length} renc.
            </span>
          </header>

          {/* SECTION 1 : VISITES EFFECTUÉES */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-serif text-lg font-semibold text-[#1C1F22]">
                  01. Visites effectuées
                </h3>
                <p className="text-xs text-[#5C6268]">
                  Balades, villages, monuments, marchés ou points de vue découverts depuis cette
                  étape.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddVisit((prev) => !prev)}
                className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1E4D3B] bg-[#1E4D3B]/8 hover:bg-[#1E4D3B]/15 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {showAddVisit ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {showAddVisit ? 'Fermer' : 'Ajouter une visite'}
              </button>
            </div>

            {showAddVisit && (
              <form
                onSubmit={handleAddVisit}
                className="no-print bg-[#F3F2ED] border border-[#DCD9D0] rounded-lg p-4 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="sm:col-span-2 block">
                    <span className="text-xs font-medium text-[#4E545A]">Lieu ou activité *</span>
                    <input
                      type="text"
                      required
                      value={visitLieu}
                      onChange={(e) => setVisitLieu(e.target.value)}
                      placeholder="Ex. Sentier côtier GR34, Marché de Sarlat..."
                      className="mt-1 w-full px-3 py-2 text-sm bg-white border border-[#DCD9D0] rounded-md text-[#1C1F22] focus:outline-none focus:border-[#1E4D3B]"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-[#4E545A]">Catégorie</span>
                    <select
                      value={visitCategorie}
                      onChange={(e) => setVisitCategorie(e.target.value as CategorieVisite)}
                      className="mt-1 w-full px-2.5 py-2 text-sm bg-white border border-[#DCD9D0] rounded-md text-[#1C1F22] focus:outline-none focus:border-[#1E4D3B]"
                    >
                      {CATEGORIES_VISITE.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block">
                  <span className="text-xs font-medium text-[#4E545A]">
                    Notes, durée ou impressions
                  </span>
                  <textarea
                    rows={2}
                    value={visitNotes}
                    onChange={(e) => setVisitNotes(e.target.value)}
                    placeholder="Ce que vous avez aimé, conseils d’accès, horaires..."
                    className="mt-1 w-full px-3 py-2 text-sm bg-white border border-[#DCD9D0] rounded-md text-[#1C1F22] focus:outline-none focus:border-[#1E4D3B]"
                  />
                </label>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-[#3A3F45] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visitCoupDeCoeur}
                      onChange={(e) => setVisitCoupDeCoeur(e.target.checked)}
                      className="w-4 h-4 accent-[#1E4D3B]"
                    />
                    Coup de cœur de l’étape
                  </label>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-medium text-white bg-[#1E4D3B] hover:bg-[#173D2F] rounded-md transition-colors cursor-pointer"
                  >
                    Enregistrer la visite
                  </button>
                </div>
              </form>
            )}

            {fiche.visites.length === 0 ? (
              <div className="py-5 px-4 rounded-lg bg-[#F5F4EE] border border-[#EAE8E0] text-sm text-[#6E747A]">
                Aucune visite consignée pour cette fiche. Cliquez sur « Ajouter une visite » pour
                noter vos découvertes.
              </div>
            ) : (
              <ul className="divide-y divide-[#EAE8E0] border-t border-b border-[#EAE8E0]">
                {fiche.visites.map((v) => (
                  <li key={v.id} className="py-3.5 flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <p className="text-sm font-semibold text-[#1C1F22]">{v.lieu}</p>
                        <span className="text-xs text-[#6E747A]">
                          · {v.categorie}
                          {v.coupDeCoeur ? ' · Coup de cœur' : ''}
                        </span>
                      </div>
                      {v.notes && (
                        <p className="text-sm text-[#4E545A] leading-relaxed">{v.notes}</p>
                      )}
                    </div>

                    <div className="no-print flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleVisitFavorite(v.id)}
                        aria-label="Basculer coup de cœur"
                        className="p-1.5 rounded hover:bg-[#ECEAE2] transition-colors cursor-pointer"
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            v.coupDeCoeur
                              ? 'fill-[#1E4D3B] text-[#1E4D3B]'
                              : 'text-[#9AA0A6] hover:text-[#1E4D3B]'
                          }`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteVisit(v.id)}
                        aria-label={`Supprimer la visite ${v.lieu}`}
                        className="p-1.5 rounded text-[#9AA0A6] hover:text-red-700 hover:bg-[#ECEAE2] transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* SECTION 2 : NOUVELLES PERSONNES RENCONTRÉES */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-serif text-lg font-semibold text-[#1C1F22]">
                  02. Nouvelles personnes rencontrées
                </h3>
                <p className="text-xs text-[#5C6268]">
                  Voisins de camping, habitants, producteurs ou voyageurs croisés sur la route.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPerson((prev) => !prev)}
                className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1E4D3B] bg-[#1E4D3B]/8 hover:bg-[#1E4D3B]/15 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {showAddPerson ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {showAddPerson ? 'Fermer' : 'Ajouter une rencontre'}
              </button>
            </div>

            {showAddPerson && (
              <form
                onSubmit={handleAddPerson}
                className="no-print bg-[#F3F2ED] border border-[#DCD9D0] rounded-lg p-4 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-medium text-[#4E545A]">Prénom &amp; Nom *</span>
                    <input
                      type="text"
                      required
                      value={personNom}
                      onChange={(e) => setPersonNom(e.target.value)}
                      placeholder="Ex. Claire & Bernard"
                      className="mt-1 w-full px-3 py-2 text-sm bg-white border border-[#DCD9D0] rounded-md text-[#1C1F22] focus:outline-none focus:border-[#1E4D3B]"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-[#4E545A]">Origine / Ville</span>
                    <input
                      type="text"
                      value={personOrigine}
                      onChange={(e) => setPersonOrigine(e.target.value)}
                      placeholder="Ex. Annecy, Belgique..."
                      className="mt-1 w-full px-3 py-2 text-sm bg-white border border-[#DCD9D0] rounded-md text-[#1C1F22] focus:outline-none focus:border-[#1E4D3B]"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-medium text-[#4E545A]">
                      Contexte de la rencontre
                    </span>
                    <input
                      type="text"
                      value={personContexte}
                      onChange={(e) => setPersonContexte(e.target.value)}
                      placeholder="Ex. Voisins d’emplacement, producteur..."
                      className="mt-1 w-full px-3 py-2 text-sm bg-white border border-[#DCD9D0] rounded-md text-[#1C1F22] focus:outline-none focus:border-[#1E4D3B]"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-[#4E545A]">
                      Contact (tél, e-mail, adresse)
                    </span>
                    <input
                      type="text"
                      value={personContact}
                      onChange={(e) => setPersonContact(e.target.value)}
                      placeholder="Facultatif"
                      className="mt-1 w-full px-3 py-2 text-sm bg-white border border-[#DCD9D0] rounded-md text-[#1C1F22] focus:outline-none focus:border-[#1E4D3B]"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-xs font-medium text-[#4E545A]">
                    Souvenir, anecdote ou conseil partagé
                  </span>
                  <textarea
                    rows={2}
                    value={personSouvenir}
                    onChange={(e) => setPersonSouvenir(e.target.value)}
                    placeholder="Un moment convivial, une bonne adresse échangée..."
                    className="mt-1 w-full px-3 py-2 text-sm bg-white border border-[#DCD9D0] rounded-md text-[#1C1F22] focus:outline-none focus:border-[#1E4D3B]"
                  />
                </label>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-medium text-white bg-[#1E4D3B] hover:bg-[#173D2F] rounded-md transition-colors cursor-pointer"
                  >
                    Enregistrer la rencontre
                  </button>
                </div>
              </form>
            )}

            {fiche.rencontres.length === 0 ? (
              <div className="py-5 px-4 rounded-lg bg-[#F5F4EE] border border-[#EAE8E0] text-sm text-[#6E747A]">
                Aucune rencontre notée sur cette étape. Gardez ici le souvenir des personnes qui
                ont marqué votre halte.
              </div>
            ) : (
              <ul className="divide-y divide-[#EAE8E0] border-t border-b border-[#EAE8E0]">
                {fiche.rencontres.map((p) => (
                  <li key={p.id} className="py-3.5 flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <p className="text-sm font-semibold text-[#1C1F22]">{p.nom}</p>
                        {p.origine && <span className="text-xs text-[#5C6268]">· {p.origine}</span>}
                        {p.contexte && (
                          <span className="text-xs text-[#6E747A]">· {p.contexte}</span>
                        )}
                      </div>
                      {p.souvenir && (
                        <p className="text-sm text-[#4E545A] leading-relaxed">{p.souvenir}</p>
                      )}
                      {p.contact && (
                        <p className="text-xs font-mono text-[#1E4D3B] pt-0.5">{p.contact}</p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeletePerson(p.id)}
                      aria-label={`Supprimer ${p.nom}`}
                      className="no-print p-1.5 rounded text-[#9AA0A6] hover:text-red-700 hover:bg-[#ECEAE2] transition-colors shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* SECTION 3 : SOUVENIRS & SAVEURS LOCALES */}
          <div className="space-y-4 pt-3 border-t border-[#EAE8E0]">
            <h3 className="font-serif text-lg font-semibold text-[#1C1F22]">
              03. Carnet d’impressions &amp; saveurs
            </h3>

            <label className="block">
              <span className="text-xs font-medium text-[#4E545A]">
                Meilleur souvenir de cette étape
              </span>
              <textarea
                rows={3}
                value={fiche.meilleurSouvenir}
                onChange={(e) => patch({ meilleurSouvenir: e.target.value })}
                placeholder="Une lumière particulière, un silence au lever du jour, un fou rire..."
                className="notebook-lines mt-1.5 w-full px-3.5 py-2 text-sm bg-white border border-[#DCD9D0] rounded-md text-[#1C1F22] placeholder:text-[#9AA0A6] focus:outline-none focus:border-[#1E4D3B] resize-y"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-[#4E545A]">
                Spécialités goûtées &amp; bonnes adresses locales
              </span>
              <textarea
                rows={3}
                value={fiche.gastronomieAdresse}
                onChange={(e) => patch({ gastronomieAdresse: e.target.value })}
                placeholder="Boulangerie du village, marché, ferme, crêperie ou plat régional..."
                className="notebook-lines mt-1.5 w-full px-3.5 py-2 text-sm bg-white border border-[#DCD9D0] rounded-md text-[#1C1F22] placeholder:text-[#9AA0A6] focus:outline-none focus:border-[#1E4D3B] resize-y"
              />
            </label>
          </div>
        </section>

        {/* ================= AUTOUR DU POINT GPS : VISITES, RANDONNÉES & PLATS ================= */}
        <SuggestionsAlentoursPanel
          fiche={fiche}
          onSaveSuggestions={(suggestionsAlentours) => patch({ suggestionsAlentours })}
          onQuickAddVisit={(lieu, categorie, notes) => {
            const newVisit: VisiteEffectuee = {
              id: `v-${Date.now()}`,
              lieu,
              categorie,
              notes,
              coupDeCoeur: false,
            };
            patch({ visites: [...fiche.visites, newVisit] });
          }}
        />
      </article>

      {/* Bottom Fiche Pagination */}
      <div className="no-print flex items-center justify-between pt-2">
        <button
          type="button"
          disabled={fiche.numero <= 1}
          onClick={() => onSelectFiche(fiche.numero - 1)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#3A3F45] bg-[#FAF9F6] border border-[#DCD9D0] hover:border-[#1C1F22] rounded-md disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          Fiche {fiche.numero > 1 ? padFicheNumber(fiche.numero - 1) : '01'}
        </button>

        <span className="text-xs font-mono text-[#6E747A] tabular-nums">
          Enregistrement automatique local
        </span>

        <button
          type="button"
          disabled={fiche.numero >= 50}
          onClick={() => onSelectFiche(fiche.numero + 1)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#3A3F45] bg-[#FAF9F6] border border-[#DCD9D0] hover:border-[#1C1F22] rounded-md disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          Fiche {fiche.numero < 50 ? padFicheNumber(fiche.numero + 1) : '50'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
