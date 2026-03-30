// =============================================================================
// USE INFLUENCIADORA AUTH ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para autenticação de influenciadoras no portal usando tabelas MT
// SISTEMA 100% MT - Usa mt_influencers diretamente
//
// =============================================================================

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { wahaApi } from '@/services/waha-api';
import { fireAndForgetLoginRecord } from '@/hooks/multitenant/useInfluencerLoginHistoryMT';

// =============================================================================
// UUID validation regex (for sanitizing sessionStorage values)
// =============================================================================
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// =============================================================================
// Types
// =============================================================================

export type VerificationMethod = 'whatsapp' | 'email';

export interface AuthState {
  isAuthenticated: boolean;
  influenciadoraId: string | null;
  influenciadora: InfluenciadoraAuthInfo | null;
  isLoading: boolean;
  error: string | null;
}

export interface InfluenciadoraAuthInfo {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  nome: string;
  nome_completo: string | null;
  nome_artistico: string | null;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  cpf: string | null;
  rg: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cep: string | null;
  cidade: string | null;
  estado: string | null;
  foto_perfil: string | null;
  codigo: string | null;
  codigo_indicacao: string | null; // alias de codigo, usado pelo portal
  genero: string | null;
  status: string;
  is_active: boolean;
  aceite_termos: boolean;
  aceite_termos_at: string | null;
  ultimo_login: string | null;
  onboarding_completed: boolean;
}

interface MTInfluencer {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  nome: string;
  nome_completo: string | null;
  nome_artistico: string | null;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  cpf: string | null;
  rg: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cep: string | null;
  cidade: string | null;
  estado: string | null;
  foto_perfil: string | null;
  codigo: string | null;
  genero: string | null;
  status: string;
  is_active: boolean;
  aceite_termos: boolean;
  aceite_termos_at: string | null;
  codigo_verificacao: string | null;
  codigo_expira_em: string | null;
  ultimo_login: string | null;
  onboarding_completed: boolean | null;
}

// =============================================================================
// Helper Functions
// =============================================================================

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getCodeExpiration(): string {
  const expiration = new Date();
  expiration.setMinutes(expiration.getMinutes() + 10); // 10 minutos
  return expiration.toISOString();
}

/**
 * Hashes an OTP code with SHA-256 for safe database storage.
 * The hash is used only for verification (not as a password hash),
 * so a simple digest without salt is sufficient here.
 */
async function hashOTP(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Derives the current tenant slug from the browser URL.
 * In production: reads the subdomain (e.g. yeslaser.app.com → 'yeslaser').
 * In development: reads the ?tenant= query param.
 * Falls back to 'yeslaser' so the influenciadora portal always has a tenant scope.
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

  return 'yeslaser';
}

/**
 * Resolves the tenant UUID for the given slug.
 * Falls back to dominio_customizado lookup when slug is a generic subdomain
 * (e.g. "app" in app.yeslaserpraiagrande.com.br) that doesn't match any tenant slug.
 * Returns null if the tenant is not found or inactive.
 */
async function resolveTenantId(slug: string): Promise<string | null> {
  // 1. Try by slug (use maybeSingle to avoid 406 when no rows found)
  const { data } = await supabase
    .from('mt_tenants')
    .select('id')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (data) return (data as { id: string }).id;

  // 2. Fallback: try by dominio_customizado (full hostname)
  // Handles cases like "app.yeslaserpraiagrande.com.br" where "app" is not a tenant slug
  const hostname = window.location.hostname;
  const { data: domainData } = await supabase
    .from('mt_tenants')
    .select('id')
    .eq('dominio_customizado', hostname)
    .eq('is_active', true)
    .maybeSingle();

  if (domainData) return (domainData as { id: string }).id;

  // 3. Fallback: for known YESlaser domains, resolve to 'yeslaser'
  if (hostname.includes('yeslaser')) {
    const { data: yeslaser } = await supabase
      .from('mt_tenants')
      .select('id')
      .eq('slug', 'yeslaser')
      .eq('is_active', true)
      .maybeSingle();
    if (yeslaser) return (yeslaser as { id: string }).id;
  }

  return null;
}

/**
 * Formata telefone para formato WhatsApp (55XXXXXXXXXX@c.us)
 */
function formatPhoneForWhatsApp(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  const withCountry = cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
  return `${withCountry}@c.us`;
}

/**
 * Envia código OTP via WhatsApp usando WAHA (mesma sessão da unidade)
 */
async function sendWhatsAppOTP(phone: string, code: string, nome: string): Promise<boolean> {
  try {
    // 1. Buscar configuração WAHA
    const { data: wahaConfig, error: configError } = await supabase
      .from('mt_waha_config')
      .select('api_url, api_key, enabled')
      .maybeSingle();

    if (configError || !wahaConfig || !wahaConfig.enabled) {
      console.warn('[WAHA] Config não encontrada ou desabilitada');
      return false;
    }

    wahaApi.setConfig(wahaConfig.api_url, wahaConfig.api_key || '');

    // 2. Buscar sessão ativa no banco
    let sessionName: string | null = null;

    const { data: sessoes } = await supabase
      .from('mt_whatsapp_sessions')
      .select('session_name, status')
      .eq('status', 'working')
      .limit(1);

    if (sessoes && sessoes.length > 0) {
      sessionName = sessoes[0].session_name;
    } else {
      // Fallback: buscar direto na API WAHA
      try {
        const wahaResp = await fetch(`${wahaConfig.api_url}/api/sessions`, {
          headers: { 'X-Api-Key': wahaConfig.api_key || '' },
        });
        if (wahaResp.ok) {
          const wahaSessions = await wahaResp.json();
          const active = wahaSessions.find(
            (s: { status: string }) => s.status === 'WORKING' || s.status === 'working'
          );
          if (active) sessionName = active.name;
        }
      } catch (err) {
        console.error('[WAHA] Erro ao buscar sessões:', err);
      }
    }

    if (!sessionName) {
      console.error('[WAHA] Nenhuma sessão ativa encontrada');
      return false;
    }

    const chatId = formatPhoneForWhatsApp(phone);
    const message = `🔐 *YESlaser - Portal de Parceiros*

Olá${nome ? `, ${nome}` : ''}!

Seu código de acesso é:

*${code}*

Este código é válido por 10 minutos.

⚠️ Se você não solicitou este código, ignore esta mensagem.

_Equipe YESlaser_`;

    await wahaApi.sendText({
      session: sessionName,
      chatId,
      text: message,
    });

    console.log(`[WAHA] OTP enviado para ${chatId} via ${sessionName}`);
    return true;
  } catch (err) {
    console.error('[WAHA] Erro ao enviar:', err);
    return false;
  }
}

/**
 * Envia código OTP via Email usando a edge function enviar-otp
 */
async function sendEmailOTP(email: string, code: string, nome: string): Promise<boolean> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const response = await fetch(`${supabaseUrl}/functions/v1/enviar-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({
        metodo: 'email',
        destino: email,
        codigo: code,
        nome,
        tipo: 'influenciadora',
      }),
    });

    const result = await response.json();

    if (!result.success) {
      console.warn('[EMAIL] Falha ao enviar:', result.error);
      // Do not log OTP code in console even in dev mode
      return false;
    }

    return true;
  } catch (err) {
    console.error('[EMAIL] Erro:', err);
    return false;
  }
}

// =============================================================================
// Hook Principal
// =============================================================================

export function useInfluenciadoraAuthAdapter() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    influenciadoraId: null,
    influenciadora: null,
    isLoading: false,
    error: null,
  });

  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // ==========================================================================
  // Solicitar Código de Verificação
  // ==========================================================================
  const requestCode = useCallback(
    async (identifier: string, method: VerificationMethod = 'whatsapp'): Promise<boolean> => {
      setIsRequestingCode(true);
      setAuthState((prev) => ({ ...prev, error: null }));

      try {
        // Resolve tenant so we can scope all queries (prevents cross-tenant data leakage)
        const tenantSlug = getCurrentTenantSlug();
        const tenantId = await resolveTenantId(tenantSlug);

        // Buscar influenciadora pelo identificador
        // O lookup é pelo TIPO do identificador (telefone vs email),
        // NÃO pelo método de entrega escolhido — isso evita o bug onde
        // a usuária digita o telefone e seleciona Email, causando busca errada.
        let query = supabase.from('mt_influencers').select('*');

        // Always scope to the current tenant
        if (tenantId) {
          query = query.eq('tenant_id', tenantId);
        }

        const isEmailIdentifier = identifier.includes('@');
        const normalizedDigits = identifier.replace(/\D/g, '');
        // CPF: 11 dígitos numéricos COM formatação de CPF (pontos/traço) OU dígitos que passam validação
        // Telefone celular BR: 11 dígitos = DDD(2) + 9 + número(8) — o 3º dígito é sempre 9
        const hasCpfFormatting = /^\d{3}[.\-]\d{3}[.\-]\d{3}[.\-]\d{2}$/.test(identifier.trim());
        const isCpfIdentifier = !isEmailIdentifier && normalizedDigits.length === 11
          && !normalizedDigits.startsWith('55')
          && (hasCpfFormatting || normalizedDigits[2] !== '9');

        if (isEmailIdentifier) {
          query = query.eq('email', identifier.toLowerCase());
        } else if (isCpfIdentifier) {
          // CPF: buscar pelo campo cpf (armazenado apenas dígitos)
          query = query.eq('cpf', normalizedDigits);
        } else {
          // Telefone: normalizar e buscar nos campos whatsapp e telefone
          // Tenta também com/sem prefixo 55 (código do Brasil) para máxima compatibilidade
          const normalizedPhone = normalizedDigits;

          // Gerar variantes: com e sem prefixo 55
          let phoneWithout55 = normalizedPhone;
          let phoneWith55 = `55${normalizedPhone}`;
          if (normalizedPhone.startsWith('55') && normalizedPhone.length >= 12) {
            phoneWithout55 = normalizedPhone.slice(2);
            phoneWith55 = normalizedPhone;
          }

          // Construir OR com todas as variantes (deduplicadas)
          const phoneVariants = [...new Set([normalizedPhone, phoneWithout55, phoneWith55])];
          const orClauses = phoneVariants
            .flatMap(p => [`whatsapp.eq.${p}`, `telefone.eq.${p}`])
            .join(',');
          query = query.or(orClauses);
        }

        // Usar limit(1) em vez de .single() para não falhar com duplicatas ou múltiplos matches
        const { data: rows, error: fetchError } = await query.limit(1);
        const data = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

        if (fetchError || !data) {
          setAuthState((prev) => ({
            ...prev,
            error: 'Conta não encontrada. Verifique os dados informados.',
          }));
          toast.error('Conta não encontrada');
          return false;
        }

        const influencer = data as MTInfluencer;

        // Verificar se está ativa
        if (!influencer.is_active) {
          setAuthState((prev) => ({
            ...prev,
            error: 'Sua conta está desativada. Entre em contato com o suporte.',
          }));
          toast.error('Conta desativada');
          return false;
        }

        // Verificar se está aprovada
        if (influencer.status === 'suspenso') {
          // Verificar se tem contrato cancelado para mensagem mais específica
          const { data: cancelledContract } = await supabase
            .from('mt_influencer_contracts')
            .select('id')
            .eq('influencer_id', influencer.id)
            .eq('status', 'cancelado')
            .limit(1);

          const hasCancelledContract = cancelledContract && cancelledContract.length > 0;

          setAuthState((prev) => ({
            ...prev,
            error: hasCancelledContract
              ? 'Seu contrato foi cancelado. Para reativar sua parceria, entre em contato com a franquia.'
              : 'Sua conta está suspensa. Entre em contato com a franquia.',
          }));
          toast.error(hasCancelledContract ? 'Contrato cancelado' : 'Conta suspensa');
          return false;
        }

        if (influencer.status !== 'approved' && influencer.status !== 'aprovado') {
          setAuthState((prev) => ({
            ...prev,
            error: 'Sua conta ainda não foi aprovada. Aguarde a aprovação.',
          }));
          toast.error('Conta pendente de aprovação');
          return false;
        }

        // Gerar código de verificação
        const verificationCode = generateVerificationCode();
        const codeExpiration = getCodeExpiration();

        // Hash the OTP before storing — never store plain-text OTPs in the database
        const hashedCode = await hashOTP(verificationCode);

        // Salvar código (hashed) no banco via RPC (SECURITY DEFINER, permite anon)
        const { error: updateError } = await supabase
          .rpc('set_influencer_otp', {
            p_id: influencer.id,
            p_codigo: hashedCode,
            p_expira_em: codeExpiration,
          });

        if (updateError) {
          throw updateError;
        }

        // Armazenar ID e tipo de identificador temporariamente para verificação
        sessionStorage.setItem('pendingInfluenciadoraId', influencer.id);
        sessionStorage.setItem('pendingIdentifierType', isEmailIdentifier ? 'email' : isCpfIdentifier ? 'cpf' : 'phone');

        // Enviar código pelo método escolhido
        let enviado = false;
        const nomeExibir = influencer.nome?.split(' ')[0] || '';

        if (method === 'whatsapp') {
          const phoneDestino = influencer.whatsapp || influencer.telefone || '';
          if (!phoneDestino) {
            setAuthState((prev) => ({
              ...prev,
              error: 'WhatsApp não cadastrado. Use o email para receber o código.',
            }));
            toast.error('WhatsApp não cadastrado');
            return false;
          }
          enviado = await sendWhatsAppOTP(phoneDestino, verificationCode, nomeExibir);
          if (!enviado) {
            // Delivery failed — do not log OTP value in console
            console.warn(`[DEV] Falha ao enviar OTP via WhatsApp para ${phoneDestino}`);
          }
        } else {
          // Email
          if (!influencer.email) {
            setAuthState((prev) => ({
              ...prev,
              error: 'Email não cadastrado. Use o WhatsApp para receber o código.',
            }));
            toast.error('Email não cadastrado');
            return false;
          }
          enviado = await sendEmailOTP(influencer.email, verificationCode, nomeExibir);
          if (!enviado) {
            // Delivery failed — do not log OTP value in console
            console.warn(`[DEV] Falha ao enviar OTP via email para ${influencer.email}`);
          }
        }

        toast.success(
          enviado
            ? (method === 'whatsapp' ? 'Código enviado para seu WhatsApp!' : 'Código enviado para seu email!')
            : (method === 'whatsapp' ? 'WhatsApp indisponível - verifique o console (DEV)' : 'Email indisponível - verifique o console (DEV)')
        );

        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao solicitar código';
        setAuthState((prev) => ({ ...prev, error: message }));
        toast.error(message);
        return false;
      } finally {
        setIsRequestingCode(false);
      }
    },
    []
  );

  // ==========================================================================
  // Verificar Código
  // ==========================================================================
  const verifyCode = useCallback(async (code: string): Promise<boolean> => {
    setIsVerifying(true);
    setAuthState((prev) => ({ ...prev, error: null }));

    try {
      // Sanitize the pending ID — only accept valid UUID format to prevent injection
      const rawPendingId = sessionStorage.getItem('pendingInfluenciadoraId');
      const pendingId = rawPendingId && UUID_REGEX.test(rawPendingId) ? rawPendingId : null;

      const pendingIdentifierType = sessionStorage.getItem('pendingIdentifierType') || undefined;

      if (!pendingId) {
        setAuthState((prev) => ({
          ...prev,
          error: 'Sessão expirada. Solicite um novo código.',
        }));
        toast.error('Sessão expirada');
        return false;
      }

      // Buscar influenciadora
      const { data, error: fetchError } = await supabase
        .from('mt_influencers')
        .select('*')
        .eq('id', pendingId)
        .single();

      if (fetchError || !data) {
        setAuthState((prev) => ({
          ...prev,
          error: 'Conta não encontrada.',
        }));
        return false;
      }

      const influencer = data as MTInfluencer;

      // Hash the supplied code before comparing with the stored hash
      const hashedInput = await hashOTP(code);

      // Verificar código (compare hashes, not plain text)
      if (influencer.codigo_verificacao !== hashedInput) {
        fireAndForgetLoginRecord({
          tenant_id: influencer.tenant_id,
          influencer_id: influencer.id,
          success: false,
          failure_reason: 'invalid_code',
          identifier_type: pendingIdentifierType,
          verification_method: codeSentMethod || 'whatsapp',
        });
        setAuthState((prev) => ({
          ...prev,
          error: 'Código inválido. Tente novamente.',
        }));
        toast.error('Código inválido');
        return false;
      }

      // Verificar expiração
      if (influencer.codigo_expira_em && new Date(influencer.codigo_expira_em) < new Date()) {
        fireAndForgetLoginRecord({
          tenant_id: influencer.tenant_id,
          influencer_id: influencer.id,
          success: false,
          failure_reason: 'expired_code',
          identifier_type: pendingIdentifierType,
          verification_method: codeSentMethod || 'whatsapp',
        });
        setAuthState((prev) => ({
          ...prev,
          error: 'Código expirado. Solicite um novo código.',
        }));
        toast.error('Código expirado');
        return false;
      }

      // Limpar código e atualizar último login via RPC (SECURITY DEFINER, permite anon)
      const { error: updateError } = await supabase
        .rpc('clear_influencer_otp', {
          p_id: influencer.id,
        });

      if (updateError) {
        throw updateError;
      }

      // Registrar login com sucesso
      fireAndForgetLoginRecord({
        tenant_id: influencer.tenant_id,
        influencer_id: influencer.id,
        success: true,
        identifier_type: pendingIdentifierType,
        verification_method: codeSentMethod || 'whatsapp',
      });

      // Limpar sessão temporária
      sessionStorage.removeItem('pendingInfluenciadoraId');
      sessionStorage.removeItem('pendingIdentifierType');

      // Salvar autenticação em localStorage
      const authInfo: InfluenciadoraAuthInfo = {
        id: influencer.id,
        tenant_id: influencer.tenant_id,
        franchise_id: influencer.franchise_id,
        nome: influencer.nome,
        nome_completo: influencer.nome_completo,
        nome_artistico: influencer.nome_artistico,
        email: influencer.email,
        telefone: influencer.telefone,
        whatsapp: influencer.whatsapp,
        cpf: influencer.cpf,
        rg: influencer.rg,
        endereco: influencer.endereco,
        numero: influencer.numero,
        complemento: influencer.complemento,
        bairro: influencer.bairro,
        cep: influencer.cep,
        cidade: influencer.cidade,
        estado: influencer.estado,
        foto_perfil: influencer.foto_perfil,
        codigo: influencer.codigo,
        codigo_indicacao: influencer.codigo, // alias para compatibilidade com portal
        genero: influencer.genero,
        status: influencer.status,
        is_active: influencer.is_active,
        aceite_termos: influencer.aceite_termos || false,
        aceite_termos_at: influencer.aceite_termos_at,
        ultimo_login: new Date().toISOString(),
        onboarding_completed: influencer.onboarding_completed ?? false,
      };

      localStorage.setItem('influenciadoraAuth', JSON.stringify(authInfo));

      setAuthState({
        isAuthenticated: true,
        influenciadoraId: influencer.id,
        influenciadora: authInfo,
        isLoading: false,
        error: null,
      });

      toast.success('Login realizado com sucesso!');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao verificar código';
      setAuthState((prev) => ({ ...prev, error: message }));
      toast.error(message);
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, []);

  // ==========================================================================
  // Restaurar Sessão
  // ==========================================================================
  const restoreSession = useCallback(async (): Promise<boolean> => {
    setAuthState((prev) => ({ ...prev, isLoading: true }));

    try {
      const stored = localStorage.getItem('influenciadoraAuth');

      if (!stored) {
        setAuthState({
          isAuthenticated: false,
          influenciadoraId: null,
          influenciadora: null,
          isLoading: false,
          error: null,
        });
        return false;
      }

      const storedInfo: InfluenciadoraAuthInfo = JSON.parse(stored);

      // Buscar dados completos do banco para manter localStorage atualizado
      const { data, error: fetchError } = await supabase
        .from('mt_influencers')
        .select('*')
        .eq('id', storedInfo.id)
        .single();

      if (fetchError || !data || !data.is_active) {
        localStorage.removeItem('influenciadoraAuth');
        setAuthState({
          isAuthenticated: false,
          influenciadoraId: null,
          influenciadora: null,
          isLoading: false,
          error: null,
        });
        return false;
      }

      const influencer = data as MTInfluencer;

      // Reconstruir authInfo com dados frescos do banco
      const authInfo: InfluenciadoraAuthInfo = {
        id: influencer.id,
        tenant_id: influencer.tenant_id,
        franchise_id: influencer.franchise_id,
        nome: influencer.nome,
        nome_completo: influencer.nome_completo,
        nome_artistico: influencer.nome_artistico,
        email: influencer.email,
        telefone: influencer.telefone,
        whatsapp: influencer.whatsapp,
        cpf: influencer.cpf,
        rg: influencer.rg,
        endereco: influencer.endereco,
        numero: influencer.numero,
        complemento: influencer.complemento,
        bairro: influencer.bairro,
        cep: influencer.cep,
        cidade: influencer.cidade,
        estado: influencer.estado,
        foto_perfil: influencer.foto_perfil,
        codigo: influencer.codigo,
        codigo_indicacao: influencer.codigo,
        genero: influencer.genero,
        status: influencer.status,
        is_active: influencer.is_active,
        aceite_termos: influencer.aceite_termos || false,
        aceite_termos_at: influencer.aceite_termos_at,
        ultimo_login: influencer.ultimo_login,
        onboarding_completed: influencer.onboarding_completed ?? false,
      };

      // Atualizar localStorage com dados frescos
      localStorage.setItem('influenciadoraAuth', JSON.stringify(authInfo));

      setAuthState({
        isAuthenticated: true,
        influenciadoraId: authInfo.id,
        influenciadora: authInfo,
        isLoading: false,
        error: null,
      });

      return true;
    } catch (error) {
      localStorage.removeItem('influenciadoraAuth');
      setAuthState({
        isAuthenticated: false,
        influenciadoraId: null,
        influenciadora: null,
        isLoading: false,
        error: null,
      });
      return false;
    }
  }, []);

  // ==========================================================================
  // Logout
  // ==========================================================================
  const logout = useCallback(() => {
    localStorage.removeItem('influenciadoraAuth');
    sessionStorage.removeItem('pendingInfluenciadoraId');

    setAuthState({
      isAuthenticated: false,
      influenciadoraId: null,
      influenciadora: null,
      isLoading: false,
      error: null,
    });

    toast.success('Logout realizado');
  }, []);

  // ==========================================================================
  // Aceitar Termos
  // ==========================================================================
  const acceptTerms = useCallback(async (): Promise<boolean> => {
    if (!authState.influenciadoraId) {
      toast.error('Você precisa estar logado');
      return false;
    }

    try {
      const { error: updateError } = await supabase
        .from('mt_influencers')
        .update({
          aceite_termos: true,
          aceite_termos_at: new Date().toISOString(),
        })
        .eq('id', authState.influenciadoraId);

      if (updateError) throw updateError;

      // Atualizar estado local
      const updatedAuth = {
        ...authState.influenciadora!,
        aceite_termos: true,
        aceite_termos_at: new Date().toISOString(),
      };

      localStorage.setItem('influenciadoraAuth', JSON.stringify(updatedAuth));

      setAuthState((prev) => ({
        ...prev,
        influenciadora: updatedAuth,
      }));

      toast.success('Termos aceitos com sucesso!');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao aceitar termos';
      toast.error(message);
      return false;
    }
  }, [authState.influenciadoraId, authState.influenciadora]);

  // ==========================================================================
  // Atualizar Dados da Influenciadora
  // ==========================================================================
  const refreshInfluenciadora = useCallback(async (): Promise<void> => {
    if (!authState.influenciadoraId) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('mt_influencers')
        .select('*')
        .eq('id', authState.influenciadoraId)
        .single();

      if (fetchError || !data) return;

      const influencer = data as MTInfluencer;

      const authInfo: InfluenciadoraAuthInfo = {
        id: influencer.id,
        tenant_id: influencer.tenant_id,
        franchise_id: influencer.franchise_id,
        nome: influencer.nome,
        nome_completo: influencer.nome_completo,
        nome_artistico: influencer.nome_artistico,
        email: influencer.email,
        telefone: influencer.telefone,
        whatsapp: influencer.whatsapp,
        cpf: influencer.cpf,
        rg: influencer.rg,
        endereco: influencer.endereco,
        numero: influencer.numero,
        complemento: influencer.complemento,
        bairro: influencer.bairro,
        cep: influencer.cep,
        cidade: influencer.cidade,
        estado: influencer.estado,
        foto_perfil: influencer.foto_perfil,
        codigo: influencer.codigo,
        codigo_indicacao: influencer.codigo, // alias para compatibilidade com portal
        genero: influencer.genero,
        status: influencer.status,
        is_active: influencer.is_active,
        aceite_termos: influencer.aceite_termos || false,
        aceite_termos_at: influencer.aceite_termos_at,
        ultimo_login: influencer.ultimo_login,
        onboarding_completed: influencer.onboarding_completed ?? false,
      };

      localStorage.setItem('influenciadoraAuth', JSON.stringify(authInfo));

      setAuthState((prev) => ({
        ...prev,
        influenciadora: authInfo,
      }));
    } catch (error) {
      console.error('[MT] Erro ao atualizar dados da influenciadora:', error);
    }
  }, [authState.influenciadoraId]);

  // Função para limpar erros
  const clearError = useCallback(() => {
    setAuthState((prev) => ({ ...prev, error: null }));
  }, []);

  // Estado para tracking de código enviado
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [codeSentMethod, setCodeSentMethod] = useState<VerificationMethod | null>(null);
  const [pendingIdentifier, setPendingIdentifier] = useState<string | null>(null);

  // Wrapper do requestCode para rastrear para onde o código foi enviado
  const solicitarCodigo = useCallback(
    async (identifier: string, method: VerificationMethod = 'whatsapp'): Promise<boolean> => {
      setPendingIdentifier(identifier);
      const success = await requestCode(identifier, method);
      if (success) {
        setCodeSentTo(identifier);
        setCodeSentMethod(method);
      }
      return success;
    },
    [requestCode]
  );

  return {
    // Estado
    ...authState,

    // Estado adicional para UI
    codeSentTo,
    codeSentMethod,
    pendingIdentifier,

    // Ações com nomes compatíveis
    requestCode,
    verifyCode,
    restoreSession,
    logout,
    acceptTerms,
    refreshInfluenciadora,
    clearError,

    // Aliases para compatibilidade com o contexto
    solicitarCodigo,
    verificarCodigo: verifyCode,
    checkStoredAuth: restoreSession,

    // Status de loading com aliases
    isRequestingCode,
    isSendingCode: isRequestingCode,
    isVerifying,

    _mode: 'mt' as const,
  };
}

// =============================================================================
// Re-export Types
// =============================================================================

export type { VerificationMethod };

// =============================================================================
// Helper: Verificar modo atual (sempre MT)
// =============================================================================

export function getInfluenciadoraAuthMode(): 'mt' {
  return 'mt';
}

export default useInfluenciadoraAuthAdapter;
