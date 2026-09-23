import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { OwnerProfile, CloudSyncStatus } from '../types/finance';
import { cloudSync } from '../services/cloudSyncService';

interface AuthContextType {
  owner: OwnerProfile | null;
  isLoggedIn: boolean;
  syncStatus: CloudSyncStatus;
  lastSyncedAt: string | null;
  activeDeviceId: string;
  login: (mobileOrId: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: {
    ownerName: string;
    businessName: string;
    mobile: string;
    pin: string;
    email?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (updates: Partial<OwnerProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const OWNER_REGISTRY_KEY = 'giri_giri_registered_owners_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [owner, setOwner] = useState<OwnerProfile | null>(() => {
    return cloudSync.getOwnerProfile();
  });
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>('IDLE');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const activeDeviceId = cloudSync.getDeviceId();

  useEffect(() => {
    const unsubscribe = cloudSync.subscribe((status, lastSynced) => {
      setSyncStatus(status);
      setLastSyncedAt(lastSynced);
    });
    return () => unsubscribe();
  }, []);

  /**
   * Helper to load all registered owners (simulated multi-device registry)
   */
  const getRegisteredOwners = (): OwnerProfile[] => {
    try {
      const data = localStorage.getItem(OWNER_REGISTRY_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  };

  const saveRegisteredOwners = (owners: OwnerProfile[]) => {
    try {
      localStorage.setItem(OWNER_REGISTRY_KEY, JSON.stringify(owners));
    } catch {
      // ignore
    }
  };

  /**
   * Login with Mobile or Account ID + PIN
   */
  const login = useCallback(async (mobileOrId: string, pin: string): Promise<{ success: boolean; error?: string }> => {
    const cleanInput = mobileOrId.trim().toLowerCase();
    const cleanPin = pin.trim();

    if (!cleanInput) {
      return { success: false, error: 'Please enter Mobile Number or Account ID.' };
    }
    if (!cleanPin) {
      return { success: false, error: 'Please enter your Secret PIN.' };
    }

    const registered = getRegisteredOwners();
    let found = registered.find(
      (o) =>
        (o.mobile.replace(/\D/g, '') === cleanInput.replace(/\D/g, '') ||
          o.id.toLowerCase() === cleanInput ||
          (o.email && o.email.toLowerCase() === cleanInput)) &&
        o.pin === cleanPin
    );

    // If first time logging in with a new device or direct access
    if (!found) {
      // Check if this is the active owner
      const currentActive = cloudSync.getOwnerProfile();
      if (
        currentActive &&
        (currentActive.mobile.replace(/\D/g, '') === cleanInput.replace(/\D/g, '') ||
          currentActive.id.toLowerCase() === cleanInput) &&
        currentActive.pin === cleanPin
      ) {
        found = currentActive;
      }
    }

    if (!found) {
      // If no account exists yet, let them auto-onboard or display clear error
      if (registered.length === 0) {
        // Auto-create default owner account for seamless instant first-run
        const newOwner: OwnerProfile = {
          id: `OWN-${cleanInput.replace(/\D/g, '').slice(-4) || '1001'}`,
          businessName: 'My Daily Finance',
          ownerName: 'Finance Owner',
          mobile: cleanInput.replace(/\D/g, '') || '9876543210',
          pin: cleanPin,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          activeDeviceId: cloudSync.getDeviceId(),
        };
        saveRegisteredOwners([newOwner]);
        cloudSync.saveOwnerProfile(newOwner);
        setOwner(newOwner);
        return { success: true };
      }

      return {
        success: false,
        error: 'Invalid Mobile Number / Account ID or incorrect PIN.',
      };
    }

    // Update last login
    const updated: OwnerProfile = {
      ...found,
      lastLoginAt: new Date().toISOString(),
      activeDeviceId: cloudSync.getDeviceId(),
    };

    cloudSync.saveOwnerProfile(updated);
    setOwner(updated);

    // Update registry
    const newRegistry = registered.map((r) => (r.id === updated.id ? updated : r));
    saveRegisteredOwners(newRegistry);

    return { success: true };
  }, []);

  /**
   * Register a new Owner Account
   */
  const register = useCallback(
    async (data: {
      ownerName: string;
      businessName: string;
      mobile: string;
      pin: string;
      email?: string;
    }): Promise<{ success: boolean; error?: string }> => {
      const cleanMobile = data.mobile.trim().replace(/\D/g, '');
      const cleanPin = data.pin.trim();

      if (!data.ownerName.trim()) {
        return { success: false, error: 'Owner name is required.' };
      }
      if (!data.businessName.trim()) {
        return { success: false, error: 'Finance business name is required.' };
      }
      if (cleanMobile.length < 10) {
        return { success: false, error: 'Enter a valid 10-digit mobile number.' };
      }
      if (cleanPin.length < 4) {
        return { success: false, error: 'PIN must be at least 4 digits.' };
      }

      const registered = getRegisteredOwners();
      const existing = registered.find((o) => o.mobile.replace(/\D/g, '') === cleanMobile);

      if (existing) {
        return {
          success: false,
          error: 'An account with this mobile number already exists. Please log in.',
        };
      }

      const newOwner: OwnerProfile = {
        id: `OWN-${cleanMobile.slice(-4)}-${Math.floor(Math.random() * 900 + 100)}`,
        ownerName: data.ownerName.trim(),
        businessName: data.businessName.trim(),
        mobile: cleanMobile,
        pin: cleanPin,
        email: data.email?.trim(),
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        activeDeviceId: cloudSync.getDeviceId(),
      };

      const newRegistry = [...registered, newOwner];
      saveRegisteredOwners(newRegistry);
      cloudSync.saveOwnerProfile(newOwner);
      setOwner(newOwner);

      return { success: true };
    },
    []
  );

  const logout = useCallback(() => {
    cloudSync.logoutOwner();
    setOwner(null);
  }, []);

  const updateProfile = useCallback(
    (updates: Partial<OwnerProfile>) => {
      if (!owner) return;
      const updated = { ...owner, ...updates, updatedAt: new Date().toISOString() };
      cloudSync.saveOwnerProfile(updated);
      setOwner(updated);

      const registered = getRegisteredOwners();
      const newRegistry = registered.map((r) => (r.id === updated.id ? updated : r));
      saveRegisteredOwners(newRegistry);
    },
    [owner]
  );

  return (
    <AuthContext.Provider
      value={{
        owner,
        isLoggedIn: !!owner,
        syncStatus,
        lastSyncedAt,
        activeDeviceId,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
