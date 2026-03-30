// Rate Limiter para chamadas WAHA API
// Evita sobrecarga do servidor e erros 429 (Too Many Requests)

interface RateLimitConfig {
  maxRequests: number;      // Número máximo de requests
  windowMs: number;         // Janela de tempo em millisegundos
  minDelayMs?: number;      // Delay mínimo entre requests
}

interface RequestRecord {
  timestamp: number;
  endpoint: string;
}

class RateLimiter {
  private requests: RequestRecord[] = [];
  private config: RateLimitConfig;
  private lastRequestTime: number = 0;

  constructor(config: RateLimitConfig) {
    this.config = {
      ...config,
      minDelayMs: config.minDelayMs ?? 100, // 100ms entre requests por padrão
    };
  }

  /**
   * Limpa requests antigos fora da janela de tempo
   */
  private cleanOldRequests(): void {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    this.requests = this.requests.filter(r => r.timestamp > windowStart);
  }

  /**
   * Verifica se pode fazer um request agora
   */
  canRequest(): boolean {
    this.cleanOldRequests();
    return this.requests.length < this.config.maxRequests;
  }

  /**
   * Verifica limite e registra o request se permitido
   * Alias para compatibilidade com FormularioPublico
   */
  checkLimit(identifier: string = ''): boolean {
    if (this.canRequest()) {
      this.recordRequest(identifier);
      return true;
    }
    return false;
  }

  /**
   * Retorna quantos requests ainda podem ser feitos na janela atual
   */
  remainingRequests(): number {
    this.cleanOldRequests();
    return Math.max(0, this.config.maxRequests - this.requests.length);
  }

  /**
   * Retorna tempo em ms até poder fazer o próximo request
   */
  timeUntilNextRequest(): number {
    if (this.canRequest()) {
      // Verificar delay mínimo entre requests
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      const minDelay = this.config.minDelayMs || 0;
      if (timeSinceLastRequest < minDelay) {
        return minDelay - timeSinceLastRequest;
      }
      return 0;
    }

    // Encontrar o request mais antigo que sairá da janela primeiro
    this.cleanOldRequests();
    if (this.requests.length === 0) return 0;

    const oldestRequest = this.requests[0];
    const timeUntilExpiry = (oldestRequest.timestamp + this.config.windowMs) - Date.now();
    return Math.max(0, timeUntilExpiry);
  }

  /**
   * Registra um request feito
   */
  recordRequest(endpoint: string = ''): void {
    this.cleanOldRequests();
    this.requests.push({
      timestamp: Date.now(),
      endpoint,
    });
    this.lastRequestTime = Date.now();
  }

  /**
   * Aguarda até poder fazer o próximo request
   */
  async waitForSlot(): Promise<void> {
    const waitTime = this.timeUntilNextRequest();
    if (waitTime > 0) {
      console.log(`[RateLimiter] Aguardando ${waitTime}ms antes do próximo request...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Executa uma função com rate limiting
   * Aguarda se necessário antes de executar
   */
  async execute<T>(fn: () => Promise<T>, endpoint: string = ''): Promise<T> {
    await this.waitForSlot();
    this.recordRequest(endpoint);
    return fn();
  }

  /**
   * Reseta o rate limiter
   */
  reset(): void {
    this.requests = [];
    this.lastRequestTime = 0;
  }

  /**
   * Retorna estatísticas do rate limiter
   */
  getStats(): {
    currentRequests: number;
    maxRequests: number;
    remainingRequests: number;
    windowMs: number;
    timeUntilNextSlot: number;
  } {
    this.cleanOldRequests();
    return {
      currentRequests: this.requests.length,
      maxRequests: this.config.maxRequests,
      remainingRequests: this.remainingRequests(),
      windowMs: this.config.windowMs,
      timeUntilNextSlot: this.timeUntilNextRequest(),
    };
  }
}

// Rate Limiter padrão para WAHA API
// Configuração: 100 requests por minuto com 600ms entre cada
export const wahaRateLimiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minuto
  minDelayMs: 600,     // 600ms entre requests
});

// Rate Limiter para operações de envio de mensagens (mais restritivo)
// 20 mensagens por minuto com 200ms entre cada
export const wahaMessageRateLimiter = new RateLimiter({
  maxRequests: 20,
  windowMs: 60 * 1000, // 1 minuto
  minDelayMs: 200,     // 200ms entre mensagens
});

// Rate Limiter para sync em background (menos restritivo)
// 60 requests por minuto com 50ms entre cada
export const wahaSyncRateLimiter = new RateLimiter({
  maxRequests: 60,
  windowMs: 60 * 1000, // 1 minuto
  minDelayMs: 50,      // 50ms entre requests
});

// Rate Limiter para submissões de formulário (anti-spam)
// 5 submissões por minuto por IP
export const formSubmissionRateLimiter = new RateLimiter({
  maxRequests: 5,
  windowMs: 60 * 1000, // 1 minuto
  minDelayMs: 100,     // 100ms entre submissões
});

export { RateLimiter };
export type { RateLimitConfig };
