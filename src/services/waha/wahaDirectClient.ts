// Cliente WAHA Direto - chamadas diretas ao servidor WAHA Plus (NOWEB)
// Documentação: https://waha.devlike.pro/docs/
// Adaptado para YESlaser

import { supabase } from '@/integrations/supabase/client';
import { wahaRateLimiter, wahaMessageRateLimiter } from '@/utils/rateLimiter';
import { wahaApi } from '@/services/waha-api';
import { sanitizeObjectForJSON, findProblematicChars } from '@/utils/unicodeSanitizer';

const DEBUG = import.meta.env.DEV;

// ===== TIPOS =====

interface WAHASessionInfo {
  name: string;
  status: string;
  config?: Record<string, unknown>;
  me?: {
    id: string;
    pushName: string;
  };
}

interface WAHAQRCode {
  value: string;
  mimetype: string;
}

interface WAHAMessage {
  id: string;
  timestamp: number;
  from: string;
  to: string;
  body?: string;
  type: string;
  hasMedia: boolean;
  ack?: number;
}

interface WAHALabel {
  id: string;
  name: string;
  color: number;
  colorHex?: string;
}

interface WAHAPoll {
  name: string;
  options: string[];
  multipleAnswers?: boolean;
}

interface WAHAContact {
  fullName: string;
  organization?: string;
  phoneNumber: string;
  whatsappId?: string;
}

interface WAHALocation {
  latitude: number;
  longitude: number;
  title?: string;
  address?: string;
}

interface WAHAEvent {
  name: string;
  description?: string;
  startTime: number; // Unix timestamp em segundos
  endTime?: number | null;
  location?: {
    name: string;
  };
  extraGuestsAllowed?: boolean;
}

interface ProxyResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

class WAHADirectClient {
  private baseUrl: string = '';
  private apiKey: string = '';
  private webhookUrl: string = '';
  private configLoaded: boolean = false;
  private lastConfigCheck: number = 0;
  private readonly CONFIG_CACHE_MS = 30000;

  // ===== CONFIGURAÇÃO =====

  async loadConfig(forceReload = false): Promise<boolean> {
    const now = Date.now();

    if (!forceReload && this.configLoaded && this.baseUrl && this.apiKey) {
      if (now - this.lastConfigCheck < this.CONFIG_CACHE_MS) {
        return true;
      }
    }

    if (DEBUG) console.warn('[WAHA] Carregando configuração...');

    try {
      // Verificar sessão do usuário atual
      const { data: sessionData } = await supabase.auth.getSession();
      if (DEBUG) console.warn('[WAHA] Usuário autenticado:', sessionData?.session?.user?.id ? 'Sim' : 'Não');

      // Sistema MT usa tabela mt_waha_config com campos api_url e api_key diretamente
      // A query SEM filtro depende do RLS para retornar apenas registros permitidos
      const { data, error, count } = await supabase
        .from('mt_waha_config')
        .select('api_url, api_key, webhook_url', { count: 'exact' })
        .maybeSingle();

      if (DEBUG) console.warn('[WAHA] Query mt_waha_config:', {
        temDados: !!data,
        erro: error?.message || 'nenhum',
        count,
        temApiUrl: !!data?.api_url,
        temApiKey: !!data?.api_key,
      });

      if (error) {
        console.error('[WAHA] Erro ao buscar config do banco:', error.message, error.code);
        console.warn('[WAHA] Configure WAHA em Configurações > WhatsApp');
        return !!(this.baseUrl && this.apiKey);
      }

      if (data) {
        if (data.api_url) {
          this.baseUrl = data.api_url.replace(/\/$/, ''); // Remove trailing slash
          if (DEBUG) console.warn('[WAHA] URL carregada:', this.baseUrl);
        }
        if (data.api_key) {
          this.apiKey = data.api_key;
          if (DEBUG) console.warn('[WAHA] Configuração carregada com sucesso');
        }
        if (data.webhook_url) {
          this.webhookUrl = data.webhook_url;
          if (DEBUG) console.warn('[WAHA] Webhook URL carregada:', this.webhookUrl);
        }
      } else {
        console.warn('[WAHA] Nenhuma configuração encontrada no banco (RLS pode estar bloqueando)');

        // Fallback 1: Tentar usar config do wahaApi service (já configurado pelo hook)
        const existingConfig = wahaApi.getConfig();
        if (existingConfig.isConfigured) {
          if (DEBUG) console.warn('[WAHA] Usando config do wahaApi service como fallback');
          this.baseUrl = existingConfig.apiUrl;
          this.apiKey = existingConfig.apiKey;
          if (DEBUG) console.warn('[WAHA] URL fallback:', this.baseUrl);
        } else {
          // Fallback 2: Valores padrão conhecidos para YESlaser
          if (DEBUG) console.warn('[WAHA] Tentando fallback com valores conhecidos...');
          if (!this.baseUrl) {
            this.baseUrl = 'https://waha.yeslaserpraiagrande.com.br';
            if (DEBUG) console.warn('[WAHA] URL fallback:', this.baseUrl);
          }
          console.warn('[WAHA] Configure WAHA em Configurações > WhatsApp');
        }
      }

      this.configLoaded = true;
      this.lastConfigCheck = now;

      const isValid = !!(this.baseUrl && this.apiKey);
      if (!isValid) {
        console.error('[WAHA] Configuração incompleta!', {
          hasUrl: !!this.baseUrl,
          hasKey: !!this.apiKey,
          hint: 'Configure WAHA em Configurações > WhatsApp ou verifique permissões RLS'
        });
      }

      return isValid;
    } catch (err) {
      console.error('[WAHA] Erro ao carregar config:', err);
      console.warn('[WAHA] Configure WAHA em Configurações > WhatsApp');
      return !!(this.baseUrl && this.apiKey);
    }
  }

  getConfigStatus(): { hasUrl: boolean; hasKey: boolean; url: string } {
    return {
      hasUrl: !!this.baseUrl,
      hasKey: !!this.apiKey,
      url: this.baseUrl || '(não configurado)',
    };
  }

  /**
   * Retorna os headers de autenticação para usar em requests externos ao WAHA
   * (ex: download de mídia)
   */
  async getAuthHeaders(): Promise<Record<string, string>> {
    await this.loadConfig();
    return {
      'X-Api-Key': this.apiKey,
    };
  }

  async reloadConfig(): Promise<boolean> {
    this.configLoaded = false;
    this.lastConfigCheck = 0;
    return this.loadConfig(true);
  }

  /**
   * Define a configuração diretamente sem consultar o banco de dados.
   * Útil quando a configuração já foi carregada por outro hook (ex: useWahaConfigAdapter).
   * Isso evita problemas de RLS que podem bloquear a leitura da tabela mt_waha_config.
   */
  setConfig(apiUrl: string, apiKey: string, webhookUrl?: string): void {
    if (!apiUrl || !apiKey) {
      console.warn('[WAHA] setConfig chamado com valores inválidos:', { hasUrl: !!apiUrl, hasKey: !!apiKey });
      return;
    }
    if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
      console.warn('[WAHA] URL inválida - deve começar com http:// ou https://');
      return;
    }
    if (apiKey.length < 8) {
      console.warn('[WAHA] API Key parece inválida (muito curta)');
      return;
    }

    this.baseUrl = apiUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = apiKey;
    if (webhookUrl) {
      this.webhookUrl = webhookUrl;
    }
    this.configLoaded = true;
    this.lastConfigCheck = Date.now();

    if (DEBUG) console.warn('[WAHA] Config definida diretamente:', {
      url: this.baseUrl,
      webhookUrl: this.webhookUrl || '(não definido)',
    });
  }

  /**
   * Converte um Blob para string base64 (data URL)
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Falha ao converter blob para base64'));
        }
      };
      reader.onerror = () => reject(new Error('Erro ao ler blob'));
      reader.readAsDataURL(blob);
    });
  }

  private async request<T>(
    endpoint: string,
    method: string = 'GET',
    body?: Record<string, unknown>,
    options?: { useMessageRateLimiter?: boolean; skipRateLimiter?: boolean; retryCount?: number }
  ): Promise<ProxyResponse<T>> {
    const maxRetries = 3;
    const currentRetry = options?.retryCount ?? 0;
    const configLoaded = await this.loadConfig();
    if (!configLoaded) {
      const status = this.getConfigStatus();
      const errorMsg = !status.hasKey
        ? 'WAHA não configurada. Acesse Configurações > WhatsApp.'
        : 'Configuração WAHA incompleta.';
      console.error('[WAHA] Config inválida:', status);
      return { success: false, error: errorMsg };
    }

    // Aplicar rate limiting (exceto se explicitamente desabilitado)
    if (!options?.skipRateLimiter) {
      const rateLimiter = options?.useMessageRateLimiter ? wahaMessageRateLimiter : wahaRateLimiter;
      await rateLimiter.waitForSlot();
      rateLimiter.recordRequest(endpoint);
    }

    const url = `${this.baseUrl}${endpoint}`;
    if (DEBUG) console.warn(`[WAHA] ${method} ${endpoint}`);

    try {
      const fetchOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.apiKey,
        },
      };

      if (body && method !== 'GET') {
        // Sanitizar body para prevenir erros com caracteres Unicode inválidos
        const sanitizedBody = sanitizeObjectForJSON(body);

        // Debug: detectar caracteres problemáticos em desenvolvimento
        if (process.env.NODE_ENV === 'development') {
          const bodyStr = JSON.stringify(body);
          const problematic = findProblematicChars(bodyStr);
          if (problematic.length > 0) {
            console.warn('[WAHA] Caracteres Unicode problemáticos detectados:', problematic);
          }
        }

        fetchOptions.body = JSON.stringify(sanitizedBody);
      }

      // ⏱️ AbortController com timeout (30s padrão)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      fetchOptions.signal = controller.signal;

      let response: Response;
      try {
        response = await fetch(url, fetchOptions);
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        if (fetchErr instanceof DOMException && fetchErr.name === 'AbortError') {
          console.error(`[WAHA] Timeout em ${endpoint} (30s)`);
          return { success: false, error: `Timeout: requisição excedeu 30s` };
        }
        throw fetchErr;
      }
      clearTimeout(timeoutId);

      // Se receber 429 (Too Many Requests), aguardar e tentar novamente com backoff exponencial
      if (response.status === 429) {
        if (currentRetry >= maxRetries) {
          console.error(`[WAHA] Rate limit excedido após ${maxRetries} tentativas em ${endpoint}`);
          return { success: false, error: `Rate limit excedido após ${maxRetries} tentativas` };
        }
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter
          ? parseInt(retryAfter) * 1000
          : Math.min(1000 * Math.pow(2, currentRetry), 30000); // exponential backoff
        console.warn(`[WAHA] Rate limit atingido! Tentativa ${currentRetry + 1}/${maxRetries}. Aguardando ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.request<T>(endpoint, method, body, { ...options, skipRateLimiter: true, retryCount: currentRetry + 1 });
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[WAHA] Erro ${response.status} em ${endpoint}:`, errorText.substring(0, 200));
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText.substring(0, 100)}`,
        };
      }

      const text = await response.text();
      const data = text ? JSON.parse(text) : null;

      if (DEBUG) console.warn(`[WAHA] ✓ ${endpoint} respondeu com sucesso`);

      return { success: true, data: data as T };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error(`[WAHA] Erro de rede em ${endpoint}:`, errorMsg);

      if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
        return {
          success: false,
          error: `Erro de conexão com WAHA (${this.baseUrl}). Verifique se o servidor está acessível e CORS está configurado.`,
        };
      }

      return { success: false, error: errorMsg };
    }
  }

  // ===== SESSION MANAGEMENT =====

  async listSessions(): Promise<ProxyResponse<WAHASessionInfo[]>> {
    return this.request<WAHASessionInfo[]>('/api/sessions');
  }

  async getSession(sessionName: string): Promise<ProxyResponse<WAHASessionInfo>> {
    return this.request<WAHASessionInfo>(`/api/sessions/${sessionName}`);
  }

  /**
   * Cria uma nova sessão WAHA com configuração COMPLETA (igual ao dashboard WAHA).
   *
   * IMPORTANTE: Inclui:
   * - start:true → para que o fullSync rode na primeira conexão
   * - markOnline:true → marca sessão como online (igual sessões funcionais)
   * - webhooks → configura webhook para receber eventos (CRÍTICO para fullSync funcionar)
   * - store.enabled:true + store.fullSync:true → sincroniza histórico completo
   *
   * Sessões criadas SEM webhooks e markOnline NÃO sincronizam chats corretamente.
   */
  async createSession(sessionName: string, engine: 'NOWEB' | 'GOWS' | 'WEBJS' = 'NOWEB'): Promise<ProxyResponse<WAHASessionInfo>> {
    // Montar config de webhooks (se webhook_url estiver configurado)
    const webhooks = this.webhookUrl ? [{
      url: this.webhookUrl,
      events: [
        'message',
        'message.any',
        'message.ack',
        'session.status',
        'label.upsert',
        'label.deleted',
        'label.chat.added',
        'label.chat.deleted',
      ],
      retries: {
        delaySeconds: 2,
        attempts: 3,
      },
    }] : [];

    // Montar config específica por engine
    let engineConfig: Record<string, unknown> = {};
    if (engine === 'GOWS') {
      engineConfig = {
        gows: {
          storage: {
            messages: true,
            groups: true,
            chats: true,
            labels: true,
          },
        },
      };
    } else if (engine === 'NOWEB') {
      engineConfig = {
        noweb: {
          markOnline: true,
          store: {
            enabled: true,
            fullSync: true,
          },
          // WAHA 2026.3.1+: merge @lid e @c.us chats do mesmo contato
          // false = mantém separados (padrão anterior), true = consolida
          merge: false,
        },
      };
    }

    const sessionConfig: Record<string, unknown> = {
      name: sessionName,
      start: true,
      engine,
      config: {
        ...engineConfig,
        ...(webhooks.length > 0 ? { webhooks } : {}),
      },
    };

    if (DEBUG) console.warn(`[WAHA] Criando sessão (engine: ${engine}) com config COMPLETA:`, JSON.stringify(sessionConfig, null, 2));

    return this.request<WAHASessionInfo>('/api/sessions', 'POST', sessionConfig);
  }

  /**
   * Cria e inicia uma sessão WAHA com fullSync para sincronização completa de chats.
   *
   * IMPORTANTE: createSession já inclui start:true no payload, garantindo que o
   * fullSync rode na primeira conexão (igual ao dashboard WAHA).
   * Sem start:true, o store é inicializado vazio e fullSync não funciona depois.
   *
   * FLUXO:
   * 1. Criar sessão com start:true + NOWEB store (enabled: true, fullSync: true)
   * 2. Aguardar 2 segundos para WAHA processar
   * 3. Verificar se store foi aplicado - se não, atualizar config e reiniciar
   * 4. Verificar status final
   *
   * @returns A sessão criada com status atualizado
   */
  async createSessionWithSync(sessionName: string, engine: 'NOWEB' | 'GOWS' | 'WEBJS' = 'NOWEB'): Promise<ProxyResponse<WAHASessionInfo>> {
    if (DEBUG) console.warn('[WAHA] ========================================');
    if (DEBUG) console.warn(`[WAHA] CRIAR SESSÃO COM SYNC: ${sessionName} (engine: ${engine})`);
    if (DEBUG) console.warn('[WAHA] Config que será usada:', this.getConfigStatus());
    if (DEBUG) console.warn('[WAHA] ========================================');

    // PASSO 1: Criar sessão com config específica por engine
    if (DEBUG) console.warn(`[WAHA] Passo 1: Criando sessão (engine: ${engine})...`);
    const createResult = await this.createSession(sessionName, engine);

    if (!createResult.success) {
      console.error('[WAHA] Falha ao criar sessão:', createResult.error);
      return createResult;
    }

    // Extrair config da resposta
    const createdConfig = createResult.data?.config as {
      noweb?: { store?: { enabled?: boolean; fullSync?: boolean } };
      gows?: { storage?: Record<string, boolean> };
    } | undefined;

    if (DEBUG) console.warn('[WAHA] Sessão criada e iniciada:', {
      name: createResult.data?.name,
      status: createResult.data?.status,
      engine,
      store_enabled: engine === 'NOWEB' ? createdConfig?.noweb?.store?.enabled : undefined,
      fullSync: engine === 'NOWEB' ? createdConfig?.noweb?.store?.fullSync : undefined,
      gows_storage: engine === 'GOWS' ? createdConfig?.gows?.storage : undefined,
    });

    // ⏳ DELAY 2s - Para WAHA processar a criação + início
    if (DEBUG) console.warn('[WAHA] ⏳ Aguardando 2s para WAHA processar...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // PASSO 2: Verificar se store foi aplicado (apenas NOWEB precisa de validação extra)
    if (engine === 'NOWEB') {
    if (DEBUG) console.warn('[WAHA] Passo 2: Verificando se store NOWEB foi aplicado...');
    const checkResult = await this.getSession(sessionName);

    if (checkResult.success && checkResult.data) {
      const sessionConfig = checkResult.data.config as {
        noweb?: { store?: { enabled?: boolean; fullSync?: boolean } }
      } | undefined;

      const storeEnabled = sessionConfig?.noweb?.store?.enabled;
      const fullSyncEnabled = sessionConfig?.noweb?.store?.fullSync;

      if (DEBUG) console.warn('[WAHA] Config atual da sessão:', {
        store_enabled: storeEnabled,
        fullSync: fullSyncEnabled,
      });

      // Se store não está habilitado, tentar atualizar a config e reiniciar
      if (!storeEnabled) {
        console.warn('[WAHA] ⚠️ Store NÃO está habilitado! Atualizando config e reiniciando...');
        const updateResult = await this.updateSessionConfig(sessionName, {
          noweb: {
            store: {
              enabled: true,
              fullSync: true,
            },
          },
        });

        if (updateResult.success) {
          if (DEBUG) console.warn('[WAHA] ✓ Config atualizada, reiniciando sessão...');
          await this.restartSession(sessionName);
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          console.error('[WAHA] ✗ Falha ao atualizar config:', updateResult.error);
        }
      }
    }
    } // end if (engine === 'NOWEB')

    // PASSO 3: Verificar status final
    if (DEBUG) console.warn('[WAHA] Passo 3: Verificando status final...');
    const statusResult = await this.getSession(sessionName);

    if (statusResult.success && statusResult.data) {
      const finalConfig = statusResult.data.config as {
        noweb?: { store?: { enabled?: boolean; fullSync?: boolean } };
        gows?: { storage?: Record<string, boolean> };
      } | undefined;

      if (DEBUG) console.warn('[WAHA] ✓ Status final:', {
        name: statusResult.data.name,
        status: statusResult.data.status,
        engine,
        store_enabled: engine === 'NOWEB' ? finalConfig?.noweb?.store?.enabled : undefined,
        gows_storage: engine === 'GOWS' ? finalConfig?.gows?.storage : undefined,
      });

      if (engine === 'NOWEB' && !finalConfig?.noweb?.store?.enabled) {
        console.error('[WAHA] ⚠️ ATENÇÃO: Store NOWEB ainda NÃO está habilitado após correção!');
      }
    }

    return statusResult;
  }

  /**
   * Aguarda a sessão voltar ao estado WORKING após um restart (causado por PUT config).
   * Tenta até 6 vezes com intervalo de 2s (máximo 12s).
   * Retorna o status final da sessão.
   */
  async waitForSessionReady(sessionName: string, maxAttempts = 6, intervalMs = 2000): Promise<string> {
    if (DEBUG) console.warn(`[WAHA] Aguardando sessão ${sessionName} voltar a WORKING...`);

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, intervalMs));

      try {
        const result = await this.getSession(sessionName);
        const status = result.data?.status || 'UNKNOWN';
        if (DEBUG) console.warn(`[WAHA] waitForReady tentativa ${i + 1}/${maxAttempts}: ${status}`);

        if (status === 'WORKING' || status === 'CONNECTED') {
          if (DEBUG) console.warn(`[WAHA] ✓ Sessão ${sessionName} voltou a WORKING`);
          return 'WORKING';
        }

        if (status === 'FAILED' || status === 'STOPPED') {
          console.warn(`[WAHA] ⚠️ Sessão ${sessionName} ficou em ${status}`);
          return status;
        }
      } catch {
        console.warn(`[WAHA] Erro ao verificar status na tentativa ${i + 1}`);
      }
    }

    console.warn(`[WAHA] ⏰ Timeout aguardando sessão ${sessionName} voltar a WORKING`);
    return 'TIMEOUT';
  }

  /**
   * Atualiza a configuração de uma sessão existente
   */
  async updateSessionConfig(sessionName: string, config: Record<string, unknown>): Promise<ProxyResponse<WAHASessionInfo>> {
    if (DEBUG) console.warn('[WAHA] Atualizando config da sessão:', sessionName);
    return this.request<WAHASessionInfo>(`/api/sessions/${sessionName}`, 'PUT', { config });
  }

  async startSession(sessionName: string): Promise<ProxyResponse<void>> {
    return this.request<void>(`/api/sessions/${sessionName}/start`, 'POST');
  }

  async stopSession(sessionName: string): Promise<ProxyResponse<void>> {
    return this.request<void>(`/api/sessions/${sessionName}/stop`, 'POST');
  }

  async deleteSession(sessionName: string): Promise<ProxyResponse<void>> {
    return this.request<void>(`/api/sessions/${sessionName}`, 'DELETE');
  }

  async restartSession(sessionName: string): Promise<ProxyResponse<void>> {
    return this.request<void>(`/api/sessions/${sessionName}/restart`, 'POST');
  }

  async getQRCode(sessionName: string): Promise<ProxyResponse<WAHAQRCode>> {
    const configLoaded = await this.loadConfig();
    if (!configLoaded) {
      return { success: false, error: 'Configuração WAHA não encontrada.' };
    }

    try {
      // Primeiro tenta buscar como JSON (alguns WAHA retornam assim)
      const response = await fetch(`${this.baseUrl}/api/${sessionName}/auth/qr`, {
        headers: {
          'X-Api-Key': this.apiKey,
          'Accept': 'application/json, image/png',
        },
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 404) {
          return { success: false, error: 'Sessão não encontrada ou não está aguardando QR Code' };
        }
        return { success: false, error: `QR Code não disponível (status ${status})` };
      }

      const contentType = response.headers.get('content-type') || '';
      if (DEBUG) console.warn('[WAHA] getQRCode content-type:', contentType);

      // Se retornar JSON, usar diretamente
      if (contentType.includes('application/json')) {
        const data = await response.json();
        return {
          success: true,
          data: {
            value: data.value || data.qr,
            mimetype: data.mimetype || 'image/png',
          },
        };
      }

      // Se retornar imagem PNG, converter para base64
      if (contentType.includes('image/')) {
        const blob = await response.blob();
        const base64 = await this.blobToBase64(blob);
        return {
          success: true,
          data: {
            value: base64,
            mimetype: contentType,
          },
        };
      }

      // Tentar como texto (pode ser base64 raw)
      const text = await response.text();
      if (text.startsWith('data:image')) {
        return {
          success: true,
          data: {
            value: text,
            mimetype: 'image/png',
          },
        };
      }

      // Se for texto que parece base64
      if (text.length > 100 && !text.includes('<') && !text.includes('{')) {
        return {
          success: true,
          data: {
            value: `data:image/png;base64,${text}`,
            mimetype: 'image/png',
          },
        };
      }

      return { success: false, error: 'Formato de QR Code não reconhecido' };
    } catch (err) {
      console.error('[WAHA] Erro ao buscar QR Code:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erro ao buscar QR Code' };
    }
  }

  // ===== MESSAGING - TEXTO =====

  async sendText(
    sessionName: string,
    chatId: string,
    text: string,
    options?: {
      replyTo?: string;
      mentionedIds?: string[];
    }
  ): Promise<ProxyResponse<WAHAMessage>> {
    return this.request<WAHAMessage>('/api/sendText', 'POST', {
      session: sessionName,
      chatId,
      text,
      ...(options?.replyTo && { reply_to: options.replyTo }),
      ...(options?.mentionedIds && { mentions: options.mentionedIds }),
    }, { useMessageRateLimiter: true });
  }

  // ===== MESSAGING - IMAGEM =====

  async sendImage(
    sessionName: string,
    chatId: string,
    file: { url?: string; base64?: string; mimetype?: string },
    options?: {
      caption?: string;
      replyTo?: string;
    }
  ): Promise<ProxyResponse<WAHAMessage>> {
    return this.request<WAHAMessage>('/api/sendImage', 'POST', {
      session: sessionName,
      chatId,
      file,
      ...(options?.caption && { caption: options.caption }),
      ...(options?.replyTo && { reply_to: options.replyTo }),
    }, { useMessageRateLimiter: true });
  }

  // ===== MESSAGING - VÍDEO =====

  async sendVideo(
    sessionName: string,
    chatId: string,
    file: { url?: string; base64?: string; mimetype?: string },
    options?: {
      caption?: string;
      replyTo?: string;
      asNote?: boolean; // Video arredondado (video note)
    }
  ): Promise<ProxyResponse<WAHAMessage>> {
    const endpoint = options?.asNote ? '/api/sendVideoNote' : '/api/sendVideo';
    return this.request<WAHAMessage>(endpoint, 'POST', {
      session: sessionName,
      chatId,
      file,
      ...(options?.caption && { caption: options.caption }),
      ...(options?.replyTo && { reply_to: options.replyTo }),
    }, { useMessageRateLimiter: true });
  }

  // ===== MESSAGING - ÁUDIO/VOZ =====

  async sendVoice(
    sessionName: string,
    chatId: string,
    file: { url?: string; base64?: string; mimetype?: string },
    options?: {
      replyTo?: string;
    }
  ): Promise<ProxyResponse<WAHAMessage>> {
    return this.request<WAHAMessage>('/api/sendVoice', 'POST', {
      session: sessionName,
      chatId,
      file,
      ...(options?.replyTo && { reply_to: options.replyTo }),
    }, { useMessageRateLimiter: true });
  }

  // ===== MESSAGING - DOCUMENTO/ARQUIVO =====

  async sendFile(
    sessionName: string,
    chatId: string,
    file: { url?: string; base64?: string; mimetype?: string; filename?: string },
    options?: {
      caption?: string;
      replyTo?: string;
    }
  ): Promise<ProxyResponse<WAHAMessage>> {
    return this.request<WAHAMessage>('/api/sendFile', 'POST', {
      session: sessionName,
      chatId,
      file,
      ...(options?.caption && { caption: options.caption }),
      ...(options?.replyTo && { reply_to: options.replyTo }),
    }, { useMessageRateLimiter: true });
  }

  // Alias para compatibilidade
  async sendDocument(
    sessionName: string,
    chatId: string,
    mediaUrl: string,
    filename: string,
    caption?: string
  ): Promise<ProxyResponse<WAHAMessage>> {
    return this.sendFile(sessionName, chatId, { url: mediaUrl, filename }, { caption });
  }

  // ===== MESSAGING - LOCALIZAÇÃO =====

  async sendLocation(
    sessionName: string,
    chatId: string,
    location: WAHALocation,
    options?: {
      replyTo?: string;
    }
  ): Promise<ProxyResponse<WAHAMessage>> {
    return this.request<WAHAMessage>('/api/sendLocation', 'POST', {
      session: sessionName,
      chatId,
      latitude: location.latitude,
      longitude: location.longitude,
      ...(location.title && { title: location.title }),
      ...(location.address && { address: location.address }),
      ...(options?.replyTo && { reply_to: options.replyTo }),
    });
  }

  // ===== MESSAGING - CONTATO (vCard) =====

  async sendContact(
    sessionName: string,
    chatId: string,
    contact: WAHAContact,
    options?: {
      replyTo?: string;
    }
  ): Promise<ProxyResponse<WAHAMessage>> {
    return this.request<WAHAMessage>('/api/sendContactVcard', 'POST', {
      session: sessionName,
      chatId,
      contacts: [{
        fullName: contact.fullName,
        organization: contact.organization || '',
        phoneNumber: contact.phoneNumber,
        whatsappId: contact.whatsappId || contact.phoneNumber,
      }],
      ...(options?.replyTo && { reply_to: options.replyTo }),
    });
  }

  // ===== MESSAGING - ENQUETE/POLL =====

  async sendPoll(
    sessionName: string,
    chatId: string,
    poll: WAHAPoll
  ): Promise<ProxyResponse<WAHAMessage>> {
    return this.request<WAHAMessage>('/api/sendPoll', 'POST', {
      session: sessionName,
      chatId,
      poll: {
        name: poll.name,
        options: poll.options,
        multipleAnswers: poll.multipleAnswers ?? false,
      },
    });
  }

  async sendPollVote(
    sessionName: string,
    chatId: string,
    pollMessageId: string,
    votes: string[]
  ): Promise<ProxyResponse<unknown>> {
    return this.request<unknown>('/api/sendPollVote', 'POST', {
      session: sessionName,
      chatId,
      pollMessageId,
      votes,
    });
  }

  // ===== MESSAGING - EVENTO =====

  async sendEvent(
    sessionName: string,
    chatId: string,
    event: WAHAEvent,
    options?: {
      replyTo?: string;
    }
  ): Promise<ProxyResponse<WAHAMessage>> {
    return this.request<WAHAMessage>(`/api/${sessionName}/events`, 'POST', {
      chatId,
      event: {
        name: event.name,
        ...(event.description && { description: event.description }),
        startTime: event.startTime,
        ...(event.endTime && { endTime: event.endTime }),
        ...(event.location && { location: event.location }),
        ...(event.extraGuestsAllowed !== undefined && { extraGuestsAllowed: event.extraGuestsAllowed }),
      },
      ...(options?.replyTo && { reply_to: options.replyTo }),
    });
  }

  // ===== MESSAGING - REAÇÃO =====

  async sendReaction(
    sessionName: string,
    chatId: string,
    messageId: string,
    emoji: string
  ): Promise<ProxyResponse<unknown>> {
    return this.request<unknown>('/api/reaction', 'POST', {
      session: sessionName,
      chatId,
      messageId,
      reaction: emoji,
    });
  }

  async removeReaction(
    sessionName: string,
    chatId: string,
    messageId: string
  ): Promise<ProxyResponse<unknown>> {
    return this.sendReaction(sessionName, chatId, messageId, '');
  }

  // ===== MESSAGING - AÇÕES =====

  // Marcar como lido
  async sendSeen(
    sessionName: string,
    chatId: string,
    messageId?: string
  ): Promise<ProxyResponse<void>> {
    return this.request<void>('/api/sendSeen', 'POST', {
      session: sessionName,
      chatId,
      ...(messageId && { messageId }),
    });
  }

  // Indicador de digitação
  async startTyping(sessionName: string, chatId: string): Promise<ProxyResponse<void>> {
    return this.request<void>('/api/startTyping', 'POST', {
      session: sessionName,
      chatId,
    });
  }

  async stopTyping(sessionName: string, chatId: string): Promise<ProxyResponse<void>> {
    return this.request<void>('/api/stopTyping', 'POST', {
      session: sessionName,
      chatId,
    });
  }

  // Presença online (própria)
  async setPresence(
    sessionName: string,
    presence: 'online' | 'offline'
  ): Promise<ProxyResponse<void>> {
    return this.request<void>(`/api/${sessionName}/presence`, 'POST', {
      presence,
    });
  }

  // Presença do contato remoto
  async getContactPresence(
    sessionName: string,
    chatId: string
  ): Promise<ProxyResponse<{ isOnline?: boolean; lastSeen?: number | null }>> {
    return this.request<{ isOnline?: boolean; lastSeen?: number | null }>(
      `/api/${sessionName}/contacts/presence?contactId=${encodeURIComponent(chatId)}`,
      'GET'
    );
  }

  // Encaminhar mensagem
  async forwardMessage(
    sessionName: string,
    chatId: string,
    messageId: string,
    fromChatId: string
  ): Promise<ProxyResponse<WAHAMessage>> {
    return this.request<WAHAMessage>('/api/forwardMessage', 'POST', {
      session: sessionName,
      chatId,
      messageId,
      from: fromChatId,
    });
  }

  // Editar mensagem
  async editMessage(
    sessionName: string,
    chatId: string,
    messageId: string,
    text: string
  ): Promise<ProxyResponse<unknown>> {
    return this.request<unknown>(
      `/api/${sessionName}/chats/${chatId}/messages/${messageId}`,
      'PUT',
      { text }
    );
  }

  // Deletar mensagem
  async deleteMessage(
    sessionName: string,
    chatId: string,
    messageId: string,
    forEveryone = false
  ): Promise<ProxyResponse<void>> {
    return this.request<void>(
      `/api/${sessionName}/chats/${chatId}/messages/${messageId}?forEveryone=${forEveryone}`,
      'DELETE'
    );
  }

  // Fixar/desafixar mensagem
  async pinMessage(
    sessionName: string,
    chatId: string,
    messageId: string,
    duration?: number // segundos
  ): Promise<ProxyResponse<void>> {
    return this.request<void>(
      `/api/${sessionName}/chats/${chatId}/messages/${messageId}/pin`,
      'POST',
      duration ? { duration } : undefined
    );
  }

  async unpinMessage(
    sessionName: string,
    chatId: string,
    messageId: string
  ): Promise<ProxyResponse<void>> {
    return this.request<void>(
      `/api/${sessionName}/chats/${chatId}/messages/${messageId}/unpin`,
      'POST'
    );
  }

  // Favoritar mensagem
  async starMessage(
    sessionName: string,
    chatId: string,
    messageId: string,
    star: boolean
  ): Promise<ProxyResponse<void>> {
    return this.request<void>('/api/star', 'POST', {
      session: sessionName,
      chatId,
      messageId,
      star,
    });
  }

  // ===== LABELS/ETIQUETAS =====

  async listLabels(sessionName: string): Promise<ProxyResponse<WAHALabel[]>> {
    return this.request<WAHALabel[]>(`/api/${sessionName}/labels`);
  }

  async createLabel(
    sessionName: string,
    name: string,
    color: number // 0-19
  ): Promise<ProxyResponse<WAHALabel>> {
    return this.request<WAHALabel>(`/api/${sessionName}/labels`, 'POST', {
      name,
      color,
    });
  }

  async updateLabel(
    sessionName: string,
    labelId: string,
    data: { name?: string; color?: number }
  ): Promise<ProxyResponse<WAHALabel>> {
    return this.request<WAHALabel>(`/api/${sessionName}/labels/${labelId}`, 'PUT', data);
  }

  async deleteLabel(sessionName: string, labelId: string): Promise<ProxyResponse<void>> {
    return this.request<void>(`/api/${sessionName}/labels/${labelId}`, 'DELETE');
  }

  async getLabelChats(sessionName: string, labelId: string): Promise<ProxyResponse<unknown[]>> {
    return this.request<unknown[]>(`/api/${sessionName}/labels/${labelId}/chats`);
  }

  async getChatLabels(sessionName: string, chatId: string): Promise<ProxyResponse<WAHALabel[]>> {
    return this.request<WAHALabel[]>(`/api/${sessionName}/labels/chats/${chatId}/`);
  }

  async setChatLabels(
    sessionName: string,
    chatId: string,
    labelIds: string[]
  ): Promise<ProxyResponse<void>> {
    return this.request<void>(`/api/${sessionName}/labels/chats/${chatId}/`, 'PUT', {
      labels: labelIds,
    });
  }

  async addChatLabel(
    sessionName: string,
    chatId: string,
    labelId: string
  ): Promise<ProxyResponse<void>> {
    // TODO: Otimizar - esta operação faz 2 requests ao WAHA (GET + PUT)
    // Para operações em lote, usar setChatLabelsAtomic diretamente
    const current = await this.getChatLabels(sessionName, chatId);
    const currentIds = current.data?.map((l) => l.id) || [];
    if (!currentIds.includes(labelId)) {
      currentIds.push(labelId);
    }
    return this.setChatLabels(sessionName, chatId, currentIds);
  }

  async removeChatLabel(
    sessionName: string,
    chatId: string,
    labelId: string
  ): Promise<ProxyResponse<void>> {
    // TODO: Otimizar - esta operação faz 2 requests ao WAHA (GET + PUT)
    // Para operações em lote, usar setChatLabelsAtomic diretamente
    const current = await this.getChatLabels(sessionName, chatId);
    const currentIds = current.data?.map((l) => l.id).filter((id) => id !== labelId) || [];
    return this.setChatLabels(sessionName, chatId, currentIds);
  }

  /**
   * Define as labels de um chat diretamente com o array completo de IDs,
   * sem fazer um GET prévio (evita o padrão N+1 de addChatLabel/removeChatLabel).
   * Use este método quando o conjunto completo de labels já é conhecido.
   */
  async setChatLabelsAtomic(
    sessionName: string,
    chatId: string,
    labelIds: string[]
  ): Promise<ProxyResponse<void>> {
    return this.setChatLabels(sessionName, chatId, labelIds);
  }

  // ===== CHATS =====

  async getChats(sessionName: string, limit = 100, offset = 0): Promise<ProxyResponse<unknown[]>> {
    return this.request<unknown[]>(
      `/api/${sessionName}/chats/overview?limit=${limit}&offset=${offset}`
    );
  }

  async getChatMessages(
    sessionName: string,
    chatId: string,
    limit = 100,
    options?: {
      downloadMedia?: boolean;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<ProxyResponse<unknown[]>> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      ...(options?.downloadMedia !== undefined && { downloadMedia: options.downloadMedia.toString() }),
      ...(options?.sortOrder && { sortOrder: options.sortOrder }),
    });
    return this.request<unknown[]>(
      `/api/${sessionName}/chats/${chatId}/messages?${params.toString()}`
    );
  }

  async archiveChat(sessionName: string, chatId: string): Promise<ProxyResponse<void>> {
    return this.request<void>(`/api/${sessionName}/chats/${chatId}/archive`, 'POST');
  }

  async unarchiveChat(sessionName: string, chatId: string): Promise<ProxyResponse<void>> {
    return this.request<void>(`/api/${sessionName}/chats/${chatId}/unarchive`, 'POST');
  }

  async deleteChat(sessionName: string, chatId: string): Promise<ProxyResponse<void>> {
    return this.request<void>(`/api/${sessionName}/chats/${chatId}`, 'DELETE');
  }

  // ===== STATUS/STORIES =====

  async sendStatusText(
    sessionName: string,
    text: string,
    options?: {
      backgroundColor?: string;
      font?: number; // 0-5
      contacts?: string[]; // Lista de contatos para enviar
    }
  ): Promise<ProxyResponse<WAHAMessage>> {
    return this.request<WAHAMessage>(`/api/${sessionName}/status/text`, 'POST', {
      text,
      ...(options?.backgroundColor && { backgroundColor: options.backgroundColor }),
      ...(options?.font !== undefined && { font: options.font }),
      ...(options?.contacts && { contacts: options.contacts }),
    });
  }

  async sendStatusImage(
    sessionName: string,
    file: { url?: string; base64?: string; mimetype?: string },
    options?: {
      caption?: string;
      contacts?: string[];
    }
  ): Promise<ProxyResponse<WAHAMessage>> {
    return this.request<WAHAMessage>(`/api/${sessionName}/status/image`, 'POST', {
      file,
      ...(options?.caption && { caption: options.caption }),
      ...(options?.contacts && { contacts: options.contacts }),
    });
  }

  async sendStatusVideo(
    sessionName: string,
    file: { url?: string; base64?: string; mimetype?: string },
    options?: {
      caption?: string;
      contacts?: string[];
    }
  ): Promise<ProxyResponse<WAHAMessage>> {
    return this.request<WAHAMessage>(`/api/${sessionName}/status/video`, 'POST', {
      file,
      ...(options?.caption && { caption: options.caption }),
      ...(options?.contacts && { contacts: options.contacts }),
    });
  }

  async sendStatusVoice(
    sessionName: string,
    file: { url?: string; base64?: string; mimetype?: string },
    options?: {
      contacts?: string[];
    }
  ): Promise<ProxyResponse<WAHAMessage>> {
    return this.request<WAHAMessage>(`/api/${sessionName}/status/voice`, 'POST', {
      file,
      ...(options?.contacts && { contacts: options.contacts }),
    });
  }

  async deleteStatus(
    sessionName: string,
    messageId: string
  ): Promise<ProxyResponse<void>> {
    return this.request<void>(`/api/${sessionName}/status/delete`, 'POST', {
      id: messageId,
    });
  }

  // ===== CONTATOS =====

  async getContacts(sessionName: string): Promise<ProxyResponse<unknown[]>> {
    return this.request<unknown[]>(`/api/contacts?session=${sessionName}`);
  }

  async getContact(sessionName: string, contactId: string): Promise<ProxyResponse<unknown>> {
    return this.request<unknown>(`/api/contacts?session=${sessionName}&contactId=${contactId}`);
  }

  async checkNumberExists(
    sessionName: string,
    phone: string
  ): Promise<ProxyResponse<{ numberExists: boolean; chatId?: string }>> {
    return this.request<{ numberExists: boolean; chatId?: string }>(
      `/api/contacts/check-exists?session=${sessionName}&phone=${phone}`
    );
  }

  async getProfilePicture(
    sessionName: string,
    chatId: string
  ): Promise<ProxyResponse<{ url: string }>> {
    return this.request<{ url: string }>(
      `/api/contacts/profile-picture?session=${sessionName}&contactId=${chatId}`
    );
  }

  // ===== BLOQUEAR / DESBLOQUEAR =====

  async blockContact(
    sessionName: string,
    contactId: string
  ): Promise<ProxyResponse<void>> {
    return this.request<void>(
      `/api/${sessionName}/contacts/${encodeURIComponent(contactId)}/block`,
      'POST'
    );
  }

  async unblockContact(
    sessionName: string,
    contactId: string
  ): Promise<ProxyResponse<void>> {
    return this.request<void>(
      `/api/${sessionName}/contacts/${encodeURIComponent(contactId)}/block`,
      'DELETE'
    );
  }

  async getBlockedContacts(
    sessionName: string
  ): Promise<ProxyResponse<Array<{ id: string; name?: string }>>> {
    return this.request<Array<{ id: string; name?: string }>>(
      `/api/${sessionName}/contacts/blocked`
    );
  }

  // ===== WEBHOOK CONFIGURATION =====

  /**
   * Configura webhook mantendo a configuração NOWEB store
   * IMPORTANTE: Deve preservar noweb.store para não perder histórico de chats
   */
  async setWebhook(
    sessionName: string,
    webhookUrl: string,
    events: string[] = ['message', 'message.any', 'message.ack', 'session.status', 'label.upsert', 'label.deleted', 'label.chat.added', 'label.chat.deleted']
  ): Promise<ProxyResponse<unknown>> {
    // IMPORTANTE: WAHA usa REPLACE, não MERGE no PUT
    // Precisamos enviar a config COMPLETA incluindo noweb.store e markOnline
    // para não perder as configurações de persistência de chats
    const result = await this.request<unknown>(`/api/sessions/${sessionName}`, 'PUT', {
      config: {
        noweb: {
          markOnline: true,
          store: {
            enabled: true,
            fullSync: true,
          },
        },
        webhooks: [
          {
            url: webhookUrl,
            events,
            retries: {
              delaySeconds: 2,
              attempts: 3,
            },
          },
        ],
      },
    });

    // PUT reinicia a sessão - aguardar voltar a WORKING
    if (result.success) {
      await this.waitForSessionReady(sessionName);
    }

    return result;
  }

  async getSessionConfig(sessionName: string): Promise<ProxyResponse<unknown>> {
    return this.request<unknown>(`/api/sessions/${sessionName}`);
  }

  /**
   * Remove todos os webhooks de uma sessão mantendo a configuração NOWEB store
   * IMPORTANTE: Deve preservar noweb.store para não perder histórico de chats
   */
  async removeWebhook(sessionName: string): Promise<ProxyResponse<unknown>> {
    const result = await this.request<unknown>(`/api/sessions/${sessionName}`, 'PUT', {
      config: {
        noweb: {
          markOnline: true,
          store: {
            enabled: true,
            fullSync: true,
          },
        },
        webhooks: [], // Array vazio para remover todos os webhooks
      },
    });

    // PUT reinicia a sessão - aguardar voltar a WORKING
    if (result.success) {
      await this.waitForSessionReady(sessionName);
    }

    return result;
  }

  // ===== DIAGNÓSTICO =====

  async testConnection(): Promise<ProxyResponse<{ sessions: number; status: string }>> {
    if (DEBUG) console.warn('[WAHA] Testando conexão...');

    const configLoaded = await this.loadConfig();
    if (!configLoaded) {
      return {
        success: false,
        error: 'Configuração WAHA não carregada. Verifique mt_waha_config.',
      };
    }

    try {
      const result = await this.listSessions();
      if (result.success) {
        const count = Array.isArray(result.data) ? result.data.length : 0;
        if (DEBUG) console.warn(`[WAHA] ✓ Conexão OK! ${count} sessões encontradas`);
        return {
          success: true,
          data: { sessions: count, status: 'connected' },
        };
      }
      return { success: false, error: result.error || 'Falha ao listar sessões' };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('[WAHA] ✗ Teste de conexão falhou:', errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  async runDiagnostics(): Promise<{
    config: { hasUrl: boolean; hasKey: boolean; url: string };
    connection: { success: boolean; error?: string; sessions?: number };
  }> {
    const config = this.getConfigStatus();
    await this.loadConfig(true);

    let connection: { success: boolean; error?: string; sessions?: number } = {
      success: false,
      error: 'Não testado',
    };

    if (config.hasUrl && config.hasKey) {
      const testResult = await this.testConnection();
      connection = {
        success: testResult.success,
        error: testResult.error,
        sessions: testResult.data?.sessions,
      };
    } else {
      connection = {
        success: false,
        error: !config.hasKey ? 'WAHA_API_KEY não configurada' : 'URL do WAHA não configurada',
      };
    }

    return { config: this.getConfigStatus(), connection };
  }

  // ===== GRUPOS =====

  // Listar todos os grupos
  async getGroups(sessionName: string): Promise<ProxyResponse<unknown[]>> {
    return this.request<unknown[]>(`/api/${sessionName}/groups`);
  }

  // Obter informações de um grupo
  async getGroupInfo(sessionName: string, groupId: string): Promise<ProxyResponse<unknown>> {
    return this.request<unknown>(`/api/${sessionName}/groups/${groupId}`);
  }

  // Criar grupo
  async createGroup(
    sessionName: string,
    name: string,
    participants: string[]
  ): Promise<ProxyResponse<unknown>> {
    return this.request<unknown>(`/api/${sessionName}/groups`, 'POST', {
      name,
      participants: participants.map(p => `${p}@c.us`),
    });
  }

  // Adicionar participantes ao grupo
  async addGroupParticipants(
    sessionName: string,
    groupId: string,
    participants: string[]
  ): Promise<ProxyResponse<unknown>> {
    return this.request<unknown>(
      `/api/${sessionName}/groups/${groupId}/participants/add`,
      'POST',
      { participants: participants.map(p => p.includes('@') ? p : `${p}@c.us`) }
    );
  }

  // Remover participantes do grupo
  async removeGroupParticipants(
    sessionName: string,
    groupId: string,
    participants: string[]
  ): Promise<ProxyResponse<unknown>> {
    return this.request<unknown>(
      `/api/${sessionName}/groups/${groupId}/participants/remove`,
      'POST',
      { participants: participants.map(p => p.includes('@') ? p : `${p}@c.us`) }
    );
  }

  // Promover participantes a admin
  async promoteGroupParticipants(
    sessionName: string,
    groupId: string,
    participants: string[]
  ): Promise<ProxyResponse<unknown>> {
    return this.request<unknown>(
      `/api/${sessionName}/groups/${groupId}/admins/promote`,
      'POST',
      { participants: participants.map(p => p.includes('@') ? p : `${p}@c.us`) }
    );
  }

  // Rebaixar admins
  async demoteGroupParticipants(
    sessionName: string,
    groupId: string,
    participants: string[]
  ): Promise<ProxyResponse<unknown>> {
    return this.request<unknown>(
      `/api/${sessionName}/groups/${groupId}/admins/demote`,
      'POST',
      { participants: participants.map(p => p.includes('@') ? p : `${p}@c.us`) }
    );
  }

  // Atualizar nome (subject) do grupo
  async updateGroupSubject(
    sessionName: string,
    groupId: string,
    subject: string
  ): Promise<ProxyResponse<unknown>> {
    return this.request<unknown>(
      `/api/${sessionName}/groups/${groupId}/settings`,
      'PUT',
      { subject }
    );
  }

  // Atualizar descrição do grupo
  async updateGroupDescription(
    sessionName: string,
    groupId: string,
    description: string
  ): Promise<ProxyResponse<unknown>> {
    return this.request<unknown>(
      `/api/${sessionName}/groups/${groupId}/settings`,
      'PUT',
      { description }
    );
  }

  // Atualizar configurações do grupo
  async updateGroupSettings(
    sessionName: string,
    groupId: string,
    settings: { announce?: boolean; restrict?: boolean }
  ): Promise<ProxyResponse<unknown>> {
    return this.request<unknown>(
      `/api/${sessionName}/groups/${groupId}/settings`,
      'PUT',
      settings
    );
  }

  // Sair do grupo
  async leaveGroup(sessionName: string, groupId: string): Promise<ProxyResponse<unknown>> {
    return this.request<unknown>(`/api/${sessionName}/groups/${groupId}/leave`, 'POST');
  }

  // Obter foto do grupo
  async getGroupProfilePicture(
    sessionName: string,
    groupId: string
  ): Promise<ProxyResponse<{ url: string }>> {
    return this.request<{ url: string }>(
      `/api/${sessionName}/groups/${groupId}/profile-picture`
    );
  }

  // Definir foto do grupo
  async setGroupProfilePicture(
    sessionName: string,
    groupId: string,
    file: { url?: string; base64?: string; mimetype?: string }
  ): Promise<ProxyResponse<unknown>> {
    return this.request<unknown>(
      `/api/${sessionName}/groups/${groupId}/profile-picture`,
      'PUT',
      { file }
    );
  }

  // Obter link de convite do grupo
  async getGroupInviteCode(sessionName: string, groupId: string): Promise<ProxyResponse<{ code: string }>> {
    return this.request<{ code: string }>(`/api/${sessionName}/groups/${groupId}/invite-code`);
  }

  // Revogar link de convite do grupo
  async revokeGroupInviteCode(sessionName: string, groupId: string): Promise<ProxyResponse<{ code: string }>> {
    return this.request<{ code: string }>(`/api/${sessionName}/groups/${groupId}/invite-code/revoke`, 'POST');
  }

  // ===== LID (Meta/Instagram/Facebook Contacts) =====

  /**
   * Buscar telefone real de um contato @lid (Meta/Instagram/Facebook)
   * Usa endpoint GET /api/{session}/lids/{lid}
   * Retorna: {"lid": "123@lid", "pn": "123456789@c.us"}
   */
  async getLidPhoneNumber(
    sessionName: string,
    lidId: string
  ): Promise<ProxyResponse<{ lid: string; pn: string }>> {
    // Remover @lid se existir
    const cleanLid = lidId.replace('@lid', '');
    return this.request<{ lid: string; pn: string }>(
      `/api/${sessionName}/lids/${cleanLid}`
    );
  }

  /**
   * Extrair telefone real de um contato @lid
   * Retorna apenas o número de telefone (sem @c.us)
   */
  async extractRealPhoneFromLid(
    sessionName: string,
    lidId: string
  ): Promise<string | null> {
    const result = await this.getLidPhoneNumber(sessionName, lidId);

    if (!result.success || !result.data) {
      if (DEBUG) console.warn(`[WAHA] Não foi possível obter telefone para LID ${lidId}`);
      return null;
    }

    // pn vem no formato "123456789@c.us"
    const pn = result.data.pn;
    if (pn && !pn.includes('@lid')) {
      const phone = pn.replace('@c.us', '').replace('@s.whatsapp.net', '');
      if (DEBUG) console.warn(`[WAHA] Telefone real para ${lidId}: ${phone}`);
      return phone;
    }

    return null;
  }

  // ===== ENCAMINHAR MENSAGENS (batch) =====

  // Encaminhar múltiplas mensagens
  async forwardMessages(
    sessionName: string,
    fromChatId: string,
    messageIds: string[],
    toChatId: string
  ): Promise<ProxyResponse<unknown>> {
    return this.request<unknown>(
      `/api/${sessionName}/chats/${fromChatId}/messages/forward`,
      'POST',
      {
        to: toChatId,
        messages: messageIds,
      }
    );
  }
}

// Singleton
export const wahaClient = new WAHADirectClient();

// Tipos exportados
export type {
  WAHASessionInfo,
  WAHAQRCode,
  WAHAMessage,
  WAHALabel,
  WAHAPoll,
  WAHAContact,
  WAHALocation,
  WAHAEvent,
  ProxyResponse,
};
