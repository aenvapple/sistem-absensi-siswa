import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index.ts';
import { apiRequest, setAuthToken, clearAuthToken, getAuthToken, ApiError } from '../api/client.ts';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdminVerified: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  verifyAdmin: (password: string) => Promise<boolean>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdminVerified, setIsAdminVerified] = useState<boolean>(() => {
    return localStorage.getItem('smp_admin_verified') === 'true';
  });
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setIsAdminVerified(false);
      setLoading(false);
      return;
    }

    try {
      const res = await apiRequest<{ success: boolean; user: User; isAdminVerified: boolean }>('/me');
      if (res.success && res.user) {
        setUser(res.user);
        setIsAdminVerified(res.isAdminVerified);
        localStorage.setItem('smp_admin_verified', res.isAdminVerified ? 'true' : 'false');
      } else {
        clearAuthToken();
        setUser(null);
        setIsAdminVerified(false);
      }
    } catch {
      clearAuthToken();
      setUser(null);
      setIsAdminVerified(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (username: string, password: string): Promise<User> => {
    const res = await apiRequest<{
      success: boolean;
      token: string;
      user: User;
      isAdminVerified: boolean;
    }>('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    if (res.token) {
      setAuthToken(res.token);
      setUser(res.user);
      setIsAdminVerified(res.isAdminVerified || false);
      localStorage.setItem('smp_admin_verified', 'false');
    }
    return res.user;
  };

  const logout = async () => {
    try {
      await apiRequest('/logout', { method: 'POST' });
    } catch {
      // Ignore network logout error
    } finally {
      clearAuthToken();
      setUser(null);
      setIsAdminVerified(false);
    }
  };

  const verifyAdmin = async (password: string): Promise<boolean> => {
    try {
      const res = await apiRequest<{ success: boolean; message: string }>('/admin/verify', {
        method: 'POST',
        body: JSON.stringify({ password })
      });
      if (res.success) {
        setIsAdminVerified(true);
        localStorage.setItem('smp_admin_verified', 'true');
        return true;
      }
      return false;
    } catch (err: any) {
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdminVerified,
        login,
        logout,
        verifyAdmin,
        refreshUser
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
