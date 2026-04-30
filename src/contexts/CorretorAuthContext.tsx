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

const MAX_VERIFY_ATTEMPTS = 5;

export function CorretorAuthProvider({ children }: { children: ReactNode }) {
  const [corretor, setCorretor] = useState<Corretor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingIdentifier, setPendingIdentifier] = useState<string | null>(null);
  const [pendingCorretor, setPendingCorretor] = useState<Corretor | null>(null);
  const [verifyAttempts, setVerifyAttempts] = useState(0);

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

      // Reject identifiers containing PostgREST filter operators to prevent injection
      if (/[(),"]/.test(identifier)) {
        setError('Email ou telefone inválido.');
        setIsLoading(false);
        return false;
      }

      // Use 3 separate .eq() queries instead of .or() with interpolation (prevents filter injection)
      const tryFind = async (column: 'email' | 'telefone' | 'celular') => {
        const { data } = await (supabase as any)
          .from('mt_corretores')
          .select('*')
          .eq(column, identifier)
          .is('deleted_at', null)
          .maybeSingle();
        return data;
      };

      const data =
        (await tryFind('email')) ||
        (await tryFind('telefone')) ||
        (await tryFind('celular'));

      if (!data) {
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

      // Send via WhatsApp — block login if delivery fails (no insecure fallback)
      const phone = corretorData.celular || corretorData.telefone;
      if (!phone) {
        setError('Corretor sem telefone cadastrado. Contate o administrador.');
        setIsLoading(false);
        return false;
      }

      const sent = await sendWhatsAppOTP(phone, code, corretorData.nome || '');
      if (!sent) {
        setError('Não foi possível enviar o código por WhatsApp. Tente novamente em instantes.');
        setIsLoading(false);
        return false;
      }

      setVerifyAttempts(0);
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
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setError('Código deve ter 6 dígitos numéricos.');
      return false;
    }
    if (verifyAttempts >= MAX_VERIFY_ATTEMPTS) {
      setError('Muitas tentativas. Solicite um novo código.');
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

      // Check expiry first to avoid leaking validity of stored code via timing
      if (data.codigo_expira_em && new Date(data.codigo_expira_em) < new Date()) {
        setError('Código expirado. Solicite um novo código.');
        return false;
      }

      // Check code match
      if (data.codigo_verificacao !== code) {
        const next = verifyAttempts + 1;
        setVerifyAttempts(next);
        if (next >= MAX_VERIFY_ATTEMPTS) {
          // Invalidate the code on server after too many attempts
          await (supabase as any)
            .from('mt_corretores')
            .update({ codigo_verificacao: null, codigo_expira_em: null })
            .eq('id', pendingCorretor.id);
          setPendingCorretor(null);
          setPendingIdentifier(null);
          setError('Muitas tentativas. Solicite um novo código.');
        } else {
          setError(`Código inválido. ${MAX_VERIFY_ATTEMPTS - next} tentativa(s) restante(s).`);
        }
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
      setVerifyAttempts(0);
      return true;
    } catch (e: any) {
      setError(e.message || 'Erro ao verificar código');
      return false;
    }
  }, [pendingCorretor, verifyAttempts]);

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
