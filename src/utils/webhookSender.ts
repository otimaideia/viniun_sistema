// Utilitario para envio de webhooks apos submissao de formulario
// Viniun Sistema

export interface WebhookConfig {
  url: string;
  headers?: Record<string, string>;
  retry?: boolean;
  maxRetries?: number;
}

export interface WebhookPayload {
  formulario_id: string;
  submissao_id: string;
  dados: Record<string, unknown>;
  created_at: string;
  metadata?: {
    ip_address?: string;
    user_agent?: string;
    referrer?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
  };
}

export interface WebhookResult {
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  error?: string;
  attempts: number;
}

/**
 * Envia um webhook com retry automatico
 */
export async function sendWebhook(
  config: WebhookConfig,
  payload: WebhookPayload
): Promise<WebhookResult> {
  const { url, headers = {}, retry = true, maxRetries = 3 } = config;

  let attempts = 0;
  let lastError: string | undefined;
  let lastStatusCode: number | undefined;
  let lastResponseBody: string | undefined;

  while (attempts < (retry ? maxRetries : 1)) {
    attempts++;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(payload),
      });

      lastStatusCode = response.status;

      try {
        lastResponseBody = await response.text();
      } catch {
        lastResponseBody = '';
      }

      if (response.ok) {
        return {
          success: true,
          statusCode: lastStatusCode,
          responseBody: lastResponseBody,
          attempts,
        };
      }

      lastError = `HTTP ${response.status}: ${response.statusText}`;

      // Se nao for erro de rate limit ou server error, nao faz retry
      if (response.status < 500 && response.status !== 429) {
        break;
      }

      // Espera exponencial antes do retry
      if (retry && attempts < maxRetries) {
        await delay(Math.pow(2, attempts) * 1000);
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Erro desconhecido';

      // Espera antes do retry em caso de erro de rede
      if (retry && attempts < maxRetries) {
        await delay(Math.pow(2, attempts) * 1000);
      }
    }
  }

  return {
    success: false,
    statusCode: lastStatusCode,
    responseBody: lastResponseBody,
    error: lastError,
    attempts,
  };
}

/**
 * Valida se uma URL de webhook e valida
 */
export function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Testa a conectividade de um webhook
 */
export async function testWebhook(url: string, headers?: Record<string, string>): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        test: true,
        timestamp: new Date().toISOString(),
        message: 'Teste de conectividade do webhook Viniun',
      }),
    });

    return response.ok || response.status === 400; // 400 pode significar que o webhook existe mas rejeitou o payload de teste
  } catch {
    return false;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
