
import { User, ChatSession, LabAsset, StudySession } from '../types';

const DB_NAME = 'StudyEasierDB';
const DB_VERSION = 2; // Incremented for new store

class StudyEasierDatabase {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
          console.error('IndexedDB failed to open. Assets will be session-only.');
          reject('Database failed to open');
        };

        request.onsuccess = () => {
          this.db = request.result;
          resolve();
        };

        request.onupgradeneeded = (event: any) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains('users')) {
            db.createObjectStore('users', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('chats')) {
            db.createObjectStore('chats', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('assets')) {
            db.createObjectStore('assets', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('study_sessions')) {
            db.createObjectStore('study_sessions', { keyPath: 'id' });
          }
        };
      } catch (e) {
        reject(e);
      }
    });

    return this.initPromise;
  }

  private async performAction(storeName: string, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest): Promise<any> {
    try {
      await this.init();
      if (!this.db) throw new Error("Database not initialized");
      
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        const request = action(store);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.warn(`Local DB Action Failed on ${storeName}:`, err);
      return mode === 'readonly' ? [] : null;
    }
  }

  async saveUser(user: any): Promise<void> {
    await this.performAction('users', 'readwrite', (s) => s.put(user));
  }

  async getUsers(): Promise<any[]> {
    return this.performAction('users', 'readonly', (s) => s.getAll());
  }

  async saveChat(chat: ChatSession): Promise<void> {
    await this.performAction('chats', 'readwrite', (s) => s.put(chat));
  }

  async getChats(userId: string): Promise<ChatSession[]> {
    const allChats: ChatSession[] = await this.performAction('chats', 'readonly', (s) => s.getAll());
    if (!Array.isArray(allChats)) return [];
    return allChats.filter(c => c.userId === userId).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async deleteChat(id: string): Promise<void> {
    await this.performAction('chats', 'readwrite', (s) => s.delete(id));
  }

  async saveAsset(asset: LabAsset): Promise<void> {
    await this.performAction('assets', 'readwrite', (s) => s.put(asset));
  }

  async getAssets(userId: string): Promise<LabAsset[]> {
    const allAssets: LabAsset[] = await this.performAction('assets', 'readonly', (s) => s.getAll());
    if (!Array.isArray(allAssets)) return [];
    return allAssets.filter(a => a.userId === userId).sort((a, b) => b.timestamp - a.timestamp);
  }

  async deleteAsset(id: string): Promise<void> {
    await this.performAction('assets', 'readwrite', (s) => s.delete(id));
  }

  async clearAssets(userId: string): Promise<void> {
    const assets = await this.getAssets(userId);
    if (!this.db) return;
    const transaction = this.db!.transaction('assets', 'readwrite');
    const store = transaction.objectStore('assets');
    assets.forEach(a => store.delete(a.id));
    return new Promise((res, rej) => {
      transaction.oncomplete = () => res();
      transaction.onerror = () => rej(transaction.error);
    });
  }

  async saveStudySession(session: StudySession): Promise<void> {
    await this.performAction('study_sessions', 'readwrite', (s) => s.put(session));
  }

  async getStudySessions(userId: string): Promise<StudySession[]> {
    const sessions: StudySession[] = await this.performAction('study_sessions', 'readonly', (s) => s.getAll());
    if (!Array.isArray(sessions)) return [];
    return sessions.filter(s => s.userId === userId).sort((a, b) => b.startTime - a.startTime);
  }
}

export const db = new StudyEasierDatabase();
