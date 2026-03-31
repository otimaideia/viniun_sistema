import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Influenciadora } from '@/types/influenciadora';
import { cleanCPF, validateCPF } from '@/utils/cpf';
import { cleanPhone, validatePhone, detectInputType } from '@/utils/phone';
import { wahaApi } from '@/services/waha-api';
import { fireAndForgetLoginRecord } from '@/hooks/multitenant/useInfluencerLoginHistoryMT';

const INFLUENCIADORA_TOKEN_KEY = 'mt_influencer_token';
const INFLUENCIADORA_DATA_KEY = 'mt_influencer_data';
const TOKEN_EXPIRY_HOURS = 24;

export type VerificationMethod = 'whatsapp' | 'email';

interface UseInfluenciadoraAuthReturn {
  // Estado
  isAuthenticated: boolean;
  influenciadora: Influenciadora | null;
  isLoading: boolean;
  isSendingCode: boolean;
  isVerifying: boolean;
  error: string | null;
  codeSentTo: string | null;
  codeSentMethod: VerificationMethod | null;
  pendingIdentifier: string | null;

  // Ações
  solicitarCodigo: (cpfOrPhoneOrEmail: string, metodo: VerificationMethod) => Promise<boolean>;
  verificarCodigo: (codigo: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  checkStoredAuth: () => Promise<boolean>;
  refreshInfluenciadora: () => Promise<void>;
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
    const message = `🔐 *Viniun - Portal do Influenciador(a)*

Olá${nome ? `, ${nome.split(' ')[0]}` : ''}!

Seu código de acesso é:

*${code}*

Este código é válido por 5 minutos.

⚠️ Se você não solicitou este código, ignore esta mensagem.

_Equipe Viniun_`;

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

export function useInfluenciadoraAuth(): UseInfluenciadoraAuthReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [influenciadora, setInfluenciadora] = useState<Influenciadora | null>(null);
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
      const storedToken = localStorage.getItem(INFLUENCIADORA_TOKEN_KEY);
      const storedData = localStorage.getItem(INFLUENCIADORA_DATA_KEY);

      if (!storedToken || !storedData) {
        return false;
      }

      const { influenciadoraId, expiry } = JSON.parse(storedToken);

      // Verificar se o token expirou
      if (new Date(expiry) < new Date()) {
        localStorage.removeItem(INFLUENCIADORA_TOKEN_KEY);
        localStorage.removeItem(INFLUENCIADORA_DATA_KEY);
        return false;
      }

      // Buscar dados atualizados da influenciadora
      const { data: influenciadoraData, error: influenciadoraError } = await supabase
        .from('mt_influencers')
        .select(`
          *,
          franqueado:mt_franchises(id, nome_franquia),
          unidade:mt_franchises(id, nome_franquia),
          redes_sociais:mt_influencer_social_media(*),
          valores:mt_influencer_values(*)
        `)
        .eq('id', influenciadoraId)
        .single();

      if (influenciadoraError || !influenciadoraData) {
        localStorage.removeItem(INFLUENCIADORA_TOKEN_KEY);
        localStorage.removeItem(INFLUENCIADORA_DATA_KEY);
        return false;
      }

      // Verificar se está aprovada
      if (influenciadoraData.status !== 'aprovado') {
        setError('Seu cadastro ainda não foi aprovado. Aguarde a aprovação.');
        localStorage.removeItem(INFLUENCIADORA_TOKEN_KEY);
        localStorage.removeItem(INFLUENCIADORA_DATA_KEY);
        return false;
      }

      setInfluenciadora(influenciadoraData as Influenciadora);
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
   * Recarrega dados da influenciadora logada
   */
  const refreshInfluenciadora = useCallback(async (): Promise<void> => {
    if (!influenciadora?.id) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('mt_influencers')
        .select(`
          *,
          franqueado:mt_franchises(id, nome_franquia),
          unidade:mt_franchises(id, nome_franquia),
          redes_sociais:mt_influencer_social_media(*),
          valores:mt_influencer_values(*)
        `)
        .eq('id', influenciadora.id)
        .single();

      if (!fetchError && data) {
        setInfluenciadora(data as Influenciadora);
        localStorage.setItem(INFLUENCIADORA_DATA_KEY, JSON.stringify(data));
      }
    } catch (err) {
      console.error('Erro ao atualizar dados:', err);
    }
  }, [influenciadora?.id]);

  /**
   * Detecta o tipo de entrada (CPF, telefone ou email)
   */
  const detectIdentifierType = (input: string): 'cpf' | 'phone' | 'email' | 'unknown' => {
    const cleaned = input.trim();

    // Email
    if (cleaned.includes('@') && cleaned.includes('.')) {
      return 'email';
    }

    // Tentar detectar CPF ou telefone
    const digitsOnly = cleaned.replace(/\D/g, '');

    if (digitsOnly.length === 11) {
      // Pode ser CPF ou telefone, verificar formato
      if (validateCPF(cleaned)) {
        return 'cpf';
      }
      if (validatePhone(cleaned)) {
        return 'phone';
      }
    }

    if (digitsOnly.length >= 10 && digitsOnly.length <= 13) {
      if (validatePhone(cleaned)) {
        return 'phone';
      }
    }

    if (digitsOnly.length === 11 && validateCPF(cleaned)) {
      return 'cpf';
    }

    // Fallback para detecção de telefone
    const inputType = detectInputType(cleaned);
    if (inputType === 'cpf') return 'cpf';
    if (inputType === 'phone') return 'phone';

    return 'unknown';
  };

  /**
   * Solicita envio de código de verificação
   */
  const solicitarCodigo = useCallback(async (
    cpfOrPhoneOrEmail: string,
    metodo: VerificationMethod
  ): Promise<boolean> => {
    setIsSendingCode(true);
    setError(null);
    setCodeSentTo(null);
    setCodeSentMethod(null);

    try {
      const cleaned = cpfOrPhoneOrEmail.trim();
      const inputType = detectIdentifierType(cleaned);

      if (inputType === 'unknown') {
        setError('Digite um CPF, telefone ou email válido');
        return false;
      }

      // Buscar influenciadora
      let query = supabase.from('mt_influencers').select('*');

      if (inputType === 'cpf') {
        const cpfClean = cleaned.replace(/\D/g, '');
        query = query.or(`cpf.eq.${cpfClean},cpf.eq.${cleanCPF(cleaned)}`);
      } else if (inputType === 'phone') {
        const phoneClean = cleaned.replace(/\D/g, '');
        // Buscar pelos últimos 8 dígitos para encontrar mesmo com formatação diferente
        const lastDigits = phoneClean.slice(-8);
        query = query.or(`whatsapp.eq.${phoneClean},telefone.eq.${phoneClean},whatsapp.ilike.%${lastDigits}%,telefone.ilike.%${lastDigits}%`);
      } else if (inputType === 'email') {
        query = query.ilike('email', cleaned);
      }

      const { data: influenciadoras, error: searchError } = await query;

      if (searchError) {
        throw searchError;
      }

      if (!influenciadoras || influenciadoras.length === 0) {
        setError('Cadastro não encontrado. Verifique seus dados ou faça o cadastro.');
        return false;
      }

      const influenciadoraData = influenciadoras[0] as Influenciadora;

      // Verificar status
      if (influenciadoraData.status === 'rejeitado') {
        setError('Seu cadastro foi rejeitado. Entre em contato com a equipe.');
        return false;
      }

      if (influenciadoraData.status === 'suspenso') {
        setError('Seu cadastro está suspenso. Entre em contato com a equipe.');
        return false;
      }

      if (influenciadoraData.status === 'pendente') {
        setError('Seu cadastro ainda está em análise. Aguarde a aprovação.');
        return false;
      }

      // Verificar se tem o dado necessário para o método escolhido
      if (metodo === 'email' && !influenciadoraData.email) {
        setError('Email não cadastrado. Use o WhatsApp para receber o código.');
        return false;
      }

      if (metodo === 'whatsapp' && !influenciadoraData.whatsapp && !influenciadoraData.telefone) {
        setError('WhatsApp não cadastrado. Use o email para receber o código.');
        return false;
      }

      // Gerar código
      const code = generateCode();
      const expiry = new Date();
      expiry.setMinutes(expiry.getMinutes() + 5); // 5 minutos de validade

      // Salvar código na influenciadora
      const { error: updateError } = await supabase
        .from('mt_influencers')
        .update({
          codigo_verificacao: code,
          codigo_expira_em: expiry.toISOString(),
        })
        .eq('id', influenciadoraData.id);

      if (updateError) {
        throw updateError;
      }

      // Enviar código
      if (metodo === 'whatsapp') {
        const telefoneDestino = influenciadoraData.whatsapp || influenciadoraData.telefone || '';
        const enviado = await sendWhatsAppCode(
          telefoneDestino,
          code,
          influenciadoraData.nome_artistico || influenciadoraData.nome_completo
        );

        if (!enviado) {
          // Fallback: mostrar código no console (apenas dev)
          console.warn('[DEV] Falha ao enviar WhatsApp, código:', code);
        }
      } else {
        // Email auth requires SMTP integration via mt_tenant_integrations
      }

      // Definir para onde foi enviado
      const destino = metodo === 'email'
        ? influenciadoraData.email || ''
        : influenciadoraData.whatsapp || influenciadoraData.telefone || '';

      setPendingIdentifier(cpfOrPhoneOrEmail);
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
      const cleaned = pendingIdentifier.trim();
      const inputType = detectIdentifierType(cleaned);

      // Buscar influenciadora com código
      let query = supabase.from('mt_influencers').select(`
        *,
        franqueado:mt_franchises(id, nome_franquia),
        unidade:mt_franchises(id, nome_franquia),
        redes_sociais:mt_influencer_social_media(*),
        valores:mt_influencer_values(*)
      `);

      if (inputType === 'cpf') {
        const cpfClean = cleaned.replace(/\D/g, '');
        query = query.or(`cpf.eq.${cpfClean},cpf.eq.${cleanCPF(cleaned)}`);
      } else if (inputType === 'phone') {
        const phoneClean = cleaned.replace(/\D/g, '');
        // Buscar pelos últimos 8 dígitos para encontrar mesmo com formatação diferente
        const lastDigits = phoneClean.slice(-8);
        query = query.or(`whatsapp.eq.${phoneClean},telefone.eq.${phoneClean},whatsapp.ilike.%${lastDigits}%,telefone.ilike.%${lastDigits}%`);
      } else if (inputType === 'email') {
        query = query.ilike('email', cleaned);
      }

      const { data: influenciadoras, error: searchError } = await query.eq('codigo_verificacao', codigo);

      if (searchError) {
        throw searchError;
      }

      if (!influenciadoras || influenciadoras.length === 0) {
        setError('Código inválido');
        return false;
      }

      const influenciadoraData = influenciadoras[0] as Influenciadora;

      // Verificar expiração
      if (influenciadoraData.codigo_expira_em && new Date(influenciadoraData.codigo_expira_em) < new Date()) {
        if (influenciadoraData.tenant_id) {
          fireAndForgetLoginRecord({
            tenant_id: influenciadoraData.tenant_id,
            influencer_id: influenciadoraData.id,
            success: false,
            failure_reason: 'expired_code',
            identifier_type: inputType,
            verification_method: codeSentMethod || 'whatsapp',
          });
        }
        setError('Código expirado. Solicite um novo código.');
        return false;
      }

      // Limpar código e atualizar último login
      const { error: updateError } = await supabase
        .from('mt_influencers')
        .update({
          codigo_verificacao: null,
          codigo_expira_em: null,
          ultimo_login: new Date().toISOString(),
        })
        .eq('id', influenciadoraData.id);

      if (updateError) {
        console.error('Erro ao atualizar login:', updateError);
      }

      // Registrar login no histórico (fire-and-forget)
      if (influenciadoraData.tenant_id) {
        fireAndForgetLoginRecord({
          tenant_id: influenciadoraData.tenant_id,
          influencer_id: influenciadoraData.id,
          success: true,
          identifier_type: inputType,
          verification_method: codeSentMethod || 'whatsapp',
        });
      }

      // Criar token de sessão
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + TOKEN_EXPIRY_HOURS);

      localStorage.setItem(INFLUENCIADORA_TOKEN_KEY, JSON.stringify({
        influenciadoraId: influenciadoraData.id,
        expiry: expiry.toISOString(),
      }));
      localStorage.setItem(INFLUENCIADORA_DATA_KEY, JSON.stringify(influenciadoraData));

      setInfluenciadora(influenciadoraData);
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
   * Encerra a sessão da influenciadora
   */
  const logout = useCallback(() => {
    localStorage.removeItem(INFLUENCIADORA_TOKEN_KEY);
    localStorage.removeItem(INFLUENCIADORA_DATA_KEY);
    setInfluenciadora(null);
    setIsAuthenticated(false);
    setPendingIdentifier(null);
    setCodeSentTo(null);
    setCodeSentMethod(null);
  }, []);

  return {
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
  };
}
