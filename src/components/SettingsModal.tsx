import React, { useState } from 'react';
import {
  X,
  Settings,
  RotateCcw,
  Trash2,
  Download,
  Upload,
  Check,
  Building,
  Target,
  Coins,
  CreditCard,
} from 'lucide-react';
import { TreasurySettings, Transaction } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TreasurySettings;
  onSaveSettings: (settings: TreasurySettings) => void;
  onResetToSampleData: () => void;
  onClearAllData: () => void;
  transactions: Transaction[];
  onImportData: (data: { settings?: TreasurySettings; transactions: Transaction[] }) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onResetToSampleData,
  onClearAllData,
  transactions,
  onImportData,
}) => {
  const [formData, setFormData] = useState<TreasurySettings>({ ...settings });
  const [confirmClear, setConfirmClear] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 800);
  };

  const handleExportJson = () => {
    const backup = {
      app: 'tymova-pokladna',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      settings: formData,
      transactions,
    };
    const jsonStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pokladna_zaloha_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed.transactions)) {
          onImportData({
            settings: parsed.settings || undefined,
            transactions: parsed.transactions,
          });
          onClose();
        } else {
          alert('Neplatný formát záložního souboru.');
        }
      } catch (err) {
        alert('Chyba při čtení souboru. Zkontrolujte, zda jde o platný JSON.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Nastavení týmové pokladny</h3>
              <p className="text-xs text-slate-500">Úprava názvu, cílů a správa dat</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              Název týmu / pokladny
            </label>
            <input
              type="text"
              value={formData.teamName}
              onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/20"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-slate-400" />
              Měna pokladny
            </label>
            <input
              type="text"
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/20"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
              Číslo bankovního účtu (pro QR platby)
            </label>
            <input
              type="text"
              value={formData.bankAccount || ''}
              onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
              placeholder="např. 123456789/0800"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/20"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" /> Uloženo!
                </>
              ) : (
                'Uložit nastavení'
              )}
            </button>
          </div>
        </form>

        {/* Data Management & Backups */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Správa a zálohování dat
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleExportJson}
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              Zálohovat (JSON)
            </button>

            <label className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center">
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              Obnovit ze zálohy
              <input
                type="file"
                accept=".json"
                onChange={handleImportJson}
                className="hidden"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                if (confirm('Chcete obnovit ukázková data?')) {
                  onResetToSampleData();
                  onClose();
                }
              }}
              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Ukázková data
            </button>

            {confirmClear ? (
              <button
                type="button"
                onClick={() => {
                  onClearAllData();
                  setConfirmClear(false);
                  onClose();
                }}
                className="px-3 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                Opravdu vymazat?
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Vymazat vše
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
