import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Compass,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
} from 'lucide-react';
import {
  CategorieVisite,
  FicheDouble,
  GroundedPlace,
  SuggestionsAlentours,
} from '../types/carnet';
import { parseGpsCoordinates } from '../utils/gps';

interface SuggestionsAlentoursPanelProps {
  fiche: FicheDouble;
  onSaveSuggestions: (suggestions: SuggestionsAlentours) => void;
  onQuickAddVisit: (lieu: string, categorie: CategorieVisite, notes: string) => void;
}

export function SuggestionsAlentoursPanel({
  fiche,
  onSaveSuggestions,
  onQuickAddVisit,
}: SuggestionsAlentoursPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedTitles, setAddedTitles] = useState<Record<string, boolean>>({});

  const parsedPoint = parseGpsCoordinates(fiche.coordonneesGps);
  const currentCoordsKey = parsedPoint
    ? `${parsedPoint.lat.toFixed(4)},${parsedPoint.lng.toFixed(4)}`
    : '';

  const saved = fiche.suggestionsAlentours || null;
  const coordsChanged = Boolean(
    saved && currentCoordsKey && saved.coordinatesKey !== currentCoordsKey
  );

  const handleFetchSuggestions = async () => {
    if (!parsedPoint) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/suggestions-etape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: parsedPoint.lat,
          lng: parsedPoint.lng,
          nomAire: fiche.nomAire,
          commune: fiche.commune,
          regionPays: fiche.regionPays,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        markdown?: string;
        places?: GroundedPlace[];
        coordinatesKey?: string;
        generatedAt?: string;
      };

      if (!response.ok) {
        throw new Error(
          payload.error || 'Impossible de récupérer les suggestions autour de ce point GPS.'
        );
      }

      onSaveSuggestions({
        markdown: payload.markdown || '',
        places: Array.isArray(payload.places) ? payload.places : [],
        coordinatesKey: payload.coordinatesKey || currentCoordsKey,
        generatedAt: payload.generatedAt || new Date().toISOString(),
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de charger les suggestions pour le moment.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlaceToVisits = (place: GroundedPlace) => {
    const alreadyExists = fiche.visites.some(
      (v) => v.lieu.trim().toLowerCase() === place.title.trim().toLowerCase()
    );
    if (!alreadyExists) {
      onQuickAddVisit(place.title, 'Patrimoine', `Repéré autour du point GPS (${place.uri})`);
    }
    setAddedTitles((prev) => ({ ...prev, [place.uri]: true }));
  };

  return (
    <section
      aria-label="Propositions autour du point GPS : visites, randonnées et spécialités"
      className="lg:col-span-2 border-t border-[#E2E0D8] bg-[#F7F6F1] p-6 sm:p-8 lg:p-10 space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#E5E3DA]">
        <div className="space-y-1">
          <p className="text-xs font-mono text-[#5C6268] tabular-nums">
            Carnet d’exploration · Basé sur le point GPS
            {parsedPoint
              ? ` (${parsedPoint.lat.toFixed(4)}, ${parsedPoint.lng.toFixed(4)})`
              : ''}
          </p>
          <h2 className="font-serif text-xl sm:text-2xl font-semibold text-[#1C1F22]">
            À découvrir aux alentours : visites, randonnées &amp; plats locaux
          </h2>
        </div>

        <div className="no-print flex items-center gap-3 shrink-0">
          {parsedPoint ? (
            <button
              type="button"
              disabled={loading}
              onClick={handleFetchSuggestions}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#1E4D3B] hover:bg-[#173D2F] disabled:opacity-60 rounded-md transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E4D3B]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Recherche en cours...
                </>
              ) : saved ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  {coordsChanged ? 'Mettre à jour selon le nouveau GPS' : 'Actualiser les idées'}
                </>
              ) : (
                <>
                  <Compass className="w-3.5 h-3.5" />
                  Proposer visites, randonnées &amp; plats
                </>
              )}
            </button>
          ) : (
            <span className="text-xs text-[#6E747A]">
              Renseignez d’abord les coordonnées GPS ci-dessus
            </span>
          )}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="px-4 py-3 text-sm rounded-md bg-red-50 border border-red-200 text-red-800"
        >
          {error}
        </div>
      )}

      {!saved && !loading && (
        <div className="py-6 px-5 rounded-lg bg-[#FAF9F6] border border-[#E5E3DA] text-sm text-[#4E545A] leading-relaxed">
          {parsedPoint ? (
            <p>
              Cliquez sur{' '}
              <strong className="font-semibold text-[#1C1F22]">
                « Proposer visites, randonnées &amp; plats »
              </strong>{' '}
              pour obtenir des idées de visites incontournables, de randonnées et de spécialités
              culinaires autour du point{' '}
              <span className="font-mono text-xs text-[#1E4D3B]">{fiche.coordonneesGps}</span>.
            </p>
          ) : (
            <p>
              Saisissez des coordonnées GPS sur la page de gauche — ou appuyez sur l’icône cible
              GPS pour insérer votre position actuelle — afin de générer des suggestions de visites
              à faire absolument, de randonnées et de spécialités à goûter dans les environs.
            </p>
          )}
        </div>
      )}

      {loading && !saved && (
        <div className="py-10 px-6 rounded-lg bg-[#FAF9F6] border border-[#E5E3DA] flex flex-col items-center justify-center gap-3 text-center">
          <Loader2 className="w-6 h-6 text-[#1E4D3B] animate-spin" />
          <p className="text-sm font-medium text-[#1C1F22]">
            Recherche des visites incontournables, randonnées et spécialités autour du point GPS...
          </p>
          <p className="text-xs text-[#5C6268]">
            Les résultats seront conservés sur cette fiche. Vérifiez les adresses avant de vous déplacer.
          </p>
        </div>
      )}

      {saved && (
        <div className="space-y-6">
          {coordsChanged && (
            <p className="text-xs text-[#9A6820] bg-[#B47B2B]/10 border border-[#B47B2B]/25 rounded-md px-3.5 py-2">
              Les coordonnées GPS de la fiche ont changé depuis la dernière recherche. Cliquez sur
              « Mettre à jour selon le nouveau GPS » pour rafraîchir les propositions.
            </p>
          )}

          {/* Grounded Markdown Guide */}
          <div className="bg-[#FAF9F6] border border-[#E2E0D8] rounded-lg p-6 text-sm text-[#2C3034] leading-relaxed space-y-4">
            <ReactMarkdown
              components={{
                h2: ({ children }) => (
                  <h3 className="font-serif text-lg font-semibold text-[#1C1F22] pt-2 first:pt-0 border-b border-[#EFECE4] pb-1.5">
                    {children}
                  </h3>
                ),
                h3: ({ children }) => (
                  <h3 className="font-serif text-lg font-semibold text-[#1C1F22] pt-2 first:pt-0 border-b border-[#EFECE4] pb-1.5">
                    {children}
                  </h3>
                ),
                p: ({ children }) => <p className="text-sm text-[#3A3F45] leading-relaxed">{children}</p>,
                ul: ({ children }) => (
                  <ul className="list-disc pl-5 space-y-2 text-sm text-[#3A3F45]">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-5 space-y-2 text-sm text-[#3A3F45]">{children}</ol>
                ),
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                strong: ({ children }) => (
                  <strong className="font-semibold text-[#1C1F22]">{children}</strong>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#1E4D3B] underline hover:text-[#173D2F]"
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {saved.markdown}
            </ReactMarkdown>
          </div>

          {/* Grounded Google Maps Place Links & Quick-Add to Visits */}
          {saved.places.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-serif text-base font-semibold text-[#1C1F22]">
                  Lieux vérifiés sur Google Maps ({saved.places.length})
                </h3>
                <span className="text-xs text-[#6E747A]">
                  Ouvrir sur Maps ou ajouter en un clic à vos visites
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {saved.places.map((place) => {
                  const isAdded =
                    addedTitles[place.uri] ||
                    fiche.visites.some(
                      (v) => v.lieu.trim().toLowerCase() === place.title.trim().toLowerCase()
                    );
                  return (
                    <div
                      key={place.uri}
                      className="bg-[#FAF9F6] border border-[#E2E0D8] rounded-lg p-3.5 flex flex-col justify-between gap-2.5"
                    >
                      <div className="space-y-1.5">
                        <a
                          href={place.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-start gap-1.5 text-sm font-medium text-[#1E4D3B] hover:underline leading-snug"
                        >
                          <span>{place.title}</span>
                          <ExternalLink className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        </a>

                        {place.reviewSnippets && place.reviewSnippets.length > 0 && (
                          <p className="text-xs text-[#5C6268] italic line-clamp-2 leading-relaxed">
                            « {place.reviewSnippets[0]} »
                          </p>
                        )}
                      </div>

                      <div className="no-print pt-2 border-t border-[#EFECE4] flex items-center justify-between gap-2">
                        <a
                          href={place.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-mono text-[#5C6268] hover:text-[#1C1F22]"
                        >
                          Google Maps
                        </a>
                        <button
                          type="button"
                          disabled={isAdded}
                          onClick={() => handleAddPlaceToVisits(place)}
                          className={`inline-flex items-center gap-1 text-xs font-medium transition-colors whitespace-nowrap ${
                            isAdded
                              ? 'text-[#6E747A]'
                              : 'text-[#1E4D3B] hover:underline cursor-pointer'
                          }`}
                        >
                          <Plus className="w-3 h-3" />
                          {isAdded ? 'Ajouté aux visites' : 'Ajouter aux visites'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
