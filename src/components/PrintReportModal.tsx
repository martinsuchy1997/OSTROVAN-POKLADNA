import React from 'react';
import { X, Printer, Download } from 'lucide-react';
import { Transaction, MemberSummary, TreasurySettings } from '../types';
import { formatCurrency, formatDateCzech, exportTreasuryPDF } from '../utils/exportUtils';

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  membersSummary: MemberSummary[];
  settings: TreasurySettings;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  transactions,
  membersSummary,
  settings,
}) => {
  if (!isOpen) return null;

  const totalCollected = transactions.reduce((sum, t) => sum + t.amount, 0);
  const today = new Date().toLocaleDateString('cs-CZ');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tricolor stripe at top */}
        <div className="no-print h-1.5 w-full flex">
          <div className="h-full flex-1 bg-blue-700" />
          <div className="h-full w-12 bg-white" />
          <div className="h-full flex-1 bg-red-600" />
        </div>

        {/* Modal Header */}
        <div className="no-print p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-900 text-white flex items-center justify-center font-black shadow-xs shrink-0">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-blue-950 text-sm sm:text-base leading-tight">
                Tisk a PDF výpis pokut
              </h3>
              <p className="text-[10px] text-slate-500">
                {settings.teamName} • Přehled kasy
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            title="Zavřít"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Buttons for Mobile */}
        <div className="no-print p-3 bg-slate-100/70 border-b border-slate-200 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => exportTreasuryPDF(transactions, membersSummary, settings)}
            className="py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Stáhnout PDF</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 active:scale-95 border border-slate-300 text-blue-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-blue-700" />
            <span>Vytisknout</span>
          </button>
        </div>

        {/* Scrollable Printable Document Preview Area */}
        <div className="p-3.5 sm:p-6 overflow-y-auto flex-1 font-sans text-slate-800 bg-white">
          <div id="printable-report" className="space-y-4">
            {/* Centered Header */}
            <div className="text-center pb-3 border-b-2 border-blue-950">
              <h1 className="text-xl sm:text-2xl font-black text-blue-950 tracking-tight uppercase">
                {settings.teamName}
              </h1>
              <div className="text-[11px] font-extrabold text-red-600 uppercase tracking-widest mt-0.5">
                Přehled pokut a dluhů hráčů
              </div>
              <div className="text-[10px] text-slate-500 mt-1 font-medium">
                Vyúčtování k: {today} • Počet hráčů: {membersSummary.length}
              </div>
            </div>

            {/* Centered Total Debt Badge */}
            <div className="max-w-[260px] mx-auto p-3 bg-red-50 border border-red-200 rounded-xl text-center">
              <div className="text-[10px] font-bold text-red-700 uppercase tracking-wider">
                Celkový dluh na pokutách
              </div>
              <div className="text-xl sm:text-2xl font-black text-red-600 mt-0.5 tracking-tight">
                {formatCurrency(totalCollected, settings.currency)}
              </div>
            </div>

            {/* Perfectly Aligned Centered Table for Mobile & Print */}
            <div className="w-full overflow-hidden rounded-xl border border-slate-300 shadow-2xs">
              <table className="w-full table-fixed text-center border-collapse">
                <thead className="bg-blue-950 text-white font-extrabold text-[11px] sm:text-xs">
                  <tr>
                    <th className="w-[45%] py-2.5 px-2 text-center border-b border-blue-900">
                      Jméno hráče
                    </th>
                    <th className="w-[30%] py-2.5 px-1 text-center border-b border-blue-900">
                      Dluh
                    </th>
                    <th className="w-[25%] py-2.5 px-1 text-center border-b border-blue-900">
                      Stav
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {membersSummary.map((m, idx) => (
                    <tr
                      key={m.name}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}
                    >
                      <td className="py-2.5 px-2 font-bold text-slate-900 text-center truncate">
                        {m.name}
                      </td>
                      <td className="py-2.5 px-1 text-center font-black text-red-600">
                        {m.totalIncome > 0
                          ? formatCurrency(m.totalIncome, settings.currency)
                          : `0 ${settings.currency}`}
                      </td>
                      <td className="py-2.5 px-1 text-center">
                        {m.totalIncome > 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded-md bg-red-100 text-red-700 font-extrabold text-[10px]">
                            Dluží
                          </span>
                        ) : (
                          <span className="inline-block px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            Čisté
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-black text-xs border-t-2 border-slate-300">
                  <tr>
                    <td className="py-2.5 px-2 text-center text-slate-900 uppercase font-extrabold text-[11px]">
                      Celkem k úhradě
                    </td>
                    <td className="py-2.5 px-1 text-center text-red-600 font-black text-xs sm:text-sm">
                      {formatCurrency(totalCollected, settings.currency)}
                    </td>
                    <td className="py-2.5 px-1 text-center text-[10px] text-red-700 font-extrabold uppercase">
                      {totalCollected > 0 ? 'K výběru' : 'Uhrazeno'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Centered Footer */}
            <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400 space-y-1.5">
              <div>Klubová pokladna {settings.teamName}</div>
              <div className="text-slate-300">
                Podpis pokladníka / zástupce: __________________________
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
