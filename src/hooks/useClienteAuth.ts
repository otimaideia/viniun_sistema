import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Lead } from '@/types/lead-mt';
import { cleanCPF, validateCPF } from '@/utils/cpf';
import { cleanPhone, validatePhone, detectInputType } from '@/utils/phone';
import { wahaApi } from '@/services/waha-api';

const CLIENTE_TOKEN_KEY = 'mt_cliente_token';
const CLIENTE_DATA_KEY = 'mt_cliente_data';
const TOKEN_EXPIRY_HOURS = 24;

// =============================================================================
// Tenant Detection for Public Portal
// =============================================================================

/**
 * Derives the current tenant slug from the browser URL.
 * In production: reads the subdomain (e.g. viniun.app.com → 'viniun').
 * In development: reads the ?tenant= query param.
 * Falls back to 'viniun' so the client portal always has a tenant scope.
 */
function getCurrentTenantSlug(): string {
  const hostname = window.location.hostname;
  const isDev = ['localhost', '127.0.0.1', '192.168.'].some(d => hostname.includes(d));

  if (!isDev) {
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      const sub = parts[0].toLowerCase();
      if (sub !== 'www') return sub;
      if (parts.length >= 4) return parts[1].toLowerCase();
    }
  } else {
    const param = new URLSearchParams(window.location.search).get('tenant');
    if (param) return param.toLowerCase();
  }

  return 'viniun';
}

/**
 * Resolves the tenant UUID for the given slug.
 * Falls back to dominio_customizado lookup and known Viniun domains.
 * Returns null if the tenant is not found or inactive.
 */
async function resolveTenantId(slug: string): Promise<string | null> {
  // 1. Try by slug
  const { data } = await supabase
    .from('mt_tenants')
    .select('id')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (data) return (data as { id: string }).id;

  // 2. Fallback: try by dominio_customizado (full hostname)
  const hostname = window.location.hostname;
  const { data: domainData } = await supabase
    .from('mt_tenants')
    .select('id')
    .eq('dominio_customizado', hostname)
    .eq('is_active', true)
    .maybeSingle();

  if (domainData) return (domainData as { id: string }).id;

  // 3. Fallback: for known Viniun domains, resolve to 'viniun'
  if (hostname.includes('viniun')) {
    const { data: viniunTenant } = await supabase
      .from('mt_tenants')
      .select('id')
      .eq('slug', 'viniun')
      .eq('is_active', true)
      .maybeSingle();
    if (viniunTenant) return (viniunTenant as { id: string }).id;
  }

  return null;
}

export type VerificationMethod = 'whatsapp' | 'email';

interface UseClienteAuthReturn {
  // Estado
  isAuthenticated: boolean;
  lead: Lead | null;
  isLoading: boolean;
  isSendingCode: boolean;
  isVerifying: boolean;
  error: string | null;
  codeSentTo: string | null;
  codeSentMethod: VerificationMethod | null;
  pendingCpfOrPhone: string | null;

  // Ações
  solicitarCodigo: (cpfOrPhone: string, metodo: VerificationMethod) => Promise<boolean>;
  verificarCodigo: (codigo: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  checkStoredAuth: () => Promise<boolean>;
}

/**
 * Gera um código aleatório de 6 dígitos
 */
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Formata número de telefone para formato WhatsApp
 * Input: 13974079532 → Output: 5513974079532@c.us
 */
function formatPhoneForWhatsApp(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  // Se não começa com 55, adiciona código do Brasil
  const withCountry = cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
  return `${withCountry}@c.us`;
}

/**
 * Envia código de verificação via WhatsApp usando WAHA
 */
async function sendWhatsAppCode(phone: string, code: string, nome: string): Promise<boolean> {
  try {
    // 1. Buscar configuração WAHA
    const { data: wahaConfig, error: configError } = await supabase
      .from('mt_waha_config')
      .select('api_url, api_key, enabled')
      .maybeSingle();

    if (configError || !wahaConfig) {
      console.error('Configuração WAHA não encontrada');
      return false;
    }

    if (!wahaConfig.enabled) {
      console.warn('WAHA está desabilitado');
      return false;
    }

    // 2. Configurar API
    wahaApi.setConfig(wahaConfig.api_url, wahaConfig.api_key || '');

    // 3. Buscar uma sessão ativa (WORKING)
    const { data: sessoes, error: sessoesError } = await supabase
      .from('mt_whatsapp_sessions')
      .select('session_name, status')
      .eq('status', 'WORKING')
      .limit(1);

    if (sessoesError || !sessoes || sessoes.length === 0) {
      console.error('Nenhuma sessão WhatsApp ativa encontrada');
      return false;
    }

    const sessionName = sessoes[0].session_name;
    const chatId = formatPhoneForWhatsApp(phone);

    // 4. Montar e enviar mensagem
    const message = `🔐 *Viniun - Código de Verificação*

Olá${nome ? `, ${nome.split(' ')[0]}` : ''}!

Seu código de acesso é:

*${code}*

Este código é válido por 5 minutos.

⚠️ Se você não solicitou este código, ignore esta mensagem.

_Atendimento Viniun_`;

    await wahaApi.sendText({
      session: sessionName,
      chatId,
      text: message,
    });

    return true;
  } catch (err) {
    console.error('Erro ao enviar WhatsApp:', err);
    return false;
  }
}

export function useClienteAuth(): UseClienteAuthReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lead, setLead] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [codeSentMethod, setCodeSentMethod] = useState<VerificationMethod | null>(null);
  const [pendingCpfOrPhone, setPendingCpfOrPhone] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  /**
   * Verifica se há sessão armazenada válida
   */
  const checkStoredAuth = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);

    try {
      const storedToken = localStorage.getItem(CLIENTE_TOKEN_KEY);
      const storedData = localStorage.getItem(CLIENTE_DATA_KEY);

      if (!storedToken || !storedData) {
        return false;
      }

      const { leadId, expiry } = JSON.parse(storedToken);

      // Verificar se o token expirou
      if (new Date(expiry) < new Date()) {
        localStorage.removeItem(CLIENTE_TOKEN_KEY);
        localStorage.removeItem(CLIENTE_DATA_KEY);
        return false;
      }

      // Resolve tenant to scope the query (prevents cross-tenant data leakage)
      const tenantSlug = getCurrentTenantSlug();
      const tenantId = await resolveTenantId(tenantSlug);

      // Buscar dados atualizados do lead
      let storedQuery = supabase
        .from('mt_leads')
        .select('*')
        .eq('id', leadId);

      // Scope to tenant - prevents accessing another tenant's lead via stored token
      if (tenantId) {
        storedQuery = storedQuery.eq('tenant_id', tenantId);
      }

      const { data: leadData, error: leadError } = await storedQuery.single();

      if (leadError || !leadData) {
        localStorage.removeItem(CLIENTE_TOKEN_KEY);
        localStorage.removeItem(CLIENTE_DATA_KEY);
        return false;
      }

      setLead(leadData as Lead);
      setIsAuthenticated(true);
      return true;
    } catch (err) {
      console.error('Erro ao verificar autenticação:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Solicita envio de código de verificação
   */
  const solicitarCodigo = useCallback(async (
    cpfOrPhone: string,
    metodo: VerificationMethod
  ): Promise<boolean> => {
    setIsSendingCode(true);
    setError(null);
    setCodeSentTo(null);
    setCodeSentMethod(null);

    try {
      const cleaned = cpfOrPhone.replace(/\D/g, '');
      const inputType = detectInputType(cpfOrPhone);

      if (inputType === 'unknown') {
        setError('Digite um CPF ou telefone válido');
        return false;
      }

      const isCPF = inputType === 'cpf';
      const isPhone = inputType === 'phone';

      if (isCPF && !validateCPF(cpfOrPhone)) {
        setError('CPF inválido');
        return false;
      }

      if (isPhone && !validatePhone(cpfOrPhone)) {
        setError('Telefone inválido');
        return false;
      }

      // Resolve tenant to scope the query (prevents cross-tenant data leakage)
      const tenantSlug = getCurrentTenantSlug();
      const tenantId = await resolveTenantId(tenantSlug);

      // Buscar lead
      let query = supabase.from('mt_leads').select('*');

      // Always scope to the current tenant
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      if (isCPF) {
        query = query.or(`cpf.eq.${cleaned},cpf.eq.${cleanCPF(cpfOrPhone)}`);
      } else {
        // Buscar por telefone - múltiplos formatos (+55, 55, sem prefixo)
        const withCountry = `55${cleaned}`;
        const withPlus = `+55${cleaned}`;
        query = query.or(`telefone.eq.${cleaned},telefone.eq.${withCountry},telefone.eq.${withPlus},telefone.ilike.%${cleaned}`);
      }

      const { data: leads, error: leadError } = await query;

      if (leadError) {
        throw leadError;
      }

      if (!leads || leads.length === 0) {
        setError('Cadastro não encontrado. Entre em contato com a unidade.');
        return false;
      }

      const leadData = leads[0] as Lead;

      // Verificar se tem o dado necessário para o método escolhido
      if (metodo === 'email' && !leadData.email) {
        setError('Email não cadastrado. Use o WhatsApp ou atualize seus dados na unidade.');
        return false;
      }

      if (metodo === 'whatsapp' && !leadData.telefone && !leadData.whatsapp) {
        setError('Telefone não cadastrado. Use o email ou atualize seus dados na unidade.');
        return false;
      }

      // Gerar código
      const code = generateCode();
      const expiry = new Date();
      expiry.setMinutes(expiry.getMinutes() + 5); // 5 minutos de validade

      // Salvar código no lead
      const { error: updateError } = await supabase
        .from('mt_leads')
        .update({
          codigo_verificacao: code,
          codigo_expira_em: expiry.toISOString(),
        })
        .eq('id', leadData.id);

      if (updateError) {
        throw updateError;
      }

      // Enviar código
      if (metodo === 'whatsapp') {
        const telefoneDestino = leadData.telefone || leadData.whatsapp || '';
        const enviado = await sendWhatsAppCode(telefoneDestino, code, leadData.nome || '');

        if (!enviado) {
          // Fallback: mostrar código no console (apenas dev)
          console.warn('[DEV] Falha ao enviar WhatsApp, código:', code);
        }
      } else {
        // Email auth requires SMTP integration via mt_tenant_integrations
      }

      // Definir para onde foi enviado
      const destino = metodo === 'email'
        ? leadData.email || ''
        : leadData.telefone || leadData.whatsapp || '';

      setPendingCpfOrPhone(cpfOrPhone);
      setCodeSentTo(destino);
      setCodeSentMethod(metodo);

      return true;
    } catch (err) {
      console.error('Erro ao solicitar código:', err);
      setError('Erro ao enviar código. Tente novamente.');
      return false;
    } finally {
      setIsSendingCode(false);
    }
  }, []);

  /**
   * Verifica o código de autenticação
   */
  const verificarCodigo = useCallback(async (codigo: string): Promise<boolean> => {
    if (!pendingCpfOrPhone) {
      setError('Solicite um novo código');
      return false;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const cleaned = pendingCpfOrPhone.replace(/\D/g, '');
      const inputType = detectInputType(pendingCpfOrPhone);
      const isCPF = inputType === 'cpf';

      // Resolve tenant to scope the query (prevents cross-tenant data leakage)
      const tenantSlug = getCurrentTenantSlug();
      const tenantId = await resolveTenantId(tenantSlug);

      // Buscar lead com código
      let query = supabase.from('mt_leads').select('*');

      // Always scope to the current tenant
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      if (isCPF) {
        query = query.or(`cpf.eq.${cleaned},cpf.eq.${cleanCPF(pendingCpfOrPhone)}`);
      } else {
        // Buscar por telefone - múltiplos formatos (+55, 55, sem prefixo)
        const withCountry = `55${cleaned}`;
        const withPlus = `+55${cleaned}`;
        query = query.or(`telefone.eq.${cleaned},telefone.eq.${withCountry},telefone.eq.${withPlus},telefone.ilike.%${cleaned}`);
      }

      const { data: leads, error: leadError } = await query.eq('codigo_verificacao', codigo);

      if (leadError) {
        throw leadError;
      }

      if (!leads || leads.length === 0) {
        setError('Código inválido');
        return false;
      }

      const leadData = leads[0] as Lead;

      // Verificar expiração
      if (leadData.codigo_expira_em && new Date(leadData.codigo_expira_em) < new Date()) {
        setError('Código expirado. Solicite um novo código.');
        return false;
      }

      // Limpar código e atualizar último login
      const { error: updateError } = await supabase
        .from('mt_leads')
        .update({
          codigo_verificacao: null,
          codigo_expira_em: null,
          ultimo_login: new Date().toISOString(),
        })
        .eq('id', leadData.id);

      if (updateError) {
        console.error('Erro ao atualizar login:', updateError);
      }

      // Criar token de sessão
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + TOKEN_EXPIRY_HOURS);

      localStorage.setItem(CLIENTE_TOKEN_KEY, JSON.stringify({
        leadId: leadData.id,
        expiry: expiry.toISOString(),
      }));
      localStorage.setItem(CLIENTE_DATA_KEY, JSON.stringify(leadData));

      setLead(leadData);
      setIsAuthenticated(true);
      setPendingCpfOrPhone(null);
      setCodeSentTo(null);
      setCodeSentMethod(null);

      return true;
    } catch (err) {
      console.error('Erro ao verificar código:', err);
      setError('Erro ao verificar código. Tente novamente.');
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, [pendingCpfOrPhone]);

  /**
   * Encerra a sessão do cliente
   */
  const logout = useCallback(() => {
    localStorage.removeItem(CLIENTE_TOKEN_KEY);
    localStorage.removeItem(CLIENTE_DATA_KEY);
    setLead(null);
    setIsAuthenticated(false);
    setPendingCpfOrPhone(null);
    setCodeSentTo(null);
    setCodeSentMethod(null);
  }, []);

  return {
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
  };
}
