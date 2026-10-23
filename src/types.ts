export type TransactionType = 'income';

export type PaymentMethod = 'cash' | 'transfer' | 'qr' | 'other';

export interface Transaction {
  id: string;
  name: string;
  amount: number; // positive incoming payment
  type: TransactionType;
  date: string; // YYYY-MM-DD
  category: string;
  paymentMethod: PaymentMethod;
  note?: string;
  createdAt: number;
}

export interface Player {
  id: string;
  name: string;
  jerseyNumber?: string;
  note?: string; // e.g. role, position
  createdAt: number;
}

export interface MemberSummary {
  id?: string;
  name: string;
  totalIncome: number; // celková sečtená částka člena
  transactionCount: number;
  lastDate?: string;
  jerseyNumber?: string;
  role?: string;
}

export interface TreasurySettings {
  teamName: string;
  currency: string;
  bankAccount?: string; // for QR payment generation
}

