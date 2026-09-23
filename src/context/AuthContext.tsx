import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { OwnerProfile, CloudSyncStatus } from '../types/finance';
import { cloudSync } from '../services/cloudSyncService';
import { firebaseSync } from '../services/firebaseSyncService';

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
   * Login with Mobile Number + PIN (connects and syncs across devices)
   */
  const login = useCallback(
    async (mobileOrId: string, pin: string): Promise<{ success: boolean; error?: string }> => {
      const cleanInput = mobileOrId.trim();
      const cleanPin = pin.trim();

      if (!cleanInput) {
        return { success: false, error: 'Please enter Mobile Number.' };
      }
      if (!cleanPin) {
        return { success: false, error: 'Please enter your Secret PIN.' };
      }

      const res = await cloudSync.loginOwnerLocallyOrSync(cleanInput, cleanPin, owner);
      if (res.success && res.owner) {
        setOwner(res.owner);
        return { success: true };
      }

      return {
        success: false,
        error: res.error || 'Invalid Mobile Number or incorrect PIN.',
      };
    },
    [owner]
  );

  /**
   * Register or Set Up an Owner Profile
   */
  const register = useCallback(
    async (data: {
      ownerName: string;
      businessName: string;
      mobile: string;
      pin: string;
      email?: string;
    }): Promise<{ success: boolean; error?: string }> => {
      const cleanMobile = data.mobile.trim().replace(/\D/g, '').slice(-10);
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

      const newOwner: OwnerProfile = {
        id: `OWN-${cleanMobile.slice(-4)}`,
        ownerName: data.ownerName.trim(),
        businessName: data.businessName.trim(),
        mobile: cleanMobile,
        pin: cleanPin,
        email: data.email?.trim(),
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        activeDeviceId: activeDeviceId,
      };

      cloudSync.saveOwnerProfile(newOwner);
      setOwner(newOwner);

      // Immediately push new owner node to Firebase Realtime Database
      try {
        await firebaseSync.pushToFirebase(newOwner, [], []);
      } catch {
        // Ignore
      }

      return { success: true };
    },
    [activeDeviceId]
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
      try {
        const custs = JSON.parse(localStorage.getItem('giri_giri_customers_v2') || '[]');
        const pays = JSON.parse(localStorage.getItem('giri_giri_payments_v2') || '[]');
        firebaseSync.pushToFirebase(updated, custs, pays);
      } catch {
        // Ignore
      }
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
