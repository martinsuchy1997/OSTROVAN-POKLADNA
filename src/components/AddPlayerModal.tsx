import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Users,
  Check,
  Shield,
  FileText,
  AlertCircle,
  Hash,
} from 'lucide-react';
import { Player } from '../types';

interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPlayer: (player: Omit<Player, 'id' | 'createdAt'>) => void;
  onAddMultiplePlayers?: (names: string[]) => void;
  existingPlayers: Player[];
}

export const AddPlayerModal: React.FC<AddPlayerModalProps> = ({
  isOpen,
  onClose,
  onAddPlayer,
  onAddMultiplePlayers,
  existingPlayers,
}) => {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');

  // Single player state
  const [name, setName] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [note, setNote] = useState('');

  // Bulk add state
  const [bulkText, setBulkText] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Zadejte prosím jméno hráče.');
      return;
    }

    const exists = existingPlayers.some(
      (p) => p.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (exists) {
      setError(`Hráč "${cleanName}" již na soupisce existuje.`);
      return;
    }

    setError(null);
    onAddPlayer({
      name: cleanName,
      jerseyNumber: jerseyNumber.trim() || undefined,
      note: note.trim() || undefined,
    });

    setSuccessMsg(`Hráč "${cleanName}" byl úspěšně přidán do týmu Ostrovan!`);
    setName('');
    setJerseyNumber('');
    setNote('');

    setTimeout(() => {
      setSuccessMsg(null);
      onClose();
    }, 1000);
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkText.trim()) {
      setError('Zadejte alespoň jedno jméno.');
      return;
    }

    // Split by newlines or commas
    const rawNames = bulkText
      .split(/[\n,]+/)
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    if (rawNames.length === 0) {
      setError('Nenalezena žádná platná jména.');
      return;
    }

    // Filter out duplicates
    const added: string[] = [];
    rawNames.forEach((n) => {
      const alreadyExists = existingPlayers.some(
        (p) => p.name.toLowerCase() === n.toLowerCase()
      );
      if (!alreadyExists && !added.includes(n)) {
        added.push(n);
      }
    });

    if (added.length === 0) {
      setError('Všechna zadaná jména již na soupisce existují.');
      return;
    }

    if (onAddMultiplePlayers) {
      onAddMultiplePlayers(added);
    } else {
      added.forEach((n) => onAddPlayer({ name: n }));
    }

    setError(null);
    setSuccessMsg(`Úspěšně přidáno ${added.length} nových hráčů!`);
    setBulkText('');

    setTimeout(() => {
      setSuccessMsg(null);
      onClose();
    }, 1200);
  };

  const positionPresets = ['Brankář', 'Obránce', 'Záložník', 'Útočník', 'Kapitán', 'Trenér'];

  return (
    <div className="fixed inset-0 z-50 bg-blue-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border-t-4 border-t-red-600 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 pb-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-900 text-white flex items-center justify-center font-bold shadow-xs">
              <UserPlus className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-blue-950 text-base">Přidat hráče do týmu</h3>
              <p className="text-xs text-slate-500">Klub Ostrovan • Evidence členů</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Toggle: Jednotlivě vs Hromadně */}
        <div className="px-5 pt-4">
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setMode('single');
                setError(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mode === 'single'
                  ? 'bg-white text-blue-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Jednotlivý hráč
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('bulk');
                setError(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mode === 'bulk'
                  ? 'bg-white text-blue-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hromadný seznam
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mx-5 mt-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mx-5 mt-3 p-3 bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold rounded-xl flex items-center gap-2">
            <Check className="w-4 h-4 text-blue-700 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Forms */}
        <div className="p-5">
          {mode === 'single' ? (
            <form onSubmit={handleSingleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-blue-950 mb-1">
                  Jméno a příjmení hráče <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="např. Tomáš Dvořák"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-700"
                  autoFocus
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-blue-950 mb-1 flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-blue-600" /> Číslo dresu
                  </label>
                  <input
                    type="text"
                    value={jerseyNumber}
                    onChange={(e) => setJerseyNumber(e.target.value)}
                    placeholder="např. 10"
                    maxLength={3}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-950 mb-1 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-blue-600" /> Pozice / Role
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="např. Útočník"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-700"
                  />
                </div>
              </div>

              {/* Quick Position Chips */}
              <div>
                <span className="text-[11px] font-semibold text-slate-400 mr-1.5">Pozice:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {positionPresets.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNote(p)}
                      className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-900 text-slate-700 transition-colors font-medium cursor-pointer"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl font-extrabold text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                >
                  <UserPlus className="w-4 h-4" />
                  Přidat hráče do soupisky
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleBulkSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-blue-950 mb-1">
                  Seznam jmen (každé jméno na nový řádek)
                </label>
                <textarea
                  rows={6}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={`Jan Novák\nPetr Svoboda\nMartin Černý\nMichal Němec`}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-700 font-mono"
                  autoFocus
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Můžete sem vložit seznam jmen zkopírovaný např. z WhatsAppu, Excelu nebo soupisky.
                </p>
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl font-extrabold text-white bg-blue-900 hover:bg-blue-950 shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Users className="w-4 h-4 text-red-400" />
                  Přidat všechny hráče ze seznamu
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
