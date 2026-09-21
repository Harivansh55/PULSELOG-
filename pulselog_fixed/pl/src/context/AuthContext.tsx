import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { apiRequest } from '../api/client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<{ dev_verification_token?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<string | undefined>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await apiRequest<{ success: boolean; data: { user: User } }>('/api/v1/auth/me');
      if (res && res.data && res.data.user) {
        setUser(res.data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const res = await apiRequest<{ success: boolean; message: string; user: User }>(
      '/api/v1/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );
    if (res && res.user) {
      setUser(res.user);
    } else {
      await refreshUser();
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    const res = await apiRequest<{
      success: boolean;
      data: { user: User; dev_verification_token?: string };
    }>('/api/v1/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    return { dev_verification_token: res.data.dev_verification_token };
  };

  const logout = async () => {
    try {
      await apiRequest('/api/v1/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
    }
  };

  const verifyEmail = async (token: string) => {
    const res = await apiRequest<{ success: boolean; data: { user: User } }>(
      `/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`
    );
    if (res && res.data && res.data.user) {
      setUser(res.data.user);
    }
  };

  const requestPasswordReset = async (email: string) => {
    const res = await apiRequest<{ success: boolean; data: { dev_token?: string } }>(
      '/api/v1/auth/forgot-password',
      {
        method: 'POST',
        body: JSON.stringify({ email }),
      }
    );
    return res.data?.dev_token;
  };

  const resetPassword = async (token: string, newPassword: string) => {
    await apiRequest('/api/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password: newPassword }),
    });
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAdmin,
        login,
        signup,
        logout,
        refreshUser,
        verifyEmail,
        requestPasswordReset,
        resetPassword,
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
