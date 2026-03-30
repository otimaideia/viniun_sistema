import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Parceria } from '@/types/parceria';
import { validatePhone } from '@/utils/phone';
import { wahaApi } from '@/services/waha-api';

// =============================================================================
// Tenant Detection for Public Portal
// =============================================================================

/**
 * Derives the current tenant slug from the browser URL.
 * In production: reads the subdomain (e.g. yeslaser.app.com → 'yeslaser').
 * In development: reads the ?tenant= query param.
 * Falls back to 'yeslaser' so the partner portal always has a tenant scope.
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
 * Falls back to dominio_customizado lookup and known YESlaser domains.
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
 * Envia código OTP via Email usando a edge function enviar-otp
 */
async function sendEmailCode(email: string, code: string, nome: string): Promise<boolean> {
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
        tipo: 'parceiro',
      }),
    });

    const result = await response.json();

    if (!result.success) {
      console.warn('[EMAIL] Falha ao enviar:', result.error);
      if (result.error?.includes('SMTP não configurado')) {
        console.log(`[DEV] SMTP não configurado. Código para ${email}: ${code}`);
      }
      return false;
    }

    return true;
  } catch (err) {
    console.error('[EMAIL] Erro:', err);
    return false;
  }
}

const PARCERIA_TOKEN_KEY = 'mt_partnership_token';
const PARCERIA_DATA_KEY = 'mt_partnership_data';
const TOKEN_EXPIRY_HOURS = 24;

export type VerificationMethod = 'whatsapp' | 'email';

interface UseParceriaAuthReturn {
  // Estado
  isAuthenticated: boolean;
  parceria: Parceria | null;
  isLoading: boolean;
  isSendingCode: boolean;
  isVerifying: boolean;
  error: string | null;
  codeSentTo: string | null;
  codeSentMethod: VerificationMethod | null;
  pendingIdentifier: string | null;

  // Ações
  solicitarCodigo: (cnpjOrPhoneOrEmail: string, metodo: VerificationMethod) => Promise<boolean>;
  verificarCodigo: (codigo: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  checkStoredAuth: () => Promise<boolean>;
  refreshParceria: () => Promise<void>;
}

/**
 * Normaliza dados brutos da tabela mt_partnerships para o tipo Parceria.
 * A tabela usa `codigo` mas o tipo Parceria usa `codigo_indicacao`.
 */
function normalizeParceriaData(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    ...raw,
    codigo_indicacao: raw.codigo_indicacao ?? raw.codigo,
    responsavel_nome: raw.responsavel_nome ?? raw.contato_nome,
  };
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
 * Valida CNPJ
 */
function validateCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length !== 14) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cleaned)) return false;

  // Validação dos dígitos verificadores
  let tamanho = cleaned.length - 2;
  let numeros = cleaned.substring(0, tamanho);
  const digitos = cleaned.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;

  tamanho = tamanho + 1;
  numeros = cleaned.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  return resultado === parseInt(digitos.charAt(1));
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

    // 3. Buscar uma sessão ativa - primeiro tenta no banco, depois na API WAHA
    let sessionName: string | null = null;

    // Tentar no banco (enum usa lowercase)
    const { data: sessoes, error: sessoesError } = await supabase
      .from('mt_whatsapp_sessions')
      .select('session_name, status')
      .eq('status', 'working')
      .limit(1);

    if (!sessoesError && sessoes && sessoes.length > 0) {
      sessionName = sessoes[0].session_name;
    } else {
      // Fallback: buscar diretamente na API WAHA
      try {
        const wahaResponse = await fetch(`${wahaConfig.api_url}/api/sessions`, {
          headers: {
            'X-Api-Key': wahaConfig.api_key || '',
          },
        });
        if (wahaResponse.ok) {
          const wahaSessions = await wahaResponse.json();
          const activeSession = wahaSessions.find((s: { status: string }) =>
            s.status === 'WORKING' || s.status === 'working'
          );
          if (activeSession) {
            sessionName = activeSession.name;
          }
        }
      } catch (wahaErr) {
        console.error('Erro ao buscar sessões WAHA:', wahaErr);
      }
    }

    if (!sessionName) {
      console.error('Nenhuma sessão WhatsApp ativa encontrada');
      return false;
    }
    const chatId = formatPhoneForWhatsApp(phone);

    // 4. Montar e enviar mensagem
    const message = `🔐 *YESlaser - Portal do Parceiro*

Olá${nome ? `, ${nome}` : ''}!

Seu código de acesso é:

*${code}*

Este código é válido por 5 minutos.

⚠️ Se você não solicitou este código, ignore esta mensagem.

_Equipe YESlaser_`;

    await wahaApi.sendText({
      session: sessionName,
      chatId,
      text: message,
    });

    console.log(`[WAHA] Código enviado para ${chatId} via sessão ${sessionName}`);
    return true;
  } catch (err) {
    console.error('Erro ao enviar WhatsApp:', err);
    return false;
  }
}

export function useParceriaAuth(): UseParceriaAuthReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [parceria, setParceria] = useState<Parceria | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [codeSentMethod, setCodeSentMethod] = useState<VerificationMethod | null>(null);
  const [pendingIdentifier, setPendingIdentifier] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  /**
   * Verifica se há sessão armazenada válida
   */
  const checkStoredAuth = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);

    try {
      const storedToken = localStorage.getItem(PARCERIA_TOKEN_KEY);
      const storedData = localStorage.getItem(PARCERIA_DATA_KEY);

      if (!storedToken || !storedData) {
        return false;
      }

      const { parceriaId, expiry } = JSON.parse(storedToken);

      // Verificar se o token expirou
      if (new Date(expiry) < new Date()) {
        localStorage.removeItem(PARCERIA_TOKEN_KEY);
        localStorage.removeItem(PARCERIA_DATA_KEY);
        return false;
      }

      // Resolve tenant to scope the query (prevents cross-tenant data leakage)
      const tenantSlug = getCurrentTenantSlug();
      const tenantId = await resolveTenantId(tenantSlug);

      // Buscar dados atualizados da parceria
      let storedQuery = supabase
        .from('mt_partnerships')
        .select(`
          *,
          beneficios:mt_partnership_benefits(*)
        `)
        .eq('id', parceriaId);

      // Scope to tenant - prevents accessing another tenant's partnership via stored token
      if (tenantId) {
        storedQuery = storedQuery.eq('tenant_id', tenantId);
      }

      const { data: parceriaData, error: parceriaError } = await storedQuery.single();

      if (parceriaError || !parceriaData) {
        localStorage.removeItem(PARCERIA_TOKEN_KEY);
        localStorage.removeItem(PARCERIA_DATA_KEY);
        return false;
      }

      // Verificar se está ativa
      if (parceriaData.status !== 'ativo') {
        if (parceriaData.status === 'pendente') {
          setError('Sua parceria ainda não foi aprovada. Aguarde a aprovação.');
        } else if (parceriaData.status === 'inativo') {
          setError('Sua parceria está inativa. Entre em contato com a equipe.');
        } else if (parceriaData.status === 'suspenso') {
          setError('Sua parceria está suspensa. Entre em contato com a equipe.');
        }
        localStorage.removeItem(PARCERIA_TOKEN_KEY);
        localStorage.removeItem(PARCERIA_DATA_KEY);
        return false;
      }

      setParceria(normalizeParceriaData(parceriaData as Record<string, unknown>) as unknown as Parceria);
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
   * Recarrega dados da parceria logada
   */
  const refreshParceria = useCallback(async (): Promise<void> => {
    if (!parceria?.id) return;

    try {
      // Resolve tenant to scope the query
      const tenantSlug = getCurrentTenantSlug();
      const tenantId = await resolveTenantId(tenantSlug);

      let refreshQuery = supabase
        .from('mt_partnerships')
        .select(`
          *,
          beneficios:mt_partnership_benefits(*)
        `)
        .eq('id', parceria.id);

      if (tenantId) {
        refreshQuery = refreshQuery.eq('tenant_id', tenantId);
      }

      const { data, error: fetchError } = await refreshQuery.single();

      if (!fetchError && data) {
        const normalized = normalizeParceriaData(data as Record<string, unknown>) as unknown as Parceria;
        setParceria(normalized);
        localStorage.setItem(PARCERIA_DATA_KEY, JSON.stringify(normalized));
      }
    } catch (err) {
      console.error('Erro ao atualizar dados:', err);
    }
  }, [parceria?.id]);

  /**
   * Detecta o tipo de entrada (CNPJ, telefone ou email)
   */
  const detectIdentifierType = (input: string): 'cnpj' | 'phone' | 'email' | 'codigo' | 'unknown' => {
    const cleaned = input.trim();

    // Email
    if (cleaned.includes('@') && cleaned.includes('.')) {
      return 'email';
    }

    // Código de indicação (alfanumérico, 6-10 caracteres)
    if (/^[A-Za-z0-9]{5,10}$/.test(cleaned)) {
      return 'codigo';
    }

    const digitsOnly = cleaned.replace(/\D/g, '');

    // CNPJ (14 dígitos)
    if (digitsOnly.length === 14 && validateCNPJ(cleaned)) {
      return 'cnpj';
    }

    // Telefone (10-13 dígitos)
    if (digitsOnly.length >= 10 && digitsOnly.length <= 13) {
      if (validatePhone(cleaned)) {
        return 'phone';
      }
    }

    return 'unknown';
  };

  /**
   * Solicita envio de código de verificação
   */
  const solicitarCodigo = useCallback(async (
    cnpjOrPhoneOrEmail: string,
    metodo: VerificationMethod
  ): Promise<boolean> => {
    setIsSendingCode(true);
    setError(null);
    setCodeSentTo(null);
    setCodeSentMethod(null);

    try {
      const cleaned = cnpjOrPhoneOrEmail.trim().toUpperCase();
      const inputType = detectIdentifierType(cleaned);

      if (inputType === 'unknown') {
        setError('Digite um CNPJ, telefone, email ou código de indicação válido');
        return false;
      }

      // Resolve tenant to scope the query (prevents cross-tenant data leakage)
      const tenantSlug = getCurrentTenantSlug();
      const tenantId = await resolveTenantId(tenantSlug);

      // Buscar parceria
      let query = supabase.from('mt_partnerships').select('*');

      // Always scope to the current tenant
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      if (inputType === 'cnpj') {
        const cnpjClean = cleaned.replace(/\D/g, '');
        query = query.eq('cnpj', cnpjClean);
      } else if (inputType === 'phone') {
        const phoneClean = cleaned.replace(/\D/g, '');
        const lastDigits = phoneClean.slice(-8);
        query = query.or(`responsavel_whatsapp.ilike.%${lastDigits}%,responsavel_telefone.ilike.%${lastDigits}%`);
      } else if (inputType === 'email') {
        query = query.ilike('responsavel_email', cleaned);
      } else if (inputType === 'codigo') {
        query = query.eq('codigo', cleaned);
      }

      const { data: parcerias, error: searchError } = await query;

      if (searchError) {
        throw searchError;
      }

      if (!parcerias || parcerias.length === 0) {
        setError('Parceria não encontrada. Verifique seus dados ou entre em contato com a equipe.');
        return false;
      }

      const parceriaData = parcerias[0] as Parceria;

      // Verificar status
      if (parceriaData.status === 'inativo') {
        setError('Sua parceria está inativa. Entre em contato com a equipe.');
        return false;
      }

      if (parceriaData.status === 'suspenso') {
        setError('Sua parceria está suspensa. Entre em contato com a equipe.');
        return false;
      }

      if (parceriaData.status === 'pendente') {
        setError('Sua parceria ainda está em análise. Aguarde a aprovação.');
        return false;
      }

      // Verificar se tem o dado necessário para o método escolhido
      if (metodo === 'email' && !parceriaData.responsavel_email) {
        setError('Email não cadastrado. Use o WhatsApp para receber o código.');
        return false;
      }

      if (metodo === 'whatsapp' && !parceriaData.responsavel_whatsapp && !parceriaData.responsavel_telefone) {
        setError('WhatsApp não cadastrado. Use o email para receber o código.');
        return false;
      }

      // Gerar código
      const code = generateCode();
      const expiry = new Date();
      expiry.setMinutes(expiry.getMinutes() + 5); // 5 minutos de validade

      // Salvar código na parceria
      const { error: updateError } = await supabase
        .from('mt_partnerships')
        .update({
          codigo_verificacao: code,
          codigo_expira_em: expiry.toISOString(),
        })
        .eq('id', parceriaData.id);

      if (updateError) {
        throw updateError;
      }

      // Enviar código
      if (metodo === 'whatsapp') {
        const telefoneDestino = parceriaData.responsavel_whatsapp || parceriaData.responsavel_telefone || '';
        const enviado = await sendWhatsAppCode(
          telefoneDestino,
          code,
          parceriaData.contato_nome || parceriaData.nome_fantasia
        );

        if (!enviado) {
          // Fallback: mostrar código no console (apenas dev)
          console.warn('[DEV] Falha ao enviar WhatsApp, código:', code);
        }
      } else {
        // Email via edge function enviar-otp
        const emailDestino = parceriaData.responsavel_email || '';
        if (!emailDestino) {
          setError('Email não cadastrado. Use o WhatsApp para receber o código.');
          return false;
        }
        const enviado = await sendEmailCode(
          emailDestino,
          code,
          parceriaData.contato_nome || parceriaData.nome_fantasia
        );
        if (!enviado) {
          console.warn(`[DEV] Falha no email. Código para ${emailDestino}: ${code}`);
        }
      }

      // Definir para onde foi enviado
      const destino = metodo === 'email'
        ? parceriaData.responsavel_email || ''
        : parceriaData.responsavel_whatsapp || parceriaData.responsavel_telefone || '';

      setPendingIdentifier(cnpjOrPhoneOrEmail);
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
    if (!pendingIdentifier) {
      setError('Solicite um novo código');
      return false;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const cleaned = pendingIdentifier.trim().toUpperCase();
      const inputType = detectIdentifierType(cleaned);

      // Resolve tenant to scope the query (prevents cross-tenant data leakage)
      const tenantSlug = getCurrentTenantSlug();
      const tenantId = await resolveTenantId(tenantSlug);

      // Buscar parceria com código
      let query = supabase.from('mt_partnerships').select(`
        *,
        beneficios:mt_partnership_benefits(*)
      `);

      // Always scope to the current tenant
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      if (inputType === 'cnpj') {
        const cnpjClean = cleaned.replace(/\D/g, '');
        query = query.eq('cnpj', cnpjClean);
      } else if (inputType === 'phone') {
        const phoneClean = cleaned.replace(/\D/g, '');
        const lastDigits = phoneClean.slice(-8);
        query = query.or(`responsavel_whatsapp.ilike.%${lastDigits}%,responsavel_telefone.ilike.%${lastDigits}%`);
      } else if (inputType === 'email') {
        query = query.ilike('responsavel_email', cleaned);
      } else if (inputType === 'codigo') {
        query = query.eq('codigo', cleaned);
      }

      const { data: parcerias, error: searchError } = await query.eq('codigo_verificacao', codigo);

      if (searchError) {
        throw searchError;
      }

      if (!parcerias || parcerias.length === 0) {
        setError('Código inválido');
        return false;
      }

      const parceriaData = parcerias[0] as Parceria;

      // Verificar expiração
      if (parceriaData.codigo_expira_em && new Date(parceriaData.codigo_expira_em) < new Date()) {
        setError('Código expirado. Solicite um novo código.');
        return false;
      }

      // Limpar código e atualizar último login
      const { error: updateError } = await supabase
        .from('mt_partnerships')
        .update({
          codigo_verificacao: null,
          codigo_expira_em: null,
          ultimo_login: new Date().toISOString(),
        })
        .eq('id', parceriaData.id);

      if (updateError) {
        console.error('Erro ao atualizar login:', updateError);
      }

      // Criar token de sessão
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + TOKEN_EXPIRY_HOURS);

      const normalizedParceria = normalizeParceriaData(parceriaData as unknown as Record<string, unknown>) as unknown as Parceria;

      localStorage.setItem(PARCERIA_TOKEN_KEY, JSON.stringify({
        parceriaId: parceriaData.id,
        expiry: expiry.toISOString(),
      }));
      localStorage.setItem(PARCERIA_DATA_KEY, JSON.stringify(normalizedParceria));

      setParceria(normalizedParceria);
      setIsAuthenticated(true);
      setPendingIdentifier(null);
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
  }, [pendingIdentifier]);

  /**
   * Encerra a sessão da parceria
   */
  const logout = useCallback(() => {
    localStorage.removeItem(PARCERIA_TOKEN_KEY);
    localStorage.removeItem(PARCERIA_DATA_KEY);
    setParceria(null);
    setIsAuthenticated(false);
    setPendingIdentifier(null);
    setCodeSentTo(null);
    setCodeSentMethod(null);
  }, []);

  return {
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
  };
}
