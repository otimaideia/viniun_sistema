// =====================================================
// SERVICE: Meta Cloud API (WhatsApp Business)
// =====================================================

import type { TemplateCategory, CostEstimate, META_COST_TABLE_BRL } from '@/types/whatsapp-hybrid';

const DEFAULT_API_VERSION = 'v21.0';
const GRAPH_API_BASE = 'https://graph.facebook.com';

// === TIPOS INTERNOS ===

interface MetaApiResponse<T = unknown> {
  data?: T;
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

interface SendMessageResponse {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string; message_status?: string }>;
}

interface TemplateResponse {
  data: Array<{
    name: string;
    id: string;
    status: string;
    category: string;
    language: string;
    quality_score?: { score: string };
    components: Array<{
      type: string;
      text?: string;
      format?: string;
      buttons?: Array<{ type: string; text: string; url?: string }>;
    }>;
  }>;
  paging?: { cursors: { before: string; after: string }; next?: string };
}

interface BusinessProfileResponse {
  data: Array<{
    about?: string;
    address?: string;
    description?: string;
    email?: string;
    profile_picture_url?: string;
    websites?: string[];
    vertical?: string;
  }>;
}

// === SERVICE CLASS ===

export class MetaCloudApiService {
  private phoneNumberId: string;
  private accessToken: string;
  private apiVersion: string;

  constructor(phoneNumberId: string, accessToken: string, apiVersion?: string) {
    this.phoneNumberId = phoneNumberId;
    this.accessToken = accessToken;
    this.apiVersion = apiVersion || DEFAULT_API_VERSION;
  }

  private get baseUrl(): string {
    return `${GRAPH_API_BASE}/${this.apiVersion}`;
  }

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    };

    if (body && method === 'POST') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json() as MetaApiResponse<T>;

    if (data.error) {
      throw new MetaApiError(
        data.error.message,
        data.error.code,
        data.error.type,
        data.error.error_subcode
      );
    }

    return data as T;
  }

  // === ENVIO DE MENSAGENS ===

  async sendText(to: string, text: string): Promise<SendMessageResponse> {
    return this.request<SendMessageResponse>(
      `/${this.phoneNumberId}/messages`,
      'POST',
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: true, body: text },
      }
    );
  }

  async sendTemplate(
    to: string,
    templateName: string,
    language: string = 'pt_BR',
    components?: Array<{
      type: 'header' | 'body' | 'button';
      parameters: Array<{
        type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video';
        text?: string;
        image?: { link: string };
      }>;
    }>
  ): Promise<SendMessageResponse> {
    const template: Record<string, unknown> = {
      name: templateName,
      language: { code: language },
    };

    if (components?.length) {
      template.components = components;
    }

    return this.request<SendMessageResponse>(
      `/${this.phoneNumberId}/messages`,
      'POST',
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'template',
        template,
      }
    );
  }

  async sendImage(to: string, imageUrl: string, caption?: string): Promise<SendMessageResponse> {
    return this.request<SendMessageResponse>(
      `/${this.phoneNumberId}/messages`,
      'POST',
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'image',
        image: { link: imageUrl, caption },
      }
    );
  }

  async sendDocument(to: string, documentUrl: string, filename: string, caption?: string): Promise<SendMessageResponse> {
    return this.request<SendMessageResponse>(
      `/${this.phoneNumberId}/messages`,
      'POST',
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'document',
        document: { link: documentUrl, caption, filename },
      }
    );
  }

  async sendVideo(to: string, videoUrl: string, caption?: string): Promise<SendMessageResponse> {
    return this.request<SendMessageResponse>(
      `/${this.phoneNumberId}/messages`,
      'POST',
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'video',
        video: { link: videoUrl, caption },
      }
    );
  }

  async sendAudio(to: string, audioUrl: string): Promise<SendMessageResponse> {
    return this.request<SendMessageResponse>(
      `/${this.phoneNumberId}/messages`,
      'POST',
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'audio',
        audio: { link: audioUrl },
      }
    );
  }

  async markAsRead(messageId: string): Promise<void> {
    await this.request(
      `/${this.phoneNumberId}/messages`,
      'POST',
      {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      }
    );
  }

  // === TEMPLATES ===

  async getTemplates(wabaId: string, limit: number = 100): Promise<TemplateResponse> {
    return this.request<TemplateResponse>(
      `/${wabaId}/message_templates?limit=${limit}`
    );
  }

  async getTemplateByName(wabaId: string, name: string): Promise<TemplateResponse> {
    return this.request<TemplateResponse>(
      `/${wabaId}/message_templates?name=${name}`
    );
  }

  // === BUSINESS PROFILE ===

  async getBusinessProfile(): Promise<BusinessProfileResponse> {
    return this.request<BusinessProfileResponse>(
      `/${this.phoneNumberId}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,websites,vertical`
    );
  }

  // === HEALTH CHECK ===

  async checkHealth(): Promise<{ healthy: boolean; details: Record<string, unknown> }> {
    try {
      const profile = await this.getBusinessProfile();
      return {
        healthy: true,
        details: {
          phone_number_id: this.phoneNumberId,
          has_profile: !!profile?.data?.length,
          checked_at: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          phone_number_id: this.phoneNumberId,
          error: error instanceof Error ? error.message : 'Unknown error',
          checked_at: new Date().toISOString(),
        },
      };
    }
  }

  // === ENVIO EM MASSA (para campanhas) ===

  async sendBulkTemplate(
    recipients: string[],
    templateName: string,
    language: string = 'pt_BR',
    getParamsForRecipient?: (phone: string) => Array<{
      type: 'header' | 'body';
      parameters: Array<{ type: 'text'; text: string }>;
    }>
  ): Promise<{
    total: number;
    success: number;
    failed: number;
    results: Array<{ phone: string; success: boolean; message_id?: string; error?: string }>;
  }> {
    const results: Array<{ phone: string; success: boolean; message_id?: string; error?: string }> = [];
    let success = 0;
    let failed = 0;

    // Rate limit: máx 80 msgs/segundo (Meta recomenda throttle)
    const BATCH_SIZE = 50;
    const DELAY_MS = 1000;

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);

      const promises = batch.map(async (phone) => {
        try {
          const components = getParamsForRecipient?.(phone);
          const response = await this.sendTemplate(phone, templateName, language, components);
          const messageId = response.messages?.[0]?.id;
          results.push({ phone, success: true, message_id: messageId });
          success++;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          results.push({ phone, success: false, error: errorMsg });
          failed++;
        }
      });

      await Promise.all(promises);

      // Pausa entre batches
      if (i + BATCH_SIZE < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    return { total: recipients.length, success, failed, results };
  }
}

// === ERROR CLASS ===

export class MetaApiError extends Error {
  code: number;
  type: string;
  subcode?: number;

  constructor(message: string, code: number, type: string, subcode?: number) {
    super(message);
    this.name = 'MetaApiError';
    this.code = code;
    this.type = type;
    this.subcode = subcode;
  }

  get isRateLimit(): boolean {
    return this.code === 4 || this.code === 80007;
  }

  get isAuthError(): boolean {
    return this.code === 190;
  }

  get isPermissionError(): boolean {
    return this.code === 10 || this.code === 200;
  }
}

// === FACTORY ===

export function createMetaCloudApi(
  phoneNumberId: string,
  accessToken: string,
  apiVersion?: string
): MetaCloudApiService {
  return new MetaCloudApiService(phoneNumberId, accessToken, apiVersion);
}
