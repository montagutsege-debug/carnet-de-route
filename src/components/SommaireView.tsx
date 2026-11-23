import { ChangeEvent, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Download,
  Heart,
  Pencil,
  Search,
  Star,
  Upload,
} from 'lucide-react';
import { CarnetData, CarnetProfile, FicheDouble } from '../types/carnet';
import { HERO_IMAGE_PATH, TYPE_ETAPE_LABELS } from '../data/initialCarnet';
import {
  calculateNights,
  formatFrenchDate,
  isFicheFilled,
  padFicheNumber,
} from '../utils/storage';
import { ResilientImage } from './ResilientImage';

interface SommaireViewProps {
  carnet: CarnetData;
  onOpenFiche: (numero: number) => void;
  onOpenNextBlankFiche: () => void;
  onOpenChecklist: () => void;
  onUpdateProfile: (profile: CarnetProfile) => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
  importMessage: { type: 'success' | 'error'; text: string } | null;
}

type FilterMode = 'toutes' | 'completees' | 'vierges' | 'favoris';

export function SommaireView({
  carnet,
  onOpenFiche,
  onOpenNextBlankFiche,
  onOpenChecklist,
  onUpdateProfile,
  onExportJson,
  onImportJson,
  importMessage,
}: SommaireViewProps) {
  const [filter, setFilter] = useState<FilterMode>('toutes');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProfile, setEditingProfile] = useState(false);
  const [draftProfile, setDraftProfile] = useState<CarnetProfile>(carnet.profile);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => {
    let completed = 0;
    let totalNights = 0;
    let totalVisites = 0;
    let totalRencontres = 0;

    carnet.fiches.forEach((f) => {
      if (isFicheFilled(f)) completed += 1;
      const nights = calculateNights(f.dateArrivee, f.dateDepart);
      if (nights !== null) totalNights += nights;
      totalVisites += f.visites.length;
      totalRencontres += f.rencontres.length;
    });

    const checklistTotal = carnet.checklist.length;
    const checklistChecked = carnet.checklist.filter((c) => c.checked).length;
    const checklistPct =
      checklistTotal > 0 ? Math.round((checklistChecked / checklistTotal) * 100) : 0;

    return {
      completed,
      totalNights,
      totalVisites,
      totalRencontres,
      checklistPct,
      checklistChecked,
      checklistTotal,
    };
  }, [carnet]);

  const filteredFiches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return carnet.fiches.filter((fiche) => {
      const filled = isFicheFilled(fiche);
      if (filter === 'completees' && !filled) return false;
      if (filter === 'vierges' && filled) return false;
      if (filter === 'favoris' && !fiche.coupDeCoeur) return false;

      if (!q) return true;
      const numStr = padFicheNumber(fiche.numero);
      const haystack = [
        numStr,
        fiche.nomAire,
        fiche.commune,
        fiche.regionPays,
        fiche.descriptionAire,
        ...fiche.visites.map((v) => `${v.lieu} ${v.notes}`),
        ...fiche.rencontres.map((r) => `${r.nom} ${r.origine}`),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [carnet.fiches, filter, searchQuery]);

  const handleSaveProfile = () => {
    onUpdateProfile({
      titreCarnet: draftProfile.titreCarnet.trim() || 'Carnet de Route',
      equipage: draftProfile.equipage.trim() || 'Notre équipage',
      vehicule: draftProfile.vehicule.trim() || 'Camping-car / Van',
      saison: draftProfile.saison.trim() || 'Saison 2026',
    });
    setEditingProfile(false);
  };

  const handleFileImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportJson(file);
      e.target.value = '';
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 space-y-10">
      {/* Split-Screen Editorial Cover Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-6 bg-[#FAF9F6] border border-[#E2E0D8] rounded-xl p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
          <div className="space-y-5">
            <p className="text-xs font-mono tracking-wide text-[#5C6268] tabular-nums">
              50 fiches doubles · Édition à compléter
            </p>

            <h1 className="font-serif text-3xl sm:text-4xl lg:text-[42px] font-semibold leading-[1.12] tracking-tight text-[#1C1F22]">
              Gardez une trace vivante de chaque halte et de chaque rencontre.
            </h1>

            <p className="text-[15px] leading-relaxed text-[#4E545A] max-w-[54ch]">
              Complétez au fil des kilomètres vos 50 fiches doubles : à gauche, votre aire de
              camping et ses aspects pratiques ; à droite, les visites effectuées et les nouvelles
              personnes rencontrées. Avant de prendre la route, vérifiez votre check-liste de
              départ.
            </p>

            {/* Editable Cover Identity */}
            <div className="pt-4 border-t border-[#E6E4DC]">
              {!editingProfile ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-[#3A3F45] flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <span className="font-semibold text-[#1C1F22]">{carnet.profile.equipage}</span>
                    <span aria-hidden="true" className="text-[#9AA0A6]">·</span>
                    <span>{carnet.profile.vehicule}</span>
                    <span aria-hidden="true" className="text-[#9AA0A6]">·</span>
                    <span className="font-mono text-xs tabular-nums text-[#5C6268]">
                      {carnet.profile.saison}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDraftProfile(carnet.profile);
                      setEditingProfile(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1E4D3B] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Personnaliser la couverture
                  </button>
                </div>
              ) : (
                <div className="space-y-3 bg-[#F3F2ED] p-4 rounded-lg border border-[#E2E0D8]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs font-medium text-[#4E545A]">Titre du carnet</span>
                      <input
                        type="text"
                        value={draftProfile.titreCarnet}
                        onChange={(e) =>
                          setDraftProfile((p) => ({ ...p, titreCarnet: e.target.value }))
                        }
                        className="mt-1 w-full px-3 py-2 text-sm bg-white border border-[#D8D5CC] rounded-md text-[#1C1F22] focus:outline-none focus:border-[#1E4D3B]"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-[#4E545A]">Équipage / Voyageurs</span>
                      <input
                        type="text"
                        value={draftProfile.equipage}
                        onChange={(e) =>
                          setDraftProfile((p) => ({ ...p, equipage: e.target.value }))
                        }
                        className="mt-1 w-full px-3 py-2 text-sm bg-white border border-[#D8D5CC] rounded-md text-[#1C1F22] focus:outline-none focus:border-[#1E4D3B]"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-[#4E545A]">Véhicule</span>
                      <input
                        type="text"
                        value={draftProfile.vehicule}
                        onChange={(e) =>
                          setDraftProfile((p) => ({ ...p, vehicule: e.target.value }))
                        }
                        className="mt-1 w-full px-3 py-2 text-sm bg-white border border-[#D8D5CC] rounded-md text-[#1C1F22] focus:outline-none focus:border-[#1E4D3B]"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-[#4E545A]">Saison / Année</span>
                      <input
                        type="text"
                        value={draftProfile.saison}
                        onChange={(e) =>
                          setDraftProfile((p) => ({ ...p, saison: e.target.value }))
                        }
                        className="mt-1 w-full px-3 py-2 text-sm bg-white border border-[#D8D5CC] rounded-md text-[#1C1F22] focus:outline-none focus:border-[#1E4D3B]"
                      />
                    </label>
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      className="px-4 py-2 text-xs font-medium text-white bg-[#1E4D3B] hover:bg-[#173D2F] rounded-md transition-colors cursor-pointer"
                    >
                      Enregistrer
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingProfile(false)}
                      className="px-3 py-2 text-xs font-medium text-[#5C6268] hover:text-[#1C1F22] cursor-pointer"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-8">
            <button
              type="button"
              onClick={onOpenNextBlankFiche}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#1E4D3B] hover:bg-[#173D2F] rounded-md transition-colors duration-150 whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E4D3B]"
            >
              Compléter la prochaine fiche
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onOpenChecklist}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#1C1F22] bg-white border border-[#D8D5CC] hover:border-[#1E4D3B] hover:text-[#1E4D3B] rounded-md transition-colors duration-150 whitespace-nowrap cursor-pointer"
            >
              Check-liste de départ ({stats.checklistPct} %)
            </button>
          </div>
        </div>

        <div className="lg:col-span-6 rounded-xl overflow-hidden border border-[#E2E0D8] min-h-[280px] lg:min-h-[400px]">
          <ResilientImage
            src={HERO_IMAGE_PATH}
            alt="Fourgon aménagé stationné face à la côte bretonne avec carnet de voyage ouvert sur une table en bois"
            fallbackTitle="Carnet de Route — 50 Fiches Doubles"
            containerClassName="w-full h-full"
            className="w-full h-full object-cover"
          />
        </div>
      </section>

      {/* Full-width 5-Column Summary Strip below Hero */}
      <section
        aria-label="Résumé du carnet"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 py-6 border-y border-[#DFDDD4]"
      >
        <div>
          <p className="text-xs text-[#5C6268]">Fiches complétées</p>
          <p className="mt-1 font-mono text-2xl font-medium text-[#1C1F22] tabular-nums">
            {stats.completed}
            <span className="text-sm text-[#7A8086]"> / 50</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-[#5C6268]">Nuits consignées</p>
          <p className="mt-1 font-mono text-2xl font-medium text-[#1C1F22] tabular-nums">
            {stats.totalNights}
          </p>
        </div>
        <div>
          <p className="text-xs text-[#5C6268]">Visites effectuées</p>
          <p className="mt-1 font-mono text-2xl font-medium text-[#1C1F22] tabular-nums">
            {stats.totalVisites}
          </p>
        </div>
        <div>
          <p className="text-xs text-[#5C6268]">Nouvelles personnes</p>
          <p className="mt-1 font-mono text-2xl font-medium text-[#1C1F22] tabular-nums">
            {stats.totalRencontres}
          </p>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <p className="text-xs text-[#5C6268]">Check-liste de départ</p>
          <p className="mt-1 font-mono text-2xl font-medium text-[#1E4D3B] tabular-nums">
            {stats.checklistChecked}
            <span className="text-sm text-[#7A8086]"> / {stats.checklistTotal}</span>
          </p>
        </div>
      </section>

      {/* Sommaire des 50 Fiches Doubles */}
      <section className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#1C1F22]">
              Sommaire des 50 fiches doubles
            </h2>
            <p className="mt-1 text-sm text-[#5C6268]">
              Cliquez sur n’importe quelle fiche numérotée de 01 à 50 pour ouvrir la double page.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onExportJson}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#3A3F45] bg-[#FAF9F6] border border-[#DCD9D0] hover:border-[#1C1F22] rounded-md transition-colors whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Sauvegarder (.json)
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#3A3F45] bg-[#FAF9F6] border border-[#DCD9D0] hover:border-[#1C1F22] rounded-md transition-colors whitespace-nowrap cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Restaurer
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleFileImport}
              className="hidden"
            />
          </div>
        </div>

        {importMessage && (
          <div
            role="status"
            className={`px-4 py-3 text-sm rounded-md border ${
              importMessage.type === 'success'
                ? 'bg-[#1E4D3B]/8 border-[#1E4D3B]/25 text-[#1E4D3B]'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {importMessage.text}
          </div>
        )}

        {/* Filter Controls & Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div
            role="tablist"
            aria-label="Filtrer les 50 fiches"
            className="inline-flex items-center p-1 bg-[#E9E7DF] rounded-lg self-start overflow-x-auto max-w-full"
          >
            {(
              [
                { id: 'toutes', label: `Toutes (50)` },
                { id: 'completees', label: `Complétées (${stats.completed})` },
                { id: 'vierges', label: `À remplir (${50 - stats.completed})` },
                {
                  id: 'favoris',
                  label: `Coups de cœur (${carnet.fiches.filter((f) => f.coupDeCoeur).length})`,
                },
              ] as { id: FilterMode; label: string }[]
            ).map((tab) => {
              const active = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#FAF9F6] text-[#1C1F22] shadow-xs'
                      : 'text-[#5C6268] hover:text-[#1C1F22]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-[#7A8086] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un lieu, une visite, un prénom..."
              aria-label="Rechercher dans les 50 fiches"
              className="w-full pl-9 pr-3 py-2 text-sm bg-[#FAF9F6] border border-[#DCD9D0] rounded-md text-[#1C1F22] placeholder:text-[#7A8086] focus:outline-none focus:border-[#1E4D3B]"
            />
          </div>
        </div>

        {/* 50-Fiche Editorial Index Grid */}
        {filteredFiches.length === 0 ? (
          <div className="bg-[#FAF9F6] border border-[#E2E0D8] rounded-xl p-10 text-center space-y-2">
            <p className="font-serif text-lg text-[#1C1F22]">
              Aucune fiche ne correspond à votre filtre.
            </p>
            <p className="text-sm text-[#5C6268]">
              Essayez un autre mot-clé ou affichez l’ensemble des 50 fiches.
            </p>
            <button
              type="button"
              onClick={() => {
                setFilter('toutes');
                setSearchQuery('');
              }}
              className="mt-2 inline-flex px-4 py-2 text-xs font-medium text-[#1E4D3B] hover:underline cursor-pointer"
            >
              Afficher les 50 fiches
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredFiches.map((fiche) => (
              <FicheIndexCard
                key={fiche.numero}
                fiche={fiche}
                onOpen={() => onOpenFiche(fiche.numero)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function FicheIndexCard({
  fiche,
  onOpen,
}: {
  fiche: FicheDouble;
  onOpen: () => void;
}) {
  const filled = isFicheFilled(fiche);
  const nights = calculateNights(fiche.dateArrivee, fiche.dateDepart);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group text-left rounded-lg border p-5 transition-all duration-150 cursor-pointer flex flex-col justify-between min-h-[152px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E4D3B] ${
        filled
          ? 'bg-[#FAF9F6] border-[#D8D5CC] hover:border-[#1E4D3B]'
          : 'bg-[#F7F6F1] border-[#E6E4DC] hover:bg-[#FAF9F6] hover:border-[#BFC4BF]'
      }`}
    >
      <div className="space-y-2 w-full">
        <div className="flex items-center justify-between gap-2 text-xs font-mono tabular-nums text-[#5C6268]">
          <span>Fiche {padFicheNumber(fiche.numero)}</span>
          <div className="flex items-center gap-2">
            {fiche.note > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[#9A6820]">
                <Star className="w-3 h-3 fill-[#B47B2B] text-[#B47B2B]" />
                {fiche.note}/5
              </span>
            )}
            {fiche.coupDeCoeur && (
              <Heart
                className="w-3.5 h-3.5 fill-[#1E4D3B] text-[#1E4D3B]"
                aria-label="Coup de cœur"
              />
            )}
          </div>
        </div>

        {filled ? (
          <>
            <h3 className="font-serif text-[17px] font-semibold leading-snug text-[#1C1F22] group-hover:text-[#1E4D3B] transition-colors line-clamp-2">
              {fiche.nomAire || fiche.commune || 'Étape sans titre'}
            </h3>
            <p className="text-xs text-[#5C6268] truncate">
              {[fiche.commune, fiche.regionPays].filter(Boolean).join(' · ') ||
                TYPE_ETAPE_LABELS[fiche.typeEtape]}
            </p>
          </>
        ) : (
          <div className="pt-2">
            <p className="font-serif text-base text-[#7A8086] group-hover:text-[#1C1F22] transition-colors">
              Fiche vierge à compléter
            </p>
            <p className="mt-1 text-xs text-[#8D9297]">
              Aire de camping · Visites · Rencontres
            </p>
          </div>
        )}
      </div>

      <div className="pt-4 mt-4 border-t border-[#EAE8E0] w-full flex items-center justify-between gap-2 text-xs text-[#5C6268]">
        {filled ? (
          <>
            <span className="truncate font-mono tabular-nums">
              {fiche.dateArrivee ? formatFrenchDate(fiche.dateArrivee) : 'Date libre'}
              {nights !== null ? ` · ${nights} n.` : ''}
            </span>
            <span className="shrink-0 tabular-nums">
              {fiche.visites.length} vis. · {fiche.rencontres.length} renc.
            </span>
          </>
        ) : (
          <span className="text-[#1E4D3B] opacity-0 group-hover:opacity-100 transition-opacity font-medium">
            Ouvrir la double page →
          </span>
        )}
      </div>
    </button>
  );
}
