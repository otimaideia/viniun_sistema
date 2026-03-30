// =============================================
// SERVIÇO DE INTEGRAÇÃO COM API YESLASER OFFICE
// =============================================

import {
  YeslaserUnidade,
  YeslaserAgendamentoRequest,
  YeslaserAgendamentoResponse,
  YeslaserLeadRequest,
  YeslaserLeadResponse,
  YeslaserAgencia,
  YESLASER_API_BASE_URL,
  YESLASER_API_ENDPOINTS,
} from "@/types/yeslaser-api";

class YeslaserApiService {
  private usuario: string | null = null;
  private senha: string | null = null;
  private baseUrl: string = YESLASER_API_BASE_URL;

  /**
   * Configura as credenciais para autenticação
   */
  setCredentials(usuario: string, senha: string) {
    this.usuario = usuario;
    this.senha = senha;
  }

  /**
   * Verifica se a API está configurada
   */
  isConfigured(): boolean {
    return !!this.usuario && !!this.senha;
  }

  /**
   * Gera o token de autenticação Basic Auth
   */
  private getAuthToken(): string {
    if (!this.usuario || !this.senha) {
      throw new Error("Credenciais não configuradas. Configure em Configurações > Integrações.");
    }
    return btoa(`${this.usuario}:${this.senha}`);
  }

  /**
   * Headers padrão para requisições
   */
  private getHeaders(): HeadersInit {
    return {
      "Authorization": `Basic ${this.getAuthToken()}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Listar todas as unidades
   */
  async listarUnidades(): Promise<YeslaserUnidade[]> {
    const response = await fetch(`${this.baseUrl}${YESLASER_API_ENDPOINTS.unidades}`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Erro ao listar unidades: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Listar horários disponíveis para uma unidade em uma data
   * @param idUnidade ID da unidade
   * @param data Data no formato dd-MM-yyyy
   */
  async listarHorariosDisponiveis(idUnidade: number, data: string): Promise<string[]> {
    const url = `${this.baseUrl}${YESLASER_API_ENDPOINTS.horariosDisponiveis(idUnidade, data)}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Erro ao listar horários: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Realizar um agendamento
   */
  async realizarAgendamento(agendamento: YeslaserAgendamentoRequest): Promise<YeslaserAgendamentoResponse> {
    const response = await fetch(`${this.baseUrl}${YESLASER_API_ENDPOINTS.agendamentos}`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(agendamento),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao realizar agendamento: ${response.status} - ${errorText}`);
    }

    return { success: true, data: await response.json() };
  }

  /**
   * Listar agências de marketing
   */
  async listarAgencias(): Promise<YeslaserAgencia[]> {
    const response = await fetch(`${this.baseUrl}${YESLASER_API_ENDPOINTS.agencias}`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Erro ao listar agências: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Cadastrar um lead na API
   */
  async cadastrarLead(lead: YeslaserLeadRequest): Promise<YeslaserLeadResponse> {
    const response = await fetch(`${this.baseUrl}${YESLASER_API_ENDPOINTS.leads}`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(lead),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao cadastrar lead: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return { ...data, success: true };
  }

  /**
   * Testar conexão com a API
   */
  async testarConexao(): Promise<{ success: boolean; message: string }> {
    try {
      const unidades = await this.listarUnidades();
      return {
        success: true,
        message: `Conexão bem sucedida! ${unidades.length} unidades encontradas.`,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  }
}

// Singleton para uso global
export const yeslaserApi = new YeslaserApiService();

// Export da classe para testes
export { YeslaserApiService };
