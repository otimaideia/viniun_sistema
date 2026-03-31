// ============================================================
// SERVIÇO DE INTEGRAÇÃO COM API WAHA
// ============================================================

import type {
  WahaSession,
  WahaQRResponse,
  WahaSessionConfig,
  WahaSendTextRequest,
  WahaConnectionTestResult,
  WahaEngine
} from "@/types/whatsapp";
import { sanitizeObjectForJSON, sanitizeForJSON } from "@/utils/unicodeSanitizer";

// Avatar padrão para leads sem foto do WhatsApp
// SVG inline em base64 - ícone de pessoa genérico (cinza)
export const DEFAULT_AVATAR_URL = 'https://ui-avatars.com/api/?background=c7c7c7&color=fff&name=&size=200&bold=true&format=svg';

/**
 * Gera URL de avatar com iniciais do nome
 * Usa serviço ui-avatars.com que gera avatares dinâmicos
 * Se o "nome" for um número de telefone, retorna o avatar genérico
 */
export function generateDefaultAvatar(name?: string | null): string {
  if (name && name.trim().length > 0) {
    // Se o nome é um número de telefone (>= 8 dígitos), não usar como iniciais
    const digitsOnly = name.trim().replace(/\D/g, '');
    if (digitsOnly.length >= 8 && digitsOnly === name.trim().replace(/[+\s\-()]/g, '')) {
      return DEFAULT_AVATAR_URL;
    }
    // Extrair iniciais do nome real (ex: "João Silva" → "JS")
    const words = name.trim().split(/\s+/).filter(w => /[a-zA-ZÀ-ÿ]/.test(w));
    if (words.length === 0) return DEFAULT_AVATAR_URL;
    const initials = words.length >= 2
      ? words[0][0] + words[words.length - 1][0]
      : words[0].substring(0, 2);
    return `https://ui-avatars.com/api/?background=E91E63&color=fff&name=${encodeURIComponent(initials)}&size=200&bold=true&format=svg`;
  }
  return DEFAULT_AVATAR_URL;
}

// Credenciais de servidores WAHA para autenticação de mídia
// Servidor legado mantido para mídias antigas que apontam para URL antiga
const LEGACY_WAHA_CONFIGS: Record<string, string> = {
  'waha.otimaideia.com.br': '', // Placeholder - configure via painel
};

/**
 * Retorna a API key correta para uma URL de mídia WAHA.
 * Se a URL pertence a um servidor legacy, retorna a key legacy.
 * Caso contrário, retorna a key atual passada como parâmetro.
 */
export function getWahaApiKeyForUrl(url: string, currentApiKey?: string): string | undefined {
  for (const [host, key] of Object.entries(LEGACY_WAHA_CONFIGS)) {
    if (url.includes(host)) return key;
  }
  return currentApiKey;
}

class WahaApiService {
  private apiUrl: string = "";
  private apiKey: string = "";

  /**
   * Configura as credenciais da API WAHA
   */
  setConfig(apiUrl: string, apiKey: string) {
    this.apiUrl = apiUrl.replace(/\/$/, ""); // Remove trailing slash
    this.apiKey = apiKey;
  }

  /**
   * Retorna as credenciais atuais
   */
  getConfig() {
    return {
      apiUrl: this.apiUrl,
      apiKey: this.apiKey,
      isConfigured: Boolean(this.apiUrl && this.apiKey)
    };
  }

  /**
   * Headers padrão para requisições
   */
  private getHeaders(): HeadersInit {
    return {
      "Content-Type": "application/json",
      "X-Api-Key": this.apiKey,
    };
  }

  /**
   * Método genérico para fazer requisições (público para extensibilidade)
   * 🛡️ Sanitiza automaticamente JSON bodies para evitar surrogates inválidos
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    timeoutMs: number = 30000
  ): Promise<T> {
    if (!this.apiUrl) {
      throw new Error("URL da API WAHA não configurada");
    }

    const url = `${this.apiUrl}${endpoint}`;

    // 🛡️ Sanitizar body JSON antes de enviar (proteção contra surrogates)
    if (options.body && typeof options.body === 'string') {
      try {
        const parsed = JSON.parse(options.body);
        const sanitized = sanitizeObjectForJSON(parsed);
        options = { ...options, body: JSON.stringify(sanitized) };
      } catch {
        // Não é JSON válido - enviar como está
      }
    }

    // ⏱️ AbortController com timeout para evitar fetch travado
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ${response.status}: ${errorText}`);
      }

      // Alguns endpoints retornam vazio
      const text = await response.text();
      if (!text) return {} as T;

      // 🛡️ Sanitizar resposta para remover surrogates UTF-16 inválidos
      // WAHA retorna mensagens com emoji/caracteres especiais que podem conter
      // high surrogates sem low surrogates - isso quebra JSON.stringify downstream
      const parsed = JSON.parse(text);
      return sanitizeObjectForJSON(parsed) as T;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error(`Timeout: requisição para ${endpoint} excedeu ${timeoutMs / 1000}s`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ============================================================
  // TESTE DE CONEXÃO
  // ============================================================

  /**
   * Testa a conexão com a API WAHA listando sessões
   */
  async testConnection(): Promise<WahaConnectionTestResult> {
    try {
      const sessions = await this.listSessions();
      return {
        success: true,
        message: `Conectado! ${sessions.length} sessão(ões) encontrada(s).`,
        sessionsCount: sessions.length,
        sessions,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  }

  // ============================================================
  // GERENCIAMENTO DE SESSÕES
  // ============================================================

  /**
   * Lista todas as sessões
   * GET /api/sessions
   */
  async listSessions(): Promise<WahaSession[]> {
    return this.request<WahaSession[]>("/api/sessions");
  }

  /**
   * Obtém detalhes de uma sessão específica
   * GET /api/sessions/{session}
   */
  async getSession(sessionName: string): Promise<WahaSession> {
    return this.request<WahaSession>(`/api/sessions/${sessionName}`);
  }

  /**
   * Cria uma nova sessão com configuração customizada
   * POST /api/sessions
   */
  async createSession(config: WahaSessionConfig): Promise<WahaSession> {
    return this.request<WahaSession>("/api/sessions", {
      method: "POST",
      body: JSON.stringify(config),
    });
  }

  /**
   * Cria uma nova sessão NOWEB com configuração otimizada para sincronização completa
   * IMPORTANTE: A config de store NÃO deve ser alterada após escanear QR code
   *
   * Configuração aplicada:
   * - start: true (auto-inicia a sessão)
   * - markOnline: true (necessário para receber notificações no celular)
   * - store.enabled: true (persiste contatos, chats e mensagens)
   * - store.fullSync: true (sincroniza ~1 ano de histórico, até 100K msgs/chat)
   */
  async createSessionWithFullSync(sessionName: string): Promise<WahaSession> {
    const config: WahaSessionConfig = {
      name: sessionName,
      start: true,
      config: {
        noweb: {
          markOnline: true,
          store: {
            enabled: true,
            fullSync: true,
          },
        },
      },
    };
    return this.createSession(config);
  }

  /**
   * Inicia uma sessão existente
   * POST /api/sessions/{session}/start
   */
  async startSession(sessionName: string): Promise<void> {
    await this.request<void>(`/api/sessions/${sessionName}/start`, {
      method: "POST",
    });
  }

  /**
   * Para uma sessão
   * POST /api/sessions/{session}/stop
   */
  async stopSession(sessionName: string): Promise<void> {
    await this.request<void>(`/api/sessions/${sessionName}/stop`, {
      method: "POST",
    });
  }

  /**
   * Reinicia uma sessão
   * POST /api/sessions/{session}/restart
   */
  async restartSession(sessionName: string): Promise<void> {
    await this.request<void>(`/api/sessions/${sessionName}/restart`, {
      method: "POST",
    });
  }

  /**
   * Deleta uma sessão
   * DELETE /api/sessions/{session}
   */
  async deleteSession(sessionName: string): Promise<void> {
    await this.request<void>(`/api/sessions/${sessionName}`, {
      method: "DELETE",
    });
  }

  /**
   * Faz logout de uma sessão (desconecta o WhatsApp)
   * POST /api/sessions/{session}/logout
   */
  async logoutSession(sessionName: string): Promise<void> {
    await this.request<void>(`/api/sessions/${sessionName}/logout`, {
      method: "POST",
    });
  }

  // ============================================================
  // AUTENTICAÇÃO / QR CODE
  // ============================================================

  /**
   * Obtém o QR Code para autenticação
   * GET /api/{session}/auth/qr
   * Retorna base64 da imagem
   */
  async getQRCode(sessionName: string): Promise<WahaQRResponse> {
    if (!this.apiUrl) {
      throw new Error("URL da API WAHA não configurada");
    }

    const url = `${this.apiUrl}/api/${sessionName}/auth/qr`;
    
    const response = await fetch(url, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ${response.status}: ${errorText}`);
    }

    const contentType = response.headers.get("content-type") || "";
    
    // Se retornar imagem diretamente (PNG), converter para base64
    if (contentType.includes("image/")) {
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(",")[1];
          resolve({
            mimetype: contentType,
            data: base64,
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
    
    // Se retornar JSON
    const data = await response.json();
    return data;
  }

  /**
   * Obtém o QR Code como imagem diretamente (URL)
   * GET /api/{session}/auth/qr?format=image
   */
  getQRCodeImageUrl(sessionName: string): string {
    return `${this.apiUrl}/api/${sessionName}/auth/qr?format=image`;
  }

  // ============================================================
  // ENVIO DE MENSAGENS
  // ============================================================

  /**
   * Envia mensagem de texto
   * POST /api/sendText
   * 🛡️ Sanitiza texto para evitar erros de Unicode
   */
  async sendText(request: WahaSendTextRequest): Promise<{ id?: string; [key: string]: unknown }> {
    const sanitizedRequest = sanitizeObjectForJSON(request);
    return await this.request<{ id?: string; [key: string]: unknown }>("/api/sendText", {
      method: "POST",
      body: JSON.stringify(sanitizedRequest),
    });
  }

  /**
   * Envia imagem
   * POST /api/sendImage
   * 🛡️ Sanitiza caption para evitar erros de Unicode
   */
  async sendImage(sessionName: string, chatId: string, imageBase64: string, caption?: string): Promise<void> {
    await this.request<void>("/api/sendImage", {
      method: "POST",
      body: JSON.stringify(sanitizeObjectForJSON({
        session: sessionName,
        chatId,
        file: {
          data: imageBase64,
        },
        caption,
      })),
    });
  }

  /**
   * Envia arquivo/documento
   * POST /api/sendFile
   * 🛡️ Sanitiza caption para evitar erros de Unicode
   */
  async sendFile(
    sessionName: string,
    chatId: string,
    fileBase64: string,
    filename: string,
    mimetype: string,
    caption?: string
  ): Promise<void> {
    await this.request<void>("/api/sendFile", {
      method: "POST",
      body: JSON.stringify(sanitizeObjectForJSON({
        session: sessionName,
        chatId,
        file: {
          data: fileBase64,
          filename,
          mimetype,
        },
        caption,
      })),
    });
  }

  /**
   * Envia áudio como voice message
   * POST /api/sendVoice
   */
  async sendVoice(sessionName: string, chatId: string, audioBase64: string): Promise<void> {
    await this.request<void>("/api/sendVoice", {
      method: "POST",
      body: JSON.stringify({
        session: sessionName,
        chatId,
        file: {
          data: audioBase64,
        },
      }),
    });
  }

  /**
   * Envia vídeo
   * POST /api/sendVideo
   * 🛡️ Sanitiza caption para evitar erros de Unicode
   */
  async sendVideo(
    sessionName: string,
    chatId: string,
    videoBase64: string,
    caption?: string
  ): Promise<void> {
    await this.request<void>("/api/sendVideo", {
      method: "POST",
      body: JSON.stringify(sanitizeObjectForJSON({
        session: sessionName,
        chatId,
        file: {
          data: videoBase64,
        },
        caption,
      })),
    });
  }

  /**
   * Marca mensagens como lidas
   * POST /api/{session}/chats/{chatId}/messages/read
   */
  async markAsRead(sessionName: string, chatId: string): Promise<void> {
    await this.request<void>(`/api/${sessionName}/chats/${chatId}/messages/read`, {
      method: "POST",
    });
  }

  /**
   * Envia contato (vCard)
   * POST /api/sendContactVcard
   * 🛡️ Sanitiza nome/org para evitar erros de Unicode
   */
  async sendContact(
    sessionName: string,
    chatId: string,
    contact: { fullName: string; phoneNumber: string; organization?: string }
  ): Promise<void> {
    await this.request<void>("/api/sendContactVcard", {
      method: "POST",
      body: JSON.stringify(sanitizeObjectForJSON({
        session: sessionName,
        chatId,
        contacts: [
          {
            fullName: contact.fullName,
            phoneNumber: contact.phoneNumber,
            organization: contact.organization,
          },
        ],
      })),
    });
  }

  /**
   * Envia enquete/votação
   * POST /api/sendPoll
   * 🛡️ Sanitiza pergunta/opções para evitar erros de Unicode
   */
  async sendPoll(
    sessionName: string,
    chatId: string,
    poll: { name: string; options: string[]; multipleAnswers?: boolean }
  ): Promise<void> {
    await this.request<void>("/api/sendPoll", {
      method: "POST",
      body: JSON.stringify(sanitizeObjectForJSON({
        session: sessionName,
        chatId,
        poll: {
          name: poll.name,
          options: poll.options,
          multipleAnswers: poll.multipleAnswers ?? false,
        },
      })),
    });
  }

  /**
   * Envia localização
   * POST /api/sendLocation
   * 🛡️ Sanitiza título/endereço para evitar erros de Unicode
   */
  async sendLocation(
    sessionName: string,
    chatId: string,
    location: { latitude: number; longitude: number; title?: string; address?: string }
  ): Promise<void> {
    await this.request<void>("/api/sendLocation", {
      method: "POST",
      body: JSON.stringify(sanitizeObjectForJSON({
        session: sessionName,
        chatId,
        latitude: location.latitude,
        longitude: location.longitude,
        title: location.title,
        address: location.address,
      })),
    });
  }

  /**
   * Envia evento (convite de calendário)
   * POST /api/{session}/events
   *
   * NOTA: sendEvent só funciona com a engine WEBJS.
   * NOWEB e GOWS não suportam este endpoint.
   * Falha silenciosa esperada em outras engines.
   *
   * @param event.startTime - Unix timestamp em segundos
   * @param event.endTime - Unix timestamp em segundos (opcional)
   * @see https://waha.devlike.pro/docs/how-to/event-message/
   * 🛡️ Sanitiza nome/descrição para evitar erros de Unicode
   */
  async sendEvent(
    sessionName: string,
    chatId: string,
    event: {
      name: string;
      description?: string;
      startTime: number;
      endTime?: number;
      location?: { name: string };
    }
  ): Promise<void> {
    // Endpoint correto conforme documentação oficial WAHA
    await this.request<void>(`/api/${sessionName}/events`, {
      method: "POST",
      body: JSON.stringify(sanitizeObjectForJSON({
        chatId,
        name: event.name,
        description: event.description,
        start: event.startTime, // Campo correto é 'start', não 'startTime'
        end: event.endTime,     // Campo correto é 'end', não 'endTime'
        location: event.location,
      })),
    });
  }

  /**
   * Deleta uma mensagem
   * DELETE /api/{session}/chats/{chatId}/messages/{messageId}
   * @param forEveryone - Se true, deleta para todos os participantes
   */
  async deleteMessage(
    sessionName: string,
    chatId: string,
    messageId: string,
    forEveryone: boolean = false
  ): Promise<void> {
    // Tentar primeiro o endpoint mais comum
    try {
      await this.request<void>(`/api/${sessionName}/chats/${chatId}/messages/${messageId}`, {
        method: "DELETE",
        body: JSON.stringify({ forEveryone }),
      });
      return;
    } catch {
      // Se falhar, tentar endpoint alternativo
      try {
        await this.request<void>(`/api/deleteMessage`, {
          method: "POST",
          body: JSON.stringify({
            session: sessionName,
            chatId,
            messageId,
            forEveryone,
          }),
        });
      } catch (innerError) {
        console.error("Nenhum endpoint de delete disponível:", innerError);
        throw innerError;
      }
    }
  }

  /**
   * Verifica se um número é válido no WhatsApp
   * GET /api/contacts/check-exists
   */
  async checkNumberExists(sessionName: string, phone: string): Promise<{ exists: boolean; chatId?: string }> {
    return this.request<{ exists: boolean; chatId?: string }>(
      `/api/contacts/check-exists?session=${sessionName}&phone=${phone}`
    );
  }

  /**
   * Busca informações de um contato pelo ID
   * GET /api/contacts?contactId={ID}&session={SESSION}
   * Retorna dados do contato incluindo número de telefone
   */
  async getProfilePicture(sessionName: string, contactId: string, refresh = false): Promise<string | null> {
    try {
      const refreshParam = refresh ? "&refresh=true" : "";
      const resp = await this.request<{ profilePictureURL?: string; url?: string }>(
        `/api/contacts/profile-picture?session=${sessionName}&contactId=${encodeURIComponent(contactId)}${refreshParam}`
      );
      const url = resp?.profilePictureURL || resp?.url;
      return (url && url.length > 10) ? url : null;
    } catch {
      return null;
    }
  }

  async getContact(sessionName: string, contactId: string): Promise<{
    id?: string;
    number?: string;
    name?: string;
    pushname?: string;
    shortName?: string;
    isMe?: boolean;
    isGroup?: boolean;
    isBusiness?: boolean;
    // Campos de foto (podem variar por versão do WAHA)
    profilePictureURL?: string;  // ✅ CORRETO (uppercase URL) - WAHA docs
    profilePictureUrl?: string;  // Fallback para versões antigas
    profilePicture?: string;
    picture?: string;
    avatar?: string;
    profilePicThumb?: string;
    imgUrl?: string;
  }> {
    try {
      return await this.request<any>(`/api/contacts?contactId=${encodeURIComponent(contactId)}&session=${sessionName}`);
    } catch (error) {
      console.warn(`[WAHA] Erro ao buscar contato ${contactId}:`, error);
      return {};
    }
  }

  /**
   * Resolve um LID (Linked ID) para telefone real
   * GET /api/{session}/lids/{lid}
   * LIDs são usados pelo WhatsApp para mascarar números em grupos
   *
   * NOTA: @lid só existe no engine NOWEB (Baileys).
   * GOWS e WEBJS usam @c.us diretamente — não geram @lid.
   * Esta função retorna null imediatamente para qualquer ID que não seja @lid.
   */
  async resolveLidToPhone(sessionName: string, lid: string): Promise<string | null> {
    // @lid só existe no engine NOWEB — GOWS usa @c.us diretamente
    if (!lid || !lid.includes('@lid')) {
      return null;
    }

    try {
      // Extrair apenas o ID numérico do LID (sem @lid)
      const lidId = lid.replace(/@lid$/, '');
      const result = await this.request<{ phoneNumber?: string; number?: string; id?: string; pn?: string; lid?: string }>(
        `/api/${sessionName}/lids/${lidId}`
      );
      // WAHA retorna diferentes campos conforme versão:
      // - pn: "5513998006982@c.us" (WAHA 2024+)
      // - phoneNumber: "5513998006982" (versões anteriores)
      // - number: "5513998006982"
      // - id: "5513998006982@c.us"
      const rawPhone = result.pn || result.phoneNumber || result.number || result.id;
      const phone = rawPhone?.replace(/@(c\.us|s\.whatsapp\.net)$/, '') || null;
      return phone ? this.cleanPhoneNumber(phone) : null;
    } catch (error) {
      console.warn(`[WAHA] Erro ao resolver LID ${lid}:`, error);
      return null;
    }
  }

  /**
   * Busca todos os mapeamentos LID -> telefone de uma sessão
   * GET /api/{session}/lids
   */
  async getAllLids(sessionName: string): Promise<Map<string, string>> {
    try {
      const result = await this.request<Array<{ lid: string; phoneNumber: string }>>(
        `/api/${sessionName}/lids`
      );
      const map = new Map<string, string>();
      if (Array.isArray(result)) {
        result.forEach(item => {
          if (item.lid && item.phoneNumber) {
            map.set(item.lid, item.phoneNumber);
          }
        });
      }
      return map;
    } catch (error) {
      console.warn(`[WAHA] Erro ao buscar LIDs:`, error);
      return new Map();
    }
  }

  /**
   * Extrai número de telefone real de um chatId
   * Trata diferentes formatos: @c.us, @lid, @g.us (grupos)
   *
   * Para @lid (NOWEB engine), tenta múltiplas fontes na ordem:
   * 1. lastMessage._data.key.remoteJidAlt
   * 2. lastMessage._data.from (@s.whatsapp.net)
   * 3. lastMessage._data.to (@s.whatsapp.net)
   * 4. contact.jid
   * 5. lastMessage.participant
   * 6. API de contatos WAHA
   * 7. chat.name (se parecer telefone)
   *
   * Baseado na implementação do guiadepraiagrande
   */
  async extractPhoneNumber(
    sessionName: string,
    chatId: string,
    chatData?: {
      phone?: string;
      phoneNumber?: string;
      number?: string;
      name?: string;
      isGroup?: boolean;
      contact?: {
        phone?: string;
        jid?: string;
      };
      jid?: string;
      participant?: string;
      lastMessage?: {
        participant?: string;
        _data?: {
          key?: {
            remoteJidAlt?: string;
          };
          from?: string;
          to?: string;
        };
      };
    }
  ): Promise<string | null> {
    if (!chatId) return null;

    // Grupos não têm telefone individual
    // Verificar tanto @g.us quanto propriedade isGroup (NOWEB pode usar @lid para grupos)
    if (chatId.includes('@g.us') || chatData?.isGroup === true) {
      return null;
    }

    // Chat ID padrão: 5511999999999@c.us - extrai direto
    if (chatId.includes('@c.us')) {
      return chatId.replace(/@c\.us$/, '');
    }

    // Para @lid, tentar múltiplas fontes (lógica do guiadepraiagrande)
    if (chatId.includes('@lid') && chatData) {
      // Chat com formato @lid (NOWEB engine) — extraindo telefone via múltiplas fontes

      let telefone: string | null = null;

      // FONTE 0: Campos diretos do chat
      telefone = chatData.phone || chatData.phoneNumber || chatData.number || chatData.contact?.phone || null;
      if (telefone) {
        const clean = this.cleanPhoneNumber(telefone);
        if (clean) return clean;
      }

      // FONTE 1: lastMessage._data.key.remoteJidAlt
      const remoteJidAlt = chatData.lastMessage?._data?.key?.remoteJidAlt;
      if (remoteJidAlt && remoteJidAlt.includes('@')) {
        telefone = remoteJidAlt.split('@')[0];
        const clean = this.cleanPhoneNumber(telefone);
        if (clean) {
          return clean;
        }
      }

      // FONTE 2: lastMessage._data.from (mensagens recebidas)
      const from = chatData.lastMessage?._data?.from;
      if (from && (from.includes('@s.whatsapp.net') || from.includes('@c.us'))) {
        telefone = from.split('@')[0];
        const clean = this.cleanPhoneNumber(telefone);
        if (clean) {
          return clean;
        }
      }

      // FONTE 3: lastMessage._data.to (mensagens enviadas)
      const to = chatData.lastMessage?._data?.to;
      if (to && (to.includes('@s.whatsapp.net') || to.includes('@c.us'))) {
        telefone = to.split('@')[0];
        const clean = this.cleanPhoneNumber(telefone);
        if (clean) {
          return clean;
        }
      }

      // FONTE 4: contact.jid ou jid alternativo
      const contactJid = chatData.contact?.jid || chatData.jid;
      if (contactJid && (contactJid.includes('@s.whatsapp.net') || contactJid.includes('@c.us'))) {
        telefone = contactJid.split('@')[0];
        const clean = this.cleanPhoneNumber(telefone);
        if (clean) {
          return clean;
        }
      }

      // FONTE 5: participant
      const participant = chatData.lastMessage?.participant || chatData.participant;
      if (participant && participant.includes('@')) {
        telefone = participant.split('@')[0];
        const clean = this.cleanPhoneNumber(telefone);
        if (clean) {
          return clean;
        }
      }

      // FONTE 6: chat.name (se parecer telefone)
      if (chatData.name) {
        const possiblePhone = chatData.name.replace(/\D/g, '');
        const cleanFromName = this.cleanPhoneNumber(possiblePhone);
        if (cleanFromName) {
          return cleanFromName;
        }
      }
    }

    // FONTE 7: API de contatos WAHA (último recurso para @lid)
    if (chatId.includes('@lid')) {
      try {
        // Primeiro tenta a API de LIDs
        const lidPhone = await this.resolveLidToPhone(sessionName, chatId);
        if (lidPhone) {
          return lidPhone;
        }

        // Fallback para API de contatos
        const contact = await this.getContact(sessionName, chatId);
        if (contact.number) {
          const clean = this.cleanPhoneNumber(contact.number);
          if (clean) {
            return clean;
          }
        }
        // Usar contact.id APENAS se NÃO for @lid (LID retorna o próprio ID, não telefone)
        if (contact.id && !contact.id.includes('@lid')) {
          const idPhone = contact.id.replace(/@.*$/, '');
          const clean = this.cleanPhoneNumber(idPhone);
          if (clean) {
            return clean;
          }
        }
      } catch (err) {
        console.warn(`[WAHA] Erro ao resolver @lid via API:`, err);
      }
    }

    // Fallback final: remover qualquer sufixo @xxx
    // ⚠️ NUNCA usar @lid como fallback - LIDs NÃO são telefones!
    if (chatId.includes('@lid')) {
      console.warn('[WAHA] Telefone NAO extraido para @lid (todas as fontes falharam):', chatId);
      return null;
    }

    // Para @c.us e @s.whatsapp.net, o fallback é seguro
    const fallback = chatId.replace(/@.*$/, '');
    const clean = this.cleanPhoneNumber(fallback);

    if (!clean) {
      console.warn('[WAHA] Telefone NAO extraido (fallback invalido):', { chatId, fallback });
    }

    return clean;
  }

  /**
   * Limpa e valida número de telefone
   * Retorna null se não parecer um telefone válido
   *
   * IMPORTANTE: Rejeita IDs LID do WhatsApp (14-15 dígitos aleatórios que NÃO são telefones)
   * Telefones válidos: 10-13 dígitos (BR: 55 + DDD + número = 12-13 dígitos)
   * LIDs inválidos: 14+ dígitos — NENHUM telefone real tem 14+ dígitos
   *
   * Comprimentos válidos:
   *   - 10 dígitos: DDD(2) + fixo(8) sem código de país
   *   - 11 dígitos: DDD(2) + celular(9) sem código de país
   *   - 12 dígitos: 55 + DDD(2) + fixo(8) com código de país
   *   - 13 dígitos: 55 + DDD(2) + celular(9) com código de país
   *   - 14+ dígitos: SEMPRE inválido (LID do WhatsApp)
   */
  private cleanPhoneNumber(phone: string | null | undefined): string | null {
    if (!phone) return null;

    // Remove tudo que não é dígito
    const digits = phone.replace(/\D/g, '');

    // Rejeitar números muito curtos (< 10 dígitos)
    if (digits.length < 10) {
      return null;
    }

    // REJEITAR números com 14+ dígitos — são LIDs do WhatsApp, NÃO telefones
    // Nenhum telefone brasileiro (nem internacional comum) tem 14+ dígitos
    // LIDs são IDs internos do WhatsApp (NOWEB engine) com 14-15 dígitos aleatórios
    if (digits.length >= 14) {
      console.warn(`[WAHA] Número rejeitado (LID detectado): ${digits} (${digits.length} dígitos)`);
      return null;
    }

    return digits;
  }

  // ============================================================
  // CHATS
  // ============================================================

  /**
   * Lista todos os chats de uma sessão com dados enriquecidos
   * Abordagem híbrida (Viniun):
   * 1. Busca TODOS os chats via /chats com limit alto
   * 2. Busca dados formatados via /chats/overview
   * 3. Mescla os dados para ter TODAS as conversas com formatação correta
   * @param limit - Limite de chats (0 = usar limite padrão alto de 5000)
   */
  async getChats(sessionName: string, _limit: number = 0, _offset: number = 0): Promise<unknown[]> {

    // Limite alto para buscar todas as conversas (WAHA tem limite padrão baixo)
    const fetchLimit = 5000;

    // 1. Primeiro buscar dados formatados do /chats/overview (tem nome, foto, etc)
    let overviewChats: Array<{
      id: string;
      name?: string;
      picture?: string;
      lastMessage?: {
        body?: string;
        text?: string;
        timestamp?: number;
        fromMe?: boolean;
      };
      unreadCount?: number;
      archived?: boolean;
      pinned?: boolean;
      isGroup?: boolean;
    }> = [];

    try {
      overviewChats = await this.request<typeof overviewChats>(
        `/api/${sessionName}/chats/overview?limit=${fetchLimit}`,
        {},
        120000 // 120s timeout para operação pesada
      );
    } catch (err) {
      console.warn("[WAHA] Erro ao buscar /chats/overview:", err);
    }

    // Criar mapa de chats formatados para lookup rápido
    const overviewMap = new Map<string, typeof overviewChats[0]>();
    for (const chat of overviewChats) {
      if (chat.id) {
        overviewMap.set(chat.id, chat);
      }
    }

    // 2. Buscar TODOS os chats via /chats com limit alto
    let allChats: Array<{
      id: string;
      name?: string;
      timestamp?: number;
      isGroup?: boolean;
      archived?: boolean;
      pinned?: boolean;
      unreadCount?: number;
      picture?: string;
      lastMessage?: {
        id?: string;
        body?: string;
        text?: string;
        timestamp?: number;
        fromMe?: boolean;
        type?: string;
        _data?: {
          key?: { remoteJidAlt?: string };
          from?: string;
          to?: string;
        };
      };
    }> = [];

    try {
      // Adicionar limit para buscar TODAS as conversas (WAHA tem limite padrão baixo)
      allChats = await this.request<typeof allChats>(
        `/api/${sessionName}/chats?limit=${fetchLimit}`,
        {},
        120000 // 120s timeout para operação pesada
      );
    } catch (err) {
      console.warn("[WAHA] Erro ao buscar /chats:", err);
      // Se /chats falhar, usar apenas o overview
      if (overviewChats.length > 0) {
        return overviewChats;
      }
    }

    // 3. FALLBACK: Se ambos endpoints retornaram vazio, buscar grupos diretamente
    // Isso contorna um bug no WAHA 2026.x com NOWEB onde /chats retorna vazio
    if (allChats.length === 0 && overviewChats.length === 0) {

      try {
        // Buscar lista de IDs de grupos
        const groupIds = await this.request<string[]>(`/api/${sessionName}/groups`);

        // Para cada grupo, criar uma entrada de chat básica
        const groupChats: typeof allChats = [];

        for (const groupId of groupIds.slice(0, 100)) { // Limitar a 100 grupos para não sobrecarregar
          try {
            // Buscar info do grupo
            const groupInfo = await this.request<{
              id: string;
              name?: string;
              subject?: string;
              picture?: string;
            }>(`/api/${sessionName}/groups/${groupId}`);

            // Buscar última mensagem do grupo
            let lastMessage: typeof allChats[0]['lastMessage'] = undefined;
            try {
              const messages = await this.request<Array<{
                id: string;
                body?: string;
                timestamp?: number;
                fromMe?: boolean;
              }>>(`/api/${sessionName}/chats/${groupId}/messages?limit=1`);
              if (messages && messages.length > 0) {
                lastMessage = messages[0];
              }
            } catch {
              // Sem mensagens, continuar
            }

            groupChats.push({
              id: groupId,
              name: groupInfo.name || groupInfo.subject || groupId,
              picture: groupInfo.picture,
              isGroup: true,
              timestamp: lastMessage?.timestamp || Math.floor(Date.now() / 1000),
              lastMessage,
            });
          } catch (err) {
            console.warn(`[WAHA] Erro ao buscar grupo ${groupId}:`, err);
          }
        }

        if (groupChats.length > 0) {
          return groupChats;
        }
      } catch (err) {
        console.warn("[WAHA] Fallback via /groups falhou:", err);
      }
    }

    // 4. Mesclar dados: pegar TODOS os chats do /chats e enriquecer com dados do /overview
    // IMPORTANTE: Manter lastMessage do /chats (tem _data para extração de telefone)
    // e só complementar com overview para nome e foto
    const enrichedChats = allChats.map(chat => {
      const chatId = chat.id;
      const overviewData = overviewMap.get(chatId);

      if (overviewData) {
        // Tem dados no overview - enriquecer nome e foto, mas MANTER lastMessage do /chats (tem _data!)
        return {
          ...chat,
          name: overviewData.name || chat.name,
          picture: overviewData.picture || chat.picture,
          // MANTER lastMessage do chat (com _data) - só usar overview se chat não tiver
          lastMessage: chat.lastMessage || overviewData.lastMessage,
          unreadCount: overviewData.unreadCount ?? chat.unreadCount,
        };
      }

      // Não tem no overview - usar dados raw
      return chat;
    });

    // Ordenar por timestamp da última mensagem (mais recentes primeiro)
    enrichedChats.sort((a, b) => {
      const timestampA = a.lastMessage?.timestamp || a.timestamp || 0;
      const timestampB = b.lastMessage?.timestamp || b.timestamp || 0;
      return timestampB - timestampA;
    });

    return enrichedChats;
  }

  /**
   * Busca informações de contato para enriquecer um chat
   * GET /api/contacts/profile-picture e /api/contacts
   */
  async getContactInfo(sessionName: string, chatId: string, phone?: string | null): Promise<{
    name?: string;
    picture?: string;
    phone?: string;
  }> {
    const result: { name?: string; picture?: string; phone?: string } = {};
    const isLid = chatId.includes('@lid');

    // ============================================================
    // FASE 0: Resolver telefone se @lid e não temos phone
    // (mesmo approach do extractPhoneNumber - resolver LID primeiro)
    // ============================================================
    if (isLid && !phone) {
      try {
        const resolvedPhone = await this.resolveLidToPhone(sessionName, chatId);
        if (resolvedPhone) {
          phone = resolvedPhone;
          result.phone = resolvedPhone;
        }
      } catch {
        // silenciar
      }
    }

    // Helper: extrair foto de um objeto contato (7 campos possíveis)
    const extractPhoto = (contact: Record<string, unknown>): string | null => {
      const url = (contact.profilePictureURL || contact.profilePictureUrl ||
                   contact.profilePicture || contact.picture ||
                   contact.avatar || contact.profilePicThumb ||
                   contact.imgUrl) as string | undefined;
      return (url && url.length > 10) ? url : null;
    };

    // Helper: buscar foto via profile-picture endpoint
    const fetchProfilePicture = async (contactId: string): Promise<string | null> => {
      try {
        const resp = await this.request<{ profilePictureURL?: string; url?: string }>(
          `/api/contacts/profile-picture?session=${sessionName}&contactId=${encodeURIComponent(contactId)}`
        );
        const url = resp?.profilePictureURL || resp?.url;
        return (url && url.length > 10) ? url : null;
      } catch {
        return null;
      }
    };

    // Helper: buscar foto + dados via contacts endpoint
    const fetchContact = async (contactId: string): Promise<string | null> => {
      try {
        const contact = await this.getContact(sessionName, contactId);
        if (!result.name) {
          result.name = contact.name || contact.pushname || contact.shortName;
        }
        if (contact.number && !result.phone) {
          result.phone = contact.number;
        }
        return extractPhoto(contact as unknown as Record<string, unknown>);
      } catch {
        return null;
      }
    };

    // ============================================================
    // FASE 1: profile-picture com chatId original (@lid ou @c.us)
    // NÃO retorna early - continua buscando nome
    // ============================================================
    let photo = await fetchProfilePicture(chatId);
    if (photo) {
      result.picture = photo;
    }

    // ============================================================
    // FASE 2: Se temos phone, tentar com phone@s.whatsapp.net
    // (principal fonte para @lid - comprovado em testes)
    // ============================================================
    if (!result.picture && phone) {
      photo = await fetchProfilePicture(`${phone}@s.whatsapp.net`);
      if (photo) {
        result.picture = photo;
      }
    }

    // ============================================================
    // FASE 3: Se temos phone, tentar com phone@c.us
    // (formato alternativo usado por algumas versões do WAHA)
    // ============================================================
    if (!result.picture && phone) {
      photo = await fetchProfilePicture(`${phone}@c.us`);
      if (photo) {
        result.picture = photo;
      }
    }

    // ============================================================
    // FASE 4: GET /api/contacts com chatId original
    // (retorna profilePictureURL + nome + number)
    // ============================================================
    photo = await fetchContact(chatId);
    if (photo && !result.picture) {
      result.picture = photo;
    }
    // Se já temos foto E nome, podemos retornar
    if (result.picture && result.name) return result;

    // ============================================================
    // FASE 5: GET /api/contacts com phone@s.whatsapp.net
    // ============================================================
    if (phone && (!result.name || !result.picture)) {
      photo = await fetchContact(`${phone}@s.whatsapp.net`);
      if (photo && !result.picture) {
        result.picture = photo;
      }
    }
    if (result.picture && result.name) return result;

    // ============================================================
    // FASE 6: GET /api/contacts com phone@c.us
    // ============================================================
    if (phone && (!result.name || !result.picture)) {
      photo = await fetchContact(`${phone}@c.us`);
      if (photo && !result.picture) {
        result.picture = photo;
      }
    }
    if (result.picture && result.name) return result;

    // ============================================================
    // FASE 7: check-exists para resolver chatId real + buscar foto
    // (último recurso - resolve @lid para @c.us real e tenta foto)
    // ============================================================
    if (isLid && phone && !result.picture) {
      try {
        const exists = await this.checkNumberExists(sessionName, phone);
        if (exists.chatId && exists.chatId !== chatId) {
          photo = await fetchProfilePicture(exists.chatId);
          if (photo) {
            result.picture = photo;
          }
        }
      } catch {
        // silenciar
      }
    }

    // ============================================================
    // FASE 8: GET /api/{session}/chats/{chatId} (só @c.us, @lid dá 404)
    // ============================================================
    if (!isLid && (!result.picture || !result.name)) {
      try {
        const chatResponse = await this.request<{
          name?: string;
          picture?: string;
          profilePicture?: string;
          profilePicThumb?: string;
        }>(`/api/${sessionName}/chats/${encodeURIComponent(chatId)}`);

        if (!result.name && chatResponse?.name) {
          result.name = chatResponse.name;
        }

        const chatPhoto = chatResponse?.picture ||
                         chatResponse?.profilePicture ||
                         chatResponse?.profilePicThumb;

        if (!result.picture && chatPhoto && chatPhoto.length > 10) {
          result.picture = chatPhoto;
        }
      } catch {
        // silenciar
      }
    }

    return result;
  }

  /**
   * Obtém mensagens de um chat específico
   * GET /api/{session}/chats/{chatId}/messages
   * @param limit - Número máximo de mensagens (0 = sem limite para buscar todas)
   * @param downloadMedia - Se true, baixa o conteúdo de mídia (imagens, vídeos, etc)
   */
  async getMessages(
    sessionName: string,
    chatId: string,
    limit: number = 0, // 0 = sem limite, buscar TODAS as mensagens
    options?: { downloadMedia?: boolean; sortOrder?: 'asc' | 'desc' }
  ): Promise<unknown[]> {
    const params = new URLSearchParams();

    // Se limit > 0, adiciona o parâmetro. Se limit = 0, não adiciona (busca todas)
    if (limit > 0) {
      params.append('limit', limit.toString());
    }

    if (options?.downloadMedia !== undefined) {
      params.append('downloadMedia', options.downloadMedia.toString());
    }
    if (options?.sortOrder) {
      params.append('sortOrder', options.sortOrder);
    }

    const queryString = params.toString();
    return this.request<unknown[]>(
      `/api/${sessionName}/chats/${chatId}/messages${queryString ? '?' + queryString : ''}`
    );
  }

  // ============================================================
  // WEBHOOK CONFIGURATION
  // ============================================================

  /**
   * Configura webhook para uma sessão
   * PUT /api/sessions/{session}
   */
  async configureWebhook(
    sessionName: string,
    webhookUrl: string,
    events: string[] = [
      // Session
      'session.status',
      // Messages
      'message',
      'message.any',
      'message.reaction',
      'message.ack',
      'message.ack.group',
      'message.waiting',
      'message.revoked',
      'message.edited',
      // Chats
      'chat.archive',
      // Groups
      'group.v2.join',
      'group.v2.leave',
      'group.v2.update',
      'group.v2.participants',
      'group.join',
      'group.leave',
      // Presence
      'presence.update',
      // Polls
      'poll.vote',
      'poll.vote.failed',
      // Calls
      'call.received',
      'call.accepted',
      'call.rejected',
      // Labels
      'label.upsert',
      'label.deleted',
      'label.chat.added',
      'label.chat.deleted',
      // Events
      'event.response',
      'event.response.failed',
      'engine.event',
    ]
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.request<void>(`/api/sessions/${sessionName}`, {
        method: "PUT",
        body: JSON.stringify({
          config: {
            webhooks: [
              {
                url: webhookUrl,
                events: events,
                retries: {
                  delaySeconds: 2,
                  attempts: 3,
                },
              },
            ],
          },
        }),
      });

      return {
        success: true,
        message: `Webhook configurado para ${events.length} evento(s)`,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Erro ao configurar webhook",
      };
    }
  }

  /**
   * Obtém a configuração de webhook de uma sessão
   * GET /api/sessions/{session}
   */
  async getWebhookConfig(sessionName: string): Promise<{
    configured: boolean;
    webhooks: Array<{ url: string; events: string[] }>;
  }> {
    try {
      const session = await this.getSession(sessionName);
      const webhooks = (session as unknown as { config?: { webhooks?: Array<{ url: string; events: string[] }> } })?.config?.webhooks || [];

      return {
        configured: webhooks.length > 0,
        webhooks,
      };
    } catch {
      return {
        configured: false,
        webhooks: [],
      };
    }
  }

  // ============================================================
  // CHATS - Archive, Unarchive, Mark Unread
  // ============================================================

  /**
   * Arquiva um chat
   * POST /api/{session}/chats/{chatId}/archive
   */
  async archiveChat(sessionName: string, chatId: string): Promise<{ success: boolean }> {
    try {
      await this.request<void>(
        `/api/${sessionName}/chats/${encodeURIComponent(chatId)}/archive`,
        { method: "POST" }
      );
      return { success: true };
    } catch (error) {
      console.error("[WAHA] Erro ao arquivar chat:", error);
      return { success: false };
    }
  }

  /**
   * Desarquiva um chat
   * POST /api/{session}/chats/{chatId}/unarchive
   */
  async unarchiveChat(sessionName: string, chatId: string): Promise<{ success: boolean }> {
    try {
      await this.request<void>(
        `/api/${sessionName}/chats/${encodeURIComponent(chatId)}/unarchive`,
        { method: "POST" }
      );
      return { success: true };
    } catch (error) {
      console.error("[WAHA] Erro ao desarquivar chat:", error);
      return { success: false };
    }
  }

  /**
   * Marca um chat como não lido
   * POST /api/{session}/chats/{chatId}/unread
   */
  async markChatUnread(sessionName: string, chatId: string): Promise<{ success: boolean }> {
    try {
      await this.request<void>(
        `/api/${sessionName}/chats/${encodeURIComponent(chatId)}/unread`,
        { method: "POST" }
      );
      return { success: true };
    } catch (error) {
      console.error("[WAHA] Erro ao marcar chat como não lido:", error);
      return { success: false };
    }
  }

  // ============================================================
  // MESSAGES - Pin/Unpin
  // ============================================================

  /**
   * Fixa uma mensagem no chat
   * POST /api/{session}/chats/{chatId}/messages/{messageId}/pin
   */
  async pinMessage(
    sessionName: string,
    chatId: string,
    messageId: string,
    duration = 604800  // 7 dias em segundos (padrão)
  ): Promise<{ success: boolean }> {
    try {
      await this.request<void>(
        `/api/${sessionName}/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}/pin`,
        {
          method: "POST",
          body: JSON.stringify({ duration }),
        }
      );
      return { success: true };
    } catch (error) {
      console.error("[WAHA] Erro ao fixar mensagem:", error);
      return { success: false };
    }
  }

  /**
   * Remove a fixação de uma mensagem
   * DELETE /api/{session}/chats/{chatId}/messages/{messageId}/pin
   */
  async unpinMessage(
    sessionName: string,
    chatId: string,
    messageId: string
  ): Promise<{ success: boolean }> {
    try {
      await this.request<void>(
        `/api/${sessionName}/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}/pin`,
        { method: "DELETE" }
      );
      return { success: true };
    } catch (error) {
      console.error("[WAHA] Erro ao desafixar mensagem:", error);
      return { success: false };
    }
  }

  // ============================================================
  // SESSION PROFILE
  // ============================================================

  /**
   * Obtém o perfil da própria sessão (número, nome, foto)
   * GET /api/{session}/profile
   */
  async getSessionProfile(sessionName: string): Promise<{
    id?: string;
    name?: string;
    pushname?: string;
    profilePictureURL?: string;
    status?: string;
  }> {
    try {
      return await this.request<any>(`/api/${sessionName}/profile`);
    } catch (error) {
      console.warn("[WAHA] Erro ao buscar perfil da sessão:", error);
      return {};
    }
  }

  /**
   * Atualiza o nome de exibição da sessão
   * PUT /api/{session}/profile/name
   */
  async setSessionProfileName(sessionName: string, name: string): Promise<{ success: boolean }> {
    try {
      await this.request<void>(`/api/${sessionName}/profile/name`, {
        method: "PUT",
        body: JSON.stringify({ name }),
      });
      return { success: true };
    } catch (error) {
      console.error("[WAHA] Erro ao atualizar nome do perfil:", error);
      return { success: false };
    }
  }

  /**
   * Atualiza o status da sessão
   * PUT /api/{session}/profile/status
   */
  async setSessionProfileStatus(sessionName: string, status: string): Promise<{ success: boolean }> {
    try {
      await this.request<void>(`/api/${sessionName}/profile/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      return { success: true };
    } catch (error) {
      console.error("[WAHA] Erro ao atualizar status do perfil:", error);
      return { success: false };
    }
  }

  // ============================================================
  // CONTACTS - List All
  // ============================================================

  /**
   * Lista todos os contatos
   * GET /api/contacts/all?session={session}&limit={limit}&offset={offset}
   */
  async getAllContacts(
    sessionName: string,
    limit = 100,
    offset = 0
  ): Promise<Array<{
    id: string;
    name?: string;
    number?: string;
    pushname?: string;
    isMe?: boolean;
    isGroup?: boolean;
    isBusiness?: boolean;
    profilePictureURL?: string;
  }>> {
    try {
      const result = await this.request<any>(
        `/api/contacts/all?session=${sessionName}&limit=${limit}&offset=${offset}`
      );
      return Array.isArray(result) ? result : (result?.contacts || []);
    } catch (error) {
      console.error("[WAHA] Erro ao listar contatos:", error);
      return [];
    }
  }

  // ============================================================
  // LABELS
  // ============================================================

  /**
   * Lista todas as labels disponíveis na sessão
   * GET /api/{session}/labels
   */
  async getSessionLabels(sessionName: string): Promise<Array<{
    id: string;
    name: string;
    color?: number;
    colorHex?: string;
    predefined?: boolean;
  }>> {
    try {
      const result = await this.request<any>(`/api/${sessionName}/labels`);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error("[WAHA] Erro ao buscar labels da sessão:", error);
      return [];
    }
  }

  /**
   * Cria uma nova label na sessão WAHA
   * POST /api/{session}/labels
   */
  async createSessionLabel(
    sessionName: string,
    name: string,
    color?: number
  ): Promise<{ id: string; name: string } | null> {
    try {
      const body: Record<string, unknown> = { name };
      if (color !== undefined) body.color = color;
      return await this.request<{ id: string; name: string }>(`/api/${sessionName}/labels`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    } catch (error) {
      console.error("[WAHA] Erro ao criar label:", error);
      return null;
    }
  }

  /**
   * Remove uma label da sessão WAHA
   * DELETE /api/{session}/labels/{labelId}
   */
  async deleteSessionLabel(sessionName: string, labelId: string): Promise<{ success: boolean }> {
    try {
      await this.request<void>(`/api/${sessionName}/labels/${labelId}`, { method: "DELETE" });
      return { success: true };
    } catch (error) {
      console.error("[WAHA] Erro ao deletar label:", error);
      return { success: false };
    }
  }

  /**
   * Obtém as labels de um chat específico
   * GET /api/{session}/labels/chats/{chatId}/
   */
  async getLabelsForChat(sessionName: string, chatId: string): Promise<Array<{
    id: string;
    name: string;
    color?: number;
    colorHex?: string;
  }>> {
    try {
      const result = await this.request<any>(
        `/api/${sessionName}/labels/chats/${encodeURIComponent(chatId)}/`
      );
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error("[WAHA] Erro ao buscar labels do chat:", error);
      return [];
    }
  }

  /**
   * Atribui labels a um chat (substitui todas as labels existentes)
   * PUT /api/{session}/labels/chats/{chatId}/
   * O WAHA espera um array de IDs de labels (os IDs numéricos do WhatsApp)
   */
  async assignLabelsToChat(
    sessionName: string,
    chatId: string,
    labelIds: string[]
  ): Promise<{ success: boolean }> {
    try {
      await this.request<void>(
        `/api/${sessionName}/labels/chats/${encodeURIComponent(chatId)}/`,
        {
          method: "PUT",
          body: JSON.stringify(labelIds),
        }
      );
      return { success: true };
    } catch (error) {
      console.error("[WAHA] Erro ao atribuir labels ao chat:", error);
      return { success: false };
    }
  }

  /**
   * Obtém todos os chats com uma label específica
   * GET /api/{session}/labels/{labelId}/chats
   */
  async getChatsWithLabel(sessionName: string, labelId: string): Promise<Array<{
    id: string;
    name?: string;
    lastMessage?: Record<string, unknown>;
  }>> {
    try {
      const result = await this.request<any>(
        `/api/${sessionName}/labels/${labelId}/chats`
      );
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error("[WAHA] Erro ao buscar chats com label:", error);
      return [];
    }
  }

  // ============================================================
  // REACTIONS - Star/unstar messages
  // ============================================================

  /**
   * Envia uma reação (emoji) a uma mensagem
   * PUT /api/{session}/reaction
   */
  async sendReaction(
    sessionName: string,
    messageId: string,
    reaction: string
  ): Promise<{ success: boolean }> {
    try {
      await this.request<void>(`/api/${sessionName}/reaction`, {
        method: "PUT",
        body: JSON.stringify({ messageId, reaction }),
      });
      return { success: true };
    } catch (error) {
      console.error("[WAHA] Erro ao enviar reação:", error);
      return { success: false };
    }
  }

  /**
   * Remove webhook de uma sessão
   */
  async removeWebhook(sessionName: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.request<void>(`/api/sessions/${sessionName}`, {
        method: "PUT",
        body: JSON.stringify({
          config: {
            webhooks: [],
          },
        }),
      });

      return {
        success: true,
        message: "Webhook removido com sucesso",
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Erro ao remover webhook",
      };
    }
  }

  // ============================================================
  // OBSERVABILIDADE
  // ============================================================

  /**
   * Verifica status de saúde do servidor WAHA
   * GET /health
   */
  async getServerHealth(): Promise<{ ok: boolean; status?: string; version?: string }> {
    try {
      const data = await this.request<{ status?: string; version?: string }>('/health');
      return { ok: true, ...data };
    } catch {
      return { ok: false };
    }
  }

  /**
   * Faz ping no servidor WAHA
   * GET /ping
   */
  async pingServer(): Promise<boolean> {
    try {
      await this.request<void>('/ping');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtém versão e informações do servidor WAHA
   * GET /api/server/version
   */
  async getServerVersion(): Promise<{ version?: string; engine?: string; timestamp?: string } | null> {
    try {
      return await this.request<{ version?: string; engine?: string; timestamp?: string }>('/api/server/version');
    } catch {
      return null;
    }
  }

  // ============================================================
  // POLL VOTE (requer WAHA Plus ou GOWS)
  // ============================================================

  /**
   * Vota em uma enquete via WhatsApp
   * POST /api/sendPollVote
   * Nota: Requer WAHA Plus ou GOWS engine
   */
  async sendPollVote(
    sessionName: string,
    chatId: string,
    pollMessageId: string,
    selectedOptions: string[]
  ): Promise<{ success: boolean }> {
    try {
      await this.request<void>('/api/sendPollVote', {
        method: 'POST',
        body: JSON.stringify({ session: sessionName, chatId, pollMessageId, selectedOptions }),
      });
      return { success: true };
    } catch (error) {
      console.warn('[WAHA] sendPollVote requer WAHA Plus ou GOWS engine:', error);
      return { success: false };
    }
  }
}

// Exporta instância singleton
export const wahaApi = new WahaApiService();
