import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  updateDoc,
  writeBatch,
  getDocs,
  query,
  where,
  getDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Player, Transaction, TreasurySettings } from '../types';
import {
  INITIAL_PLAYERS,
  INITIAL_TRANSACTIONS,
  DEFAULT_SETTINGS,
  INITIAL_CATEGORIES,
} from '../data/initialData';

const PLAYERS_COL = 'players';
const TRANSACTIONS_COL = 'transactions';
const SETTINGS_DOC = 'main';
const CATEGORIES_DOC = 'categories';

/**
 * Initializes Firestore with existing or default data if the database is empty
 */
export async function initializeCloudDatabaseIfEmpty(
  localPlayers: Player[],
  localTransactions: Transaction[],
  localSettings: TreasurySettings,
  localCategories: string[]
): Promise<void> {
  try {
    const settingsRef = doc(db, 'settings', SETTINGS_DOC);
    const settingsSnap = await getDoc(settingsRef);

    if (!settingsSnap.exists()) {
      console.log('Seeding cloud Firestore database...');
      const batch = writeBatch(db);

      // 1. Settings
      batch.set(settingsRef, localSettings.teamName ? localSettings : DEFAULT_SETTINGS);

      // 2. Categories
      const categoriesRef = doc(db, 'settings', CATEGORIES_DOC);
      batch.set(categoriesRef, {
        list: localCategories.length > 0 ? localCategories : INITIAL_CATEGORIES,
      });

      // 3. Players (use local if available, else default)
      const playersToSeed = localPlayers.length > 0 ? localPlayers : INITIAL_PLAYERS;
      for (const p of playersToSeed) {
        batch.set(doc(db, PLAYERS_COL, p.id), p);
      }

      // 4. Transactions (use local if available, else default)
      const txsToSeed = localTransactions.length > 0 ? localTransactions : INITIAL_TRANSACTIONS;
      for (const t of txsToSeed) {
        batch.set(doc(db, TRANSACTIONS_COL, t.id), t);
      }

      await batch.commit();
      console.log('Cloud Firestore database seeded successfully!');
    }
  } catch (error) {
    console.error('Error during cloud initialization:', error);
  }
}

/**
 * Real-time subscription to players collection
 */
export function subscribeToPlayers(
  onData: (players: Player[]) => void,
  onError?: (err: any) => void
): () => void {
  const colRef = collection(db, PLAYERS_COL);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const players: Player[] = [];
      snapshot.forEach((d) => {
        players.push(d.data() as Player);
      });
      // Sort players by creation time or jersey
      players.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      onData(players);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, PLAYERS_COL);
      onError?.(err);
    }
  );
}

/**
 * Real-time subscription to transactions collection
 */
export function subscribeToTransactions(
  onData: (transactions: Transaction[]) => void,
  onError?: (err: any) => void
): () => void {
  const colRef = collection(db, TRANSACTIONS_COL);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const txs: Transaction[] = [];
      snapshot.forEach((d) => {
        txs.push(d.data() as Transaction);
      });
      // Sort newest first
      txs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      onData(txs);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, TRANSACTIONS_COL);
      onError?.(err);
    }
  );
}

/**
 * Real-time subscription to main settings
 */
export function subscribeToSettings(
  onData: (settings: TreasurySettings) => void,
  onError?: (err: any) => void
): () => void {
  const docRef = doc(db, 'settings', SETTINGS_DOC);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        onData(snap.data() as TreasurySettings);
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, 'settings/main');
      onError?.(err);
    }
  );
}

/**
 * Real-time subscription to fine categories list
 */
export function subscribeToCategories(
  onData: (categories: string[]) => void,
  onError?: (err: any) => void
): () => void {
  const docRef = doc(db, 'settings', CATEGORIES_DOC);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists() && Array.isArray(snap.data()?.list)) {
        onData(snap.data()?.list as string[]);
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, 'settings/categories');
      onError?.(err);
    }
  );
}

/**
 * Add or overwrite a player in Firestore
 */
export async function addPlayerToCloud(player: Player): Promise<void> {
  const docRef = doc(db, PLAYERS_COL, player.id);
  try {
    await setDoc(docRef, player);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${PLAYERS_COL}/${player.id}`);
  }
}

/**
 * Add multiple players in a batch to Firestore
 */
export async function addMultiplePlayersToCloud(players: Player[]): Promise<void> {
  const batch = writeBatch(db);
  for (const p of players) {
    batch.set(doc(db, PLAYERS_COL, p.id), p);
  }
  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, PLAYERS_COL);
  }
}

/**
 * Delete a player and all their associated transactions from Firestore
 */
export async function deletePlayerFromCloud(playerId: string, playerName: string): Promise<void> {
  try {
    // 1. Delete player document
    await deleteDoc(doc(db, PLAYERS_COL, playerId));

    // 2. Query and delete all transactions of this player
    const cleanTarget = playerName.trim().toLowerCase();
    const q = query(collection(db, TRANSACTIONS_COL));
    const snap = await getDocs(q);

    const batch = writeBatch(db);
    let count = 0;
    snap.forEach((d) => {
      const data = d.data() as Transaction;
      if (data.name && data.name.trim().toLowerCase() === cleanTarget) {
        batch.delete(d.ref);
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${PLAYERS_COL}/${playerId}`);
  }
}

/**
 * Add fine transaction to Firestore
 */
export async function addTransactionToCloud(tx: Transaction): Promise<void> {
  const docRef = doc(db, TRANSACTIONS_COL, tx.id);
  try {
    await setDoc(docRef, tx);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${TRANSACTIONS_COL}/${tx.id}`);
  }
}

/**
 * Delete a specific transaction from Firestore
 */
export async function deleteTransactionFromCloud(txId: string): Promise<void> {
  const docRef = doc(db, TRANSACTIONS_COL, txId);
  try {
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${TRANSACTIONS_COL}/${txId}`);
  }
}

/**
 * Update transaction in Firestore
 */
export async function updateTransactionInCloud(
  txId: string,
  updated: Partial<Transaction>
): Promise<void> {
  const docRef = doc(db, TRANSACTIONS_COL, txId);
  try {
    await updateDoc(docRef, updated);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${TRANSACTIONS_COL}/${txId}`);
  }
}

/**
 * Clear all debt for a specific player (player paid all fines)
 */
export async function clearPlayerDebtInCloud(playerName: string): Promise<void> {
  try {
    const cleanTarget = playerName.trim().toLowerCase();
    const snap = await getDocs(collection(db, TRANSACTIONS_COL));
    const batch = writeBatch(db);
    let count = 0;

    snap.forEach((d) => {
      const data = d.data() as Transaction;
      if (data.name && data.name.trim().toLowerCase() === cleanTarget) {
        batch.delete(d.ref);
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, TRANSACTIONS_COL);
  }
}

/**
 * Save club settings to Firestore
 */
export async function saveSettingsToCloud(settings: TreasurySettings): Promise<void> {
  const docRef = doc(db, 'settings', SETTINGS_DOC);
  try {
    await setDoc(docRef, settings, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'settings/main');
  }
}

/**
 * Save fine categories list to Firestore
 */
export async function saveCategoriesToCloud(categories: string[]): Promise<void> {
  const docRef = doc(db, 'settings', CATEGORIES_DOC);
  try {
    await setDoc(docRef, { list: categories });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'settings/categories');
  }
}

/**
 * Reset all cloud data to initial sample data
 */
export async function resetCloudToSampleData(): Promise<void> {
  try {
    // 1. Delete all current players & transactions
    const pSnap = await getDocs(collection(db, PLAYERS_COL));
    const tSnap = await getDocs(collection(db, TRANSACTIONS_COL));

    const deleteBatch = writeBatch(db);
    pSnap.forEach((d) => deleteBatch.delete(d.ref));
    tSnap.forEach((d) => deleteBatch.delete(d.ref));
    await deleteBatch.commit();

    // 2. Re-seed sample data
    const batch = writeBatch(db);
    batch.set(doc(db, 'settings', SETTINGS_DOC), DEFAULT_SETTINGS);
    batch.set(doc(db, 'settings', CATEGORIES_DOC), { list: INITIAL_CATEGORIES });

    for (const p of INITIAL_PLAYERS) {
      batch.set(doc(db, PLAYERS_COL, p.id), p);
    }
    for (const t of INITIAL_TRANSACTIONS) {
      batch.set(doc(db, TRANSACTIONS_COL, t.id), t);
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'reset');
  }
}

/**
 * Clear all players and transactions from cloud
 */
export async function clearAllCloudData(): Promise<void> {
  try {
    const pSnap = await getDocs(collection(db, PLAYERS_COL));
    const tSnap = await getDocs(collection(db, TRANSACTIONS_COL));

    const batch = writeBatch(db);
    pSnap.forEach((d) => batch.delete(d.ref));
    tSnap.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'clear_all');
  }
}
