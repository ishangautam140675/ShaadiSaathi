import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { AuthUser, Family } from '../types/auth';
import { useAuth } from './useAuth';

export interface AuthContextType {
  user: AuthUser | null;
  family: Family | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setupRequired: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  initializeSetup: (payload: {
    familyName: string;
    brideName: string;
    groomName: string;
    weddingDate: string;
    totalBudget?: number;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
    adminSide?: 'bride' | 'groom' | 'mutual';
  }) => Promise<boolean>;
  acceptInvitation: (payload: {
    token: string;
    name: string;
    password: string;
  }) => Promise<boolean>;
  clearError: () => void;
  refreshAuth: () => Promise<void>;
}

const TOKEN_KEY = 'shaadisaathi_session_token';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [setupRequired, setSetupRequired] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch {
      // Storage restricted
    }
    return headers;
  };

  const clearError = () => setError(null);

  const refreshAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 1. Check if first-time setup is required
      const statusRes = await fetch('/api/setup/status');
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setSetupRequired(statusData.setupRequired);
        if (statusData.setupRequired) {
          setUser(null);
          setFamily(null);
          setIsLoading(false);
          return;
        }
      }

      // 2. Validate existing session
      const meRes = await fetch('/api/auth/me', {
        headers: getAuthHeaders(),
      });

      if (meRes.ok) {
        const meData = await meRes.json();
        setUser(meData.user);
        setFamily(meData.family);
      } else {
        setUser(null);
        setFamily(null);
        try {
          localStorage.removeItem(TOKEN_KEY);
        } catch {
          // ignore
        }
      }
    } catch {
      // Offline or network error
      setUser(null);
      setFamily(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const signIn = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Incorrect email or password.');
        setIsLoading(false);
        return false;
      }

      setUser(data.user);
      setFamily(data.family);
      if (data.token) {
        try {
          localStorage.setItem(TOKEN_KEY, data.token);
        } catch {
          // Storage blocked
        }
      }

      setIsLoading(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to connect to authentication service.');
      setIsLoading(false);
      return false;
    }
  };

  const signOut = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await fetch('/api/auth/sign-out', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } catch {
      // Ignore network errors on signout
    } finally {
      setUser(null);
      setFamily(null);
      try {
        localStorage.removeItem(TOKEN_KEY);
      } catch {
        // ignore
      }
      setIsLoading(false);
    }
  };

  const initializeSetup = async (payload: {
    familyName: string;
    brideName: string;
    groomName: string;
    weddingDate: string;
    totalBudget?: number;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
    adminSide?: 'bride' | 'groom' | 'mutual';
  }): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/setup/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Initialization failed.');
        setIsLoading(false);
        return false;
      }

      setUser(data.user);
      setFamily(data.family);
      setSetupRequired(false);
      if (data.token) {
        try {
          localStorage.setItem(TOKEN_KEY, data.token);
        } catch {
          // ignore
        }
      }

      setIsLoading(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Connection failed.');
      setIsLoading(false);
      return false;
    }
  };

  const acceptInvitation = async (payload: {
    token: string;
    name: string;
    password: string;
  }): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to accept invitation.');
        setIsLoading(false);
        return false;
      }

      setUser(data.user);
      setFamily(data.family);
      if (data.token) {
        try {
          localStorage.setItem(TOKEN_KEY, data.token);
        } catch {
          // ignore
        }
      }

      setIsLoading(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Connection failed.');
      setIsLoading(false);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        family,
        isAuthenticated: !!user,
        isLoading,
        setupRequired,
        error,
        signIn,
        signOut,
        initializeSetup,
        acceptInvitation,
        clearError,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export { useAuth };
