import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { X, QrCode as QrIcon, Copy, Check, Smartphone, AlertCircle } from 'lucide-react';
import { TreasurySettings } from '../types';
import { formatCurrency } from '../utils/exportUtils';
import { generateSpaydString as buildSpayd } from '../utils/spayd';

interface QrPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberName: string;
  suggestedAmount?: number;
  settings: TreasurySettings;
}

export const QrPaymentModal: React.FC<QrPaymentModalProps> = ({
  isOpen,
  onClose,
  memberName,
  suggestedAmount,
  settings,
}) => {
  const [amount, setAmount] = useState<string>(suggestedAmount ? suggestedAmount.toString() : '100');
  const [account, setAccount] = useState<string>(settings.bankAccount || '123456789/0800');
  const [message, setMessage] = useState<string>(`Pokuta Ostrovan - ${memberName}`);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (suggestedAmount) {
      setAmount(suggestedAmount.toString());
    }
    if (memberName) {
      setMessage(`Pokuta Ostrovan - ${memberName}`);
    }
  }, [memberName, suggestedAmount]);

  useEffect(() => {
    if (!isOpen) return;

    const parsedAmount = parseFloat(amount);
    const spaydString = buildSpayd({
      account: account,
      amount: !isNaN(parsedAmount) && parsedAmount > 0 ? parsedAmount : undefined,
      message: message,
    });

    if (spaydString) {
      QRCode.toDataURL(
        spaydString,
        {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 280,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        },
        (err, url) => {
          if (!err && url) {
            setQrDataUrl(url);
          }
        }
      );
    }
  }, [isOpen, account, amount, message]);

  if (!isOpen) return null;

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(account);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <QrIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">QR Platba pro {memberName}</h3>
              <p className="text-xs text-slate-500">Český standard SPAYD pro mobilní bankovnictví</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-bold text-slate-600 mb-1">Částka ({settings.currency})</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-600 mb-1">Bankovní účet týmu</label>
            <input
              type="text"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder="123456789/0800"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-600 text-xs mb-1">Zpráva pro příjemce</label>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* QR Code Canvas / Image Display */}
        <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
          {qrDataUrl ? (
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 text-center">
              <img src={qrDataUrl} alt="QR Platba" className="w-52 h-52 mx-auto" />
              <div className="mt-1 text-[11px] font-bold text-slate-500 tracking-wider">
                QR PLATBA (SPAYD)
              </div>
            </div>
          ) : (
            <div className="h-52 flex items-center justify-center text-xs text-slate-400">
              Generuji QR kód...
            </div>
          )}

          <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <span>Naskenujte fotoaparátem v mobilním bankovnictví</span>
          </div>
        </div>

        {/* Quick copy account details */}
        <div className="flex items-center justify-between p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs">
          <div>
            <div className="font-semibold text-slate-700">Číslo účtu: <span className="font-mono font-bold">{account}</span></div>
            <div className="text-[11px] text-slate-500">Částka: <span className="font-bold">{amount} {settings.currency}</span></div>
          </div>
          <button
            onClick={handleCopyAccount}
            className="px-2.5 py-1.5 rounded-lg bg-white border border-indigo-200 text-indigo-700 font-semibold hover:bg-indigo-50 flex items-center gap-1 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Zkopírováno' : 'Kopírovat'}
          </button>
        </div>

        {/* Footer */}
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer"
        >
          Zavřít
        </button>
      </div>
    </div>
  );
};
