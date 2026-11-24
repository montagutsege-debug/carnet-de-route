import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { AppTab } from '../types/carnet';

interface HeaderProps {
  titreCarnet: string;
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  onOpenNextBlankFiche: () => void;
}

const NAV_ITEMS: { id: AppTab; label: string }[] = [
  { id: 'sommaire', label: 'Sommaire' },
  { id: 'fiche', label: 'Fiches doubles' },
  { id: 'carte', label: 'Carte' },
  { id: 'checklist', label: 'Check-list' },
  { id: 'rencontres', label: 'Rencontres' },
  { id: 'bilan', label: 'Bilan' },
];

export function Header({
  titreCarnet,
  activeTab,
  onSelectTab,
  onOpenNextBlankFiche,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (tab: AppTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="no-print sticky top-0 z-30 bg-[#FAF9F6]/95 backdrop-blur-sm border-b border-[#E2E0D8]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 lg:gap-8">
        {/* Zone 1: Brand wordmark — single text element */}
        <button
          type="button"
          onClick={() => handleNavClick('sommaire')}
          className="font-serif text-xl font-semibold tracking-tight text-[#1C1F22] hover:text-[#1E4D3B] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1E4D3B] cursor-pointer"
        >
          {titreCarnet || 'Carnet de Route'}
        </button>

        {/* Zone 2: 4 clean single-line text navigation links */}
        <nav
          aria-label="Navigation principale"
          className="hidden md:flex items-center gap-4 lg:gap-7 text-sm font-medium"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`relative py-1 whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1E4D3B] ${
                  isActive
                    ? 'text-[#1E4D3B] font-semibold'
                    : 'text-[#5C6268] hover:text-[#1C1F22]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 right-0 -bottom-[21px] h-[2px] bg-[#1E4D3B]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              onOpenNextBlankFiche();
              setMobileMenuOpen(false);
            }}
            className="hidden sm:inline-flex md:hidden lg:inline-flex items-center justify-center px-3 lg:px-4 py-2 text-sm font-medium text-white bg-[#1E4D3B] hover:bg-[#173D2F] rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E4D3B]"
          >
            Nouvelle étape
          </button>

          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-md text-[#1C1F22] hover:bg-[#E9E7DF] transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E2E0D8] bg-[#FAF9F6] px-4 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full text-left px-3 py-3 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#1E4D3B]/10 text-[#1E4D3B] font-semibold'
                    : 'text-[#3A3F45] hover:bg-[#ECEAE2]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                onOpenNextBlankFiche();
                setMobileMenuOpen(false);
              }}
              className="w-full px-4 py-3 text-sm font-medium text-white bg-[#1E4D3B] hover:bg-[#173D2F] rounded-md transition-colors cursor-pointer"
            >
              Nouvelle étape
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
