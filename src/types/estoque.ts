// Tipos para o módulo de Estoque & Inventário

// === ENUMS ===

export type ProductCategory =
  | 'injetavel'
  | 'descartavel'
  | 'cosmetico'
  | 'equipamento'
  | 'medicamento'
  | 'material';

export type UnitType =
  | 'UI'
  | 'ml'
  | 'unidade'
  | 'par'
  | 'cx'
  | 'frasco';

export type MovementType =
  | 'entrada'
  | 'saida'
  | 'ajuste'
  | 'perda'
  | 'transferencia';

export type AlertType =
  | 'estoque_baixo'
  | 'vencimento_proximo'
  | 'divergencia'
  | 'vencido';

export type AlertSeverity = 'baixa' | 'media' | 'alta' | 'critica';

// === LABELS ===

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  injetavel: 'Injetável',
  descartavel: 'Descartável',
  cosmetico: 'Cosmético',
  equipamento: 'Equipamento',
  medicamento: 'Medicamento',
  material: 'Material',
};

export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  UI: 'UI (Unidades Internacionais)',
  ml: 'ml (Mililitros)',
  unidade: 'Unidade',
  par: 'Par',
  cx: 'Caixa',
  frasco: 'Frasco',
};

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  entrada: 'Entrada',
  saida: 'Saída',
  ajuste: 'Ajuste',
  perda: 'Perda',
  transferencia: 'Transferência',
};

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  estoque_baixo: 'Estoque Baixo',
  vencimento_proximo: 'Vencimento Próximo',
  divergencia: 'Divergência',
  vencido: 'Vencido',
};

// === INTERFACES ===

export interface InventoryProduct {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  codigo: string | null;
  nome: string;
  descricao: string | null;
  categoria: ProductCategory;
  unidade_medida: UnitType;
  is_fracionado: boolean;
  quantidade_total_unidade: number | null;
  doses_por_unidade: number | null;
  dose_padrao: number | null;
  custo_pix: number | null;
  custo_cartao: number | null;
  custo_unitario_fracionado: number | null;
  estoque_minimo: number;
  marca: string | null;
  fabricante: string | null;
  registro_anvisa: string | null;
  imagem_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
}

export interface InventoryProductCreate {
  codigo?: string;
  nome: string;
  descricao?: string;
  categoria: ProductCategory;
  unidade_medida: UnitType;
  is_fracionado?: boolean;
  quantidade_total_unidade?: number;
  doses_por_unidade?: number;
  dose_padrao?: number;
  custo_pix?: number;
  custo_cartao?: number;
  estoque_minimo?: number;
  marca?: string;
  fabricante?: string;
  registro_anvisa?: string;
  imagem_url?: string;
  franchise_id?: string;
}

export interface InventoryProductUpdate extends Partial<InventoryProductCreate> {
  id: string;
  is_active?: boolean;
}

export interface InventoryProductFilters {
  categoria?: ProductCategory;
  is_fracionado?: boolean;
  is_active?: boolean;
  search?: string;
  franchise_id?: string;
}

export interface InventorySupplier {
  id: string;
  tenant_id: string;
  razao_social: string | null;
  nome_fantasia: string;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  contato_nome: string | null;
  endereco: string | null;
  condicoes_pagamento: string | null;
  observacoes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface InventorySupplierCreate {
  nome_fantasia: string;
  razao_social?: string;
  cnpj?: string;
  telefone?: string;
  email?: string;
  contato_nome?: string;
  endereco?: string;
  condicoes_pagamento?: string;
  observacoes?: string;
}

export interface InventoryStock {
  id: string;
  tenant_id: string;
  franchise_id: string;
  product_id: string;
  lote: string | null;
  data_validade: string | null;
  quantidade_atual: number;
  quantidade_inicial: number;
  custo_unitario: number;
  fornecedor_id: string | null;
  nota_fiscal: string | null;
  data_entrada: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  // JOINs
  product?: InventoryProduct;
  supplier?: InventorySupplier;
}

export interface InventoryStockCreate {
  franchise_id: string;
  product_id: string;
  lote?: string;
  data_validade?: string;
  quantidade_inicial: number;
  custo_unitario: number;
  fornecedor_id?: string;
  nota_fiscal?: string;
  data_entrada?: string;
  observacoes?: string;
}

export interface InventoryMovement {
  id: string;
  tenant_id: string;
  franchise_id: string;
  stock_id: string | null;
  product_id: string;
  tipo: MovementType;
  quantidade: number;
  custo_unitario: number | null;
  custo_total: number | null;
  motivo: string | null;
  appointment_id: string | null;
  sale_id: string | null;
  consumption_id: string | null;
  transfer_franchise_id: string | null;
  responsavel_id: string | null;
  created_at: string;
  // JOINs
  product?: InventoryProduct;
}

export interface InventoryMovementCreate {
  franchise_id: string;
  stock_id?: string;
  product_id: string;
  tipo: MovementType;
  quantidade: number;
  custo_unitario?: number;
  custo_total?: number;
  motivo?: string;
  appointment_id?: string;
  sale_id?: string;
  consumption_id?: string;
  transfer_franchise_id?: string;
}

export interface ServiceProduct {
  id: string;
  tenant_id: string;
  service_id: string;
  product_id: string;
  quantidade: number;
  is_obrigatorio: boolean;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  // JOINs
  product?: InventoryProduct;
  service?: { id: string; nome: string };
}

export interface ServiceProductCreate {
  service_id: string;
  product_id: string;
  quantidade: number;
  is_obrigatorio?: boolean;
  observacoes?: string;
}

export interface ProcedureConsumption {
  id: string;
  tenant_id: string;
  franchise_id: string;
  appointment_id: string;
  product_id: string;
  stock_id: string | null;
  quantidade: number;
  custo_unitario: number | null;
  custo_total: number | null;
  profissional_id: string | null;
  observacoes: string | null;
  created_at: string;
  // JOINs
  product?: InventoryProduct;
}

export interface ProcedureConsumptionCreate {
  franchise_id: string;
  appointment_id: string;
  product_id: string;
  stock_id?: string;
  quantidade: number;
  custo_unitario?: number;
  custo_total?: number;
  profissional_id?: string;
  observacoes?: string;
}

export interface InventoryAlert {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  product_id: string | null;
  tipo: AlertType;
  titulo: string;
  descricao: string | null;
  severidade: AlertSeverity;
  dados: Record<string, any> | null;
  lido: boolean;
  resolvido: boolean;
  resolvido_em: string | null;
  resolvido_por: string | null;
  created_at: string;
  // JOINs
  product?: InventoryProduct;
}

// === FICHA TECNICA ===

export interface FichaTecnicaItem extends ServiceProduct {
  custo_unitario_calc: number; // custo_unitario_fracionado || custo_pix || 0
  custo_total_linha: number;   // custo_unitario_calc * quantidade
}

export interface FichaTecnicaResumo {
  items: FichaTecnicaItem[];
  custo_total: number;
  margem_maior: number | null; // preco_tabela_maior - custo_total
  margem_menor: number | null; // preco_tabela_menor - custo_total
}

// === DASHBOARD ===

export interface EstoqueDashboardMetrics {
  valor_total_estoque: number;
  total_produtos: number;
  produtos_estoque_baixo: number;
  produtos_vencendo_30dias: number;
  produtos_vencidos: number;
  alertas_pendentes: number;
  movimentacoes_hoje: number;
  consumo_medio_mensal: number;
}

// === SUPPLIER PRICE COMPARISON ===

export interface SupplierPriceList {
  id: string;
  tenant_id: string;
  supplier_id: string;
  descricao: string | null;
  data_vigencia: string;
  data_validade: string | null;
  arquivo_url: string | null;
  arquivo_path: string | null;
  arquivo_tipo: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  // JOINs
  supplier?: InventorySupplier;
  prices?: SupplierPrice[];
  _count?: number;
}

export interface SupplierPriceListCreate {
  supplier_id: string;
  descricao?: string;
  data_vigencia: string;
  data_validade?: string;
  arquivo_url?: string;
  arquivo_path?: string;
  arquivo_tipo?: string;
  observacoes?: string;
}

export interface SupplierPrice {
  id: string;
  tenant_id: string;
  price_list_id: string;
  supplier_id: string;
  product_id: string | null;
  nome_produto_fornecedor: string;
  preco_unitario: number;
  unidade_medida: string | null;
  is_mapped: boolean;
  created_at: string;
  updated_at: string;
  // JOINs
  product?: InventoryProduct;
  supplier?: InventorySupplier;
  price_list?: SupplierPriceList;
}

export interface SupplierPriceCreate {
  price_list_id: string;
  supplier_id: string;
  product_id?: string;
  nome_produto_fornecedor: string;
  preco_unitario: number;
  unidade_medida?: string;
  is_mapped?: boolean;
}

export interface PriceComparisonRow {
  product: InventoryProduct;
  prices: {
    supplier_id: string;
    supplier_name: string;
    preco_unitario: number;
    data_vigencia: string;
    price_list_id: string;
  }[];
  best_price: number | null;
  worst_price: number | null;
}

export interface PriceHistoryPoint {
  data_vigencia: string;
  supplier_id: string;
  supplier_name: string;
  preco_unitario: number;
}
