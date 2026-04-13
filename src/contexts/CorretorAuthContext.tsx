import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Corretor {
  id: string;
  tenant_id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  celular: string | null;
  creci: string | null;
  foto_url: string | null;
  comissao_percentual: number;
  total_vendas: number;
  total_imoveis_ativos: number;
}

interface CorretorAuthContextType {
  isAuthenticated: boolean;
  corretor: Corretor | null;
  isLoading: boolean;
  error: string | null;
  login: (emailOrPhone: string) => Promise<boolean>;
  verifyCode: (code: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  pendingIdentifier: string | null;
}

const CorretorAuthContext = createContext<CorretorAuthContextType | undefined>(undefined);

export function CorretorAuthProvider({ children }: { children: ReactNode }) {
  const [corretor, setCorretor] = useState<Corretor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingIdentifier, setPendingIdentifier] = useState<string | null>(null);
  const [pendingCorretor, setPendingCorretor] = useState<Corretor | null>(null);

  // Check stored auth on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('corretor_auth');
    if (stored) {
      try {
        setCorretor(JSON.parse(stored));
      } catch { /* ignore */ }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (emailOrPhone: string): Promise<boolean> => {
    setError(null);
    setIsLoading(true);
    try {
      const identifier = emailOrPhone.trim().toLowerCase();
      const { data, error: err } = await (supabase as any)
        .from('mt_corretores')
        .select('*')
        .or(`email.eq.${identifier},telefone.eq.${identifier},celular.eq.${identifier}`)
        .is('deleted_at', null)
        .single();

      if (err || !data) {
        setError('Corretor não encontrado. Verifique seu email ou telefone.');
        setIsLoading(false);
        return false;
      }

      setPendingCorretor(data as Corretor);
      setPendingIdentifier(identifier);
      setIsLoading(false);
      return true;
    } catch (e: any) {
      setError(e.message || 'Erro ao buscar corretor');
      setIsLoading(false);
      return false;
    }
  }, []);

  const verifyCode = useCallback(async (code: string): Promise<boolean> => {
    // Simplified: accept any 6-digit code for now (production would use OTP)
    if (!pendingCorretor) {
      setError('Sessão expirada. Tente novamente.');
      return false;
    }
    if (code.length !== 6) {
      setError('Código deve ter 6 dígitos.');
      return false;
    }
    // For now, accept code "123456" or any 6 digits
    setCorretor(pendingCorretor);
    sessionStorage.setItem('corretor_auth', JSON.stringify(pendingCorretor));
    setPendingCorretor(null);
    setPendingIdentifier(null);
    return true;
  }, [pendingCorretor]);

  const logout = useCallback(() => {
    setCorretor(null);
    sessionStorage.removeItem('corretor_auth');
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <CorretorAuthContext.Provider value={{
      isAuthenticated: !!corretor,
      corretor,
      isLoading,
      error,
      login,
      verifyCode,
      logout,
      clearError,
      pendingIdentifier,
    }}>
      {children}
    </CorretorAuthContext.Provider>
  );
}

export function useCorretorAuth() {
  const ctx = useContext(CorretorAuthContext);
  if (!ctx) throw new Error('useCorretorAuth must be used within CorretorAuthProvider');
  return ctx;
}

export function CorretorProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useCorretorAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!isAuthenticated) {
    window.location.href = '/corretor/login';
    return null;
  }
  return <>{children}</>;
}
