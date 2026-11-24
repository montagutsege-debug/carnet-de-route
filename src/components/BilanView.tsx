import { useMemo } from 'react';
import { ArrowUpRight, Compass, Heart, Star } from 'lucide-react';
import { CarnetData } from '../types/carnet';
import { METEO_LABELS, TYPE_ETAPE_LABELS } from '../data/initialCarnet';
import { calculerBilan, formatEuros, formatKm } from '../utils/bilan';
import { formatFrenchDate, padFicheNumber } from '../utils/storage';

interface BilanViewProps {
  carnet: CarnetData;
  onOpenFiche?: (numero: number) => void;
  /** Compact version without buttons, used in the PDF export. */
  pourImpression?: boolean;
}

export function BilanView({ carnet, onOpenFiche, pourImpression = false }: BilanViewProps) {
  const bilan = useMemo(() => calculerBilan(carnet), [carnet]);

  if (bilan.etapes === 0) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-3">
        <Compass className="w-8 h-8 text-[#82888E] mx-auto" strokeWidth={1.5} />
        <h1 className="font-serif text-2xl font-semibold text-[#1C1F22]">Pas encore de bilan</h1>
        <p className="text-sm text-[#5C6268] max-w-md mx-auto">
          Remplissez au moins une fiche (dates, tarif, compteur, coordonnées GPS) : le bilan de
          votre voyage se calcule tout seul.
        </p>
      </div>
    );
  }

  const periode =
    bilan.dateDebut && bilan.dateFin
      ? `Du ${formatFrenchDate(bilan.dateDebut)} au ${formatFrenchDate(bilan.dateFin)}`
      : '';
  const coutMoyen = bilan.nuitsPayantes > 0 ? bilan.budgetNuits / bilan.nuitsPayantes : null;

  return (
    <div
      className={
        pourImpression
          ? 'space-y-8'
          : 'max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 space-y-10'
      }
    >
      <section className="pb-5 border-b border-[#DFDDD4] space-y-1.5">
        <p className="text-xs font-mono text-[#5C6268] tabular-nums">
          {carnet.profile.titreCarnet}
          {periode ? ` · ${periode}` : ''}
        </p>
        <h1
          className={`font-serif font-semibold text-[#1C1F22] ${pourImpression ? 'text-3xl' : 'text-3xl sm:text-4xl'}`}
        >
          Bilan du voyage
        </h1>
        {!pourImpression && (
          <p className="text-sm sm:text-[15px] text-[#4E545A] leading-relaxed max-w-2xl">
            Calculé automatiquement à partir des fiches remplies : dates, tarifs, relevés du
            compteur et coordonnées GPS.
          </p>
        )}
      </section>

      {/* Key figures */}
      <section
        aria-label="Chiffres clés"
        className={`grid gap-x-6 gap-y-6 pb-8 border-b border-[#DFDDD4] ${
          pourImpression ? 'grid-cols-4' : 'grid-cols-2 lg:grid-cols-4'
        }`}
      >
        <Chiffre libelle="Étapes" valeur={String(bilan.etapes)} detail="fiches remplies" />
        <Chiffre
          libelle="Nuits"
          valeur={String(bilan.nuits)}
          detail={
            bilan.nuitsGratuites > 0
              ? `dont ${bilan.nuitsGratuites} gratuite${bilan.nuitsGratuites > 1 ? 's' : ''}`
              : undefined
          }
        />
        <Chiffre
          libelle="Kilomètres"
          valeur={
            bilan.kmCompteur !== null
              ? formatKm(bilan.kmCompteur)
              : bilan.kmVolOiseau !== null
                ? `≈ ${formatKm(bilan.kmVolOiseau)}`
                : '—'
          }
          detail={
            bilan.kmCompteur !== null
              ? 'relevés du compteur'
              : bilan.kmVolOiseau !== null
                ? 'à vol d’oiseau entre étapes'
                : 'renseignez le compteur'
          }
        />
        <Chiffre
          libelle="Budget nuits"
          valeur={formatEuros(bilan.budgetNuits)}
          detail={
            coutMoyen !== null
              ? `${formatEuros(Math.round(coutMoyen * 100) / 100)} par nuit payante`
              : undefined
          }
        />
        <Chiffre
          libelle="Note moyenne"
          valeur={bilan.noteMoyenne !== null ? `${bilan.noteMoyenne.toFixed(1).replace('.', ',')} / 5` : '—'}
        />
        <Chiffre libelle="Coups de cœur" valeur={String(bilan.coupsDeCoeur)} detail={`${bilan.aRefaire} étape${bilan.aRefaire > 1 ? 's' : ''} à refaire`} />
        <Chiffre libelle="Visites" valeur={String(bilan.visites)} />
        <Chiffre libelle="Rencontres" valeur={String(bilan.rencontres)} detail={`${bilan.photos} photo${bilan.photos > 1 ? 's' : ''}`} />
      </section>

      {bilan.tarifsInconnus > 0 && !pourImpression && (
        <p className="text-xs text-[#6E747A] -mt-6">
          {bilan.tarifsInconnus} étape{bilan.tarifsInconnus > 1 ? 's' : ''} sans tarif lisible
          {bilan.tarifsInconnus > 1 ? ' ne sont' : ' n’est'} pas comptée
          {bilan.tarifsInconnus > 1 ? 's' : ''} dans le budget (indiquez un montant ou « Gratuit »).
        </p>
      )}

      {/* Breakdowns */}
      <section
        className={`grid gap-6 ${pourImpression ? 'grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}
      >
        <Repartition
          titre="Types d’étapes"
          unite="étape"
          lignes={bilan.parType.map((l) => ({ libelle: TYPE_ETAPE_LABELS[l.cle], valeur: l.valeur }))}
        />
        <Repartition
          titre="Météo à l’arrivée"
          unite="étape"
          lignes={bilan.parMeteo.map((l) => ({ libelle: METEO_LABELS[l.cle], valeur: l.valeur }))}
          vide="Aucune météo renseignée."
        />
        <Repartition
          titre="Visites par catégorie"
          unite="visite"
          lignes={bilan.parCategorieVisite.map((l) => ({ libelle: l.cle, valeur: l.valeur }))}
          vide="Aucune visite notée."
        />
      </section>

      <section className={`grid gap-6 ${pourImpression ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
        <div className="bg-[#FAF9F6] border border-[#E2E0D8] rounded-xl p-5 sm:p-6 space-y-3 break-inside-avoid">
          <h2 className="font-serif text-lg font-semibold text-[#1C1F22]">Régions traversées</h2>
          {bilan.regions.length === 0 ? (
            <p className="text-sm text-[#6E747A]">Aucune région renseignée.</p>
          ) : (
            <ul className="divide-y divide-[#EFECE4]">
              {bilan.regions.map((r) => (
                <li key={r.nom} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="text-[#1C1F22]">{r.nom}</span>
                  <span className="font-mono text-xs tabular-nums text-[#5C6268]">
                    {r.etapes} étape{r.etapes > 1 ? 's' : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-[#FAF9F6] border border-[#E2E0D8] rounded-xl p-5 sm:p-6 space-y-3 break-inside-avoid">
          <h2 className="font-serif text-lg font-semibold text-[#1C1F22]">Meilleures étapes</h2>
          {bilan.meilleuresEtapes.length === 0 ? (
            <p className="text-sm text-[#6E747A]">
              Notez vos étapes ou marquez vos coups de cœur pour les retrouver ici.
            </p>
          ) : (
            <ul className="divide-y divide-[#EFECE4]">
              {bilan.meilleuresEtapes.map((f) => (
                <li key={f.numero} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1C1F22] truncate">
                      {f.nomAire || f.commune || `Étape ${padFicheNumber(f.numero)}`}
                    </p>
                    <p className="text-xs text-[#5C6268] flex items-center gap-2">
                      <span className="font-mono tabular-nums">Fiche {padFicheNumber(f.numero)}</span>
                      {f.note > 0 && (
                        <span className="inline-flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-[#B47B2B] text-[#B47B2B]" aria-hidden="true" />
                          {f.note}/5
                        </span>
                      )}
                      {f.coupDeCoeur && (
                        <span className="inline-flex items-center gap-0.5">
                          <Heart className="w-3 h-3 fill-[#1E4D3B] text-[#1E4D3B]" aria-hidden="true" />
                          Coup de cœur
                        </span>
                      )}
                    </p>
                  </div>
                  {onOpenFiche && !pourImpression && (
                    <button
                      type="button"
                      onClick={() => onOpenFiche(f.numero)}
                      className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-[#1E4D3B] hover:underline cursor-pointer"
                    >
                      Ouvrir
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function Chiffre({ libelle, valeur, detail }: { libelle: string; valeur: string; detail?: string }) {
  return (
    <div>
      <p className="text-xs text-[#5C6268]">{libelle}</p>
      <p className="mt-1 font-mono text-2xl font-medium text-[#1C1F22] tabular-nums">{valeur}</p>
      {detail && <p className="mt-0.5 text-xs text-[#6E747A]">{detail}</p>}
    </div>
  );
}

/** One-colour horizontal bars (a single series, so no legend is needed). */
function Repartition({
  titre,
  unite,
  lignes,
  vide = 'Rien à afficher.',
}: {
  titre: string;
  unite: string;
  lignes: { libelle: string; valeur: number }[];
  vide?: string;
}) {
  const max = Math.max(1, ...lignes.map((l) => l.valeur));
  return (
    <div className="bg-[#FAF9F6] border border-[#E2E0D8] rounded-xl p-5 sm:p-6 space-y-4 break-inside-avoid">
      <h2 className="font-serif text-lg font-semibold text-[#1C1F22]">{titre}</h2>
      {lignes.length === 0 ? (
        <p className="text-sm text-[#6E747A]">{vide}</p>
      ) : (
        <ul className="space-y-3">
          {lignes.map((l) => {
            const texte = `${l.libelle} : ${l.valeur} ${unite}${l.valeur > 1 ? 's' : ''}`;
            return (
              <li key={l.libelle} title={texte} className="group">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-[#3A3F45] truncate">{l.libelle}</span>
                  <span className="font-mono text-xs tabular-nums text-[#1C1F22]">{l.valeur}</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-[#ECEAE2]" aria-hidden="true">
                  <div
                    className="h-2 rounded-full bg-[#1E4D3B] group-hover:bg-[#173D2F] transition-colors"
                    style={{ width: `${(l.valeur / max) * 100}%`, printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
                  />
                </div>
                <span className="sr-only">{texte}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
