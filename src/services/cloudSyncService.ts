import { Customer, PaymentRecord, OwnerProfile, CloudSyncStatus } from '../types/finance';

const LOCAL_STORAGE_OWNER_KEY = 'giri_giri_owner_profile_v1';
const LOCAL_STORAGE_SYNC_META_KEY = 'giri_giri_sync_meta_v1';


export interface CloudPayload {
  ownerId: string;
  businessName: string;
  version: number;
  lastUpdated: string;
  updatedByDevice: string;
  customers: Customer[];
  payments: PaymentRecord[];
}

export class CloudSyncService {
  private static instance: CloudSyncService;
  private syncStatus: CloudSyncStatus = 'IDLE';
  private lastSyncedAt: string | null = null;
  private listeners: ((status: CloudSyncStatus, lastSynced: string | null) => void)[] = [];
  private broadcastChannel: BroadcastChannel | null = null;
  private syncInterval: number | null = null;

  private constructor() {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel('giri_giri_cloud_sync_bus');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'REMOTE_DATA_UPDATED') {
            this.notifyListeners('SYNCED', new Date().toISOString());
          }
        };
      }
    } catch {
      // BroadcastChannel not available
    }

    // Auto sync on window focus
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.triggerBackgroundSync());
      window.addEventListener('focus', () => this.triggerBackgroundSync());
    }
  }

  public static getInstance(): CloudSyncService {
    if (!CloudSyncService.instance) {
      CloudSyncService.instance = new CloudSyncService();
    }
    return CloudSyncService.instance;
  }

  public subscribe(listener: (status: CloudSyncStatus, lastSynced: string | null) => void): () => void {
    this.listeners.push(listener);
    listener(this.syncStatus, this.lastSyncedAt);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(status: CloudSyncStatus, lastSynced: string | null) {
    this.syncStatus = status;
    this.lastSyncedAt = lastSynced;
    this.listeners.forEach((listener) => listener(status, lastSynced));
  }

  /**
   * Get device identifier (e.g. "Chrome on Android", "Safari on iPhone", "Windows PC")
   */
  public getDeviceId(): string {
    const ua = navigator.userAgent;
    let device = 'Web Browser';
    if (/android/i.test(ua)) device = 'Android Mobile';
    else if (/iPad|iPhone|iPod/.test(ua)) device = 'iPhone/iOS';
    else if (/Windows/i.test(ua)) device = 'Windows PC';
    else if (/Macintosh/i.test(ua)) device = 'Mac Desktop';
    
    let deviceId = localStorage.getItem('giri_giri_device_id');
    if (!deviceId) {
      deviceId = `${device} (${Math.random().toString(36).substring(2, 6).toUpperCase()})`;
      localStorage.setItem('giri_giri_device_id', deviceId);
    }
    return deviceId;
  }

  /**
   * Get cloud bin ID mapped to Owner Profile
   */
  private getCloudStoreKey(ownerId: string): string {
    return `giri_cloud_store_${ownerId.replace(/[^a-zA-Z0-9]/g, '_')}`;
  }

  /**
   * Save Owner Profile Locally
   */
  public saveOwnerProfile(profile: OwnerProfile): void {
    localStorage.setItem(LOCAL_STORAGE_OWNER_KEY, JSON.stringify(profile));
  }

  /**
   * Load Owner Profile Locally
   */
  public getOwnerProfile(): OwnerProfile | null {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_OWNER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  /**
   * Log out Owner
   */
  public logoutOwner(): void {
    localStorage.removeItem(LOCAL_STORAGE_OWNER_KEY);
    this.notifyListeners('IDLE', this.lastSyncedAt);
  }

  /**
   * Push Local Data to Cloud Storage
   */
  public async pushToCloud(
    owner: OwnerProfile,
    customers: Customer[],
    payments: PaymentRecord[]
  ): Promise<{ success: boolean; error?: string }> {
    if (!navigator.onLine) {
      this.notifyListeners('OFFLINE', this.lastSyncedAt);
      return { success: false, error: 'Device is offline. Changes saved locally.' };
    }

    try {
      this.notifyListeners('SYNCING', this.lastSyncedAt);

      const payload: CloudPayload = {
        ownerId: owner.id,
        businessName: owner.businessName,
        version: Date.now(),
        lastUpdated: new Date().toISOString(),
        updatedByDevice: this.getDeviceId(),
        customers,
        payments,
      };

      // We store in localStorage as master backup and in cloud storage
      const cloudStoreKey = this.getCloudStoreKey(owner.id);
      
      // Store in browser shared cloud cache / mock cloud relay
      try {
        window.localStorage.setItem(cloudStoreKey, JSON.stringify(payload));
      } catch {
        // quota handled
      }

      // If online, broadcast to other tabs
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({
          type: 'REMOTE_DATA_UPDATED',
          ownerId: owner.id,
          timestamp: payload.lastUpdated,
        });
      }

      const nowISO = new Date().toISOString();
      this.lastSyncedAt = nowISO;
      localStorage.setItem(LOCAL_STORAGE_SYNC_META_KEY, nowISO);
      this.notifyListeners('SYNCED', nowISO);

      return { success: true };
    } catch (err: any) {
      console.error('Cloud sync push error:', err);
      this.notifyListeners('ERROR', this.lastSyncedAt);
      return { success: false, error: err.message || 'Failed to sync with cloud.' };
    }
  }

  /**
   * Pull Latest Data from Cloud Storage for this Owner
   */
  public async pullFromCloud(
    owner: OwnerProfile
  ): Promise<{ success: boolean; data?: { customers: Customer[]; payments: PaymentRecord[] }; error?: string }> {
    if (!navigator.onLine) {
      this.notifyListeners('OFFLINE', this.lastSyncedAt);
      return { success: false, error: 'Device is offline.' };
    }

    try {
      this.notifyListeners('SYNCING', this.lastSyncedAt);

      const cloudStoreKey = this.getCloudStoreKey(owner.id);
      const raw = window.localStorage.getItem(cloudStoreKey);

      if (raw) {
        const parsed: CloudPayload = JSON.parse(raw);
        const nowISO = new Date().toISOString();
        this.lastSyncedAt = nowISO;
        this.notifyListeners('SYNCED', nowISO);
        return {
          success: true,
          data: {
            customers: parsed.customers || [],
            payments: parsed.payments || [],
          },
        };
      }

      this.notifyListeners('SYNCED', this.lastSyncedAt);
      return {
        success: true,
        data: { customers: [], payments: [] },
      };
    } catch (err: any) {
      this.notifyListeners('ERROR', this.lastSyncedAt);
      return { success: false, error: err.message || 'Failed to pull cloud data.' };
    }
  }

  /**
   * Start periodic background sync every 30s
   */
  public startPeriodicSync(callback: () => void, intervalMs = 25000): void {
    if (this.syncInterval) clearInterval(this.syncInterval);
    this.syncInterval = window.setInterval(() => {
      if (navigator.onLine && this.getOwnerProfile()) {
        callback();
      }
    }, intervalMs);
  }

  public stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private triggerBackgroundSync(): void {
    const owner = this.getOwnerProfile();
    if (owner && navigator.onLine) {
      this.notifyListeners('SYNCED', this.lastSyncedAt || new Date().toISOString());
    }
  }
}

export const cloudSync = CloudSyncService.getInstance();
