// ═══════════════════════════════════════════════════
// Tipos do módulo IMÓVEIS (mt_properties + auxiliares)
// ═══════════════════════════════════════════════════

export interface MTPropertyType {
  id: string;
  tenant_id: string;
  parent_id: string | null;
  codigo: string;
  nome: string;
  descricao: string | null;
  icone: string | null;
  ordem: number;
  is_active: boolean;
  children?: MTPropertyType[];
}

export interface MTPropertyPurpose {
  id: string;
  tenant_id: string;
  codigo: string;
  nome: string;
  ordem: number;
  is_active: boolean;
}

export type FeatureCategoria = 'caracteristica' | 'proximidade' | 'acabamento' | 'infraestrutura';

export interface MTPropertyFeature {
  id: string;
  tenant_id: string;
  categoria: FeatureCategoria;
  nome: string;
  icone: string | null;
  ordem: number;
  is_active: boolean;
}

export interface MTPropertyPhoto {
  id: string;
  tenant_id: string;
  property_id: string;
  url: string;
  thumbnail_url: string | null;
  storage_path: string | null;
  descricao: string | null;
  album: string | null;
  ordem: number;
  is_destaque: boolean;
  mime_type: string | null;
  tamanho_bytes: number | null;
  largura: number | null;
  altura: number | null;
  legacy_filename: string | null;
  created_at: string;
}

export type PropertySituacao = 'disponivel' | 'vendido' | 'alugado' | 'reservado' | 'inativo';

export interface MTProperty {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  ref_code: string | null;
  legacy_id: number | null;
  // Classificação
  property_type_id: string | null;
  property_subtype_id: string | null;
  purpose_id: string | null;
  // Pessoas
  owner_id: string | null;
  captador_id: string | null;
  corretor_id: string | null;
  construtora_id: string | null;
  // Localização
  location_estado_id: string | null;
  location_cidade_id: string | null;
  location_bairro_id: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  cep: string | null;
  building_id: string | null;
  ponto_referencia: string | null;
  latitude: number | null;
  longitude: number | null;
  status_endereco: string | null;
  chaves: string | null;
  // Cômodos
  dormitorios: number;
  suites: number;
  banheiros: number;
  salas: number;
  cozinhas: number;
  garagens: number;
  dep_empregada: number;
  // Áreas (m²)
  area_construida: number | null;
  area_privada: number | null;
  area_terreno: number | null;
  area_total: number | null;
  area_util: number | null;
  // Preços (BRL)
  valor_venda: number | null;
  valor_locacao: number | null;
  valor_temporada: number | null;
  valor_iptu: number | null;
  valor_condominio: number | null;
  valor_promocao: number | null;
  status_valor: string | null;
  // Financiamento Caixa
  aceita_financiamento: boolean;
  financiamento_caixa: boolean;
  financ_caixa_mostrar_site: boolean;
  financ_caixa_valor_entrada: number | null;
  financ_caixa_valor_parcela: number | null;
  financ_caixa_valor_chaves: number | null;
  financ_caixa_valor_intermediarias: number | null;
  financ_caixa_qtd_parcelas: number | null;
  financ_caixa_qtd_intermediarias: number | null;
  financ_caixa_tipo_intermediarias: string | null;
  financ_caixa_valor_subsidio: number | null;
  financ_caixa_valor_financiado: number | null;
  financ_caixa_observacoes: string | null;
  // Financiamento Construtora
  financiamento_construtora: boolean;
  financ_const_mostrar_site: boolean;
  financ_const_valor_entrada: number | null;
  financ_const_valor_parcela: number | null;
  financ_const_valor_chaves: number | null;
  financ_const_valor_intermediarias: number | null;
  financ_const_qtd_parcelas: number | null;
  financ_const_qtd_intermediarias: number | null;
  financ_const_tipo_intermediarias: string | null;
  financ_const_observacoes: string | null;
  // Status
  situacao: PropertySituacao;
  disponibilidade: string | null;
  destaque: boolean;
  destaque_semana: boolean;
  lancamento: boolean;
  // Condição
  mobiliado: boolean;
  semimobiliado: boolean;
  situacao_documentacao: string | null;
  distancia_praia: number | null;
  // Conteúdo
  titulo: string | null;
  descricao: string | null;
  descricao_interna: string | null;
  post_texto: string | null;
  // SEO
  slug: string | null;
  seo_title: string | null;
  seo_descricao: string | null;
  seo_palavras_chave: string | null;
  // Mídia
  foto_destaque_url: string | null;
  video_youtube_url: string | null;
  tour_virtual_url: string | null;
  // Contadores
  total_visualizacoes: number;
  total_consultas: number;
  total_favoritos: number;
  // Portais
  portal_export: boolean;
  portal_metadata: Record<string, unknown>;
  // Auditoria
  metadata: Record<string, unknown>;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Relacionamentos (joins opcionais)
  property_type?: MTPropertyType;
  property_subtype?: MTPropertyType;
  purpose?: MTPropertyPurpose;
  photos?: MTPropertyPhoto[];
  features?: MTPropertyFeature[];
  owner?: { id: string; nome: string };
  captador?: { id: string; nome: string };
  corretor?: { id: string; nome: string };
  building?: { id: string; nome: string };
  location_estado?: { id: string; nome: string; uf: string };
  location_cidade?: { id: string; nome: string };
  location_bairro?: { id: string; nome: string };
}

export interface MTPropertyCreate {
  tenant_id?: string;
  franchise_id?: string;
  ref_code?: string;
  property_type_id?: string;
  property_subtype_id?: string;
  purpose_id?: string;
  owner_id?: string;
  captador_id?: string;
  corretor_id?: string;
  construtora_id?: string;
  location_estado_id?: string;
  location_cidade_id?: string;
  location_bairro_id?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  cep?: string;
  building_id?: string;
  ponto_referencia?: string;
  latitude?: number;
  longitude?: number;
  status_endereco?: string;
  chaves?: string;
  dormitorios?: number;
  suites?: number;
  banheiros?: number;
  salas?: number;
  cozinhas?: number;
  garagens?: number;
  dep_empregada?: number;
  area_construida?: number;
  area_privada?: number;
  area_terreno?: number;
  area_total?: number;
  area_util?: number;
  valor_venda?: number;
  valor_locacao?: number;
  valor_temporada?: number;
  valor_iptu?: number;
  valor_condominio?: number;
  valor_promocao?: number;
  status_valor?: string;
  aceita_financiamento?: boolean;
  financiamento_caixa?: boolean;
  financiamento_construtora?: boolean;
  situacao?: PropertySituacao;
  destaque?: boolean;
  destaque_semana?: boolean;
  lancamento?: boolean;
  mobiliado?: boolean;
  semimobiliado?: boolean;
  situacao_documentacao?: string;
  distancia_praia?: number;
  titulo?: string;
  descricao?: string;
  descricao_interna?: string;
  slug?: string;
  seo_title?: string;
  seo_descricao?: string;
  seo_palavras_chave?: string;
  foto_destaque_url?: string;
  video_youtube_url?: string;
  tour_virtual_url?: string;
  portal_export?: boolean;
}

export interface MTPropertyUpdate extends Partial<MTPropertyCreate> {
  id: string;
}

export interface MTPropertyFilters {
  search?: string;
  property_type_id?: string;
  property_subtype_id?: string;
  purpose_id?: string;
  location_estado_id?: string;
  location_cidade_id?: string;
  location_bairro_id?: string;
  building_id?: string;
  dormitorios_min?: number;
  dormitorios_max?: number;
  valor_min?: number;
  valor_max?: number;
  area_min?: number;
  area_max?: number;
  situacao?: PropertySituacao;
  destaque?: boolean;
  lancamento?: boolean;
  aceita_financiamento?: boolean;
  mobiliado?: boolean;
  features?: string[];
  sort_by?: 'preco_asc' | 'preco_desc' | 'area_asc' | 'area_desc' | 'recent' | 'updated';
  page?: number;
  per_page?: number;
}
