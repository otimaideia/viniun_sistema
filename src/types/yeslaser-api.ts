// =============================================
// TIPOS PARA INTEGRAÇÃO COM API YESLASER OFFICE
// API: https://apiaberta.yeslaseroffice.com.br
// =============================================

// ============ UNIDADES ============
export interface YeslaserUnidade {
  Id: number;
  Modelo: string;
  Nome: string;
  NumeroInauguracao: number;
  DataInauguracao: string;
  RazaoSocial: string;
  Cnpj: string;
  Endereco: string;
  Cidade: string;
  Ibge: number;
  Latitude: string;
  Longitude: string;
  EmailClinica: string;
  WebMail: string;
  Telefone: string;
  Celular: string;
  CelularFinanceiro: string;
  Socio: string;
  CelularSocio: string;
  DiretorClinica: string;
  Administrador: string;
  Consultor: string;
  Cep: string;
  DistanciaKm: number;
}

// ============ AGENDAMENTO ============
export interface YeslaserAgendamentoRequest {
  IdUnidade: string;
  Data: string; // formato dd-MM-yyyy
  Horario: string; // formato HH:mm
  IdLead: number;
  Observacao?: string;
}

export interface YeslaserAgendamentoResponse {
  success: boolean;
  message?: string;
  data?: any;
}

// ============ LEAD ============
export interface YeslaserLeadRequest {
  IdUnidade: number;
  IdAgenciaMkt: number;
  Nome: string;
  Telefone: string;
  Email: string;
  Campanha?: string;
  Origem?: string;
  Observacao?: string;
}

export interface YeslaserLeadResponse {
  Id: number;
  success: boolean;
  message?: string;
}

// ============ AGÊNCIAS ============
export interface YeslaserAgencia {
  Id: number;
  Nome: string;
}

// ============ CONFIG DA API (Aplicação) ============
export interface YeslaserApiConfig {
  usuario: string;
  senha: string;
  baseUrl: string;
  agenciaId?: number;
  enabled: boolean;
}

// ============ CONFIG DA API (Tabela mt_api_config) ============
export interface YeslaserApiConfigRow {
  id: string;
  usuario: string;
  senha: string;
  agencia_id: number | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface YeslaserAuthRequest {
  Usuario: string;
  Senha: string;
}

export const YESLASER_API_BASE_URL = "https://apiaberta.yeslaseroffice.com.br";

export const YESLASER_API_ENDPOINTS = {
  unidades: "/v1/unidades",
  horariosDisponiveis: (idUnidade: number, data: string) => 
    `/v1/unidades/${idUnidade}/horarios-disponiveis?data=${data}`,
  agendamentos: "/v1/agendamentos",
  agencias: "/v1/agencias",
  leads: "/v1/leads",
} as const;
