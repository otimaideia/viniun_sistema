export interface MTPropertyClient {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  lead_id: string | null;
  legacy_id: number | null;
  nome: string;
  email: string | null;
  telefone: string | null;
  telefone2: string | null;
  celular: string | null;
  cpf_cnpj: string | null;
  rg_inscricao_estadual: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  cep: string | null;
  location_id: string | null;
  bairro: string | null;
  tipo_cadastro: string | null;
  grupo: string | null;
  como_conheceu_id: string | null;
  receber_email: boolean;
  status: string;
  observacao: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MTClientTicket {
  id: string;
  tenant_id: string;
  client_id: string;
  user_id: string | null;
  property_id: string | null;
  assunto: string | null;
  mensagem: string | null;
  status: 'aberto' | 'em_atendimento' | 'fechado';
  created_at: string;
  updated_at: string;
}

export interface MTClientSource {
  id: string;
  tenant_id: string;
  codigo: string;
  nome: string;
  is_active: boolean;
  created_at: string;
}
