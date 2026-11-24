'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { User, AuthResponse } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  loginWithSso: (payload: { credential?: string; email?: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updated: Partial<User>) => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      if (!token) return;
      const res = await api.get('/auth/me');
      if (res.data?.success && res.data?.data) {
        setUser(res.data.data);
        localStorage.setItem('user_info', JSON.stringify(res.data.data));
      }
    } catch {}
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user_info');
    const token = localStorage.getItem('access_token');
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('user_info');
      }
    }
    setLoading(false);

    if (token) {
      refreshUser();
    }

    const handlePermissionsUpdated = () => {
      refreshUser();
    };
    window.addEventListener('permissions-updated', handlePermissionsUpdated);
    return () => {
      window.removeEventListener('permissions-updated', handlePermissionsUpdated);
    };
  }, []);

  const login = async (username: string, password: string) => {
    const res = await api.post<{ success: boolean; data: AuthResponse }>('/auth/login', {
      username,
      password,
    });
    const authData = res.data.data;
    localStorage.setItem('access_token', authData.access_token);
    localStorage.setItem('refresh_token', authData.refresh_token);
    localStorage.setItem('user_info', JSON.stringify(authData.user));
    setUser(authData.user);
    router.push('/dashboard');
  };

  const loginWithSso = async (payload: { credential?: string; email?: string }) => {
    const res = await api.post<{ success: boolean; data: AuthResponse }>('/auth/sso/callback', payload);
    const authData = res.data.data;
    localStorage.setItem('access_token', authData.access_token);
    localStorage.setItem('refresh_token', authData.refresh_token);
    localStorage.setItem('user_info', JSON.stringify(authData.user));
    setUser(authData.user);
    router.push('/dashboard');
  };

  // Data dari /auth/me (dicek berkala di layout dashboard) menyegarkan role dan izin tanpa perlu login ulang,
  // jadi menu sidebar langsung mengikuti perubahan hak akses dari Pengaturan.
  useEffect(() => {
    const onMe = (e: Event) => {
      const fresh = (e as CustomEvent<Partial<User>>).detail;
      if (!fresh) return;
      setUser((prev) => {
        if (!prev) return prev;
        const merged = { ...prev, ...fresh, avatar: prev.avatar };
        localStorage.setItem('user_info', JSON.stringify(merged));
        return merged;
      });
    };
    window.addEventListener('auth-me-updated', onMe);
    return () => window.removeEventListener('auth-me-updated', onMe);
  }, []);

  const updateUser = (updated: Partial<User>) => {
    if (!user) return;
    const merged = { ...user, ...updated };
    setUser(merged);
    localStorage.setItem('user_info', JSON.stringify(merged));
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      await api.post('/auth/logout', { refresh_token: refreshToken });
    } catch (e) {
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_info');
      setUser(null);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithSso, logout, updateUser, refreshUser, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
