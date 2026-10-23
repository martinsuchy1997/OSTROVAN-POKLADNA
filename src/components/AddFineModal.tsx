import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  PlusCircle,
  Banknote,
  Tag,
  User,
  AlertCircle,
  Check,
  ShieldAlert,
  Trash2,
  Receipt,
} from 'lucide-react';
import { Transaction } from '../types';
import { formatCurrency } from '../utils/exportUtils';

interface AddFineModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
  existingPlayers: {
    name: string;
    jerseyNumber?: string;
    role?: string;
    totalIncome?: number;
    transactionCount?: number;
  }[];
  categories: string[];
  currency: string;
  onAddFine: (data: { name: string; amount: number; category: string }) => void;
  playerFines?: Transaction[];
  onDeleteFine?: (id: string) => void;
  onDeletePlayer?: (name: string) => void;
}

export const AddFineModal: React.FC<AddFineModalProps> = ({
  isOpen,
  onClose,
  playerName: initialPlayerName,
  existingPlayers,
  categories,
  currency,
  onAddFine,
  playerFines = [],
  onDeleteFine,
  onDeletePlayer,
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState(initialPlayerName);
  const [customPlayerName, setCustomPlayerName] = useState('');
  const [amount, setAmount] = useState('100');
  const [category, setCategory] = useState(categories[0] || 'ZÁPISNÉ (500)');
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'add' | 'history'>('add');
  const [confirmDeletePlayer, setConfirmDeletePlayer] = useState(false);

  const amountInputRef = useRef<HTMLInputElement>(null);

  // Auto-extract amount from category string e.g. "ZÁPISNÉ (500)" or "KAPITÁN (300)"
  const extractAmountFromCategory = (cat: string): string => {
    const match = cat.match(/\((\d+)(?:\s*Kč)?\)/);
    return match && match[1] ? match[1] : '';
  };

  useEffect(() => {
    if (isOpen) {
      const targetName = initialPlayerName || existingPlayers[0]?.name || '';
      setSelectedPlayer(targetName);
      setCustomPlayerName('');
      setError(null);
      setIsSuccess(false);
      setActiveSubTab('add');

      const defaultCat = categories[0] || 'ZÁPISNÉ (500)';
      setCategory(defaultCat);
      const extracted = extractAmountFromCategory(defaultCat);
      setAmount(extracted || '500');

      setTimeout(() => {
        amountInputRef.current?.focus();
        amountInputRef.current?.select();
      }, 100);
    }
  }, [isOpen, initialPlayerName, existingPlayers, categories]);

  if (!isOpen) return null;

  const quickAmounts = [30, 50, 100, 150, 200, 300, 500];

  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    const extracted = extractAmountFromCategory(newCat);
    if (extracted) {
      setAmount(extracted);
    }
  };

  const currentPlayerInfo = existingPlayers.find((p) => p.name === selectedPlayer);
  const currentPlayerFines = playerFines.filter((f) => f.name === selectedPlayer);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = (selectedPlayer === '__NEW__' ? customPlayerName : selectedPlayer).trim();
    const parsedAmount = parseFloat(amount.replace(',', '.'));

    if (!finalName) {
      setError('Vyberte nebo zadejte prosím jméno hráče.');
      return;
    }

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Zadejte prosím platnou částku pokuty.');
      return;
    }

    onAddFine({
      name: finalName,
      amount: parsedAmount,
      category,
    });

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tricolor stripe at top */}
        <div className="h-1.5 w-full flex">
          <div className="h-full flex-1 bg-blue-700" />
          <div className="h-full w-12 bg-white" />
          <div className="h-full flex-1 bg-red-600" />
        </div>

        {/* Modal Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center font-black shadow-xs shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-blue-950 text-base leading-tight">
                Pokuta hráče
              </h3>
              <p className="text-[11px] text-slate-500">
                Klub Ostrovan • Evidence chyb a dluhu
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {onDeletePlayer && selectedPlayer && selectedPlayer !== '__NEW__' && (
              <button
                type="button"
                onClick={() => setConfirmDeletePlayer(true)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                title="Smazat hráče ze soupisky"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Zavřít"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Delete Player Confirmation in Modal */}
        {confirmDeletePlayer && selectedPlayer && (
          <div className="p-3 bg-red-50 border-b border-red-200 flex flex-col gap-2 animate-in fade-in duration-100">
            <div className="text-xs font-bold text-red-900">
              Opravdu chcete smazat hráče <span className="underline">{selectedPlayer}</span> ze soupisky včetně všech jeho pokut?
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (onDeletePlayer) {
                    onDeletePlayer(selectedPlayer);
                    onClose();
                  }
                }}
                className="flex-1 py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-lg cursor-pointer transition-colors shadow-xs text-center"
              >
                Ano, smazat hráče
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeletePlayer(false)}
                className="py-1.5 px-3 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg border border-slate-300 cursor-pointer transition-colors text-center"
              >
                Zrušit
              </button>
            </div>
          </div>
        )}

        {/* Selected Player Banner */}
        <div className="p-3.5 bg-blue-50/60 border-b border-blue-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-900 to-blue-700 text-white font-black text-base flex items-center justify-center shadow-xs border-2 border-red-500">
                {selectedPlayer.charAt(0).toUpperCase()}
              </div>
              {currentPlayerInfo?.jerseyNumber && (
                <span className="absolute -bottom-1 -right-1 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full border border-white">
                  #{currentPlayerInfo.jerseyNumber}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <div className="font-extrabold text-blue-950 text-base truncate">
                {selectedPlayer === '__NEW__' ? (customPlayerName || 'Nový hráč') : selectedPlayer}
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                <span>Aktuální dluh:</span>
                <strong className="text-red-600 font-extrabold text-sm">
                  {formatCurrency(currentPlayerInfo?.totalIncome || 0, currency)}
                </strong>
              </div>
            </div>
          </div>

          {!initialPlayerName && (
            <select
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
              className="text-xs font-bold text-blue-800 bg-white border border-blue-200 rounded-lg px-2 py-1 focus:outline-none cursor-pointer max-w-[130px]"
            >
              {existingPlayers.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
              <option value="__NEW__">+ Jiný hráč...</option>
            </select>
          )}
        </div>

        {/* Sub-Tabs: Udělit pokutu vs Historie chyb */}
        {currentPlayerFines.length > 0 && (
          <div className="flex border-b border-slate-100 bg-slate-50/50 p-1">
            <button
              type="button"
              onClick={() => setActiveSubTab('add')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeSubTab === 'add'
                  ? 'bg-white text-blue-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5 text-red-600" />
              <span>Nová pokuta</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('history')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeSubTab === 'history'
                  ? 'bg-white text-blue-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-3.5 h-3.5 text-blue-700" />
              <span>Dosud udělené ({currentPlayerFines.length})</span>
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="p-4 overflow-y-auto space-y-4">
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isSuccess && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Pokuta byla úspěšně přičtena k dluhu!</span>
            </div>
          )}

          {activeSubTab === 'add' ? (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* New Player Input if __NEW__ */}
              {selectedPlayer === '__NEW__' && (
                <div>
                  <label className="block text-xs font-bold text-blue-950 mb-1">
                    Jméno nového hráče <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={customPlayerName}
                    onChange={(e) => setCustomPlayerName(e.target.value)}
                    placeholder="např. Tomáš Nový"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-700"
                    autoFocus
                    required
                  />
                </div>
              )}

              {/* Amount Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                    <Banknote className="w-3.5 h-3.5 text-red-600" />
                    Výše pokuty
                  </label>
                  <span className="text-[11px] font-bold text-red-600 uppercase tracking-wide">
                    Hráč bude dlužit
                  </span>
                </div>

                <div className="relative">
                  <input
                    ref={amountInputRef}
                    type="number"
                    step="any"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="100"
                    className="w-full pl-3.5 pr-14 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-black text-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-600 transition-all"
                    required
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-base font-black text-slate-400 pointer-events-none">
                    {currency}
                  </span>
                </div>

                {/* Quick Amount Buttons */}
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 mt-2">
                  {quickAmounts.map((q) => {
                    const isSelected = amount === q.toString();
                    return (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setAmount(q.toString())}
                        className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
                          isSelected
                            ? 'bg-red-600 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                        }`}
                      >
                        +{q}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reason / Category */}
              <div>
                <label className="block text-xs font-bold text-blue-950 mb-1 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-blue-700" />
                  Důvod pokuty (chyba na fotbale)
                </label>
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-700 cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSuccess}
                  className="w-full py-3.5 px-4 rounded-xl font-extrabold text-white text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer bg-red-600 hover:bg-red-700 active:scale-[0.98] shadow-red-600/25"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Udělit pokutu {amount ? `${amount} ${currency}` : ''}</span>
                </button>
              </div>
            </form>
          ) : (
            /* History Sub-tab: View & cancel fines for this player */
            <div className="space-y-2">
              <div className="text-xs font-bold text-blue-950 flex items-center justify-between pb-1 border-b border-slate-100">
                <span>Zaznamenané pokuty:</span>
                <span className="text-red-600 font-black">
                  Celkem: {formatCurrency(currentPlayerInfo?.totalIncome || 0, currency)}
                </span>
              </div>

              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {currentPlayerFines.map((fine) => (
                  <div
                    key={fine.id}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-slate-900 truncate pr-2">
                      {fine.category}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-black text-red-600">
                        +{formatCurrency(fine.amount, currency)}
                      </span>
                      {onDeleteFine && (
                        <button
                          type="button"
                          onClick={() => onDeleteFine(fine.id)}
                          className="p-1 text-slate-300 hover:text-red-600 transition-colors"
                          title="Smazat tuto pokutu"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setActiveSubTab('add')}
                className="w-full py-2.5 mt-2 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 font-bold text-xs hover:bg-blue-100 transition-colors cursor-pointer"
              >
                + Udělit další pokutu tomuto hráči
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
