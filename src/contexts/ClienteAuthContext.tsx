import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useClienteAuthAdapter, VerificationMethod } from '@/hooks/useClienteAuthAdapter';
import { Lead } from '@/types/lead-mt';

interface ClienteAuthContextType {
  // Estado de autenticação
  isAuthenticated: boolean;
  lead: Lead | null;
  isLoading: boolean;

  // Estado do processo de login
  isSendingCode: boolean;
  isVerifying: boolean;
  error: string | null;
  codeSentTo: string | null;
  codeSentMethod: VerificationMethod | null;
  pendingCpfOrPhone: string | null;

  // Ações
  requestCode: (cpfOrPhone: string, metodo: VerificationMethod) => Promise<boolean>;
  verifyCode: (codigo: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

const ClienteAuthContext = createContext<ClienteAuthContextType | undefined>(undefined);

interface ClienteAuthProviderProps {
  children: ReactNode;
}

export function ClienteAuthProvider({ children }: ClienteAuthProviderProps) {
  const {
    isAuthenticated,
    lead,
    isLoading,
    isSendingCode,
    isVerifying,
    error,
    codeSentTo,
    codeSentMethod,
    pendingCpfOrPhone,
    solicitarCodigo,
    verificarCodigo,
    logout,
    clearError,
    checkStoredAuth,
  } = useClienteAuthAdapter();

  // Verificar autenticação armazenada ao montar
  useEffect(() => {
    checkStoredAuth();
  }, [checkStoredAuth]);

  const value: ClienteAuthContextType = {
    isAuthenticated,
    lead,
    isLoading,
    isSendingCode,
    isVerifying,
    error,
    codeSentTo,
    codeSentMethod,
    pendingCpfOrPhone,
    requestCode: solicitarCodigo,
    verifyCode: verificarCodigo,
    logout,
    clearError,
  };

  return (
    <ClienteAuthContext.Provider value={value}>
      {children}
    </ClienteAuthContext.Provider>
  );
}

export function useClienteAuthContext(): ClienteAuthContextType {
  const context = useContext(ClienteAuthContext);

  if (context === undefined) {
    throw new Error('useClienteAuthContext must be used within a ClienteAuthProvider');
  }

  return context;
}
