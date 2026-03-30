import { LeadStatus } from "./lead";

export interface PromocaoCadastro {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  genero: string | null;
  data_nascimento: string | null;
  cep: string | null;
  aceita_contato: boolean | null;
  unidade: string | null;
  status: LeadStatus | null;
  quantidade_indicacoes: number | null;
  // Campos adicionais do banco
  campanha: string | null;
  id_api: number | null;
  indicacoes_status: string | null;
  landing_page: string | null;
  last_action_timestamp: string | null;
  last_action_type: string | null;
  lead_id: string | null;
  origem: string | null;
  responsible_id: string | null;
  // UTM Parameters
  utm_campaign: string | null;
  utm_medium: string | null;
  utm_source: string | null;
  created_at: string;
  updated_at: string;
}

export interface PromocaoIndicacao {
  id: string;
  cadastro_id: string;
  nome: string;
  email: string;
  telefone: string;
  lead_id: string | null;
  unidade: string | null;
  created_at: string;
  // Join com cadastro (para exibição)
  cadastro?: PromocaoCadastro;
}
