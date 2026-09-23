import { Customer, PaymentRecord, OwnerProfile, CloudSyncStatus } from '../types/finance';
import Peer, { DataConnection } from 'peerjs';

const LOCAL_STORAGE_OWNER_KEY = 'giri_giri_owner_profile_v2';
const LOCAL_STORAGE_SYNC_META_KEY = 'giri_giri_sync_meta_v2';

export interface SyncPayload {
  owner: OwnerProfile;
  timestamp: string;
  sourceDevice: string;
  customers: Customer[];
  payments: PaymentRecord[];
}

export class CloudSyncService {
  private static instance: CloudSyncService;
  private syncStatus: CloudSyncStatus = 'IDLE';
  private lastSyncedAt: string | null = null;
  private listeners: ((status: CloudSyncStatus, lastSynced: string | null) => void)[] = [];
  private dataListeners: ((data: { customers: Customer[]; payments: PaymentRecord[]; owner?: OwnerProfile }) => void)[] = [];
  private broadcastChannel: BroadcastChannel | null = null;
  private peer: Peer | null = null;
  private activeConnections: Map<string, DataConnection> = new Map();
  private peerInitialized = false;
  private currentOwner: OwnerProfile | null = null;

  private constructor() {
    this.currentOwner = this.getOwnerProfile();

    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel('giri_giri_cloud_sync_bus');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'REMOTE_DATA_UPDATED' && event.data.payload) {
            this.notifyDataListeners(event.data.payload);
            this.notifyListeners('SYNCED', new Date().toISOString());
          }
        };
      }
    } catch {
      // Fallback
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.notifyListeners('SYNCED', this.lastSyncedAt);
        if (this.currentOwner) {
          this.initPeerNetwork(this.currentOwner);
        }
      });
      window.addEventListener('offline', () => this.notifyListeners('OFFLINE', this.lastSyncedAt));

      if (this.currentOwner) {
        this.initPeerNetwork(this.currentOwner);
      }
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
    this.listeners.forEach((listener) => listener(status, lastSynced));
  }

  private notifyDataListeners(data: { customers: Customer[]; payments: PaymentRecord[]; owner?: OwnerProfile }) {
    this.dataListeners.forEach((listener) => listener(data));
  }

  public getDeviceId(): string {
    if (typeof window === 'undefined') return 'Server Device';
    const ua = navigator.userAgent;
    let device = 'Web Browser';
    if (/android/i.test(ua)) device = 'Android Phone';
    else if (/iPad|iPhone|iPod/.test(ua)) device = 'iPhone/iOS';
    else if (/Windows/i.test(ua)) device = 'Windows Laptop';
    else if (/Macintosh/i.test(ua)) device = 'MacBook';

    let deviceId = localStorage.getItem('giri_giri_device_id_v2');
    if (!deviceId) {
      deviceId = `${device} (${Math.random().toString(36).substring(2, 6).toUpperCase()})`;
      localStorage.setItem('giri_giri_device_id_v2', deviceId);
    }
    return deviceId;
  }

  public saveOwnerProfile(profile: OwnerProfile): void {
    this.currentOwner = profile;
    localStorage.setItem(LOCAL_STORAGE_OWNER_KEY, JSON.stringify(profile));
    this.initPeerNetwork(profile);
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
    this.currentOwner = null;
    localStorage.removeItem(LOCAL_STORAGE_OWNER_KEY);
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {
        // Ignore
      }
      this.peer = null;
      this.peerInitialized = false;
    }
    this.notifyListeners('IDLE', this.lastSyncedAt);
  }

  /**
   * Initialize WebRTC Peer-to-Peer Mesh for the Owner across Laptop & Mobile
   */
  public initPeerNetwork(owner: OwnerProfile): void {
    if (typeof window === 'undefined' || !navigator.onLine) return;
    if (this.peerInitialized && this.peer && !this.peer.destroyed) return;

    const cleanMobile = owner.mobile.replace(/\D/g, '').slice(-10);
    const shortDevice = Math.random().toString(36).substring(2, 7);
    const myPeerId = `girigiri-sync-${cleanMobile}-${shortDevice}`;

    try {
      this.peer = new Peer(myPeerId, {
        debug: 0,
      });

      this.peer.on('open', () => {
        this.peerInitialized = true;
        this.notifyListeners('SYNCED', new Date().toISOString());
      });

      // Handle incoming connection from owner's other device (e.g. mobile connecting to laptop)
      this.peer.on('connection', (conn) => {
        this.setupConnectionHandlers(conn);
      });

      this.peer.on('error', () => {
        // Reconnect gracefully if needed
      });
    } catch {
      // WebRTC fallback
    }
  }

  private setupConnectionHandlers(conn: DataConnection) {
    conn.on('open', () => {
      this.activeConnections.set(conn.peer, conn);
      this.notifyListeners('SYNCED', new Date().toISOString());

      // Send our current local data to newly connected device
      const owner = this.getOwnerProfile();
      if (owner) {
        try {
          const custs = JSON.parse(localStorage.getItem('giri_giri_customers_v2') || '[]');
          const pays = JSON.parse(localStorage.getItem('giri_giri_payments_v2') || '[]');
          conn.send({
            type: 'DATA_SYNC',
            payload: {
              owner,
              timestamp: new Date().toISOString(),
              sourceDevice: this.getDeviceId(),
              customers: custs,
              payments: pays,
            },
          });
        } catch {
          // Ignore
        }
      }
    });

    conn.on('data', (data: any) => {
      if (data && data.type === 'DATA_SYNC' && data.payload) {
        this.notifyDataListeners(data.payload);
        const now = new Date().toISOString();
        this.lastSyncedAt = now;
        this.notifyListeners('SYNCED', now);
      }
    });

    conn.on('close', () => {
      this.activeConnections.delete(conn.peer);
    });
  }

  /**
   * Broadcast state update to all connected owner devices in real-time
   */
  public broadcastUpdate(
    owner: OwnerProfile,
    customers: Customer[],
    payments: PaymentRecord[]
  ): void {
    const payload: SyncPayload = {
      owner,
      timestamp: new Date().toISOString(),
      sourceDevice: this.getDeviceId(),
      customers,
      payments,
    };

    // 1. Cross-Tab / Cross-Window Local Broadcast
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'REMOTE_DATA_UPDATED',
          payload,
        });
      } catch {
        // Ignore
      }
    }

    // 2. WebRTC Peer-to-Peer Cross-Device Broadcast
    this.activeConnections.forEach((conn) => {
      if (conn.open) {
        try {
          conn.send({
            type: 'DATA_SYNC',
            payload,
          });
        } catch {
          // Ignore
        }
      }
    });

    const nowISO = new Date().toISOString();
    this.lastSyncedAt = nowISO;
    localStorage.setItem(LOCAL_STORAGE_SYNC_META_KEY, nowISO);
    this.notifyListeners('SYNCED', nowISO);
  }

  /**
   * Compresses full finance dataset into a compact base64 payload for QR code and direct links
   */
  public async exportSyncDataToCompressed(
    owner: OwnerProfile,
    customers: Customer[],
    payments: PaymentRecord[]
  ): Promise<string> {
    const data: SyncPayload = {
      owner,
      timestamp: new Date().toISOString(),
      sourceDevice: this.getDeviceId(),
      customers,
      payments,
    };

    const json = JSON.stringify(data);

    try {
      if (typeof window !== 'undefined' && 'CompressionStream' in window) {
        const stream = new Blob([json]).stream();
        const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
        const compressedBlob = await new Response(compressedStream).blob();
        const buffer = await compressedBlob.arrayBuffer();
        
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return `gz:${btoa(binary)}`;
      }
    } catch {
      // Fallback to standard base64
    }

    return `raw:${btoa(encodeURIComponent(json))}`;
  }

  /**
   * Decompresses and restores sync payload
   */
  public async importCompressedSyncData(
    compressedStr: string
  ): Promise<{ success: boolean; data?: SyncPayload; error?: string }> {
    try {
      const clean = compressedStr.trim();
      let jsonString = '';

      if (clean.startsWith('gz:')) {
        const base64 = clean.slice(3);
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }

        if (typeof window !== 'undefined' && 'DecompressionStream' in window) {
          const decompressStream = new Blob([bytes])
            .stream()
            .pipeThrough(new DecompressionStream('gzip'));
          jsonString = await new Response(decompressStream).text();
        } else {
          throw new Error('Decompression not supported on this browser.');
        }
      } else if (clean.startsWith('raw:')) {
        const base64 = clean.slice(4);
        jsonString = decodeURIComponent(atob(base64));
      } else {
        jsonString = decodeURIComponent(atob(clean));
      }

      const parsed: SyncPayload = JSON.parse(jsonString);
      if (!parsed || !Array.isArray(parsed.customers) || !Array.isArray(parsed.payments)) {
        return { success: false, error: 'Invalid or corrupt sync payload.' };
      }

      return { success: true, data: parsed };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to parse sync data.' };
    }
  }

  /**
   * Generate 1-Click Instant Mobile Sync Link
   */
  public async generateMobileSyncUrl(
    owner: OwnerProfile,
    customers: Customer[],
    payments: PaymentRecord[]
  ): Promise<string> {
    const compressed = await this.exportSyncDataToCompressed(owner, customers, payments);
    const baseUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
    return `${baseUrl}#sync=${encodeURIComponent(compressed)}`;
  }

  /**
   * Auth/Login helper
   */
  public async loginOwnerLocallyOrSync(
    mobile: string,
    pin: string,
    existingOwnerProfile?: OwnerProfile | null
  ): Promise<{ success: boolean; owner?: OwnerProfile; error?: string }> {
    const cleanMobile = mobile.trim().replace(/\D/g, '');
    const cleanPin = pin.trim();

    if (cleanMobile.length < 10) {
      return { success: false, error: 'Please enter a valid 10-digit mobile number.' };
    }
    if (cleanPin.length < 4) {
      return { success: false, error: 'PIN must be at least 4 digits.' };
    }

    const savedOwner = existingOwnerProfile || this.getOwnerProfile();
    if (savedOwner && savedOwner.mobile.replace(/\D/g, '') === cleanMobile) {
      if (savedOwner.pin && savedOwner.pin !== cleanPin) {
        return { success: false, error: 'Incorrect PIN for this account.' };
      }
      this.saveOwnerProfile(savedOwner);
      return { success: true, owner: savedOwner };
    }

    // Create / Connect owner profile
    const ownerProfile: OwnerProfile = {
      id: `OWN-${cleanMobile.slice(-4)}`,
      ownerName: savedOwner?.ownerName || 'Finance Owner',
      businessName: savedOwner?.businessName || 'Sri Lakshmi Narsimha Finance',
      mobile: cleanMobile,
      pin: cleanPin,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      activeDeviceId: this.getDeviceId(),
    };

    this.saveOwnerProfile(ownerProfile);
    this.notifyListeners('SYNCED', new Date().toISOString());
    return { success: true, owner: ownerProfile };
  }
}

export const cloudSync = CloudSyncService.getInstance();
