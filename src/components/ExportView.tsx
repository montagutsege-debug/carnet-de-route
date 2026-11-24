import { ReactNode, useMemo, useState } from 'react';
import { FileDown, Heart, Star } from 'lucide-react';
import { CarnetData, FicheDouble, RevenirChoix } from '../types/carnet';
import {
  CHECKLIST_CATEGORIES,
  HERO_IMAGE_PATH,
  METEO_LABELS,
  SERVICE_LABELS,
  TYPE_ETAPE_LABELS,
} from '../data/initialCarnet';
import { calculateNights, formatFrenchDate, padFicheNumber } from '../utils/storage';
import { fichesDansLOrdre } from '../utils/bilan';
import { BilanView } from './BilanView';

const REVENIR_LABELS: Record<Exclude<RevenirChoix, ''>, string> = {
  oui: 'Oui, sans hésiter',
  'peut-etre': 'Peut-être',
  non: 'Non',
};

interface ExportViewProps {
  carnet: CarnetData;
}

export function ExportView({ carnet }: ExportViewProps) {
  const [avecBilan, setAvecBilan] = useState(true);
  const [avecPhotos, setAvecPhotos] = useState(true);
  const [avecChecklist, setAvecChecklist] = useState(false);

  const fiches = useMemo(() => fichesDansLOrdre(carnet.fiches), [carnet.fiches]);
  const couverture =
    fiches.find((f) => f.coupDeCoeur && f.photos.length > 0)?.photos[0].url ??
    fiches.find((f) => f.photos.length > 0)?.photos[0].url ??
    HERO_IMAGE_PATH;
  const pages = 1 + (avecBilan ? 1 : 0) + fiches.length + (avecChecklist ? 1 : 0);

  return (
    <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 space-y-8">
      {/* Options (not printed) */}
      <section className="no-print space-y-5 pb-6 border-b border-[#DFDDD4]">
        <div className="space-y-1.5">
          <p className="text-xs font-mono text-[#5C6268] tabular-nums">
            {fiches.length} fiche{fiches.length > 1 ? 's' : ''} remplie{fiches.length > 1 ? 's' : ''} · environ {pages} page{pages > 1 ? 's' : ''} A4
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#1C1F22]">
            Exporter le carnet en PDF
          </h1>
          <p className="text-sm sm:text-[15px] text-[#4E545A] leading-relaxed max-w-2xl">
            Aperçu ci-dessous. Cliquez sur le bouton, puis dans la fenêtre d’impression choisissez
            « Enregistrer au format PDF » (Mac : menu « PDF » en bas à gauche ; iPad : touchez
            l’icône Partager, puis « Enregistrer dans Fichiers »).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Option label="Bilan du voyage" checked={avecBilan} onChange={setAvecBilan} />
          <Option label="Photos" checked={avecPhotos} onChange={setAvecPhotos} />
          <Option label="Check-liste de départ" checked={avecChecklist} onChange={setAvecChecklist} />
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          disabled={fiches.length === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#1E4D3B] hover:bg-[#173D2F] disabled:opacity-50 rounded-md transition-colors cursor-pointer"
        >
          <FileDown className="w-4 h-4" />
          Enregistrer en PDF / Imprimer
        </button>
        {fiches.length === 0 && (
          <p className="text-sm text-[#9A6820]">Remplissez au moins une fiche pour l’exporter.</p>
        )}
      </section>

      {/* Printable document */}
      <div className="carnet-print space-y-8">
        <Page>
          <div className="h-full flex flex-col justify-between gap-8">
            <div className="space-y-4">
              <p className="text-xs font-mono tracking-wide text-[#5C6268]">
                Carnet de route · {fiches.length} étape{fiches.length > 1 ? 's' : ''}
              </p>
              <h1 className="font-serif text-4xl sm:text-5xl font-semibold leading-tight text-[#1C1F22]">
                {carnet.profile.titreCarnet}
              </h1>
              <p className="text-base text-[#3A3F45]">
                {[carnet.profile.equipage, carnet.profile.vehicule, carnet.profile.saison]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <div className="aspect-[4/3] rounded-lg overflow-hidden bg-[#E9E7DF]">
              {avecPhotos && (
                <img src={couverture} alt="" className="w-full h-full object-cover" />
              )}
            </div>
            {fiches.length > 0 && (
              <ol className="text-sm text-[#3A3F45] columns-2 gap-8">
                {fiches.map((f) => (
                  <li key={f.numero} className="break-inside-avoid py-0.5">
                    <span className="font-mono text-xs text-[#82888E] tabular-nums">
                      {padFicheNumber(f.numero)}
                    </span>{' '}
                    {f.nomAire || f.commune || 'Étape'}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </Page>

        {avecBilan && fiches.length > 0 && (
          <Page>
            <BilanView carnet={carnet} pourImpression />
          </Page>
        )}

        {fiches.map((fiche) => (
          <Page key={fiche.numero}>
            <FicheImprimee fiche={fiche} avecPhotos={avecPhotos} />
          </Page>
        ))}

        {avecChecklist && (
          <Page>
            <h2 className="font-serif text-3xl font-semibold text-[#1C1F22] mb-6">
              Check-liste de départ
            </h2>
            <div className="columns-1 sm:columns-2 gap-8">
              {CHECKLIST_CATEGORIES.map((cat) => {
                const items = carnet.checklist.filter((i) => i.category === cat.id);
                if (items.length === 0) return null;
                return (
                  <div key={cat.id} className="break-inside-avoid mb-5">
                    <h3 className="font-serif text-base font-semibold text-[#1C1F22] mb-1.5">
                      {cat.titre}
                    </h3>
                    <ul className="space-y-1">
                      {items.map((item) => (
                        <li key={item.id} className="flex items-start gap-2 text-sm text-[#3A3F45]">
                          <span
                            aria-hidden="true"
                            className="mt-0.5 w-3.5 h-3.5 shrink-0 rounded-sm border border-[#82888E] text-[10px] leading-3 text-center"
                          >
                            {item.checked ? '✓' : ''}
                          </span>
                          {item.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </Page>
        )}
      </div>
    </div>
  );
}

function Option({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-[#1C1F22] cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-[#1E4D3B]"
      />
      {label}
    </label>
  );
}

/** One A4 sheet: a white card on screen, a page of its own when printed. */
function Page({ children }: { children: ReactNode }) {
  return (
    <section className="print-page bg-white border border-[#E2E0D8] rounded-lg shadow-sm p-6 sm:p-10">
      {children}
    </section>
  );
}

function FicheImprimee({ fiche, avecPhotos }: { fiche: FicheDouble; avecPhotos: boolean }) {
  const nuits = calculateNights(fiche.dateArrivee, fiche.dateDepart);
  const services = SERVICE_LABELS.filter((s) => fiche.services[s.key]).map((s) => s.label);
  const dates = [
    fiche.dateArrivee && formatFrenchDate(fiche.dateArrivee),
    fiche.dateDepart && formatFrenchDate(fiche.dateDepart),
  ]
    .filter(Boolean)
    .join(' → ');

  const infos: [string, string][] = [
    ['Dates', dates + (nuits !== null ? ` (${nuits} nuit${nuits > 1 ? 's' : ''})` : '')],
    ['Type de halte', TYPE_ETAPE_LABELS[fiche.typeEtape]],
    ['Tarif / nuit', fiche.tarifNuit ? `${fiche.tarifNuit}${/\d$/.test(fiche.tarifNuit.trim()) ? ' €' : ''}` : ''],
    ['Compteur', fiche.kilometrage ? `${fiche.kilometrage} km` : ''],
    ['Météo', fiche.meteo ? METEO_LABELS[fiche.meteo] : ''],
    ['GPS', fiche.coordonneesGps],
    ['Y revenir ?', fiche.revenir ? REVENIR_LABELS[fiche.revenir] : ''],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <article className="space-y-6 text-[#1C1F22]">
      <header className="flex items-start justify-between gap-4 pb-4 border-b border-[#E2E0D8]">
        <div className="min-w-0">
          <p className="text-xs font-mono text-[#5C6268] tabular-nums">
            Fiche {padFicheNumber(fiche.numero)} / 50
          </p>
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold leading-tight">
            {fiche.nomAire || fiche.commune || `Étape ${padFicheNumber(fiche.numero)}`}
          </h2>
          <p className="text-sm text-[#5C6268]">
            {[fiche.commune, fiche.regionPays].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="shrink-0 text-right space-y-1">
          {fiche.note > 0 && (
            <p className="inline-flex items-center gap-0.5" aria-label={`Note ${fiche.note} sur 5`}>
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${i < fiche.note ? 'fill-[#B47B2B] text-[#B47B2B]' : 'text-[#CECBC0]'}`}
                />
              ))}
            </p>
          )}
          {fiche.coupDeCoeur && (
            <p className="flex items-center justify-end gap-1 text-xs font-medium text-[#1E4D3B]">
              <Heart className="w-3.5 h-3.5 fill-[#1E4D3B]" /> Coup de cœur
            </p>
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            {infos.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-[#6E747A]">{k}</dt>
                <dd className="text-[#1C1F22]">{v}</dd>
              </div>
            ))}
          </dl>
          {services.length > 0 && (
            <p className="text-sm text-[#3A3F45]">
              <span className="text-[#6E747A]">Services : </span>
              {services.join(' · ')}
            </p>
          )}
          {fiche.descriptionAire && <Bloc titre="L’aire">{fiche.descriptionAire}</Bloc>}
        </div>

        {avecPhotos && fiche.photos.length > 0 && (
          <div className="grid grid-cols-2 gap-2 content-start">
            {fiche.photos.map((p, i) => (
              <figure key={p.id} className={`break-inside-avoid ${i === 0 ? 'col-span-2' : ''}`}>
                <img
                  src={p.url}
                  alt={p.legende || ''}
                  className="w-full aspect-[4/3] object-cover rounded"
                />
                {p.legende && (
                  <figcaption className="mt-1 text-[11px] italic text-[#5C6268]">{p.legende}</figcaption>
                )}
              </figure>
            ))}
          </div>
        )}
      </div>

      {fiche.visites.length > 0 && (
        <section className="space-y-2 break-inside-avoid">
          <h3 className="font-serif text-lg font-semibold">Visites effectuées</h3>
          <ul className="space-y-2">
            {fiche.visites.map((v) => (
              <li key={v.id} className="text-sm">
                <span className="font-medium">{v.lieu}</span>
                <span className="text-[#6E747A]"> · {v.categorie}{v.coupDeCoeur ? ' · coup de cœur' : ''}</span>
                {v.notes && <p className="text-[#3A3F45]">{v.notes}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {fiche.rencontres.length > 0 && (
        <section className="space-y-2 break-inside-avoid">
          <h3 className="font-serif text-lg font-semibold">Nouvelles personnes rencontrées</h3>
          <ul className="space-y-2">
            {fiche.rencontres.map((r) => (
              <li key={r.id} className="text-sm">
                <span className="font-medium">{r.nom}</span>
                {r.origine && <span className="text-[#6E747A]"> · {r.origine}</span>}
                {r.contexte && <p className="text-[#5C6268]">{r.contexte}</p>}
                {r.souvenir && <p className="text-[#3A3F45]">{r.souvenir}</p>}
                {r.contact && <p className="font-mono text-xs text-[#5C6268]">{r.contact}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {(fiche.meilleurSouvenir || fiche.gastronomieAdresse) && (
        <div className="grid grid-cols-2 gap-6">
          {fiche.meilleurSouvenir && <Bloc titre="Meilleur souvenir">{fiche.meilleurSouvenir}</Bloc>}
          {fiche.gastronomieAdresse && (
            <Bloc titre="Saveurs & bonnes adresses">{fiche.gastronomieAdresse}</Bloc>
          )}
        </div>
      )}
    </article>
  );
}

function Bloc({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <div className="space-y-1 break-inside-avoid">
      <h3 className="text-xs font-medium uppercase tracking-wide text-[#6E747A]">{titre}</h3>
      <p className="text-sm leading-relaxed whitespace-pre-line text-[#1C1F22]">{children}</p>
    </div>
  );
}
