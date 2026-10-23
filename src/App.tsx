import React, { useState, useEffect, useMemo } from 'react';
import {
  Printer,
  Settings as SettingsIcon,
  Plus,
  PlusCircle,
} from 'lucide-react';
import { Transaction, MemberSummary, TreasurySettings, Player } from './types';
import {
  DEFAULT_SETTINGS,
  INITIAL_CATEGORIES,
  INITIAL_TRANSACTIONS,
  INITIAL_PLAYERS,
} from './data/initialData';
import { MembersSummaryView } from './components/MembersSummaryView';
import { AddFineModal } from './components/AddFineModal';
import { PrintReportModal } from './components/PrintReportModal';
import { SettingsModal } from './components/SettingsModal';
import { AddPlayerModal } from './components/AddPlayerModal';
import {
  formatCurrency,
  exportTreasuryPDF,
} from './utils/exportUtils';
import {
  initializeCloudDatabaseIfEmpty,
  subscribeToPlayers,
  subscribeToTransactions,
  subscribeToSettings,
  subscribeToCategories,
  addPlayerToCloud,
  addMultiplePlayersToCloud,
  deletePlayerFromCloud,
  addTransactionToCloud,
  deleteTransactionFromCloud,
  updateTransactionInCloud,
  clearPlayerDebtInCloud,
  saveSettingsToCloud,
  saveCategoriesToCloud,
  resetCloudToSampleData,
  clearAllCloudData,
} from './services/firebaseSync';

export default function App() {
  // Transactions persistence
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('team_treasury_transactions');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((t: any) => t.type !== 'expense')
            .map((t: any) => ({ ...t, type: 'income' as const }));
        }
      } catch (e) {
        console.error('Failed to parse saved transactions', e);
      }
    }
    return INITIAL_TRANSACTIONS;
  });

  // Settings persistence
  const [settings, setSettings] = useState<TreasurySettings>(() => {
    const saved = localStorage.getItem('team_treasury_settings');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.teamName === 'FK Sokol - Týmová pokladna' || !parsed.teamName) {
          parsed.teamName = 'Ostrovan';
        }
        return parsed;
      } catch (e) {
        console.error('Failed to parse saved settings', e);
      }
    }
    return DEFAULT_SETTINGS;
  });

  // Categories persistence
  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('team_treasury_categories');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.some((c: string) => c.includes('ZÁPISNÉ'))) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse categories', e);
      }
    }
    return INITIAL_CATEGORIES;
  });

  // Players Roster persistence
  const [players, setPlayers] = useState<Player[]>(() => {
    const saved = localStorage.getItem('team_treasury_players');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse saved players', e);
      }
    }
    return INITIAL_PLAYERS;
  });

  // Real-time cloud database synchronization
  useEffect(() => {
    // 1. Initialize cloud Firestore database if it is empty
    initializeCloudDatabaseIfEmpty(players, transactions, settings, categories);

    // 2. Real-time listeners for live multi-device sync
    const unsubPlayers = subscribeToPlayers((cloudPlayers) => {
      if (cloudPlayers) {
        setPlayers(cloudPlayers);
        try {
          localStorage.setItem('team_treasury_players', JSON.stringify(cloudPlayers));
        } catch (e) {}
      }
    });

    const unsubTxs = subscribeToTransactions((cloudTxs) => {
      if (cloudTxs) {
        setTransactions(cloudTxs);
        try {
          localStorage.setItem('team_treasury_transactions', JSON.stringify(cloudTxs));
        } catch (e) {}
      }
    });

    const unsubSettings = subscribeToSettings((cloudSettings) => {
      if (cloudSettings) {
        setSettings(cloudSettings);
        try {
          localStorage.setItem('team_treasury_settings', JSON.stringify(cloudSettings));
        } catch (e) {}
      }
    });

    const unsubCats = subscribeToCategories((cloudCats) => {
      if (cloudCats) {
        setCategories(cloudCats);
        try {
          localStorage.setItem('team_treasury_categories', JSON.stringify(cloudCats));
        } catch (e) {}
      }
    });

    return () => {
      unsubPlayers();
      unsubTxs();
      unsubSettings();
      unsubCats();
    };
  }, []);

  // Sync to localStorage as local mirror
  useEffect(() => {
    localStorage.setItem('team_treasury_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('team_treasury_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('team_treasury_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('team_treasury_players', JSON.stringify(players));
  }, [players]);

  // Modals state
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);

  // Fast fine modal: clicking on any player opens this modal directly
  const [fineModalData, setFineModalData] = useState<{
    isOpen: boolean;
    playerName: string;
  }>({
    isOpen: false,
    playerName: '',
  });

  // Aggregated sums per player
  const membersSummary: MemberSummary[] = useMemo(() => {
    const map = new Map<string, MemberSummary>();

    // 1. Initialize registered players
    players.forEach((p) => {
      const cleanName = p.name.trim();
      if (!cleanName) return;

      map.set(cleanName, {
        id: p.id,
        name: cleanName,
        totalIncome: 0,
        transactionCount: 0,
        jerseyNumber: p.jerseyNumber,
        role: p.note,
      });
    });

    // 2. Sum up transactions
    transactions.forEach((tx) => {
      const cleanName = tx.name.trim();
      if (!cleanName) return;

      if (!map.has(cleanName)) {
        map.set(cleanName, {
          name: cleanName,
          totalIncome: 0,
          transactionCount: 0,
        });
      }

      const summary = map.get(cleanName)!;
      summary.transactionCount += 1;
      summary.totalIncome += tx.amount;
    });

    return Array.from(map.values()).sort((a, b) => b.totalIncome - a.totalIncome);
  }, [players, transactions]);

  // Total fines owed across the team
  const totalFinesOwed = useMemo(
    () => transactions.reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  );

  // Handlers with instant local update and cloud database sync
  const handleAddTransaction = (txData: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTx: Transaction = {
      ...txData,
      type: 'income',
      id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      createdAt: Date.now(),
    };

    setTransactions((prev) => {
      const next = [newTx, ...prev];
      try {
        localStorage.setItem('team_treasury_transactions', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    // Save to Firestore cloud database
    addTransactionToCloud(newTx);

    if (newTx.category && !categories.includes(newTx.category)) {
      const updatedCategories = [...categories, newTx.category];
      setCategories(updatedCategories);
      saveCategoriesToCloud(updatedCategories);
    }
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => {
      const next = prev.filter((t) => t.id !== id);
      try {
        localStorage.setItem('team_treasury_transactions', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    // Delete from Firestore cloud database
    deleteTransactionFromCloud(id);
  };

  // Update an existing fine amount or category
  const handleUpdateTransaction = (id: string, updated: Partial<Transaction>) => {
    setTransactions((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, ...updated } : t));
      try {
        localStorage.setItem('team_treasury_transactions', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    // Update in Firestore cloud database
    updateTransactionInCloud(id, updated);
  };

  // Clear / zero out all debt for a specific player (when player paid)
  const handleClearPlayerDebt = (playerName: string) => {
    const target = playerName.trim().toLowerCase();
    setTransactions((prev) => {
      const next = prev.filter((t) => t.name.trim().toLowerCase() !== target);
      try {
        localStorage.setItem('team_treasury_transactions', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    // Clear debt in Firestore cloud database
    clearPlayerDebtInCloud(playerName);
  };

  const handleOpenAddFine = (name?: string) => {
    setFineModalData({
      isOpen: true,
      playerName: name || '',
    });
  };

  const handleAddFineSubmit = (data: { name: string; amount: number; category: string }) => {
    handleAddTransaction({
      name: data.name,
      amount: data.amount,
      type: 'income',
      category: data.category,
      date: new Date().toISOString().slice(0, 10),
      paymentMethod: 'cash',
    });
  };

  const handleAddPlayer = (playerData: Omit<Player, 'id' | 'createdAt'>) => {
    const newPlayer: Player = {
      ...playerData,
      id: 'player-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      createdAt: Date.now(),
    };
    setPlayers((prev) => {
      const next = [...prev, newPlayer];
      try {
        localStorage.setItem('team_treasury_players', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    // Add to Firestore cloud database
    addPlayerToCloud(newPlayer);
  };

  const handleAddMultiplePlayers = (names: string[]) => {
    const newPlayers: Player[] = names.map((name, idx) => ({
      id: 'player-' + Date.now() + '-' + idx,
      name,
      createdAt: Date.now() + idx,
    }));
    setPlayers((prev) => {
      const next = [...prev, ...newPlayers];
      try {
        localStorage.setItem('team_treasury_players', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    // Add to Firestore cloud database
    addMultiplePlayersToCloud(newPlayers);
  };

  const handleDeletePlayer = (name: string) => {
    const targetName = name.trim().toLowerCase();
    const targetPlayer = players.find((p) => p.name.trim().toLowerCase() === targetName);

    // 1. Remove player from roster locally
    setPlayers((prev) => {
      const next = prev.filter((p) => p.name.trim().toLowerCase() !== targetName);
      try {
        localStorage.setItem('team_treasury_players', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    // 2. Remove all transactions of this player locally
    setTransactions((prev) => {
      const next = prev.filter((t) => t.name.trim().toLowerCase() !== targetName);
      try {
        localStorage.setItem('team_treasury_transactions', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    // 3. Delete from Firestore cloud database
    deletePlayerFromCloud(targetPlayer?.id || name, name);
  };

  const handleResetToSampleData = () => {
    setTransactions(INITIAL_TRANSACTIONS);
    setSettings(DEFAULT_SETTINGS);
    setCategories(INITIAL_CATEGORIES);
    setPlayers(INITIAL_PLAYERS);
    try {
      localStorage.setItem('team_treasury_transactions', JSON.stringify(INITIAL_TRANSACTIONS));
      localStorage.setItem('team_treasury_settings', JSON.stringify(DEFAULT_SETTINGS));
      localStorage.setItem('team_treasury_categories', JSON.stringify(INITIAL_CATEGORIES));
      localStorage.setItem('team_treasury_players', JSON.stringify(INITIAL_PLAYERS));
    } catch (e) {}

    // Reset in Firestore cloud database
    resetCloudToSampleData();
  };

  const handleClearAllData = () => {
    setTransactions([]);
    setPlayers([]);
    try {
      localStorage.setItem('team_treasury_transactions', JSON.stringify([]));
      localStorage.setItem('team_treasury_players', JSON.stringify([]));
    } catch (e) {}

    // Clear in Firestore cloud database
    clearAllCloudData();
  };

  const handleSaveSettings = (newSettings: TreasurySettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem('team_treasury_settings', JSON.stringify(newSettings));
    } catch (e) {}

    // Save to Firestore cloud database
    saveSettingsToCloud(newSettings);
  };

  const handleImportData = (data: {
    settings?: TreasurySettings;
    transactions: Transaction[];
    players?: Player[];
  }) => {
    if (data.settings) {
      setSettings(data.settings);
      try {
        localStorage.setItem('team_treasury_settings', JSON.stringify(data.settings));
      } catch (e) {}
    }
    if (data.transactions) {
      const sanitized = data.transactions
        .filter((t: any) => t.type !== 'expense')
        .map((t: any) => ({ ...t, type: 'income' as const }));
      setTransactions(sanitized);
      try {
        localStorage.setItem('team_treasury_transactions', JSON.stringify(sanitized));
      } catch (e) {}
    }
    if (data.players && Array.isArray(data.players)) {
      setPlayers(data.players);
      try {
        localStorage.setItem('team_treasury_players', JSON.stringify(data.players));
      } catch (e) {}
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/80 pb-12 font-sans text-slate-800 antialiased">
      {/* Top Club Tricolor Accent Ribbon */}
      <div className="h-1.5 w-full flex">
        <div className="h-full flex-1 bg-blue-700" />
        <div className="h-full w-10 bg-white" />
        <div className="h-full flex-1 bg-red-600" />
      </div>

      {/* Mobile-First Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-md mx-auto px-3.5 h-14 flex items-center justify-between gap-2">
          {/* Logo & Club Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-900 to-red-600 p-0.5 shadow-xs flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center font-black text-sm">
                <span className="text-blue-900">O</span>
                <span className="text-red-600 text-xs">✦</span>
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-extrabold text-blue-950 tracking-tight leading-none truncate">
                  {settings.teamName}
                </h1>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-red-100 text-red-700 border border-red-200 shrink-0">
                  Pokuty
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-none">
                Fotbalový sazebník kasy
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Direct Add Fine Button - Red Plus only */}
            <button
              type="button"
              onClick={() => handleOpenAddFine()}
              className="w-8 h-8 rounded-xl bg-red-600 hover:bg-red-700 active:scale-90 text-white shadow-xs transition-all flex items-center justify-center cursor-pointer"
              title="Zadat pokutu"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>

            {/* Print button */}
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="p-1.5 rounded-xl text-slate-600 hover:text-blue-950 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Tiskový výpis"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Settings button */}
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-1.5 rounded-xl text-slate-600 hover:text-blue-950 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Nastavení"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area - Single Column Mobile Layout */}
      <main className="max-w-md mx-auto px-3.5 pt-3.5 space-y-3">
        {/* Metric Card: Celkový dluh */}
        <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 text-white rounded-2xl p-4 shadow-xs border-b-4 border-red-600 relative overflow-hidden">
          <div className="text-xs font-bold text-red-300 uppercase tracking-wider mb-1">
            Celkový dluh na pokutách
          </div>

          <div className="text-3xl font-black tracking-tight text-white mt-1">
            {formatCurrency(totalFinesOwed, settings.currency)}
          </div>

          <div className="pt-2.5 mt-2.5 border-t border-white/10 flex items-center justify-between text-xs text-blue-100">
            <span className="font-semibold text-blue-200">Klub Ostrovan</span>
            <button
              type="button"
              onClick={() => handleOpenAddFine()}
              className="inline-flex items-center gap-1 font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Zadat pokutu
            </button>
          </div>
        </div>

        {/* Players List with Debts */}
        <div>
          <MembersSummaryView
            members={membersSummary}
            transactions={transactions}
            settings={settings}
            onOpenAddFineModal={handleOpenAddFine}
            onOpenAddPlayerModal={() => setIsAddPlayerModalOpen(true)}
            onDeletePlayer={handleDeletePlayer}
          />
        </div>
      </main>

      {/* Direct Fine Modal with player history and deletion */}
      <AddFineModal
        isOpen={fineModalData.isOpen}
        onClose={() => setFineModalData({ isOpen: false, playerName: '' })}
        playerName={fineModalData.playerName}
        existingPlayers={membersSummary}
        categories={categories}
        currency={settings.currency}
        onAddFine={handleAddFineSubmit}
        playerFines={transactions}
        onDeleteFine={handleDeleteTransaction}
        onDeletePlayer={handleDeletePlayer}
        onClearPlayerDebt={handleClearPlayerDebt}
        onUpdateFine={handleUpdateTransaction}
      />

      {/* Add Player Modal */}
      <AddPlayerModal
        isOpen={isAddPlayerModalOpen}
        onClose={() => setIsAddPlayerModalOpen(false)}
        onAddPlayer={handleAddPlayer}
        onAddMultiplePlayers={handleAddMultiplePlayers}
        existingPlayers={players}
      />

      {/* Print Statement Modal */}
      <PrintReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        transactions={transactions}
        membersSummary={membersSummary}
        settings={settings}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onResetToSampleData={handleResetToSampleData}
        onClearAllData={handleClearAllData}
        transactions={transactions}
        onImportData={handleImportData}
      />
    </div>
  );
}
