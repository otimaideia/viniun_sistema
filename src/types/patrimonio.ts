// === ASSET STATUS ===

export type AssetStatus =
  | 'planning'
  | 'acquired'
  | 'in_operation'
  | 'maintenance'
  | 'retired'
  | 'disposed'
  | 'transferred';

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  planning: 'Planejado',
  acquired: 'Adquirido',
  in_operation: 'Em Operação',
  maintenance: 'Em Manutenção',
  retired: 'Desativado',
  disposed: 'Baixado',
  transferred: 'Transferido',
};

export const ASSET_STATUS_COLORS: Record<AssetStatus, string> = {
  planning: 'bg-gray-100 text-gray-800',
  acquired: 'bg-blue-100 text-blue-800',
  in_operation: 'bg-green-100 text-green-800',
  maintenance: 'bg-yellow-100 text-yellow-800',
  retired: 'bg-orange-100 text-orange-800',
  disposed: 'bg-red-100 text-red-800',
  transferred: 'bg-purple-100 text-purple-800',
};

// === DEPRECIATION METHOD ===

export type DepreciationMethod =
  | 'straight_line'
  | 'declining_balance'
  | 'sum_of_years'
  | 'units_of_production';

export const DEPRECIATION_METHOD_LABELS: Record<DepreciationMethod, string> = {
  straight_line: 'Linear',
  declining_balance: 'Saldo Decrescente',
  sum_of_years: 'Soma dos Dígitos',
  units_of_production: 'Unidades Produzidas',
};

// === MAINTENANCE TYPE ===

export type MaintenanceType = 'preventive' | 'corrective' | 'calibration' | 'inspection';

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  preventive: 'Preventiva',
  corrective: 'Corretiva',
  calibration: 'Calibração',
  inspection: 'Inspeção',
};

export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  scheduled: 'Agendada',
  in_progress: 'Em Andamento',
  completed: 'Concluída',
  cancelled: 'Cancelada',
};

export const MAINTENANCE_STATUS_COLORS: Record<MaintenanceStatus, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

// === INTERFACES ===

export interface MTAssetCategory {
  id: string;
  tenant_id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  icone: string | null;
  cor: string | null;
  depreciation_method: DepreciationMethod;
  default_useful_life_years: number | null;
  default_salvage_rate: number | null;
  ordem: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MTAsset {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  category_id: string | null;

  codigo: string;
  nome: string;
  descricao: string | null;
  numero_serie: string | null;
  marca: string | null;
  modelo: string | null;
  fornecedor: string | null;
  nota_fiscal: string | null;
  imagem_url: string | null;

  valor_aquisicao: number;
  valor_residual: number;
  moeda: string;
  data_aquisicao: string | null;
  data_inicio_uso: string | null;

  metodo_depreciacao: DepreciationMethod;
  vida_util_anos: number;
  vida_util_meses: number | null;
  unidades_total_esperadas: number | null;
  unidades_produzidas: number;
  taxa_depreciacao: number | null;

  depreciacao_acumulada: number;
  valor_contabil: number;

  status: AssetStatus;
  localizacao: string | null;
  responsavel: string | null;
  responsavel_id: string | null;

  data_baixa: string | null;
  motivo_baixa: string | null;
  valor_baixa: number | null;

  franchise_origem_id: string | null;
  data_transferencia: string | null;

  tags: string[] | null;
  observacoes: string | null;

  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;

  // Relations
  category?: MTAssetCategory;
  franchise?: { id: string; nome_fantasia: string };
  tenant?: { id: string; slug: string; nome_fantasia: string };
  responsavel_user?: {
    id: string;
    nome: string;
    email: string;
    cargo: string | null;
    departamento: string | null;
    avatar_url: string | null;
  } | null;
}

export interface MTAssetCreate {
  nome: string;
  codigo: string;
  tenant_id?: string;
  franchise_id?: string;
  category_id?: string;
  descricao?: string;
  numero_serie?: string;
  marca?: string;
  modelo?: string;
  fornecedor?: string;
  nota_fiscal?: string;
  imagem_url?: string;
  valor_aquisicao: number;
  valor_residual?: number;
  moeda?: string;
  data_aquisicao?: string;
  data_inicio_uso?: string;
  metodo_depreciacao?: DepreciationMethod;
  vida_util_anos?: number;
  vida_util_meses?: number;
  unidades_total_esperadas?: number;
  taxa_depreciacao?: number;
  status?: AssetStatus;
  localizacao?: string;
  responsavel?: string;
  responsavel_id?: string;
  tags?: string[];
  observacoes?: string;
}

export interface MTAssetUpdate extends Partial<MTAssetCreate> {
  id: string;
}

export interface MTAssetFilters {
  status?: AssetStatus;
  category_id?: string;
  franchise_id?: string;
  search?: string;
}

export interface MTAssetMaintenance {
  id: string;
  tenant_id: string;
  asset_id: string;
  tipo: MaintenanceType;
  descricao: string;
  fornecedor_servico: string | null;
  custo: number;
  data_agendada: string | null;
  data_realizada: string | null;
  proxima_manutencao: string | null;
  status: MaintenanceStatus;
  notas: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  // Relation
  asset?: { id: string; codigo: string; nome: string };
}

export interface MTAssetMaintenanceCreate {
  asset_id: string;
  tipo: MaintenanceType;
  descricao: string;
  fornecedor_servico?: string;
  custo?: number;
  data_agendada?: string;
  data_realizada?: string;
  proxima_manutencao?: string;
  status?: MaintenanceStatus;
  notas?: string;
}

export interface MTAssetMaintenanceUpdate extends Partial<MTAssetMaintenanceCreate> {
  id: string;
}

export interface MTAssetStatusHistory {
  id: string;
  tenant_id: string;
  asset_id: string;
  status_anterior: AssetStatus | null;
  status_novo: AssetStatus;
  motivo: string | null;
  franchise_anterior_id: string | null;
  franchise_nova_id: string | null;
  created_at: string;
  created_by: string | null;
}

// === DEPRECIATION CALCULATION TYPES ===

export interface DepreciationScheduleEntry {
  ano: number;
  depreciacao_periodo: number;
  depreciacao_acumulada: number;
  valor_contabil: number;
}

export interface AssetMetrics {
  total_ativos: number;
  valor_total_aquisicao: number;
  valor_total_contabil: number;
  depreciacao_total: number;
  por_status: Record<string, number>;
  por_categoria: { categoria: string; cor: string; quantidade: number; valor: number }[];
  proximas_manutencoes: number;
  ativos_totalmente_depreciados: number;
}
