// =============================================================================
// TIPOS - Módulo de Análise Competitiva
// =============================================================================

export interface MTCompetitor {
  id: string;
  tenant_id: string;
  nome: string;
  slug: string | null;
  website: string | null;
  logo_url: string | null;
  tipo: 'concorrente' | 'referencia_mercado';
  cidade: string | null;
  estado: string | null;
  regiao: 'nacional' | 'regional' | 'local' | null;
  url_base_feminino: string | null;
  url_base_masculino: string | null;
  scraper_seletores: Record<string, string> | null;
  notas: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MTCompetitorCreate {
  nome: string;
  tenant_id?: string;
  slug?: string;
  website?: string;
  logo_url?: string;
  tipo?: 'concorrente' | 'referencia_mercado';
  cidade?: string;
  estado?: string;
  regiao?: 'nacional' | 'regional' | 'local';
  url_base_feminino?: string;
  url_base_masculino?: string;
  scraper_seletores?: Record<string, string>;
  notas?: string;
}

export interface MTCompetitorUpdate extends Partial<MTCompetitorCreate> {
  id: string;
}

export interface MTCompetitorPrice {
  id: string;
  tenant_id: string;
  competitor_id: string;
  service_id: string | null;
  nome_servico: string;
  categoria: string | null;
  area_corporal: string | null;
  genero: 'feminino' | 'masculino' | 'unissex';
  preco_total: number | null;
  preco_promocional: number | null;
  preco_credito: number | null;
  preco_pix: number | null;
  preco_recorrencia: number | null;
  preco_por_sessao: number | null;
  parcelas_max: number | null;
  valor_parcela: number | null;
  parcelas_sem_juros: number | null;
  sessoes_pacote: number | null;
  tecnologia: string | null;
  fonte: string | null;
  url_fonte: string | null;
  data_coleta: string;
  valido_ate: string | null;
  observacoes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Relations
  competitor?: MTCompetitor;
}

export interface MTCompetitorPriceCreate {
  competitor_id: string;
  tenant_id?: string;
  service_id?: string;
  nome_servico: string;
  categoria?: string;
  area_corporal?: string;
  genero?: 'feminino' | 'masculino' | 'unissex';
  preco_total?: number;
  preco_promocional?: number;
  preco_credito?: number;
  preco_pix?: number;
  preco_recorrencia?: number;
  preco_por_sessao?: number;
  parcelas_max?: number;
  valor_parcela?: number;
  parcelas_sem_juros?: number;
  sessoes_pacote?: number;
  tecnologia?: string;
  fonte?: string;
  url_fonte?: string;
  data_coleta?: string;
  valido_ate?: string;
  observacoes?: string;
}

export interface MTCompetitorPriceUpdate extends Partial<MTCompetitorPriceCreate> {
  id: string;
}

// Dados agregados para a tabela comparativa
export interface ComparativoArea {
  area_corporal: string;
  area_nome: string;
  genero: 'feminino' | 'masculino';
  nosso_preco: number | null;
  nosso_preco_sessao: number | null;
  concorrentes: ConcorrentePrecoResumo[];
  media_mercado: number | null;
  posicao: 'abaixo' | 'dentro' | 'acima' | 'sem_dados';
  diferenca_pct: number;
}

export interface ConcorrentePrecoResumo {
  competitor_id: string;
  nome: string;
  preco_total: number | null;
  preco_promocional: number | null;
  preco_credito: number | null;
  preco_pix: number | null;
  preco_recorrencia: number | null;
  parcelas: string | null; // "12x R$ 149,90"
  parcelas_num: number | null;
  valor_parcela_num: number | null;
  sessoes: number | null;
  data_coleta: string | null;
}

export interface ComparativoMetricas {
  total_areas: number;
  abaixo_mercado: number;
  dentro_mercado: number;
  acima_mercado: number;
  sem_dados: number;
  economia_media_pct: number;
}

// Nomes legíveis para áreas corporais
export const AREA_NOMES: Record<string, string> = {
  'axilas': 'Axilas',
  'virilha': 'Virilha',
  'virilha-completa': 'Virilha Completa',
  'virilha-cavada': 'Virilha Cavada',
  'anus': 'Perianal',
  'perianal': 'Perianal',
  'areolas': 'Aréolas',
  'bracos-inteiros': 'Braços Inteiros',
  'antebraco': 'Antebraço',
  'pescoco': 'Pescoço',
  'glabela': 'Glabela',
  'testa': 'Testa',
  'faces-laterais': 'Faces Laterais',
  'buco': 'Buço',
  'costas': 'Costas',
  'abdomen': 'Abdômen',
  'pernas-inteiras': 'Pernas Inteiras',
  'meia-perna': 'Meia Perna',
  'pes': 'Pés',
  'maos': 'Mãos',
  'nuca': 'Nuca',
  'queixo': 'Queixo',
  'orelhas': 'Orelhas',
  'lombar': 'Lombar',
  'barba': 'Barba',
  'ombros': 'Ombros',
  'peitoral': 'Peitoral',
  'gluteos': 'Glúteos',
};
