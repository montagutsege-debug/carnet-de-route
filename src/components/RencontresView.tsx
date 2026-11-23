import { useMemo, useState } from 'react';
import { ArrowUpRight, Heart, Search } from 'lucide-react';
import { FicheDouble, NouvellePersonne, VisiteEffectuee } from '../types/carnet';
import { formatFrenchDate, padFicheNumber } from '../utils/storage';

interface RencontresViewProps {
  fiches: FicheDouble[];
  onOpenFiche: (numero: number) => void;
}

interface PersonneIndexItem {
  personne: NouvellePersonne;
  ficheNumero: number;
  nomAire: string;
  commune: string;
  dateArrivee: string;
}

interface VisiteIndexItem {
  visite: VisiteEffectuee;
  ficheNumero: number;
  nomAire: string;
  commune: string;
  dateArrivee: string;
}

export function RencontresView({ fiches, onOpenFiche }: RencontresViewProps) {
  const [viewMode, setViewMode] = useState<'rencontres' | 'visites'>('rencontres');
  const [query, setQuery] = useState('');

  const allRencontres = useMemo<PersonneIndexItem[]>(() => {
    const list: PersonneIndexItem[] = [];
    fiches.forEach((f) => {
      f.rencontres.forEach((p) => {
        list.push({
          personne: p,
          ficheNumero: f.numero,
          nomAire: f.nomAire,
          commune: f.commune,
          dateArrivee: f.dateArrivee,
        });
      });
    });
    return list;
  }, [fiches]);

  const allVisites = useMemo<VisiteIndexItem[]>(() => {
    const list: VisiteIndexItem[] = [];
    fiches.forEach((f) => {
      f.visites.forEach((v) => {
        list.push({
          visite: v,
          ficheNumero: f.numero,
          nomAire: f.nomAire,
          commune: f.commune,
          dateArrivee: f.dateArrivee,
        });
      });
    });
    return list;
  }, [fiches]);

  const filteredRencontres = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allRencontres;
    return allRencontres.filter((item) =>
      [
        item.personne.nom,
        item.personne.origine,
        item.personne.contexte,
        item.personne.souvenir,
        item.nomAire,
        item.commune,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [allRencontres, query]);

  const filteredVisites = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allVisites;
    return allVisites.filter((item) =>
      [
        item.visite.lieu,
        item.visite.categorie,
        item.visite.notes,
        item.nomAire,
        item.commune,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [allVisites, query]);

  return (
    <div className="max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 space-y-8">
      <section className="space-y-2 max-w-2xl">
        <p className="text-xs font-mono text-[#5C6268]">
          Répertoire consolidé des 50 fiches doubles
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#1C1F22]">
          Rencontres &amp; visites mémorables
        </h1>
        <p className="text-sm sm:text-[15px] text-[#4E545A] leading-relaxed">
          Retrouvez en un coup d’œil toutes les nouvelles personnes rencontrées et les visites
          consignées au fil de vos 50 fiches, avec un accès direct à l’étape d’origine.
        </p>
      </section>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div
          role="tablist"
          aria-label="Afficher rencontres ou visites"
          className="inline-flex items-center p-1 bg-[#E9E7DF] rounded-lg self-start"
        >
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'rencontres'}
            onClick={() => setViewMode('rencontres')}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              viewMode === 'rencontres'
                ? 'bg-[#FAF9F6] text-[#1C1F22] shadow-xs'
                : 'text-[#5C6268] hover:text-[#1C1F22]'
            }`}
          >
            Nouvelles personnes ({allRencontres.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'visites'}
            onClick={() => setViewMode('visites')}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              viewMode === 'visites'
                ? 'bg-[#FAF9F6] text-[#1C1F22] shadow-xs'
                : 'text-[#5C6268] hover:text-[#1C1F22]'
            }`}
          >
            Visites effectuées ({allVisites.length})
          </button>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#7A8086] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              viewMode === 'rencontres'
                ? 'Chercher un prénom, une ville...'
                : 'Chercher un site, une catégorie...'
            }
            className="w-full pl-9 pr-3 py-2 text-sm bg-[#FAF9F6] border border-[#DCD9D0] rounded-md text-[#1C1F22] placeholder:text-[#7A8086] focus:outline-none focus:border-[#1E4D3B]"
          />
        </div>
      </div>

      {viewMode === 'rencontres' ? (
        filteredRencontres.length === 0 ? (
          <div className="bg-[#FAF9F6] border border-[#E2E0D8] rounded-xl p-10 text-center space-y-2">
            <p className="font-serif text-lg text-[#1C1F22]">Aucune rencontre trouvée.</p>
            <p className="text-sm text-[#5C6268]">
              Ajoutez de nouvelles personnes sur la page de droite de vos fiches doubles pour les
              retrouver ici.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredRencontres.map((item) => (
              <div
                key={`${item.ficheNumero}-${item.personne.id}`}
                className="bg-[#FAF9F6] border border-[#E2E0D8] rounded-xl p-6 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="font-serif text-xl font-semibold text-[#1C1F22]">
                      {item.personne.nom}
                    </h2>
                    <span className="font-mono text-xs tabular-nums text-[#5C6268] shrink-0">
                      Fiche {padFicheNumber(item.ficheNumero)}
                    </span>
                  </div>

                  <p className="text-xs text-[#5C6268]">
                    {[item.personne.origine, item.personne.contexte].filter(Boolean).join(' · ') ||
                      'Rencontre de voyage'}
                  </p>

                  {item.personne.souvenir && (
                    <p className="text-sm text-[#3A3F45] leading-relaxed pt-1">
                      {item.personne.souvenir}
                    </p>
                  )}

                  {item.personne.contact && (
                    <p className="text-xs font-mono text-[#1E4D3B] pt-1 break-all">
                      {item.personne.contact}
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-[#EAE8E0] flex items-center justify-between gap-3">
                  <span className="text-xs text-[#5C6268] truncate">
                    {item.commune || item.nomAire || `Étape ${padFicheNumber(item.ficheNumero)}`}
                    {item.dateArrivee ? ` · ${formatFrenchDate(item.dateArrivee)}` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenFiche(item.ficheNumero)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#1E4D3B] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Ouvrir
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : filteredVisites.length === 0 ? (
        <div className="bg-[#FAF9F6] border border-[#E2E0D8] rounded-xl p-10 text-center space-y-2">
          <p className="font-serif text-lg text-[#1C1F22]">Aucune visite trouvée.</p>
          <p className="text-sm text-[#5C6268]">
            Consignez vos visites et balades sur la page de droite de vos fiches doubles.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVisites.map((item) => (
            <div
              key={`${item.ficheNumero}-${item.visite.id}`}
              className="bg-[#FAF9F6] border border-[#E2E0D8] rounded-xl p-6 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-serif text-lg font-semibold text-[#1C1F22] leading-snug">
                    {item.visite.lieu}
                  </h2>
                  {item.visite.coupDeCoeur && (
                    <Heart
                      className="w-4 h-4 fill-[#1E4D3B] text-[#1E4D3B] shrink-0 mt-1"
                      aria-label="Coup de cœur"
                    />
                  )}
                </div>

                <p className="text-xs text-[#5C6268]">
                  {item.visite.categorie} · Fiche {padFicheNumber(item.ficheNumero)}
                </p>

                {item.visite.notes && (
                  <p className="text-sm text-[#3A3F45] leading-relaxed pt-1">
                    {item.visite.notes}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-[#EAE8E0] flex items-center justify-between gap-3">
                <span className="text-xs text-[#5C6268] truncate">
                  {item.commune || item.nomAire || `Étape ${padFicheNumber(item.ficheNumero)}`}
                </span>
                <button
                  type="button"
                  onClick={() => onOpenFiche(item.ficheNumero)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#1E4D3B] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Voir la fiche
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
