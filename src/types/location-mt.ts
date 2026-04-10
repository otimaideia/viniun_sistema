export type LocationTipo = 'pais' | 'estado' | 'cidade' | 'bairro';

export interface MTLocation {
  id: string;
  tenant_id: string;
  parent_id: string | null;
  tipo: LocationTipo;
  nome: string;
  codigo_ibge: string | null;
  uf: string | null;
  latitude: number | null;
  longitude: number | null;
  descricao_seo: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Relacionamentos
  children?: MTLocation[];
  parent?: MTLocation;
}

export interface MTLocationCreate {
  tenant_id?: string;
  parent_id?: string | null;
  tipo: LocationTipo;
  nome: string;
  codigo_ibge?: string;
  uf?: string;
  latitude?: number;
  longitude?: number;
  descricao_seo?: string;
}
