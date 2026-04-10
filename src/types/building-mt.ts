export interface MTBuilding {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  construtora_id: string | null;
  legacy_id: number | null;
  nome: string;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  cep: string | null;
  location_bairro_id: string | null;
  location_cidade_id: string | null;
  // Contatos
  sindico_nome: string | null;
  sindico_telefone: string | null;
  sindico_email: string | null;
  sindico_celular: string | null;
  porteiro1_nome: string | null;
  porteiro1_telefone: string | null;
  porteiro1_email: string | null;
  porteiro1_celular: string | null;
  porteiro2_nome: string | null;
  porteiro2_telefone: string | null;
  porteiro2_email: string | null;
  porteiro2_celular: string | null;
  zelador_nome: string | null;
  zelador_telefone: string | null;
  zelador_email: string | null;
  zelador_celular: string | null;
  // Dados
  ano_construcao: number | null;
  total_unidades: number | null;
  total_andares: number | null;
  valor_condominio: number | null;
  infraestrutura: string[];
  fotos: { url: string; thumbnail_url?: string; descricao?: string; ordem?: number }[];
  foto_destaque_url: string | null;
  latitude: number | null;
  longitude: number | null;
  descricao: string | null;
  campos_personalizados: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Relacionamentos
  construtora?: { id: string; nome: string };
}

export interface MTBuildingCreate {
  tenant_id?: string;
  franchise_id?: string;
  construtora_id?: string;
  nome: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  cep?: string;
  location_bairro_id?: string;
  location_cidade_id?: string;
  sindico_nome?: string;
  sindico_telefone?: string;
  sindico_email?: string;
  sindico_celular?: string;
  porteiro1_nome?: string;
  porteiro1_telefone?: string;
  porteiro1_email?: string;
  porteiro1_celular?: string;
  porteiro2_nome?: string;
  porteiro2_telefone?: string;
  porteiro2_email?: string;
  porteiro2_celular?: string;
  zelador_nome?: string;
  zelador_telefone?: string;
  zelador_email?: string;
  zelador_celular?: string;
  ano_construcao?: number;
  total_unidades?: number;
  total_andares?: number;
  valor_condominio?: number;
  infraestrutura?: string[];
  latitude?: number;
  longitude?: number;
  descricao?: string;
}

export interface MTBuildingUpdate extends Partial<MTBuildingCreate> {
  id: string;
}
