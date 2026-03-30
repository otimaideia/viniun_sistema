import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useParceriaAuth, VerificationMethod } from '@/hooks/useParceriaAuth';
import { Parceria } from '@/types/parceria';

interface ParceriaAuthContextType {
  // Estado de autenticação
  isAuthenticated: boolean;
  parceria: Parceria | null;
  isLoading: boolean;

  // Estado do processo de login
  isSendingCode: boolean;
  isVerifying: boolean;
  error: string | null;
  codeSentTo: string | null;
  codeSentMethod: VerificationMethod | null;
  pendingIdentifier: string | null;

  // Ações
  requestCode: (cnpjOrPhoneOrEmail: string, metodo: VerificationMethod) => Promise<boolean>;
  verifyCode: (codigo: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  refreshParceria: () => Promise<void>;
}

const ParceriaAuthContext = createContext<ParceriaAuthContextType | undefined>(undefined);

interface ParceriaAuthProviderProps {
  children: ReactNode;
}

export function ParceriaAuthProvider({ children }: ParceriaAuthProviderProps) {
  const {
    isAuthenticated,
    parceria,
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
    refreshParceria,
  } = useParceriaAuth();

  // Verificar autenticação armazenada ao montar
  useEffect(() => {
    checkStoredAuth();
  }, [checkStoredAuth]);

  const value: ParceriaAuthContextType = {
    isAuthenticated,
    parceria,
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
    refreshParceria,
  };

  return (
    <ParceriaAuthContext.Provider value={value}>
      {children}
    </ParceriaAuthContext.Provider>
  );
}

export function useParceriaAuthContext(): ParceriaAuthContextType {
  const context = useContext(ParceriaAuthContext);

  if (context === undefined) {
    throw new Error('useParceriaAuthContext must be used within a ParceriaAuthProvider');
  }

  return context;
}
