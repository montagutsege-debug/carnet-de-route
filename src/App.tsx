/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppTab,
  CarnetData,
  CarnetProfile,
  ChecklistCategoryId,
  FicheDouble,
} from './types/carnet';
import { createBlankFiche } from './data/initialCarnet';
import {
  exportCarnetJson,
  isFicheFilled,
  normalizeCarnet,
  openActiveCarnet,
  openCarnet,
  requestPersistentStorage,
  saveCarnet,
} from './utils/storage';
import { Header } from './components/Header';
import { SommaireView } from './components/SommaireView';
import { FicheDoubleView } from './components/FicheDoubleView';
import { CarteView } from './components/CarteView';
import { ChecklistView } from './components/ChecklistView';
import { RencontresView } from './components/RencontresView';
import { BilanView } from './components/BilanView';
import { ExportView } from './components/ExportView';
import { CarnetsView } from './components/CarnetsView';

export default function App() {
  const [opened, setOpened] = useState<{ id: string; data: CarnetData } | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    openActiveCarnet().then((result) => {
      if (!cancelled) setOpened(result);
    });
    requestPersistentStorage();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSwitchCarnet = useCallback(async (id: string) => {
    setOpenError(null);
    try {
      const data = await openCarnet(id);
      setOpened({ id, data });
      window.scrollTo({ top: 0 });
    } catch {
      setOpenError('Impossible d’ouvrir ce carnet.');
    }
  }, []);

  if (!opened) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F2ED] text-sm text-[#5C6268]">
        Ouverture du carnet…
      </div>
    );
  }

  return (
    <CarnetApp
      key={opened.id}
      carnetId={opened.id}
      initialCarnet={opened.data}
      onSwitchCarnet={handleSwitchCarnet}
      switchError={openError}
    />
  );
}

const SAVE_DELAY_MS = 400;

/**
 * Saves the carnet shortly after each change (grouping fast typing into one
 * write), never runs two writes at once, and flushes when the page is hidden.
 */
function useCarnetAutosave(carnetId: string, carnet: CarnetData) {
  const [saveError, setSaveError] = useState(false);
  const pendingRef = useRef<CarnetData | null>(null);
  const writingRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const firstRenderRef = useRef(true);

  const flush = useCallback(async () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (writingRef.current) return;
    writingRef.current = true;
    try {
      while (pendingRef.current) {
        const data = pendingRef.current;
        pendingRef.current = null;
        try {
          await saveCarnet(carnetId, data);
          setSaveError(false);
        } catch (err) {
          console.error('Enregistrement du carnet impossible :', err);
          setSaveError(true);
        }
      }
    } finally {
      writingRef.current = false;
    }
  }, [carnetId]);

  useEffect(() => {
    // The carnet that was just loaded does not need saving again.
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }
    pendingRef.current = carnet;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => void flush(), SAVE_DELAY_MS);
  }, [carnet, flush]);

  useEffect(() => {
    const onHide = () => {
      if (pendingRef.current) void flush();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') onHide();
    };
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onVisibility);
      // Leaving this carnet (switching to another one): save what is pending.
      if (pendingRef.current) void flush();
    };
  }, [flush]);

  /** Saves immediately; resolves once everything pending is written. */
  const flushNow = useCallback(async () => {
    await flush();
    while (writingRef.current) {
      await new Promise((r) => setTimeout(r, 50));
    }
  }, [flush]);

  return { saveError, flushNow };
}

interface CarnetAppProps {
  carnetId: string;
  initialCarnet: CarnetData;
  onSwitchCarnet: (id: string) => Promise<void>;
  switchError: string | null;
}

function CarnetApp({ carnetId, initialCarnet, onSwitchCarnet, switchError }: CarnetAppProps) {
  const [carnet, setCarnet] = useState<CarnetData>(initialCarnet);
  const { saveError, flushNow } = useCarnetAutosave(carnetId, carnet);

  // Lets the Mac app (Xcode version) save pending changes before its window closes.
  useEffect(() => {
    const w = window as unknown as { __carnetFlush?: () => Promise<void> };
    w.__carnetFlush = flushNow;
    return () => {
      if (w.__carnetFlush === flushNow) delete w.__carnetFlush;
    };
  }, [flushNow]);
  const [activeTab, setActiveTab] = useState<AppTab>('sommaire');
  const [selectedFicheNum, setSelectedFicheNum] = useState<number>(1);
  const [importMessage, setImportMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const activeFiche =
    carnet.fiches.find((f) => f.numero === selectedFicheNum) || carnet.fiches[0];

  const handleOpenFiche = (numero: number) => {
    const clamped = Math.max(1, Math.min(50, numero));
    setSelectedFicheNum(clamped);
    setActiveTab('fiche');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenNextBlankFiche = () => {
    const nextBlank = carnet.fiches.find((f) => !isFicheFilled(f));
    handleOpenFiche(nextBlank ? nextBlank.numero : selectedFicheNum);
  };

  const handleSelectTab = (tab: AppTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /** Saves the open carnet, then opens another one. */
  const handleSwitchCarnet = async (id: string) => {
    if (id === carnetId) return;
    await flushNow();
    await onSwitchCarnet(id);
  };

  const handleUpdateProfile = (profile: CarnetProfile) => {
    setCarnet((prev) => ({ ...prev, profile }));
  };

  const handleUpdateFiche = (updated: FicheDouble) => {
    setCarnet((prev) => ({
      ...prev,
      fiches: prev.fiches.map((f) => (f.numero === updated.numero ? updated : f)),
    }));
  };

  const handleResetFiche = (numero: number) => {
    setCarnet((prev) => ({
      ...prev,
      fiches: prev.fiches.map((f) => (f.numero === numero ? createBlankFiche(numero) : f)),
    }));
  };

  const handleToggleChecklistItem = (id: string) => {
    setCarnet((prev) => ({
      ...prev,
      checklist: prev.checklist.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      ),
    }));
  };

  const handleAddChecklistItem = (category: ChecklistCategoryId, label: string) => {
    setCarnet((prev) => ({
      ...prev,
      checklist: [
        ...prev.checklist,
        {
          id: `custom-${Date.now()}`,
          category,
          label,
          checked: false,
          isCustom: true,
        },
      ],
    }));
  };

  const handleDeleteChecklistItem = (id: string) => {
    setCarnet((prev) => ({
      ...prev,
      checklist: prev.checklist.filter((item) => item.id !== id),
    }));
  };

  const handleResetChecklist = () => {
    setCarnet((prev) => ({
      ...prev,
      checklist: prev.checklist.map((item) => ({ ...item, checked: false })),
    }));
  };

  const handleExportJson = () => {
    exportCarnetJson(carnet);
    setImportMessage({
      type: 'success',
      text: 'Sauvegarde téléchargée au format JSON.',
    });
  };

  const handleImportJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Partial<CarnetData>;
        const normalized = normalizeCarnet(parsed);
        if (!normalized) {
          throw new Error('Structure invalide');
        }
        setCarnet((prev) => ({
          ...normalized,
          profile: { ...prev.profile, ...(parsed.profile || {}) },
        }));
        setImportMessage({
          type: 'success',
          text: 'Votre carnet a bien été restauré.',
        });
      } catch {
        setImportMessage({
          type: 'error',
          text: 'Fichier invalide : sélectionnez une sauvegarde JSON générée par Carnet de Route.',
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F2ED] text-[#1C1F22]">
      {saveError && (
        <div
          role="alert"
          className="no-print bg-red-50 border-b border-red-200 text-red-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm"
        >
          Attention : vos dernières modifications n’ont pas pu être enregistrées (espace disque
          du navigateur plein ?). Téléchargez une sauvegarde pour ne rien perdre :{' '}
          <button
            type="button"
            onClick={handleExportJson}
            className="underline font-semibold cursor-pointer"
          >
            Sauvegarder (.json)
          </button>
        </div>
      )}

      <Header
        titreCarnet={carnet.profile.titreCarnet}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onOpenNextBlankFiche={handleOpenNextBlankFiche}
      />

      <main className="flex-1">
        {activeTab === 'sommaire' && (
          <SommaireView
            carnet={carnet}
            onOpenFiche={handleOpenFiche}
            onOpenNextBlankFiche={handleOpenNextBlankFiche}
            onOpenChecklist={() => handleSelectTab('checklist')}
            onUpdateProfile={handleUpdateProfile}
            onExportJson={handleExportJson}
            onImportJson={handleImportJson}
            importMessage={importMessage}
            onOpenCarnets={() => handleSelectTab('carnets')}
            onOpenBilan={() => handleSelectTab('bilan')}
            onOpenExport={() => handleSelectTab('export')}
          />
        )}

        {activeTab === 'fiche' && (
          <FicheDoubleView
            fiche={activeFiche}
            allFiches={carnet.fiches}
            onSelectFiche={handleOpenFiche}
            onUpdateFiche={handleUpdateFiche}
            onResetFiche={handleResetFiche}
            onBackToSommaire={() => handleSelectTab('sommaire')}
          />
        )}

        {activeTab === 'carte' && (
          <CarteView
            fiches={carnet.fiches}
            onOpenFiche={handleOpenFiche}
          />
        )}

        {activeTab === 'checklist' && (
          <ChecklistView
            items={carnet.checklist}
            onToggleItem={handleToggleChecklistItem}
            onAddItem={handleAddChecklistItem}
            onDeleteItem={handleDeleteChecklistItem}
            onResetAll={handleResetChecklist}
          />
        )}

        {activeTab === 'rencontres' && (
          <RencontresView
            fiches={carnet.fiches}
            onOpenFiche={handleOpenFiche}
          />
        )}

        {activeTab === 'bilan' && <BilanView carnet={carnet} onOpenFiche={handleOpenFiche} />}

        {activeTab === 'export' && <ExportView carnet={carnet} />}

        {activeTab === 'carnets' && (
          <CarnetsView
            carnetId={carnetId}
            carnet={carnet}
            onOpenCarnet={handleSwitchCarnet}
            onRenameCurrent={(titre) =>
              setCarnet((prev) => ({ ...prev, profile: { ...prev.profile, titreCarnet: titre } }))
            }
            switchError={switchError}
          />
        )}
      </main>

      <footer className="no-print border-t border-[#DFDDD4] bg-[#FAF9F6] mt-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#5C6268]">
          <p>
            <span className="font-serif font-medium text-[#1C1F22]">
              {carnet.profile.titreCarnet}
            </span>{' '}
            · 50 fiches doubles &amp; check-liste de départ
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <button
              type="button"
              onClick={() => handleSelectTab('sommaire')}
              className="hover:text-[#1C1F22] transition-colors cursor-pointer"
            >
              Sommaire
            </button>
            <button
              type="button"
              onClick={() => handleSelectTab('fiche')}
              className="hover:text-[#1C1F22] transition-colors cursor-pointer"
            >
              Fiches doubles
            </button>
            <button
              type="button"
              onClick={() => handleSelectTab('carte')}
              className="hover:text-[#1C1F22] transition-colors cursor-pointer"
            >
              Carte
            </button>
            <button
              type="button"
              onClick={() => handleSelectTab('checklist')}
              className="hover:text-[#1C1F22] transition-colors cursor-pointer"
            >
              Check-list
            </button>
            <button
              type="button"
              onClick={() => handleSelectTab('carnets')}
              className="hover:text-[#1C1F22] transition-colors cursor-pointer"
            >
              Mes carnets
            </button>
            <button
              type="button"
              onClick={() => handleSelectTab('export')}
              className="hover:text-[#1C1F22] transition-colors cursor-pointer"
            >
              Export PDF
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              className="hover:text-[#1E4D3B] font-medium transition-colors cursor-pointer"
            >
              Sauvegarder (.json)
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
