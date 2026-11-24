import { FormEvent, useCallback, useEffect, useState } from 'react';
import { BookOpen, Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { CarnetData } from '../types/carnet';
import {
  CarnetMeta,
  createCarnet,
  deleteCarnet,
  formatFrenchDate,
  listCarnets,
  readCarnet,
  saveCarnet,
} from '../utils/storage';

interface CarnetsViewProps {
  carnetId: string;
  carnet: CarnetData;
  onOpenCarnet: (id: string) => Promise<void>;
  onRenameCurrent: (titre: string) => void;
  switchError: string | null;
}

export function CarnetsView({
  carnetId,
  carnet,
  onOpenCarnet,
  onRenameCurrent,
  switchError,
}: CarnetsViewProps) {
  const [carnets, setCarnets] = useState<CarnetMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const unavailable = carnetId === 'local';

  const refresh = useCallback(async () => {
    if (unavailable) return;
    try {
      const index = await listCarnets();
      setCarnets(index.carnets);
    } catch {
      setError('Impossible de lire la liste des carnets.');
    }
  }, [unavailable]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Show the open carnet with its current title and progress, even before it is saved.
  const lignes = (carnets ?? []).map((c) =>
    c.id === carnetId
      ? {
          ...c,
          titre: carnet.profile.titreCarnet,
          saison: carnet.profile.saison,
        }
      : c
  );

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const titre = newTitle.trim() || `Voyage ${new Date().getFullYear()}`;
    setBusyId('new');
    setError(null);
    try {
      const id = await createCarnet(titre, carnet);
      setNewTitle('');
      setShowCreate(false);
      await onOpenCarnet(id);
    } catch {
      setError('Impossible de créer le carnet (espace disque insuffisant ?).');
      setBusyId(null);
    }
  };

  const handleOpen = async (id: string) => {
    setBusyId(id);
    await onOpenCarnet(id);
    setBusyId(null);
  };

  const handleRename = async (id: string) => {
    const titre = renameValue.trim();
    if (!titre) return;
    setError(null);
    if (id === carnetId) {
      onRenameCurrent(titre);
      setRenamingId(null);
      return;
    }
    setBusyId(id);
    try {
      const data = await readCarnet(id);
      if (!data) throw new Error('introuvable');
      await saveCarnet(id, { ...data, profile: { ...data.profile, titreCarnet: titre } });
      setRenamingId(null);
      await refresh();
    } catch {
      setError('Impossible de renommer ce carnet.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await deleteCarnet(id);
      setConfirmDeleteId(null);
      await refresh();
    } catch {
      setError('Impossible de supprimer ce carnet.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-[960px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 space-y-8">
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[#DFDDD4]">
        <div className="space-y-1.5">
          <p className="text-xs font-mono text-[#5C6268] tabular-nums">
            Un carnet de 50 fiches doubles par voyage
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#1C1F22]">
            Mes carnets
          </h1>
        </div>
        {!unavailable && !showCreate && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-[#1E4D3B] hover:bg-[#173D2F] rounded-md transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nouveau carnet
          </button>
        )}
      </section>

      {unavailable && (
        <p className="text-sm text-[#9A6820] bg-[#B47B2B]/10 border border-[#B47B2B]/25 rounded-md px-4 py-3">
          Ce navigateur ne permet pas de gérer plusieurs carnets (navigation privée ?). Votre carnet
          actuel reste utilisable normalement.
        </p>
      )}

      {(error || switchError) && (
        <p role="alert" className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-md px-4 py-3">
          {error || switchError}
        </p>
      )}

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="bg-[#FAF9F6] border border-[#E2E0D8] rounded-xl p-5 sm:p-6 space-y-4"
        >
          <div className="space-y-1.5">
            <label htmlFor="nouveau-carnet" className="block text-xs font-medium text-[#4E545A]">
              Nom du nouveau carnet
            </label>
            <input
              id="nouveau-carnet"
              type="text"
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={`Ex. Écosse ${new Date().getFullYear()}`}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#DCD9D0] rounded-md text-[#1C1F22] placeholder:text-[#9AA0A6] focus:outline-none focus:border-[#1E4D3B]"
            />
          </div>
          <p className="text-xs text-[#5C6268] leading-relaxed">
            Le nouveau carnet commence avec 50 fiches vierges. Il reprend votre équipage, votre
            véhicule et votre check-liste de départ, avec toutes les cases décochées. Le carnet
            actuel reste enregistré tel quel.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={busyId === 'new'}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#1E4D3B] hover:bg-[#173D2F] disabled:opacity-60 rounded-md cursor-pointer"
            >
              {busyId === 'new' && <Loader2 className="w-4 h-4 animate-spin" />}
              Créer et ouvrir
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-3 py-2 text-sm text-[#5C6268] hover:text-[#1C1F22] cursor-pointer"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {!unavailable && (
        <ul className="space-y-3">
          {carnets === null && (
            <li className="text-sm text-[#5C6268]">Chargement…</li>
          )}
          {lignes.map((c) => {
            const isCurrent = c.id === carnetId;
            const isBusy = busyId === c.id;
            return (
              <li
                key={c.id}
                className={`bg-[#FAF9F6] border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isCurrent ? 'border-[#1E4D3B]' : 'border-[#E2E0D8]'
                }`}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  {renamingId === c.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void handleRename(c.id);
                      }}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="text"
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        aria-label="Nouveau nom du carnet"
                        className="flex-1 min-w-0 px-3 py-1.5 text-sm bg-white border border-[#DCD9D0] rounded-md focus:outline-none focus:border-[#1E4D3B]"
                      />
                      <button
                        type="submit"
                        aria-label="Valider le nom"
                        className="w-9 h-9 inline-flex items-center justify-center rounded-md text-white bg-[#1E4D3B] cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRenamingId(null)}
                        aria-label="Annuler"
                        className="w-9 h-9 inline-flex items-center justify-center rounded-md text-[#5C6268] hover:bg-[#ECEAE2] cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </form>
                  ) : (
                    <p className="font-serif text-lg font-semibold text-[#1C1F22] flex items-center gap-2 min-w-0">
                      <BookOpen className="w-4 h-4 shrink-0 text-[#1E4D3B]" />
                      <span className="truncate">{c.titre}</span>
                      {isCurrent && (
                        <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-sans font-semibold text-[#1E4D3B] bg-[#1E4D3B]/10">
                          Ouvert
                        </span>
                      )}
                    </p>
                  )}
                  <p className="text-xs text-[#5C6268] font-mono tabular-nums">
                    {c.saison ? `${c.saison} · ` : ''}
                    {c.fichesRemplies} / 50 fiches · modifié le {formatFrenchDate(c.updatedAt.slice(0, 10))}
                  </p>
                </div>

                {renamingId !== c.id && (
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {confirmDeleteId === c.id ? (
                      <>
                        <span className="text-xs text-red-800">Supprimer définitivement ?</span>
                        <button
                          type="button"
                          onClick={() => void handleDelete(c.id)}
                          disabled={isBusy}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-red-700 hover:bg-red-800 rounded-md cursor-pointer"
                        >
                          Oui, supprimer
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-3 py-1.5 text-xs text-[#5C6268] hover:text-[#1C1F22] cursor-pointer"
                        >
                          Annuler
                        </button>
                      </>
                    ) : (
                      <>
                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => void handleOpen(c.id)}
                            disabled={isBusy}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#1E4D3B] hover:bg-[#173D2F] disabled:opacity-60 rounded-md cursor-pointer"
                          >
                            {isBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Ouvrir
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingId(c.id);
                            setRenameValue(c.titre);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#3A3F45] bg-white border border-[#DCD9D0] hover:border-[#1C1F22] rounded-md cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Renommer
                        </button>
                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(c.id)}
                            aria-label={`Supprimer le carnet ${c.titre}`}
                            className="w-9 h-9 inline-flex items-center justify-center rounded-md text-[#6E747A] hover:text-red-700 hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!unavailable && (
        <p className="text-xs text-[#6E747A] leading-relaxed">
          Pensez à télécharger une sauvegarde (.json) de chaque carnet de temps en temps : elle
          permet de le restaurer sur un autre appareil. Le carnet ouvert ne peut pas être supprimé ;
          ouvrez-en un autre d’abord.
        </p>
      )}
    </div>
  );
}
