import { Customer, PaymentRecord, OwnerProfile, CloudSyncStatus } from '../types/finance';

const CLOUD_API_BASE = 'https://api.restful-api.dev/objects';
const MASTER_REGISTRY_ID = 'ff808181a09d98f701a0cc78e96d7580';
const LOCAL_STORAGE_OWNER_KEY = 'giri_giri_owner_profile_v2';
const LOCAL_STORAGE_SYNC_META_KEY = 'giri_giri_sync_meta_v2';

export interface CloudPayload {
  owner: OwnerProfile;
  lastUpdated: string;
  updatedByDevice: string;
  customers: Customer[];
  payments: PaymentRecord[];
}

interface MasterRegistryPayload {
  owners: {
    [cleanMobile: string]: {
      cloudRecordId: string;
      pin: string;
      ownerName: string;
      businessName: string;
      id: string;
      email?: string;
    };
  };
}

export class CloudSyncService {
  private static instance: CloudSyncService;
  private syncStatus: CloudSyncStatus = 'IDLE';
  private lastSyncedAt: string | null = null;
  private listeners: ((status: CloudSyncStatus, lastSynced: string | null) => void)[] = [];
  private broadcastChannel: BroadcastChannel | null = null;
  private syncInterval: number | null = null;
  private isPushing = false;
  private isPulling = false;

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
      // BroadcastChannel fallback
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.notifyListeners('SYNCED', this.lastSyncedAt));
      window.addEventListener('offline', () => this.notifyListeners('OFFLINE', this.lastSyncedAt));
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

  public getDeviceId(): string {
    if (typeof window === 'undefined') return 'Server Device';
    const ua = navigator.userAgent;
    let device = 'Web Browser';
    if (/android/i.test(ua)) device = 'Android Mobile';
    else if (/iPad|iPhone|iPod/.test(ua)) device = 'iPhone/iOS';
    else if (/Windows/i.test(ua)) device = 'Windows PC';
    else if (/Macintosh/i.test(ua)) device = 'Mac Desktop';

    let deviceId = localStorage.getItem('giri_giri_device_id_v2');
    if (!deviceId) {
      deviceId = `${device} (${Math.random().toString(36).substring(2, 6).toUpperCase()})`;
      localStorage.setItem('giri_giri_device_id_v2', deviceId);
    }
    return deviceId;
  }

  public saveOwnerProfile(profile: OwnerProfile): void {
    localStorage.setItem(LOCAL_STORAGE_OWNER_KEY, JSON.stringify(profile));
  }

  public getOwnerProfile(): OwnerProfile | null {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_OWNER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  public logoutOwner(): void {
    localStorage.removeItem(LOCAL_STORAGE_OWNER_KEY);
    this.notifyListeners('IDLE', this.lastSyncedAt);
  }

  /**
   * Helper to fetch the Master Cloud Registry
   */
  private async getMasterRegistry(): Promise<MasterRegistryPayload> {
    try {
      const res = await fetch(`${CLOUD_API_BASE}/${MASTER_REGISTRY_ID}`);
      if (res.ok) {
        const json = await res.json();
        return json.data || { owners: {} };
      }
    } catch (e) {
      console.warn('Could not fetch master cloud registry:', e);
    }
    return { owners: {} };
  }

  /**
   * Helper to update Master Cloud Registry
   */
  private async updateMasterRegistry(registry: MasterRegistryPayload): Promise<boolean> {
    try {
      const res = await fetch(`${CLOUD_API_BASE}/${MASTER_REGISTRY_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'girigiri_finance_master_registry_v1',
          data: registry,
        }),
      });
      return res.ok;
    } catch (e) {
      console.warn('Could not update master cloud registry:', e);
      return false;
    }
  }

  /**
   * Look up and authenticate Owner on any device over the internet
   */
  public async lookupAndAuthOwner(
    mobileOrId: string,
    pin: string
  ): Promise<{
    success: boolean;
    owner?: OwnerProfile;
    data?: { customers: Customer[]; payments: PaymentRecord[] };
    error?: string;
  }> {
    if (!navigator.onLine) {
      return { success: false, error: 'Device is offline. Please connect to Wi-Fi or Mobile Data.' };
    }

    try {
      this.notifyListeners('SYNCING', this.lastSyncedAt);
      const cleanInput = mobileOrId.trim().replace(/\D/g, '');
      const cleanId = mobileOrId.trim().toLowerCase();
      const cleanPin = pin.trim();

      const registry = await this.getMasterRegistry();
      let matchedKey: string | null = null;
      let matchedEntry: any = null;

      // Find by mobile digits or by Account ID
      for (const [mKey, entry] of Object.entries(registry.owners || {})) {
        if (
          mKey === cleanInput ||
          mKey.slice(-10) === cleanInput.slice(-10) ||
          entry.id?.toLowerCase() === cleanId
        ) {
          matchedKey = mKey;
          matchedEntry = entry;
          break;
        }
      }

      if (!matchedEntry) {
        this.notifyListeners('IDLE', this.lastSyncedAt);
        return {
          success: false,
          error: `No account found for "${mobileOrId}". If you are new, click "New Account" to register.`,
        };
      }

      if (matchedEntry.pin !== cleanPin) {
        this.notifyListeners('IDLE', this.lastSyncedAt);
        return { success: false, error: 'Incorrect PIN. Please re-enter your Secret PIN.' };
      }

      // Fetch live cloud data
      let customers: Customer[] = [];
      let payments: PaymentRecord[] = [];

      if (matchedEntry.cloudRecordId) {
        try {
          const dataRes = await fetch(`${CLOUD_API_BASE}/${matchedEntry.cloudRecordId}`);
          if (dataRes.ok) {
            const dataJson = await dataRes.json();
            customers = dataJson.data?.customers || [];
            payments = dataJson.data?.payments || [];
          }
        } catch (e) {
          console.warn('Failed to fetch data payload from cloud:', e);
        }
      }

      const ownerProfile: OwnerProfile = {
        id: matchedEntry.id || `OWN-${matchedKey?.slice(-4) || '1001'}`,
        ownerName: matchedEntry.ownerName || 'Owner',
        businessName: matchedEntry.businessName || 'My Daily Finance',
        mobile: matchedKey || cleanInput,
        pin: cleanPin,
        email: matchedEntry.email,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        activeDeviceId: this.getDeviceId(),
        cloudRecordId: matchedEntry.cloudRecordId,
      };

      this.saveOwnerProfile(ownerProfile);
      const nowISO = new Date().toISOString();
      this.lastSyncedAt = nowISO;
      this.notifyListeners('SYNCED', nowISO);

      return {
        success: true,
        owner: ownerProfile,
        data: { customers, payments },
      };
    } catch (err: any) {
      this.notifyListeners('ERROR', this.lastSyncedAt);
      return { success: false, error: err.message || 'Authentication error over cloud.' };
    }
  }

  /**
   * Register a new Owner Account in Cloud Database
   */
  public async registerOwnerInCloud(
    data: {
      ownerName: string;
      businessName: string;
      mobile: string;
      pin: string;
      email?: string;
    },
    initialCustomers: Customer[] = [],
    initialPayments: PaymentRecord[] = []
  ): Promise<{ success: boolean; owner?: OwnerProfile; error?: string }> {
    if (!navigator.onLine) {
      return { success: false, error: 'Device is offline. Internet connection required to create cloud account.' };
    }

    try {
      this.notifyListeners('SYNCING', this.lastSyncedAt);
      const cleanMobile = data.mobile.trim().replace(/\D/g, '');
      const cleanPin = data.pin.trim();

      const registry = await this.getMasterRegistry();
      if (registry.owners && registry.owners[cleanMobile]) {
        this.notifyListeners('IDLE', this.lastSyncedAt);
        return {
          success: false,
          error: 'An account with this mobile number already exists in Cloud. Please log in.',
        };
      }

      const ownerId = `OWN-${cleanMobile.slice(-4)}-${Math.floor(Math.random() * 900 + 100)}`;
      const newOwner: OwnerProfile = {
        id: ownerId,
        ownerName: data.ownerName.trim(),
        businessName: data.businessName.trim(),
        mobile: cleanMobile,
        pin: cleanPin,
        email: data.email?.trim(),
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        activeDeviceId: this.getDeviceId(),
      };

      // Step 1: Create dedicated cloud data record on REST API
      const createRes = await fetch(CLOUD_API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `girigiri_owner_${cleanMobile}`,
          data: {
            owner: newOwner,
            lastUpdated: new Date().toISOString(),
            updatedByDevice: this.getDeviceId(),
            customers: initialCustomers,
            payments: initialPayments,
          },
        }),
      });

      if (!createRes.ok) {
        throw new Error('Could not create cloud data record.');
      }

      const createdObj = await createRes.json();
      newOwner.cloudRecordId = createdObj.id;

      // Step 2: Add to master registry
      if (!registry.owners) registry.owners = {};
      registry.owners[cleanMobile] = {
        cloudRecordId: createdObj.id,
        pin: cleanPin,
        ownerName: newOwner.ownerName,
        businessName: newOwner.businessName,
        id: newOwner.id,
        email: newOwner.email,
      };

      await this.updateMasterRegistry(registry);

      this.saveOwnerProfile(newOwner);
      const nowISO = new Date().toISOString();
      this.lastSyncedAt = nowISO;
      this.notifyListeners('SYNCED', nowISO);

      return { success: true, owner: newOwner };
    } catch (err: any) {
      console.error('Cloud registration error:', err);
      this.notifyListeners('ERROR', this.lastSyncedAt);
      return { success: false, error: err.message || 'Failed to register account in cloud.' };
    }
  }

  /**
   * Push Local Data to Cloud Storage Record
   */
  public async pushToCloud(
    owner: OwnerProfile,
    customers: Customer[],
    payments: PaymentRecord[]
  ): Promise<{ success: boolean; error?: string }> {
    if (!navigator.onLine) {
      this.notifyListeners('OFFLINE', this.lastSyncedAt);
      return { success: false, error: 'Offline. Changes saved locally.' };
    }

    if (this.isPushing) return { success: true };
    this.isPushing = true;

    try {
      this.notifyListeners('SYNCING', this.lastSyncedAt);

      // If owner has no cloudRecordId yet, find or create one
      let cloudId = owner.cloudRecordId;
      if (!cloudId) {
        const registry = await this.getMasterRegistry();
        const cleanMobile = owner.mobile.replace(/\D/g, '');
        if (registry.owners && registry.owners[cleanMobile]) {
          cloudId = registry.owners[cleanMobile].cloudRecordId;
          owner.cloudRecordId = cloudId;
          this.saveOwnerProfile(owner);
        } else {
          // Create cloud record
          const createRes = await fetch(CLOUD_API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: `girigiri_owner_${cleanMobile}`,
              data: {
                owner,
                lastUpdated: new Date().toISOString(),
                updatedByDevice: this.getDeviceId(),
                customers,
                payments,
              },
            }),
          });
          if (createRes.ok) {
            const created = await createRes.json();
            cloudId = created.id;
            owner.cloudRecordId = cloudId;
            this.saveOwnerProfile(owner);

            if (!registry.owners) registry.owners = {};
            registry.owners[cleanMobile] = {
              cloudRecordId: cloudId || '',
              pin: owner.pin || '',
              ownerName: owner.ownerName,
              businessName: owner.businessName,
              id: owner.id,
            };
            await this.updateMasterRegistry(registry);
          }
        }
      }

      if (cloudId) {
        await fetch(`${CLOUD_API_BASE}/${cloudId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `girigiri_owner_${owner.mobile.replace(/\D/g, '')}`,
            data: {
              owner,
              lastUpdated: new Date().toISOString(),
              updatedByDevice: this.getDeviceId(),
              customers,
              payments,
            },
          }),
        });
      }

      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({
          type: 'REMOTE_DATA_UPDATED',
          ownerId: owner.id,
          timestamp: new Date().toISOString(),
        });
      }

      const nowISO = new Date().toISOString();
      this.lastSyncedAt = nowISO;
      localStorage.setItem(LOCAL_STORAGE_SYNC_META_KEY, nowISO);
      this.notifyListeners('SYNCED', nowISO);

      return { success: true };
    } catch (err: any) {
      console.error('Cloud push error:', err);
      this.notifyListeners('ERROR', this.lastSyncedAt);
      return { success: false, error: err.message || 'Failed to sync with cloud.' };
    } finally {
      this.isPushing = false;
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

    if (this.isPulling) return { success: false, error: 'Already pulling.' };
    this.isPulling = true;

    try {
      this.notifyListeners('SYNCING', this.lastSyncedAt);

      let cloudId = owner.cloudRecordId;
      if (!cloudId) {
        const registry = await this.getMasterRegistry();
        const cleanMobile = owner.mobile.replace(/\D/g, '');
        if (registry.owners && registry.owners[cleanMobile]) {
          cloudId = registry.owners[cleanMobile].cloudRecordId;
          owner.cloudRecordId = cloudId;
          this.saveOwnerProfile(owner);
        }
      }

      if (cloudId) {
        const res = await fetch(`${CLOUD_API_BASE}/${cloudId}`);
        if (res.ok) {
          const json = await res.json();
          const customers = json.data?.customers || [];
          const payments = json.data?.payments || [];
          const nowISO = new Date().toISOString();
          this.lastSyncedAt = nowISO;
          this.notifyListeners('SYNCED', nowISO);
          return {
            success: true,
            data: { customers, payments },
          };
        }
      }

      this.notifyListeners('SYNCED', this.lastSyncedAt);
      return { success: true, data: { customers: [], payments: [] } };
    } catch (err: any) {
      this.notifyListeners('ERROR', this.lastSyncedAt);
      return { success: false, error: err.message || 'Failed to pull cloud data.' };
    } finally {
      this.isPulling = false;
    }
  }

  /**
   * Start periodic background sync every 12s
   */
  public startPeriodicSync(callback: () => void, intervalMs = 12000): void {
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
}

export const cloudSync = CloudSyncService.getInstance();
