import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import {
  ArrowUpRight,
  Compass,
  Heart,
  Maximize2,
  Route,
  Star,
} from 'lucide-react';
import { FicheDouble } from '../types/carnet';
import { TYPE_ETAPE_LABELS } from '../data/initialCarnet';
import {
  calculateNights,
  formatFrenchDate,
  isFicheFilled,
  padFicheNumber,
} from '../utils/storage';
import { GpsPoint, parseGpsCoordinates } from '../utils/gps';

interface CarteViewProps {
  fiches: FicheDouble[];
  onOpenFiche: (numero: number) => void;
}

interface MappedEtape {
  fiche: FicheDouble;
  position: GpsPoint;
}

const DEFAULT_FRANCE_CENTER: GpsPoint = { lat: 46.6034, lng: 2.2137 };

export function CarteView({ fiches, onOpenFiche }: CarteViewProps) {
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [showItinerary, setShowItinerary] = useState(true);
  const [selectedFicheNum, setSelectedFicheNum] = useState<number | null>(null);
  const [fitTrigger, setFitTrigger] = useState(0);

  const { mappedAll, unmappedFilled } = useMemo(() => {
    const mapped: MappedEtape[] = [];
    const unmapped: FicheDouble[] = [];

    fiches.forEach((fiche) => {
      const point = parseGpsCoordinates(fiche.coordonneesGps);
      if (point) {
        mapped.push({ fiche, position: point });
      } else if (isFicheFilled(fiche)) {
        unmapped.push(fiche);
      }
    });

    return { mappedAll: mapped, unmappedFilled: unmapped };
  }, [fiches]);

  const displayedEtapes = useMemo(() => {
    if (!onlyFavorites) return mappedAll;
    return mappedAll.filter((item) => item.fiche.coupDeCoeur);
  }, [mappedAll, onlyFavorites]);

  const selectedEtape = useMemo(
    () => displayedEtapes.find((item) => item.fiche.numero === selectedFicheNum) || null,
    [displayedEtapes, selectedFicheNum]
  );

  const handleSelectEtape = useCallback((numero: number | null) => {
    setSelectedFicheNum(numero);
  }, []);

  const handleRecenterAll = () => {
    setSelectedFicheNum(null);
    setFitTrigger((n) => n + 1);
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & Controls */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-[#DFDDD4]">
        <div className="space-y-1.5 max-w-2xl">
          <p className="text-xs font-mono text-[#5C6268] tabular-nums">
            {mappedAll.length} étape{mappedAll.length > 1 ? 's' : ''} géolocalisée
            {mappedAll.length > 1 ? 's' : ''} sur 50 fiches
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#1C1F22]">
            Carte des étapes
          </h1>
          <p className="text-sm sm:text-[15px] text-[#4E545A] leading-relaxed">
            Visualisez l’ensemble de vos haltes positionnées automatiquement à partir des
            coordonnées GPS renseignées sur chaque fiche double.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            role="tablist"
            aria-label="Filtrer les étapes sur la carte"
            className="inline-flex items-center p-1 bg-[#E9E7DF] rounded-lg"
          >
            <button
              type="button"
              role="tab"
              aria-selected={!onlyFavorites}
              onClick={() => {
                setOnlyFavorites(false);
                setFitTrigger((n) => n + 1);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                !onlyFavorites
                  ? 'bg-[#FAF9F6] text-[#1C1F22] shadow-xs'
                  : 'text-[#5C6268] hover:text-[#1C1F22]'
              }`}
            >
              Toutes ({mappedAll.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={onlyFavorites}
              onClick={() => {
                setOnlyFavorites(true);
                setFitTrigger((n) => n + 1);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                onlyFavorites
                  ? 'bg-[#FAF9F6] text-[#1C1F22] shadow-xs'
                  : 'text-[#5C6268] hover:text-[#1C1F22]'
              }`}
            >
              Coups de cœur ({mappedAll.filter((m) => m.fiche.coupDeCoeur).length})
            </button>
          </div>

          {displayedEtapes.length > 1 && (
            <button
              type="button"
              onClick={() => setShowItinerary((prev) => !prev)}
              aria-pressed={showItinerary}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border transition-colors whitespace-nowrap cursor-pointer ${
                showItinerary
                  ? 'bg-[#1E4D3B] text-white border-[#1E4D3B]'
                  : 'bg-[#FAF9F6] text-[#3A3F45] border-[#DCD9D0] hover:border-[#1E4D3B]'
              }`}
            >
              <Route className="w-3.5 h-3.5" />
              Relier les étapes
            </button>
          )}

          {displayedEtapes.length > 0 && (
            <button
              type="button"
              onClick={handleRecenterAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#3A3F45] bg-[#FAF9F6] border border-[#DCD9D0] hover:border-[#1C1F22] rounded-md transition-colors whitespace-nowrap cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Tout cadrer
            </button>
          )}
        </div>
      </section>

      {/* Main Split Layout: Companion Stop List + Interactive map (OpenStreetMap) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Sidebar: Geolocated Stops List */}
        <aside className="lg:col-span-4 bg-[#FAF9F6] border border-[#E2E0D8] rounded-xl flex flex-col overflow-hidden max-h-[640px]">
          <div className="px-5 py-4 border-b border-[#EAE8E0] flex items-center justify-between gap-2">
            <h2 className="font-serif text-lg font-semibold text-[#1C1F22]">
              Étapes sur la carte
            </h2>
            <span className="font-mono text-xs tabular-nums text-[#5C6268]">
              {displayedEtapes.length} point{displayedEtapes.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#EFECE4]">
            {displayedEtapes.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <Compass className="w-7 h-7 text-[#82888E] mx-auto" strokeWidth={1.5} />
                <p className="font-serif text-base text-[#1C1F22]">
                  {onlyFavorites
                    ? 'Aucun coup de cœur géolocalisé.'
                    : 'Aucune étape géolocalisée pour le moment.'}
                </p>
                <p className="text-xs text-[#5C6268] leading-relaxed">
                  Ajoutez des coordonnées GPS sur une fiche double (ou cliquez sur le bouton cible
                  GPS) pour la voir apparaître automatiquement ici.
                </p>
              </div>
            ) : (
              displayedEtapes.map(({ fiche }) => {
                const isSelected = selectedFicheNum === fiche.numero;
                const nights = calculateNights(fiche.dateArrivee, fiche.dateDepart);
                return (
                  <div
                    key={fiche.numero}
                    className={`p-4 transition-colors ${
                      isSelected ? 'bg-[#1E4D3B]/8' : 'hover:bg-[#F3F2ED]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectEtape(fiche.numero)}
                      className="w-full text-left space-y-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#1E4D3B] rounded"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs font-mono tabular-nums text-[#5C6268]">
                        <span className={isSelected ? 'text-[#1E4D3B] font-semibold' : ''}>
                          Fiche {padFicheNumber(fiche.numero)}
                        </span>
                        <div className="flex items-center gap-2">
                          {fiche.note > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[#9A6820]">
                              <Star className="w-3 h-3 fill-[#B47B2B] text-[#B47B2B]" />
                              {fiche.note}/5
                            </span>
                          )}
                          {fiche.coupDeCoeur && (
                            <Heart className="w-3.5 h-3.5 fill-[#1E4D3B] text-[#1E4D3B]" />
                          )}
                        </div>
                      </div>

                      <p className="font-serif text-[15px] font-semibold text-[#1C1F22] leading-snug">
                        {fiche.nomAire || fiche.commune || `Étape ${padFicheNumber(fiche.numero)}`}
                      </p>

                      <p className="text-xs text-[#5C6268] truncate">
                        {[fiche.commune, fiche.regionPays].filter(Boolean).join(' · ') ||
                          TYPE_ETAPE_LABELS[fiche.typeEtape]}
                      </p>

                      <div className="flex items-center justify-between gap-2 pt-1 text-[11px] font-mono text-[#6E747A] tabular-nums">
                        <span className="truncate">{fiche.coordonneesGps}</span>
                        {fiche.dateArrivee && (
                          <span className="shrink-0">
                            {formatFrenchDate(fiche.dateArrivee)}
                            {nights !== null ? ` · ${nights} n.` : ''}
                          </span>
                        )}
                      </div>
                    </button>

                    <div className="mt-2.5 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onOpenFiche(fiche.numero)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#1E4D3B] hover:underline cursor-pointer"
                      >
                        Ouvrir la fiche
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {unmappedFilled.length > 0 && (
            <div className="px-5 py-3.5 bg-[#F3F2ED] border-t border-[#E2E0D8] space-y-2">
              <p className="text-xs font-medium text-[#3A3F45]">
                Fiches complétées sans coordonnées GPS ({unmappedFilled.length})
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {unmappedFilled.map((f) => (
                  <button
                    key={f.numero}
                    type="button"
                    onClick={() => onOpenFiche(f.numero)}
                    className="text-xs text-[#1E4D3B] hover:underline cursor-pointer"
                  >
                    Fiche {padFicheNumber(f.numero)}
                    {f.commune ? ` (${f.commune})` : ''}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Right Panel: Interactive OpenStreetMap map (free, no API key) */}
        <div className="lg:col-span-8 bg-[#FAF9F6] border border-[#E2E0D8] rounded-xl overflow-hidden h-[500px] sm:h-[560px] lg:h-[640px] relative z-0">
          <InteractiveMap
            etapes={displayedEtapes}
            selectedEtape={selectedEtape}
            showItinerary={showItinerary}
            fitTrigger={fitTrigger}
            onSelectEtape={handleSelectEtape}
            onOpenFiche={onOpenFiche}
          />
        </div>
      </section>
    </div>
  );
}

interface InteractiveMapProps {
  etapes: MappedEtape[];
  selectedEtape: MappedEtape | null;
  showItinerary: boolean;
  fitTrigger: number;
  onSelectEtape: (numero: number | null) => void;
  onOpenFiche: (numero: number) => void;
}

function InteractiveMap({
  etapes,
  selectedEtape,
  showItinerary,
  fitTrigger,
  onSelectEtape,
  onOpenFiche,
}: InteractiveMapProps) {
  return (
    <MapContainer
      center={DEFAULT_FRANCE_CENTER}
      zoom={6}
      scrollWheelZoom
      style={{ width: '100%', height: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        subdomains={['a', 'b', 'c']}
        maxZoom={19}
      />

      <MapViewportController etapes={etapes} selectedEtape={selectedEtape} fitTrigger={fitTrigger} />
      <MapClickDeselect onDeselect={() => onSelectEtape(null)} />

      {showItinerary && etapes.length > 1 && (
        <Polyline
          positions={etapes.map((item) => item.position)}
          pathOptions={{ color: '#1E4D3B', weight: 2.5, opacity: 0.75, dashArray: '6 8' }}
        />
      )}

      {etapes.map((item) => (
        <EtapeMarker
          key={item.fiche.numero}
          etape={item}
          isSelected={selectedEtape?.fiche.numero === item.fiche.numero}
          onSelect={() => onSelectEtape(item.fiche.numero)}
          onClose={() => onSelectEtape(null)}
          onOpenFiche={() => onOpenFiche(item.fiche.numero)}
        />
      ))}
    </MapContainer>
  );
}

function MapClickDeselect({ onDeselect }: { onDeselect: () => void }) {
  useMapEvents({ click: onDeselect });
  return null;
}

function MapViewportController({
  etapes,
  selectedEtape,
  fitTrigger,
}: {
  etapes: MappedEtape[];
  selectedEtape: MappedEtape | null;
  fitTrigger: number;
}) {
  const map = useMap();

  // Fit all geolocated stops when mounting, changing filter, or clicking "Tout cadrer"
  useEffect(() => {
    if (etapes.length === 0) {
      map.setView(DEFAULT_FRANCE_CENTER, 6);
      return;
    }
    if (etapes.length === 1) {
      map.setView(etapes[0].position, 11);
      return;
    }
    const bounds = L.latLngBounds(etapes.map((item) => [item.position.lat, item.position.lng]));
    map.fitBounds(bounds, { padding: [64, 64] });
  }, [map, etapes.length, fitTrigger]);

  // Smoothly focus when selecting an étape from the list or marker
  useEffect(() => {
    if (!selectedEtape) return;
    const zoom = Math.max(map.getZoom(), 10);
    map.flyTo(selectedEtape.position, zoom, { duration: 0.6 });
  }, [map, selectedEtape]);

  return null;
}

function markerIcon(numLabel: string, isSelected: boolean, coupDeCoeur: boolean): L.DivIcon {
  const size = isSelected ? 36 : 32;
  const bg = isSelected ? '#1C1F22' : coupDeCoeur ? '#B47B2B' : '#1E4D3B';
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
    html: `<div style="width:${size}px;height:${size}px;background:${bg};color:#fff;border:2px solid #fff;border-radius:9999px;display:flex;align-items:center;justify-content:center;font:600 12px 'IBM Plex Mono',monospace;box-shadow:0 2px 6px rgba(0,0,0,.3)">${numLabel}</div>`,
  });
}

function EtapeMarker({
  etape,
  isSelected,
  onSelect,
  onClose,
  onOpenFiche,
}: {
  etape: MappedEtape;
  isSelected: boolean;
  onSelect: () => void;
  onClose: () => void;
  onOpenFiche: () => void;
}) {
  const markerRef = useRef<L.Marker | null>(null);
  const { fiche, position } = etape;
  const numLabel = padFicheNumber(fiche.numero);
  const nights = calculateNights(fiche.dateArrivee, fiche.dateDepart);
  const icon = useMemo(
    () => markerIcon(numLabel, isSelected, fiche.coupDeCoeur),
    [numLabel, isSelected, fiche.coupDeCoeur]
  );

  // Keep the popup in sync with the selection made from the side list
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    if (isSelected) marker.openPopup();
    else marker.closePopup();
  }, [isSelected]);

  return (
    <Marker
      ref={markerRef}
      position={position}
      icon={icon}
      title={`Fiche ${numLabel} — ${fiche.nomAire || fiche.commune || 'Étape'}`}
      zIndexOffset={isSelected ? 1000 : fiche.coupDeCoeur ? 500 : 0}
      eventHandlers={{
        click: onSelect,
        popupclose: () => {
          if (isSelected) onClose();
        },
      }}
    >
      <Popup maxWidth={290}>
        <div className="space-y-2 text-[#1C1F22] font-sans">
          <div className="flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums text-[#5C6268]">
            <span>Fiche {numLabel} / 50</span>
            {fiche.note > 0 && (
              <span className="text-[#9A6820] font-medium">{fiche.note} / 5 ★</span>
            )}
          </div>

          <div>
            <h3 className="font-serif text-base font-semibold leading-snug text-[#1C1F22]">
              {fiche.nomAire || fiche.commune || `Étape ${numLabel}`}
            </h3>
            <p className="text-xs text-[#5C6268] mt-0.5">
              {[fiche.commune, fiche.regionPays].filter(Boolean).join(' · ') ||
                TYPE_ETAPE_LABELS[fiche.typeEtape]}
            </p>
          </div>

          <p className="text-[11px] font-mono text-[#5C6268] tabular-nums">
            {fiche.dateArrivee ? formatFrenchDate(fiche.dateArrivee) : 'Date libre'}
            {nights !== null ? ` · ${nights} nuit${nights > 1 ? 's' : ''}` : ''}
            {' · '}
            {fiche.visites.length} vis. · {fiche.rencontres.length} renc.
          </p>

          {fiche.descriptionAire && (
            <p className="text-xs text-[#3A3F45] line-clamp-2 leading-relaxed">
              {fiche.descriptionAire}
            </p>
          )}

          <div className="pt-1.5 border-t border-[#EAE8E0]">
            <button
              type="button"
              onClick={onOpenFiche}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#1E4D3B] hover:underline cursor-pointer"
            >
              Ouvrir la fiche double
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
