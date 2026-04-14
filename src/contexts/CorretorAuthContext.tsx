import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { wahaApi } from '@/services/waha-api';

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

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function formatPhoneForWhatsApp(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  const withCountry = cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
  return `${withCountry}@c.us`;
}

async function sendWhatsAppOTP(phone: string, code: string, nome: string): Promise<boolean> {
  try {
    const { data: wahaConfig } = await supabase
      .from('mt_waha_config')
      .select('api_url, api_key, enabled')
      .maybeSingle();

    if (!wahaConfig?.enabled || !wahaConfig.api_url) {
      console.warn('[CorretorAuth] WAHA desabilitado ou não configurado');
      return false;
    }

    wahaApi.setConfig(wahaConfig.api_url, wahaConfig.api_key || '');

    const { data: sessoes } = await supabase
      .from('mt_whatsapp_sessions')
      .select('session_name, status')
      .eq('status', 'WORKING')
      .limit(1);

    if (!sessoes?.length) {
      console.error('[CorretorAuth] Nenhuma sessão WhatsApp ativa');
      return false;
    }

    const sessionName = sessoes[0].session_name;
    const chatId = formatPhoneForWhatsApp(phone);
    const firstName = nome ? nome.split(' ')[0] : '';

    const message = `🔐 *Portal do Corretor - Código de Acesso*

Olá${firstName ? `, ${firstName}` : ''}!

Seu código de acesso ao Portal do Corretor:

*${code}*

Válido por 5 minutos.

⚠️ Se você não solicitou, ignore esta mensagem.

_Viniun Imóveis_`;

    await wahaApi.sendText({ session: sessionName, chatId, text: message });
    return true;
  } catch (err) {
    console.error('[CorretorAuth] Erro ao enviar WhatsApp:', err);
    return false;
  }
}

export function CorretorAuthProvider({ children }: { children: ReactNode }) {
  const [corretor, setCorretor] = useState<Corretor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingIdentifier, setPendingIdentifier] = useState<string | null>(null);
  const [pendingCorretor, setPendingCorretor] = useState<Corretor | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('corretor_auth');
    if (stored) {
      try { setCorretor(JSON.parse(stored)); } catch { /* ignore */ }
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

      const corretorData = data as Corretor & { telefone: string; celular: string };

      // Generate and store OTP
      const code = generateCode();
      const expiry = new Date();
      expiry.setMinutes(expiry.getMinutes() + 5);

      await (supabase as any)
        .from('mt_corretores')
        .update({
          codigo_verificacao: code,
          codigo_expira_em: expiry.toISOString(),
        })
        .eq('id', corretorData.id);

      // Send via WhatsApp
      const phone = corretorData.celular || corretorData.telefone;
      if (phone) {
        const sent = await sendWhatsAppOTP(phone, code, corretorData.nome || '');
        if (!sent) {
          // Fallback: allow login anyway but log warning
          console.warn('[CorretorAuth] WhatsApp não enviado, código salvo no banco para verificação manual');
        }
      }

      setPendingCorretor(corretorData);
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
    if (!pendingCorretor) {
      setError('Sessão expirada. Tente novamente.');
      return false;
    }
    if (code.length !== 6) {
      setError('Código deve ter 6 dígitos.');
      return false;
    }

    try {
      // Verify code against database
      const { data, error: err } = await (supabase as any)
        .from('mt_corretores')
        .select('codigo_verificacao, codigo_expira_em')
        .eq('id', pendingCorretor.id)
        .single();

      if (err || !data) {
        setError('Erro ao verificar código. Tente novamente.');
        return false;
      }

      // Check code match
      if (data.codigo_verificacao !== code) {
        setError('Código inválido. Verifique e tente novamente.');
        return false;
      }

      // Check expiry
      if (data.codigo_expira_em && new Date(data.codigo_expira_em) < new Date()) {
        setError('Código expirado. Solicite um novo código.');
        return false;
      }

      // Clear verification code
      await (supabase as any)
        .from('mt_corretores')
        .update({ codigo_verificacao: null, codigo_expira_em: null })
        .eq('id', pendingCorretor.id);

      // Authenticate
      setCorretor(pendingCorretor);
      sessionStorage.setItem('corretor_auth', JSON.stringify(pendingCorretor));
      setPendingCorretor(null);
      setPendingIdentifier(null);
      return true;
    } catch (e: any) {
      setError(e.message || 'Erro ao verificar código');
      return false;
    }
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
