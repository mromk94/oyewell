import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as apiLogin, register as apiRegister, fetchMe, getCustomerToken, setCustomerToken, removeCustomerToken, type User } from './api';

export interface AuthState {
  customer: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  authOpen: boolean;
  onAuthSuccess: (() => void) | null;
}

export interface AuthContextValue extends AuthState {
  openAuth: (onSuccess?: () => void) => void;
  closeAuth: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; firstName?: string; lastName?: string; phone?: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const onAuthSuccessRef = useRef<(() => void) | null>(null);

  const loadCustomer = useCallback(async () => {
    const token = getCustomerToken();
    if (!token) {
      setCustomer(null);
      setLoading(false);
      return;
    }
    try {
      const { user } = await fetchMe();
      setCustomer(user);
    } catch {
      removeCustomerToken();
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomer();
  }, [loadCustomer]);

  async function login(email: string, password: string) {
    const { token, user } = await apiLogin(email, password);
    if (token) setCustomerToken(token);
    setCustomer(user ?? null);
    setAuthOpen(false);
    if (onAuthSuccessRef.current) {
      const cb = onAuthSuccessRef.current;
      onAuthSuccessRef.current = null;
      cb();
    } else {
      navigate('/account');
    }
  }

  async function register(data: { email: string; password: string; firstName?: string; lastName?: string; phone?: string }) {
    const { token, user } = await apiRegister(data);
    if (token) setCustomerToken(token);
    setCustomer(user ?? null);
    setAuthOpen(false);
    if (onAuthSuccessRef.current) {
      const cb = onAuthSuccessRef.current;
      onAuthSuccessRef.current = null;
      cb();
    } else {
      navigate('/account');
    }
  }

  function logout() {
    removeCustomerToken();
    setCustomer(null);
    navigate('/');
  }

  function openAuth(onSuccess?: () => void) {
    onAuthSuccessRef.current = onSuccess ?? null;
    setAuthOpen(true);
  }

  function closeAuth() {
    onAuthSuccessRef.current = null;
    setAuthOpen(false);
  }

  const value: AuthContextValue = {
    customer,
    isAuthenticated: !!customer,
    loading,
    authOpen,
    onAuthSuccess: null,
    openAuth,
    closeAuth,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
