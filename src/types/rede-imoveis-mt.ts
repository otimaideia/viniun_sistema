// =============================================================================
// TIPOS - Rede Colaborativa de Imoveis (Tabelas Compartilhadas)
// =============================================================================

// --- Tabela de Rede (coleção de imóveis compartilhada) ---

export type NetworkTableTipo = 'venda' | 'locacao' | 'temporada' | 'lancamento' | 'misto';
export type NetworkTableVisibilidade = 'publica' | 'parceiros' | 'privada';
export type NetworkTableStatus = 'rascunho' | 'ativa' | 'pausada' | 'encerrada';
export type ComissaoTipo = 'percentual' | 'fixo';

export interface MTNetworkTable {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  nome: string;
  descricao: string | null;
  tipo: NetworkTableTipo;
  visibilidade: NetworkTableVisibilidade;
  comissao_percentual: number;
  comissao_tipo: ComissaoTipo;
  comissao_valor_fixo: number | null;
  regras_comissao: Record<string, unknown>;
  total_imoveis: number;
  total_visualizacoes: number;
  total_interesses: number;
  validade_inicio: string | null;
  validade_fim: string | null;
  is_active: boolean;
  status: NetworkTableStatus;
  foto_capa_url: string | null;
  tags: string[] | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joins
  tenant?: { slug: string; nome_fantasia: string };
}

export type MTNetworkTableCreate = Pick<MTNetworkTable,
  'nome' | 'tipo' | 'visibilidade' | 'comissao_percentual' | 'comissao_tipo'
> & Partial<Pick<MTNetworkTable,
  'descricao' | 'comissao_valor_fixo' | 'regras_comissao' | 'validade_inicio' | 'validade_fim' | 'foto_capa_url' | 'tags' | 'status'
>>;

// --- Item da Tabela (imóvel vinculado) ---

export interface MTNetworkTableItem {
  id: string;
  tenant_id: string;
  table_id: string;
  property_id: string;
  valor_rede: number | null;
  valor_comissao: number | null;
  comissao_percentual: number | null;
  observacoes: string | null;
  destaque: boolean;
  ordem: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joins
  property?: {
    id: string;
    titulo: string;
    ref_code: string;
    foto_destaque_url: string | null;
    valor_venda: number | null;
    valor_locacao: number | null;
    dormitorios: number | null;
    area_construida: number | null;
    situacao: string;
    tenant?: { slug: string; nome_fantasia: string };
  };
}

// --- Parceria entre Tenants ---

export type PartnershipTipo = 'bilateral' | 'unilateral';
export type PartnershipStatus = 'pendente' | 'ativa' | 'suspensa' | 'recusada' | 'encerrada';

export interface MTNetworkPartnership {
  id: string;
  tenant_origin_id: string;
  tenant_partner_id: string;
  tipo: PartnershipTipo;
  status: PartnershipStatus;
  comissao_padrao: number;
  termos: string | null;
  metadata: Record<string, unknown>;
  approved_at: string | null;
  approved_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joins
  tenant_origin?: { slug: string; nome_fantasia: string };
  tenant_partner?: { slug: string; nome_fantasia: string };
}

// --- Interesse em imóvel da rede ---

export type InterestTipo = 'consulta' | 'proposta' | 'reserva' | 'visita';
export type InterestStatus = 'novo' | 'em_contato' | 'negociando' | 'aceito' | 'recusado' | 'cancelado';

export interface MTNetworkInterest {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  table_id: string | null;
  table_item_id: string | null;
  property_id: string;
  tipo: InterestTipo;
  status: InterestStatus;
  valor_proposta: number | null;
  observacoes: string | null;
  contato_nome: string | null;
  contato_telefone: string | null;
  contato_email: string | null;
  user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joins
  tenant?: { slug: string; nome_fantasia: string };
  property?: { id: string; titulo: string; ref_code: string; foto_destaque_url: string | null };
}

// --- Transação concluída via rede ---

export type TransactionStatus = 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';

export interface MTNetworkTransaction {
  id: string;
  interest_id: string | null;
  property_id: string;
  table_id: string | null;
  tenant_owner_id: string;
  tenant_seller_id: string;
  valor_venda: number;
  comissao_total: number | null;
  comissao_owner: number | null;
  comissao_seller: number | null;
  status: TransactionStatus;
  data_fechamento: string | null;
  observacoes: string | null;
  documentos: unknown[];
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  tenant_owner?: { slug: string; nome_fantasia: string };
  tenant_seller?: { slug: string; nome_fantasia: string };
  property?: { id: string; titulo: string; ref_code: string };
}

// --- Filtros ---

export interface NetworkTableFilters {
  search?: string;
  tipo?: NetworkTableTipo;
  visibilidade?: NetworkTableVisibilidade;
  status?: NetworkTableStatus;
  tenantId?: string;
}

export interface NetworkInterestFilters {
  tipo?: InterestTipo;
  status?: InterestStatus;
  propertyId?: string;
  tableId?: string;
}
