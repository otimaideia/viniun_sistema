export interface MTCaptador {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  user_id: string | null;
  legacy_id: number | null;
  nome: string;
  email: string | null;
  telefone: string | null;
  celular: string | null;
  foto_url: string | null;
  data_nascimento: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  cep: string | null;
  location_bairro_id: string | null;
  location_cidade_id: string | null;
  location_estado_id: string | null;
  creci: string | null;
  especialidade: string | null;
  comissao_percentual: number;
  total_imoveis_captados: number;
  total_imoveis_ativos: number;
  status: string;
  observacao: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MTCaptadorCreate {
  tenant_id?: string;
  franchise_id?: string;
  user_id?: string;
  nome: string;
  email?: string;
  telefone?: string;
  celular?: string;
  foto_url?: string;
  data_nascimento?: string;
  creci?: string;
  especialidade?: string;
  comissao_percentual?: number;
}

export interface MTCaptadorUpdate extends Partial<MTCaptadorCreate> {
  id: string;
}
