import React, { useState, useMemo } from 'react';
import {
  Search,
  FileSpreadsheet,
  FileText,
  Trash2,
  Edit2,
  Printer,
  Layers,
  ArrowUpDown,
} from 'lucide-react';
import { Transaction, MemberSummary, TreasurySettings } from '../types';
import {
  formatCurrency,
  exportTransactionsToCSV,
  exportTreasuryPDF,
} from '../utils/exportUtils';

interface TransactionListProps {
  transactions: Transaction[];
  settings: TreasurySettings;
  categories: string[];
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onOpenPrintModal: () => void;
  membersSummary: MemberSummary[];
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  settings,
  categories,
  onEditTransaction,
  onDeleteTransaction,
  onOpenPrintModal,
  membersSummary,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'amount_desc' | 'amount_asc' | 'name_asc'>('amount_desc');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        // Search
        if (searchTerm) {
          const s = searchTerm.toLowerCase();
          const matchName = t.name.toLowerCase().includes(s);
          const matchCat = t.category.toLowerCase().includes(s);
          if (!matchName && !matchCat) return false;
        }

        // Category
        if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'amount_desc') return b.amount - a.amount;
        if (sortBy === 'amount_asc') return a.amount - b.amount;
        if (sortBy === 'name_asc') return a.name.localeCompare(b.name, 'cs');
        return 0;
      });
  }, [transactions, searchTerm, categoryFilter, sortBy]);

  // Filtered total sum
  const filteredTotal = useMemo(
    () => filteredTransactions.reduce((sum, t) => sum + t.amount, 0),
    [filteredTransactions]
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6 space-y-5">
      {/* Top Header & Export Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold shadow-xs">
              <Layers className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-blue-950">
                Deník udělených pokut ({filteredTransactions.length} z {transactions.length}) • Ostrovan
              </h2>
              <p className="text-xs text-slate-500">
                Evidence všech udělených pokut za chyby na fotbale (dlužné částky hráčů)
              </p>
            </div>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Export to CSV */}
          <button
            type="button"
            onClick={() => exportTransactionsToCSV(transactions, settings)}
            className="text-xs font-bold px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Exportovat všechny pokuty do tabulky CSV (Excel)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-700" />
            <span>Export CSV</span>
          </button>

          {/* Export to PDF */}
          <button
            type="button"
            onClick={() => exportTreasuryPDF(transactions, membersSummary, settings)}
            className="text-xs font-bold px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Stáhnout pokladní zprávu v PDF"
          >
            <FileText className="w-3.5 h-3.5 text-red-600" />
            <span>Export PDF</span>
          </button>

          {/* Print Statement */}
          <button
            type="button"
            onClick={onOpenPrintModal}
            className="text-xs font-bold px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Tiskový výpis"
          >
            <Printer className="w-3.5 h-3.5 text-slate-700" />
            <span>Tiskový výpis</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-blue-700 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Hledat hráče nebo chybu..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-700"
          />
        </div>

        {/* Category selector */}
        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:bg-white cursor-pointer"
          >
            <option value="all">Všechny důvody pokut</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Sorting */}
        <div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:bg-white cursor-pointer"
          >
            <option value="amount_desc">Od nejvyšší částky</option>
            <option value="amount_asc">Od nejnižší částky</option>
            <option value="name_asc">Podle jména hráče (A - Z)</option>
          </select>
        </div>
      </div>

      {/* Filter Summary */}
      {(categoryFilter !== 'all' || searchTerm) && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-blue-50/60 rounded-xl text-xs text-blue-950 border border-blue-100">
          <div className="flex items-center gap-2">
            <span className="font-bold">Nalezeno:</span>
            <span>{filteredTransactions.length} záznamů</span>
            <span>•</span>
            <span className="text-red-700 font-extrabold">
              Součet dluhu: {formatCurrency(filteredTotal, settings.currency)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setCategoryFilter('all');
            }}
            className="text-[11px] font-bold text-blue-700 hover:underline cursor-pointer"
          >
            Resetovat filtry
          </button>
        </div>
      )}

      {/* Transactions Table with Deep Royal Blue Header */}
      {filteredTransactions.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
          <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-600">Nebyly nalezeny žádné udělené pokuty</p>
          <p className="text-xs text-slate-400 mt-1">Zkuste upravit nastavené filtry nebo zadejte novou pokutu.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-blue-900 text-[11px] font-bold text-white uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3">Hráč</th>
                <th className="py-3 px-3 text-right">Pokuta (Dluží)</th>
                <th className="py-3 px-3">Chyba na fotbale (Důvod)</th>
                <th className="py-3 px-3 text-right">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-blue-50/40 transition-colors">
                  {/* Jméno */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-[10px]">
                        {tx.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-extrabold text-blue-950">{tx.name}</span>
                    </div>
                  </td>

                  {/* Částka */}
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <span className="font-extrabold text-sm text-red-600">
                      +{formatCurrency(tx.amount, settings.currency)}
                    </span>
                  </td>

                  {/* Kategorie */}
                  <td className="py-3 px-3">
                    <span className="font-semibold text-slate-900">{tx.category}</span>
                  </td>

                  {/* Akce */}
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    {deleteConfirmId === tx.id ? (
                      <div className="inline-flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-200">
                        <span className="text-[11px] font-bold text-red-700 px-1">Smazat?</span>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteTransaction(tx.id);
                            setDeleteConfirmId(null);
                          }}
                          className="text-[10px] font-bold bg-red-600 text-white px-2 py-0.5 rounded cursor-pointer"
                        >
                          Ano
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="text-[10px] font-semibold bg-white text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 cursor-pointer"
                        >
                          Ne
                        </button>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onEditTransaction(tx)}
                          className="p-1.5 text-slate-400 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Upravit pokutu"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(tx.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Smazat záznam"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
