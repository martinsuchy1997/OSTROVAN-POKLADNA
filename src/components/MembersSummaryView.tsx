import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  FileSpreadsheet,
  Trash2,
  ShieldAlert,
} from 'lucide-react';
import { MemberSummary, Transaction, TreasurySettings } from '../types';
import { formatCurrency, exportMembersSummaryToCSV } from '../utils/exportUtils';

interface MembersSummaryViewProps {
  members: MemberSummary[];
  transactions: Transaction[];
  settings: TreasurySettings;
  onOpenAddFineModal: (playerName: string) => void;
  onOpenAddPlayerModal: () => void;
  onDeletePlayer?: (name: string) => void;
  initialFilter?: 'debtors' | 'all' | 'clean';
}

export const MembersSummaryView: React.FC<MembersSummaryViewProps> = ({
  members,
  settings,
  onOpenAddFineModal,
  onOpenAddPlayerModal,
  onDeletePlayer,
  initialFilter = 'all',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'debtors' | 'all' | 'clean'>(initialFilter);
  const [deleteConfirmMember, setDeleteConfirmMember] = useState<string | null>(null);

  // Filtered and sorted members (highest debt first)
  const processedMembers = useMemo(() => {
    let result = members.filter((m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase().trim())
    );

    if (statusFilter === 'debtors') {
      result = result.filter((m) => m.totalIncome > 0);
    } else if (statusFilter === 'clean') {
      result = result.filter((m) => m.totalIncome === 0);
    }

    // Always sort by highest debt first, then alphabetical
    return [...result].sort((a, b) => {
      if (b.totalIncome !== a.totalIncome) {
        return b.totalIncome - a.totalIncome;
      }
      return a.name.localeCompare(b.name, 'cs');
    });
  }, [members, searchTerm, statusFilter]);

  const totalDebtorCount = useMemo(() => members.filter((m) => m.totalIncome > 0).length, [members]);
  const cleanCount = useMemo(() => members.filter((m) => m.totalIncome === 0).length, [members]);
  const filteredFinesSum = useMemo(
    () => processedMembers.reduce((sum, m) => sum + m.totalIncome, 0),
    [processedMembers]
  );

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-slate-200 overflow-hidden">
      {/* Top Section Header */}
      <div className="p-3.5 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center font-black shadow-xs shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-extrabold text-blue-950 truncate">
              {statusFilter === 'debtors'
                ? 'Hráči s dluhem'
                : statusFilter === 'clean'
                ? 'Hráči s čistým kontem'
                : 'Celá soupiska'} • Ostrovan
            </h2>
            <p className="text-[11px] text-slate-500 truncate">
              Klepněte na hráče pro zadání pokuty
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenAddPlayerModal}
            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white flex items-center gap-1 transition-colors shadow-xs cursor-pointer active:scale-95"
            title="Přidat hráče"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Hráč</span>
          </button>

          <button
            type="button"
            onClick={() => exportMembersSummaryToCSV(members, settings)}
            className="text-xs font-bold px-2.5 py-1.5 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
            title="Exportovat do CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-700" />
            <span className="hidden sm:inline ml-1">CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar (Mobile Optimized) */}
      <div className="p-3 sm:p-4 space-y-2.5 border-b border-slate-100">
        {/* 3 Mobile Filter Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setStatusFilter('debtors')}
            className={`py-2 px-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer text-center truncate ${
              statusFilter === 'debtors'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-700 hover:text-red-700'
            }`}
          >
            Dlužníci ({totalDebtorCount})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`py-2 px-1 rounded-lg text-xs font-bold transition-all cursor-pointer text-center truncate ${
              statusFilter === 'all'
                ? 'bg-blue-950 text-white shadow-xs'
                : 'text-slate-700 hover:text-blue-950'
            }`}
          >
            Všichni ({members.length})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('clean')}
            className={`py-2 px-1 rounded-lg text-xs font-bold transition-all cursor-pointer text-center truncate ${
              statusFilter === 'clean'
                ? 'bg-blue-800 text-white shadow-xs'
                : 'text-slate-700 hover:text-blue-800'
            }`}
          >
            Čisté ({cleanCount})
          </button>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Hledat hráče..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-700 transition-all font-medium"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 p-1"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Players List - Pristine Mobile Layout */}
      <div className="divide-y divide-slate-100">
        {processedMembers.length === 0 ? (
          <div className="text-center py-10 px-4">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs sm:text-sm font-semibold text-slate-700">
              {searchTerm
                ? `Žádný hráč neodpovídá "${searchTerm}"`
                : statusFilter === 'debtors'
                ? 'Žádný hráč momentálně nedluží! Všichni mají čisté konto.'
                : 'Zatím zde nejsou žádní hráči.'}
            </p>
            {statusFilter === 'debtors' && (
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className="mt-2 text-xs font-bold text-blue-700 hover:underline cursor-pointer"
              >
                Zobrazit všechny hráče
              </button>
            )}
          </div>
        ) : (
          processedMembers.map((member, index) => {
            const hasDebt = member.totalIncome > 0;

            return (
              <div
                key={member.name}
                onClick={() => onOpenAddFineModal(member.name)}
                className={`p-3 sm:p-3.5 flex items-center justify-between gap-3 transition-colors cursor-pointer select-none active:bg-slate-100/80 ${
                  hasDebt ? 'hover:bg-red-50/30' : 'hover:bg-blue-50/20'
                }`}
              >
                {/* Left: Rank, Avatar & Player Name */}
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Rank number */}
                  <span className="w-3.5 text-center font-bold text-slate-400 text-[11px] shrink-0">
                    {index + 1}.
                  </span>

                  {/* Player Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-900 to-blue-700 text-white font-bold text-xs flex items-center justify-center border border-red-500 shadow-2xs">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    {member.jerseyNumber && (
                      <span className="absolute -bottom-1 -right-1 bg-red-600 text-white text-[8px] font-black px-1 rounded-full border border-white">
                        #{member.jerseyNumber}
                      </span>
                    )}
                  </div>

                  {/* Player Name (Smaller, crisp) */}
                  <div className="min-w-0">
                    <div className="font-bold text-blue-950 text-xs sm:text-sm leading-tight truncate">
                      {member.name}
                    </div>
                  </div>
                </div>

                {/* Right: Debt amount & Red Plus button */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div
                      className={`text-xs sm:text-sm font-black ${
                        hasDebt ? 'text-red-600' : 'text-slate-400'
                      }`}
                    >
                      {formatCurrency(member.totalIncome, settings.currency)}
                    </div>
                  </div>

                  {/* Red Plus button only (no text Pokuta) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenAddFineModal(member.name);
                    }}
                    className="w-7 h-7 rounded-lg bg-red-600 hover:bg-red-700 active:scale-90 text-white flex items-center justify-center shadow-2xs transition-all cursor-pointer shrink-0"
                    title="Udělit pokutu"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                  </button>

                  {/* Delete player button */}
                  {onDeletePlayer && (
                    deleteConfirmMember === member.name ? (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 bg-red-100 p-1 rounded-lg border border-red-300 shadow-2xs"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeletePlayer(member.name);
                            setDeleteConfirmMember(null);
                          }}
                          className="text-[11px] font-black bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded-md cursor-pointer active:scale-95 shadow-xs"
                        >
                          Smazat
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmMember(null);
                          }}
                          className="text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-700 px-1.5 py-1 rounded-md border border-slate-300 cursor-pointer active:scale-95"
                        >
                          Zrušit
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmMember(member.name);
                        }}
                        className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 active:scale-90 flex items-center justify-center transition-all cursor-pointer shrink-0"
                        title={`Smazat hráče ${member.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Summary Footer */}
      <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
        <div>
          Zobrazeno: <strong className="text-blue-950 font-bold">{processedMembers.length}</strong> hráčů
        </div>
        <div className="font-bold">
          Součet dluhů:{' '}
          <span className="text-red-600 font-black text-sm">
            {formatCurrency(filteredFinesSum, settings.currency)}
          </span>
        </div>
      </div>
    </div>
  );
};
