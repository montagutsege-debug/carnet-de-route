import { FormEvent, useMemo, useState } from 'react';
import { Check, Plus, Printer, RotateCcw, Trash2 } from 'lucide-react';
import { ChecklistCategoryId, ChecklistItem } from '../types/carnet';
import { CHECKLIST_CATEGORIES } from '../data/initialCarnet';

interface ChecklistViewProps {
  items: ChecklistItem[];
  onToggleItem: (id: string) => void;
  onAddItem: (category: ChecklistCategoryId, label: string) => void;
  onDeleteItem: (id: string) => void;
  onResetAll: () => void;
}

export function ChecklistView({
  items,
  onToggleItem,
  onAddItem,
  onDeleteItem,
  onResetAll,
}: ChecklistViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<ChecklistCategoryId | 'all'>('all');
  const [onlyUnchecked, setOnlyUnchecked] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newCategory, setNewCategory] = useState<ChecklistCategoryId>('papiers');
  const [confirmReset, setConfirmReset] = useState(false);

  const summary = useMemo(() => {
    const total = items.length;
    const checked = items.filter((i) => i.checked).length;
    const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
    return { total, checked, remaining: total - checked, pct };
  }, [items]);

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = newLabel.trim();
    if (!cleaned) return;
    onAddItem(newCategory, cleaned);
    setNewLabel('');
  };

  const visibleCategories = CHECKLIST_CATEGORIES.filter(
    (cat) => selectedCategory === 'all' || cat.id === selectedCategory
  );

  return (
    <div className="max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 space-y-8">
      {/* Header & Progress */}
      <section className="bg-[#FAF9F6] border border-[#E2E0D8] rounded-xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <p className="text-xs font-mono text-[#5C6268]">
              Préparation avant de prendre la route
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#1C1F22]">
              Check-liste de départ
            </h1>
            <p className="text-sm sm:text-[15px] text-[#4E545A] leading-relaxed">
              Cochez chaque point avant le départ pour ne rien oublier. Vous pouvez ajouter vos
              propres vérifications et réinitialiser toute la liste avant chaque nouveau voyage.
            </p>
          </div>

          <div className="no-print flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#3A3F45] bg-white border border-[#DCD9D0] hover:border-[#1C1F22] rounded-md transition-colors whitespace-nowrap cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimer
            </button>

            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#3A3F45] bg-white border border-[#DCD9D0] hover:border-[#1E4D3B] hover:text-[#1E4D3B] rounded-md transition-colors whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Nouveau départ
              </button>
            ) : (
              <div className="inline-flex items-center gap-2 bg-[#F3F2ED] border border-[#D8D5CC] px-3 py-1.5 rounded-md">
                <span className="text-xs text-[#1C1F22]">Tout décocher ?</span>
                <button
                  type="button"
                  onClick={() => {
                    onResetAll();
                    setConfirmReset(false);
                  }}
                  className="text-xs font-semibold text-[#1E4D3B] hover:underline cursor-pointer"
                >
                  Confirmer
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="text-xs text-[#5C6268] hover:text-[#1C1F22] cursor-pointer"
                >
                  Annuler
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 pt-2 border-t border-[#EAE8E0]">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-[#1C1F22]">
              {summary.remaining === 0
                ? 'Tout est vérifié — bon voyage !'
                : `${summary.remaining} élément${summary.remaining > 1 ? 's' : ''} restant${summary.remaining > 1 ? 's' : ''} avant le départ`}
            </span>
            <span className="font-mono text-sm tabular-nums text-[#1E4D3B] font-medium">
              {summary.checked} / {summary.total} ({summary.pct} %)
            </span>
          </div>
          <div className="w-full h-2.5 bg-[#E6E4DC] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1E4D3B] transition-all duration-200"
              style={{ width: `${summary.pct}%` }}
            />
          </div>
        </div>
      </section>

      {/* Filter Bar & Add Custom Item */}
      <section className="no-print grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 flex flex-wrap items-center gap-2">
          <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#E9E7DF] rounded-lg">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-[#FAF9F6] text-[#1C1F22] shadow-xs'
                  : 'text-[#5C6268] hover:text-[#1C1F22]'
              }`}
            >
              Toutes
            </button>
            {CHECKLIST_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-[#FAF9F6] text-[#1C1F22] shadow-xs'
                    : 'text-[#5C6268] hover:text-[#1C1F22]'
                }`}
              >
                {cat.titre.split(' & ')[0]}
              </button>
            ))}
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-medium text-[#3A3F45] ml-1 cursor-pointer select-none min-h-[40px]">
            <input
              type="checkbox"
              checked={onlyUnchecked}
              onChange={(e) => setOnlyUnchecked(e.target.checked)}
              className="w-4 h-4 accent-[#1E4D3B] rounded cursor-pointer"
            />
            Masquer les éléments cochés
          </label>
        </div>

        {/* Add Custom Item Form */}
        <form
          onSubmit={handleAdd}
          className="lg:col-span-5 bg-[#FAF9F6] border border-[#E2E0D8] rounded-lg p-3 flex flex-col sm:flex-row gap-2"
        >
          <select
            aria-label="Catégorie de l’élément"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as ChecklistCategoryId)}
            className="px-2.5 py-2 text-xs bg-white border border-[#DCD9D0] rounded-md text-[#1C1F22] focus:outline-none focus:border-[#1E4D3B]"
          >
            {CHECKLIST_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.titre}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Ajouter un élément personnel..."
            aria-label="Nouvel élément de la check-liste"
            className="flex-1 min-w-0 px-3 py-2 text-sm bg-white border border-[#DCD9D0] rounded-md text-[#1C1F22] placeholder:text-[#7A8086] focus:outline-none focus:border-[#1E4D3B]"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1 px-3.5 py-2 text-xs font-medium text-white bg-[#1E4D3B] hover:bg-[#173D2F] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Ajouter
          </button>
        </form>
      </section>

      {/* Category Columns */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {visibleCategories.map((cat, idx) => {
          const categoryItems = items.filter((item) => item.category === cat.id);
          const displayedItems = onlyUnchecked
            ? categoryItems.filter((item) => !item.checked)
            : categoryItems;
          const catCheckedCount = categoryItems.filter((i) => i.checked).length;

          return (
            <div
              key={cat.id}
              className="bg-[#FAF9F6] border border-[#E2E0D8] rounded-xl p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-baseline justify-between gap-3 pb-3 border-b border-[#EAE8E0]">
                  <div>
                    <h2 className="font-serif text-xl font-semibold text-[#1C1F22]">
                      0{idx + 1}. {cat.titre}
                    </h2>
                    <p className="mt-0.5 text-xs text-[#5C6268]">{cat.description}</p>
                  </div>
                  <span className="font-mono text-xs tabular-nums text-[#5C6268] shrink-0">
                    {catCheckedCount}/{categoryItems.length}
                  </span>
                </div>

                {displayedItems.length === 0 ? (
                  <p className="py-6 text-sm text-[#6E747A] italic">
                    {onlyUnchecked
                      ? 'Tous les éléments de cette catégorie sont vérifiés.'
                      : 'Aucun élément dans cette catégorie.'}
                  </p>
                ) : (
                  <ul className="divide-y divide-[#EFECE4] mt-2">
                    {displayedItems.map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-3 py-1">
                        <button
                          type="button"
                          onClick={() => onToggleItem(item.id)}
                          className="flex-1 flex items-center gap-3 py-2 text-left min-h-[44px] group cursor-pointer focus-visible:outline-2 focus-visible:outline-[#1E4D3B] rounded"
                        >
                          <span
                            aria-hidden="true"
                            className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                              item.checked
                                ? 'bg-[#1E4D3B] border-[#1E4D3B] text-white'
                                : 'bg-white border-[#C5C2B8] group-hover:border-[#1E4D3B]'
                            }`}
                          >
                            {item.checked && <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
                          </span>
                          <span
                            className={`text-sm leading-snug transition-colors ${
                              item.checked
                                ? 'line-through text-[#82888E]'
                                : 'text-[#1C1F22]'
                            }`}
                          >
                            {item.label}
                          </span>
                        </button>

                        {item.isCustom && (
                          <button
                            type="button"
                            onClick={() => onDeleteItem(item.id)}
                            aria-label={`Supprimer ${item.label}`}
                            className="no-print p-2 text-[#82888E] hover:text-red-700 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
