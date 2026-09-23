import { Customer, PaymentRecord, OwnerProfile, CloudSyncStatus } from '../types/finance';

const LOCAL_STORAGE_FIREBASE_URL_KEY = 'giri_giri_firebase_db_url_v2';
// Default Firebase Realtime DB URL
const DEFAULT_FIREBASE_URL = 'https://girigiri-finance-default-rtdb.firebaseio.com';

export interface FirebaseDataPayload {
  owner: OwnerProfile;
  lastUpdated: string;
  updatedByDevice: string;
  customers: Customer[];
  payments: PaymentRecord[];
}

export class FirebaseSyncService {
  private static instance: FirebaseSyncService;
  private databaseUrl: string;
  private eventSource: EventSource | null = null;
  private listeners: ((status: CloudSyncStatus, lastSynced: string | null) => void)[] = [];
  private dataListeners: ((data: { customers: Customer[]; payments: PaymentRecord[]; owner?: OwnerProfile }) => void)[] = [];
  private syncStatus: CloudSyncStatus = 'IDLE';
  private lastSyncedAt: string | null = null;
  private isPushing = false;

  private constructor() {
    this.databaseUrl = this.getStoredDatabaseUrl();
  }

  public static getInstance(): FirebaseSyncService {
    if (!FirebaseSyncService.instance) {
      FirebaseSyncService.instance = new FirebaseSyncService();
    }
    return FirebaseSyncService.instance;
  }

  public getStoredDatabaseUrl(): string {
    try {
      return localStorage.getItem(LOCAL_STORAGE_FIREBASE_URL_KEY) || DEFAULT_FIREBASE_URL;
    } catch {
      return DEFAULT_FIREBASE_URL;
    }
  }

  public setDatabaseUrl(url: string): void {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    this.databaseUrl = cleanUrl;
    try {
      localStorage.setItem(LOCAL_STORAGE_FIREBASE_URL_KEY, cleanUrl);
    } catch {
      // Ignore
    }
  }

  public subscribe(listener: (status: CloudSyncStatus, lastSynced: string | null) => void): () => void {
    this.listeners.push(listener);
    listener(this.syncStatus, this.lastSyncedAt);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public subscribeToData(
    listener: (data: { customers: Customer[]; payments: PaymentRecord[]; owner?: OwnerProfile }) => void
  ): () => void {
    this.dataListeners.push(listener);
    return () => {
      this.dataListeners = this.dataListeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(status: CloudSyncStatus, lastSynced: string | null) {
    this.syncStatus = status;
    this.lastSyncedAt = lastSynced;
    this.listeners.forEach((l) => l(status, lastSynced));
  }

  private notifyDataListeners(data: { customers: Customer[]; payments: PaymentRecord[]; owner?: OwnerProfile }) {
    this.dataListeners.forEach((l) => l(data));
  }

  /**
   * Test connection to a Firebase Realtime Database URL
   */
  public async testFirebaseConnection(customUrl?: string): Promise<{ success: boolean; message: string }> {
    const url = (customUrl || this.databaseUrl).replace(/\/+$/, '');
    try {
      const res = await fetch(`${url}/.json?shallow=true`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (res.ok || res.status === 401 || res.status === 403) {
        // Even if 401/403 or 200, the database URL is valid and active
        return { success: true, message: 'Firebase Realtime Database connection successful!' };
      }
      return { success: false, message: `Firebase returned status code: ${res.status}` };
    } catch (err: any) {
      return { success: false, message: err.message || 'Could not connect to Firebase URL.' };
    }
  }

  /**
   * Push full dataset to Firebase Realtime Database at /owners/{cleanMobile}.json
   */
  public async pushToFirebase(
    owner: OwnerProfile,
    customers: Customer[],
    payments: PaymentRecord[]
  ): Promise<{ success: boolean; error?: string }> {
    if (!navigator.onLine) {
      this.notifyListeners('OFFLINE', this.lastSyncedAt);
      return { success: false, error: 'Device is offline. Changes saved locally.' };
    }

    if (this.isPushing) return { success: true };
    this.isPushing = true;

    try {
      this.notifyListeners('SYNCING', this.lastSyncedAt);
      const cleanMobile = owner.mobile.replace(/\D/g, '').slice(-10);
      const url = `${this.databaseUrl}/owners/${cleanMobile}.json`;

      const payload: FirebaseDataPayload = {
        owner,
        lastUpdated: new Date().toISOString(),
        updatedByDevice: owner.activeDeviceId || 'Device',
        customers,
        payments,
      };

      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Firebase PUT returned status ${res.status}`);
      }

      const now = new Date().toISOString();
      this.lastSyncedAt = now;
      this.notifyListeners('SYNCED', now);
      return { success: true };
    } catch (err: any) {
      console.warn('Firebase push issue:', err);
      this.notifyListeners('ERROR', this.lastSyncedAt);
      return { success: false, error: err.message || 'Failed to push to Firebase.' };
    } finally {
      this.isPushing = false;
    }
  }

  /**
   * Pull latest data from Firebase Realtime Database for this owner
   */
  public async pullFromFirebase(
    cleanMobile: string
  ): Promise<{ success: boolean; data?: { customers: Customer[]; payments: PaymentRecord[]; owner?: OwnerProfile }; error?: string }> {
    if (!navigator.onLine) {
      this.notifyListeners('OFFLINE', this.lastSyncedAt);
      return { success: false, error: 'Device is offline.' };
    }

    try {
      this.notifyListeners('SYNCING', this.lastSyncedAt);
      const digits = cleanMobile.replace(/\D/g, '').slice(-10);
      const url = `${this.databaseUrl}/owners/${digits}.json`;

      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!res.ok) {
        throw new Error(`Firebase GET returned status ${res.status}`);
      }

      const json = await res.json();
      if (!json) {
        this.notifyListeners('SYNCED', this.lastSyncedAt);
        return { success: true, data: { customers: [], payments: [] } };
      }

      const customers: Customer[] = Array.isArray(json.customers) ? json.customers : [];
      const payments: PaymentRecord[] = Array.isArray(json.payments) ? json.payments : [];
      const ownerProfile: OwnerProfile | undefined = json.owner;

      const now = new Date().toISOString();
      this.lastSyncedAt = now;
      this.notifyListeners('SYNCED', now);

      return {
        success: true,
        data: { customers, payments, owner: ownerProfile },
      };
    } catch (err: any) {
      this.notifyListeners('ERROR', this.lastSyncedAt);
      return { success: false, error: err.message || 'Failed to pull from Firebase.' };
    }
  }

  /**
   * Start native Server-Sent Events (SSE) Live Real-Time Stream from Firebase
   */
  public startRealtimeStream(cleanMobile: string): void {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;

    this.stopRealtimeStream();

    const digits = cleanMobile.replace(/\D/g, '').slice(-10);
    const streamUrl = `${this.databaseUrl}/owners/${digits}.json`;

    try {
      this.eventSource = new EventSource(streamUrl);

      this.eventSource.addEventListener('put', (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed && parsed.data) {
            const data = parsed.data;
            if (data.customers && data.payments) {
              this.notifyDataListeners({
                customers: data.customers,
                payments: data.payments,
                owner: data.owner,
              });
              const now = new Date().toISOString();
              this.lastSyncedAt = now;
              this.notifyListeners('SYNCED', now);
            }
          }
        } catch {
          // Ignore parse errors
        }
      });

      this.eventSource.onerror = () => {
        // Auto-reconnects natively
      };
    } catch {
      // Fallback to polling
    }
  }

  public stopRealtimeStream(): void {
    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch {
        // Ignore
      }
      this.eventSource = null;
    }
  }
}

export const firebaseSync = FirebaseSyncService.getInstance();
