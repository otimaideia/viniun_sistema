export interface MTPropertyOwner {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  user_id: string | null;
  legacy_id: number | null;
  nome: string;
  email: string | null;
  telefone: string | null;
  telefone2: string | null;
  celular: string | null;
  cpf_cnpj: string | null;
  rg_inscricao_estadual: string | null;
  tipo_pessoa: 'PF' | 'PJ';
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  cep: string | null;
  location_id: string | null;
  bairro: string | null;
  status: string;
  observacao: string | null;
  total_imoveis: number;
  total_imoveis_ativos: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MTPropertyOwnerCreate {
  tenant_id?: string;
  franchise_id?: string;
  nome: string;
  email?: string;
  telefone?: string;
  telefone2?: string;
  celular?: string;
  cpf_cnpj?: string;
  rg_inscricao_estadual?: string;
  tipo_pessoa?: 'PF' | 'PJ';
  endereco?: string;
  numero?: string;
  complemento?: string;
  cep?: string;
  location_id?: string;
  bairro?: string;
  observacao?: string;
}

export interface MTPropertyOwnerUpdate extends Partial<MTPropertyOwnerCreate> {
  id: string;
}

export interface MTOwnerInvite {
  id: string;
  tenant_id: string;
  owner_id: string;
  token: string;
  email: string;
  expires_at: string;
  used_at: string | null;
  user_created_id: string | null;
  created_by: string | null;
  created_at: string;
}
