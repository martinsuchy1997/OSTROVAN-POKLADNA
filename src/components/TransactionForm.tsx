import React, { useState, useEffect, useRef } from 'react';
import {
  PlusCircle,
  Plus,
  User,
  Banknote,
  Tag,
  ArrowDownLeft,
  Check,
  X,
} from 'lucide-react';
import { Transaction, TreasurySettings } from '../types';

interface TransactionFormProps {
  onAddTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  onUpdateTransaction?: (id: string, tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  editingTransaction?: Transaction | null;
  onCancelEdit?: () => void;
  existingMembers: string[];
  categories: string[];
  settings: TreasurySettings;
  presetMemberName?: string;
  onOpenAddPlayerModal?: () => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  onAddTransaction,
  onUpdateTransaction,
  editingTransaction,
  onCancelEdit,
  existingMembers,
  categories,
  settings,
  presetMemberName,
  onOpenAddPlayerModal,
}) => {
  const [name, setName] = useState(presetMemberName || '');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>(categories[0] || 'Členský příspěvek');

  const [isNameFocused, setIsNameFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successAnimation, setSuccessAnimation] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTransaction) {
      setName(editingTransaction.name);
      setAmount(editingTransaction.amount.toString());
      setCategory(editingTransaction.category);
    } else if (presetMemberName) {
      setName(presetMemberName);
    }
  }, [editingTransaction, presetMemberName]);

  const quickAmounts = [50, 100, 150, 200, 500];

  const filteredMembers = existingMembers.filter(
    (m) =>
      m.toLowerCase().includes(name.toLowerCase().trim()) &&
      m.toLowerCase() !== name.toLowerCase().trim()
  );

  // Auto-detect fine amount from category name (e.g. "... (100 Kč)" or "... (100)")
  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    const match = newCat.match(/\((\d+)(?:\s*Kč)?\)/);
    if (match && match[1] && (!amount || amount === '0')) {
      setAmount(match[1]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const parsedAmount = parseFloat(amount.replace(',', '.'));

    if (!cleanName) {
      setError('Zadejte prosím jméno hráče.');
      nameInputRef.current?.focus();
      return;
    }

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Zadejte prosím platnou částku pokuty větší než 0.');
      return;
    }

    setError(null);

    const payload = {
      name: cleanName,
      amount: parsedAmount,
      type: 'income' as const,
      date: new Date().toISOString().slice(0, 10),
      category,
      paymentMethod: 'cash' as const,
    };

    if (editingTransaction && onUpdateTransaction) {
      onUpdateTransaction(editingTransaction.id, payload);
    } else {
      onAddTransaction(payload);
      setName('');
      setAmount('');
      setSuccessAnimation(true);
      setTimeout(() => setSuccessAnimation(false), 2000);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6 transition-all relative overflow-hidden border-t-4 border-t-red-600">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold shadow-xs">
            <ArrowDownLeft className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-blue-950">
              {editingTransaction ? 'Upravit pokutu hráče' : 'Zadat pokutu za fotbalovou chybu'}
            </h2>
            <p className="text-xs text-slate-500">
              Klub Ostrovan • Vyberte hráče, chybu a částku (hráč bude částku dlužit)
            </p>
          </div>
        </div>

        {editingTransaction && onCancelEdit && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" /> Zrušit úpravy
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-700 p-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successAnimation && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-900 text-sm rounded-xl flex items-center gap-2 font-semibold">
          <Check className="w-4 h-4 text-red-600" />
          <span>Pokuta byla úspěšně zapsána do kasy týmu Ostrovan!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Jméno a Částka */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Jméno osoby */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-blue-950 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-blue-600" />
                Jméno člena / hráče <span className="text-red-600">*</span>
              </label>
              {onOpenAddPlayerModal && (
                <button
                  type="button"
                  onClick={onOpenAddPlayerModal}
                  className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Přidat nového hráče
                </button>
              )}
            </div>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setIsNameFocused(true)}
              onBlur={() => setTimeout(() => setIsNameFocused(false), 200)}
              placeholder="např. Jan Novák"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-700 transition-all text-sm"
              required
            />

            {/* Quick autocomplete dropdown for existing members */}
            {isNameFocused && filteredMembers.length > 0 && (
              <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-44 overflow-y-auto py-1">
                <div className="px-3 py-1 text-[11px] font-bold text-blue-900 uppercase tracking-wider bg-blue-50/50">
                  Vyberte ze stávajících hráčů
                </div>
                {filteredMembers.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onMouseDown={() => setName(m)}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 hover:text-blue-900 flex items-center gap-2 text-slate-700 transition-colors cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-bold">
                      {m.slice(0, 1)}
                    </div>
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Částka */}
          <div>
            <label className="block text-xs font-bold text-blue-950 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Banknote className="w-3.5 h-3.5 text-red-600" />
                Výše pokuty ({settings.currency}) <span className="text-red-600">*</span>
              </span>
              <span className="text-[11px] font-semibold text-red-600">hráč bude dlužit</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full pl-3.5 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition-all text-base"
                required
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-blue-900 pointer-events-none">
                {settings.currency}
              </span>
            </div>

            {/* Quick preset amount chips */}
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[11px] text-slate-400 font-medium">Rychle:</span>
              {quickAmounts.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(q.toString())}
                  className="text-xs px-2 py-0.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 font-semibold border border-blue-200 transition-colors cursor-pointer"
                >
                  +{q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Kategorie / Chyba na fotbale */}
        <div>
          <label className="block text-xs font-bold text-blue-950 mb-1 flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-blue-600" />
            Důvod pokuty (chyba na fotbale / přestupek)
          </label>
          <select
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-700 transition-all text-sm cursor-pointer"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Submit button - Vibrant Red */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl font-extrabold text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer bg-red-600 hover:bg-red-700 shadow-red-600/25 active:scale-[0.99]"
          >
            {editingTransaction ? (
              <>
                <Check className="w-5 h-5" /> Uložit úpravu pokuty
              </>
            ) : (
              <>
                <PlusCircle className="w-5 h-5" />
                Udělit pokutu (hráč bude dlužit do kasy)
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
