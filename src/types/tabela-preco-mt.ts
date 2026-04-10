export interface MTPropertyPriceTable {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  nome: string;
  descricao: string | null;
  tipo: string;
  validade_inicio: string | null;
  validade_fim: string | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MTPriceItem {
  id: string;
  tenant_id: string;
  table_id: string;
  property_id: string;
  valor_tabela: number | null;
  valor_desconto: number | null;
  condicoes: Record<string, unknown>;
  created_at: string;
}

export interface MTPriceTableOwner {
  id: string;
  tenant_id: string;
  table_id: string;
  tipo_dono: string;
  dono_id: string | null;
  nome: string | null;
  created_at: string;
}
