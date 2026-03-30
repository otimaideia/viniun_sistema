import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useInfluenciadoraAuthAdapter, VerificationMethod } from '@/hooks/useInfluenciadoraAuthAdapter';
import { Influenciadora } from '@/types/influenciadora';

interface InfluenciadoraAuthContextType {
  // Estado de autenticação
  isAuthenticated: boolean;
  influenciadora: Influenciadora | null;
  isLoading: boolean;

  // Estado do processo de login
  isSendingCode: boolean;
  isVerifying: boolean;
  error: string | null;
  codeSentTo: string | null;
  codeSentMethod: VerificationMethod | null;
  pendingIdentifier: string | null;

  // Ações
  requestCode: (cpfOrPhoneOrEmail: string, metodo: VerificationMethod) => Promise<boolean>;
  verifyCode: (codigo: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  refreshInfluenciadora: () => Promise<void>;
}

const InfluenciadoraAuthContext = createContext<InfluenciadoraAuthContextType | undefined>(undefined);

interface InfluenciadoraAuthProviderProps {
  children: ReactNode;
}

export function InfluenciadoraAuthProvider({ children }: InfluenciadoraAuthProviderProps) {
  const {
    isAuthenticated,
    influenciadora,
    isLoading,
    isSendingCode,
    isVerifying,
    error,
    codeSentTo,
    codeSentMethod,
    pendingIdentifier,
    solicitarCodigo,
    verificarCodigo,
    logout,
    clearError,
    checkStoredAuth,
    refreshInfluenciadora,
  } = useInfluenciadoraAuthAdapter();

  // Verificar autenticação armazenada ao montar
  useEffect(() => {
    checkStoredAuth();
  }, [checkStoredAuth]);

  const value: InfluenciadoraAuthContextType = {
    isAuthenticated,
    influenciadora,
    isLoading,
    isSendingCode,
    isVerifying,
    error,
    codeSentTo,
    codeSentMethod,
    pendingIdentifier,
    requestCode: solicitarCodigo,
    verifyCode: verificarCodigo,
    logout,
    clearError,
    refreshInfluenciadora,
  };

  return (
    <InfluenciadoraAuthContext.Provider value={value}>
      {children}
    </InfluenciadoraAuthContext.Provider>
  );
}

export function useInfluenciadoraAuthContext(): InfluenciadoraAuthContextType {
  const context = useContext(InfluenciadoraAuthContext);

  if (context === undefined) {
    throw new Error('useInfluenciadoraAuthContext must be used within a InfluenciadoraAuthProvider');
  }

  return context;
}
