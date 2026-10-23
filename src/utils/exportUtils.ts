import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, MemberSummary, TreasurySettings } from '../types';

/**
 * Remove or transliterate Czech accents for jsPDF built-in fonts (Helvetica)
 * to avoid encoding issues and square boxes.
 */
export function removeDiacritics(str: string): string {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Format currency amount with Czech standard spacing
 */
export function formatCurrency(amount: number, currency = 'Kč'): string {
  const formatted = new Intl.NumberFormat('cs-CZ', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);
  return `${formatted} ${currency}`;
}

export function formatDateCzech(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parseInt(parts[2], 10)}. ${parseInt(parts[1], 10)}. ${parts[0]}`;
  }
  return dateStr;
}

/**
 * Download a file in the browser
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export all fine transactions to CSV with UTF-8 BOM for Czech Excel compatibility
 * Purely informative without dates, payment methods or notes
 */
export function exportTransactionsToCSV(
  transactions: Transaction[],
  settings: TreasurySettings
): void {
  const bom = '\uFEFF';
  const delimiter = ';';

  const headers = [
    'Jméno hráče',
    'Pokuta (Dluží)',
    'Měna',
    'Chyba na fotbale / Důvod pokuty',
  ];

  const rows = transactions.map((t) => [
    `"${(t.name || '').replace(/"/g, '""')}"`,
    t.amount,
    settings.currency,
    `"${(t.category || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent =
    bom +
    [headers.join(delimiter), ...rows.map((r) => r.join(delimiter))].join('\r\n');

  const safeTitle = settings.teamName.toLowerCase().replace(/[^a-z0-9]/gi, '_');
  downloadFile(
    csvContent,
    `${safeTitle}_fotbalove_pokuty.csv`,
    'text/csv;charset=utf-8;'
  );
}

/**
 * Export aggregated member summaries to CSV
 */
export function exportMembersSummaryToCSV(
  members: MemberSummary[],
  settings: TreasurySettings
): void {
  const bom = '\uFEFF';
  const delimiter = ';';

  const headers = [
    'Jméno hráče',
    'Celkem dluží na pokutách',
    'Počet pokut',
    'Stav',
  ];

  const rows = members.map((m) => {
    const statusText = m.totalIncome > 0 ? `Dluží ${m.totalIncome} ${settings.currency}` : 'Čisté konto (bez pokuty)';

    return [
      `"${m.name.replace(/"/g, '""')}"`,
      m.totalIncome,
      m.transactionCount,
      `"${statusText}"`,
    ];
  });

  const csvContent =
    bom +
    [headers.join(delimiter), ...rows.map((r) => r.join(delimiter))].join('\r\n');

  const safeTitle = settings.teamName.toLowerCase().replace(/[^a-z0-9]/gi, '_');
  downloadFile(
    csvContent,
    `${safeTitle}_prehled_dluzniku.csv`,
    'text/csv;charset=utf-8;'
  );
}

/**
 * Export treasury fine report to PDF
 * Centered text, large readable font, clean football treasury layout
 */
export function exportTreasuryPDF(
  transactions: Transaction[],
  members: MemberSummary[],
  settings: TreasurySettings
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const totalCollected = transactions.reduce((sum, t) => sum + t.amount, 0);
  const today = new Date().toLocaleDateString('cs-CZ');
  const cleanTeamName = removeDiacritics(settings.teamName || 'Ostrovan').toUpperCase();
  const cleanCurrency = removeDiacritics(settings.currency || 'Kc');

  // Page width is 210mm, horizontal center is 105mm
  const centerX = 105;

  // 1. Club Header (Centered, bold, prominent)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text(cleanTeamName, centerX, 20, { align: 'center' });

  // 2. Subtitle (Centered, red bold)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(185, 28, 28); // Red 700
  doc.text('PREHLED POKUT A DLUHU HRACU', centerX, 27, { align: 'center' });

  // 3. Date & Player Count (Centered, subtle)
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text(`Vystaveno k: ${today}  |  Aktivnich hracu na soupisce: ${members.length}`, centerX, 33, {
    align: 'center',
  });

  // 4. Centered Total Debt Badge
  const badgeWidth = 140;
  const badgeX = centerX - badgeWidth / 2;
  doc.setFillColor(254, 242, 242); // Red 50
  doc.setDrawColor(252, 165, 165); // Red 300
  doc.roundedRect(badgeX, 38, badgeWidth, 20, 3, 3, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(153, 27, 27); // Red 800
  doc.text('CELKOVY DLUH NA POKUTACH', centerX, 44.5, { align: 'center' });

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(185, 28, 28); // Red 700
  doc.text(`${totalCollected.toLocaleString('cs-CZ')} ${cleanCurrency}`, centerX, 53.5, {
    align: 'center',
  });

  // 5. Centered Table of Players & Debts
  const memberTableData: string[][] = members.map((m) => [
    removeDiacritics(m.name),
    m.totalIncome > 0 ? `${m.totalIncome.toLocaleString('cs-CZ')} ${cleanCurrency}` : `0 ${cleanCurrency}`,
    m.totalIncome > 0 ? 'DLUZI' : 'CISTE KONTO',
  ]);

  autoTable(doc, {
    startY: 64,
    head: [['JMENO HRACE', 'DLUH NA POKUTACH', 'STAV']],
    body: memberTableData,
    foot: [
      [
        'CELKEM K UHRADE',
        `${totalCollected.toLocaleString('cs-CZ')} ${cleanCurrency}`,
        totalCollected > 0 ? 'K VYBERU' : 'VSE UHRAZENO',
      ],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138], // Royal Navy Blue
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 11,
      halign: 'center',
      valign: 'middle',
      cellPadding: 4,
    },
    bodyStyles: {
      fontSize: 10.5,
      textColor: [30, 41, 59],
      halign: 'center',
      valign: 'middle',
      cellPadding: 3.8,
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [185, 28, 28],
      fontStyle: 'bold',
      fontSize: 11,
      halign: 'center',
      valign: 'middle',
      cellPadding: 4,
    },
    columnStyles: {
      0: { halign: 'center', fontStyle: 'bold', cellWidth: 70 },
      1: { halign: 'center', fontStyle: 'bold', textColor: [185, 28, 28], cellWidth: 60 },
      2: { halign: 'center', fontStyle: 'bold', cellWidth: 46 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 17, right: 17 },
  });

  // 6. Centered Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Klubova pokladna ${cleanTeamName}  •  Strana ${i} z ${pageCount}`,
      centerX,
      288,
      { align: 'center' }
    );
  }

  const safeTitle = (settings.teamName || 'ostrovan').toLowerCase().replace(/[^a-z0-9]/gi, '_');
  doc.save(`${safeTitle}_prehled_pokut.pdf`);
}
