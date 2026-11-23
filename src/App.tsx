/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
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
  loadCarnet,
  saveCarnet,
} from './utils/storage';
import { Header } from './components/Header';
import { SommaireView } from './components/SommaireView';
import { FicheDoubleView } from './components/FicheDoubleView';
import { CarteView } from './components/CarteView';
import { ChecklistView } from './components/ChecklistView';
import { RencontresView } from './components/RencontresView';

export default function App() {
  const [carnet, setCarnet] = useState<CarnetData>(() => loadCarnet());
  const [activeTab, setActiveTab] = useState<AppTab>('sommaire');
  const [selectedFicheNum, setSelectedFicheNum] = useState<number>(1);
  const [importMessage, setImportMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  useEffect(() => {
    saveCarnet(carnet);
  }, [carnet]);

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
        if (!parsed || !Array.isArray(parsed.fiches) || !Array.isArray(parsed.checklist)) {
          throw new Error('Structure invalide');
        }
        const normalizedFiches: FicheDouble[] = Array.from({ length: 50 }, (_, idx) => {
          const existing = parsed.fiches?.find((f) => f && f.numero === idx + 1);
          if (!existing) return createBlankFiche(idx + 1);
          return {
            ...createBlankFiche(idx + 1),
            ...existing,
            numero: idx + 1,
            services: {
              ...createBlankFiche(idx + 1).services,
              ...(existing.services || {}),
            },
            visites: Array.isArray(existing.visites) ? existing.visites : [],
            rencontres: Array.isArray(existing.rencontres) ? existing.rencontres : [],
          };
        });

        setCarnet((prev) => ({
          version: 1,
          profile: {
            ...prev.profile,
            ...(parsed.profile || {}),
          },
          fiches: normalizedFiches,
          checklist: parsed.checklist!,
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
      </main>

      <footer className="no-print border-t border-[#DFDDD4] bg-[#FAF9F6] mt-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#5C6268]">
          <p>
            <span className="font-serif font-medium text-[#1C1F22]">
              {carnet.profile.titreCarnet}
            </span>{' '}
            · 50 fiches doubles &amp; check-liste de départ
          </p>
          <div className="flex items-center gap-5">
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
