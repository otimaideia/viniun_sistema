// =============================================================================
// TIPOS MULTI-TENANT - Módulo de Promoções Unificadas
// =============================================================================
//
// Interfaces para mt_promotions, mt_promotion_services, mt_promotion_assets,
// mt_promotion_subscriptions, mt_promotion_uses, mt_notification_log
//
// =============================================================================

// -----------------------------------------------------------------------------
// Enums / Unions
// -----------------------------------------------------------------------------

export type MTPromotionTipo = 'desconto' | 'pacote' | 'lancamento' | 'evento' | 'sazonal';
export type MTPromotionDescontoTipo = 'percentual' | 'fixo';
export type MTPromotionPublicoAlvo = 'todos' | 'leads_novos' | 'leads_retorno' | 'influenciadores';
export type MTPromotionStatus = 'rascunho' | 'ativa' | 'pausada' | 'expirada' | 'cancelada';

export type MTPromotionAssetTipo = 'banner' | 'banner_mobile' | 'video' | 'thumbnail' | 'story' | 'carousel' | 'documento';
export type MTPromotionSubscriptionStatus = 'pendente' | 'aderido' | 'recusado' | 'expirado';
export type MTNotificationCanal = 'whatsapp' | 'email' | 'push' | 'sms';
export type MTNotificationStatus = 'pendente' | 'enviado' | 'entregue' | 'falhou' | 'lido';

// -----------------------------------------------------------------------------
// Promoção Principal
// -----------------------------------------------------------------------------

export interface MTPromotion {
  id: string;
  tenant_id: string;
  franchise_id: string | null;

  // Identificação
  codigo: string;
  titulo: string;
  descricao: string | null;

  // Tipo e desconto
  tipo: MTPromotionTipo;
  desconto_tipo: MTPromotionDescontoTipo | null;
  desconto_valor: number | null;
  valor_minimo: number | null;

  // Período
  data_inicio: string | null;
  data_fim: string | null;

  // Limites
  max_usos: number | null;
  usos_count: number;
  max_usos_por_lead: number | null;

  // Segmentação
  publico_alvo: MTPromotionPublicoAlvo;
  campaign_id: string | null;

  // Visual
  banner_url: string | null;
  banner_mobile_url: string | null;
  cor_destaque: string | null;

  // Status
  status: MTPromotionStatus;
  is_public: boolean;

  // Legal
  termos: string | null;
  regulamento_url: string | null;

  // Metadata
  metadata: Record<string, any>;
  created_by: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
  deleted_at: string | null;

  // Joins
  tenant?: { slug: string; nome_fantasia: string };
  franchise?: { nome: string };
  services?: MTPromotionService[];
  assets?: MTPromotionAsset[];
  subscriptions?: MTPromotionSubscription[];
  uses?: MTPromotionUse[];
  subscriptions_count?: number;
  uses_count?: number;
}

// -----------------------------------------------------------------------------
// Serviços vinculados à Promoção
// -----------------------------------------------------------------------------

export interface MTPromotionService {
  id: string;
  promotion_id: string;
  service_id: string;
  desconto_tipo: MTPromotionDescontoTipo | null;
  desconto_valor: number | null;
  preco_promocional: number | null;
  created_at: string;

  // Joins
  service?: {
    id: string;
    nome: string;
    preco: number;
    categoria: string | null;
  };
}

// -----------------------------------------------------------------------------
// Assets / Mídia da Promoção
// -----------------------------------------------------------------------------

export interface MTPromotionAsset {
  id: string;
  promotion_id: string;
  tipo: MTPromotionAssetTipo;
  titulo: string | null;
  url: string;
  storage_path: string | null;
  mime_type: string | null;
  tamanho_bytes: number | null;
  ordem: number;
  created_at: string;
}

// -----------------------------------------------------------------------------
// Adesões de Influenciadoras
// -----------------------------------------------------------------------------

export interface MTPromotionSubscription {
  id: string;
  promotion_id: string;
  influencer_id: string;
  status: MTPromotionSubscriptionStatus;
  link_gerado: string | null;
  aderiu_at: string | null;
  tenant_id: string;
  total_cliques: number;
  total_leads: number;
  total_vendas: number;
  valor_vendas: number;
  notificado_at: string | null;
  notificado_via: string | null;
  created_at: string;
  updated_at: string;

  // Joins
  promotion?: MTPromotion;
  influencer?: {
    id: string;
    nome: string;
    telefone: string | null;
    codigo: string | null;
    instagram: string | null;
  };
}

// -----------------------------------------------------------------------------
// Usos / Resgates da Promoção
// -----------------------------------------------------------------------------

export interface MTPromotionUse {
  id: string;
  promotion_id: string;
  lead_id: string | null;
  subscription_id: string | null;
  franchise_id: string | null;
  desconto_aplicado: number | null;
  valor_original: number | null;
  valor_final: number | null;
  metadata: Record<string, any>;
  created_at: string;

  // Joins
  lead?: { id: string; nome: string; telefone: string | null };
  subscription?: MTPromotionSubscription;
}

// -----------------------------------------------------------------------------
// Log de Notificações (Universal)
// -----------------------------------------------------------------------------

export interface MTNotificationLog {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  entity_type: string;
  entity_id: string;
  reference_type: string | null;
  reference_id: string | null;
  canal: MTNotificationCanal;
  destinatario: string;
  titulo: string | null;
  conteudo: string | null;
  status: MTNotificationStatus;
  enviado_at: string | null;
  entregue_at: string | null;
  lido_at: string | null;
  erro_mensagem: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

// -----------------------------------------------------------------------------
// Create / Update DTOs
// -----------------------------------------------------------------------------

export interface CreatePromotionData {
  titulo: string;
  tenant_id?: string;
  franchise_id?: string | null;
  codigo?: string;
  descricao?: string;
  tipo?: MTPromotionTipo;
  desconto_tipo?: MTPromotionDescontoTipo | null;
  desconto_valor?: number | null;
  valor_minimo?: number | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  max_usos?: number | null;
  max_usos_por_lead?: number | null;
  publico_alvo?: MTPromotionPublicoAlvo;
  campaign_id?: string | null;
  banner_url?: string | null;
  banner_mobile_url?: string | null;
  cor_destaque?: string | null;
  status?: MTPromotionStatus;
  is_public?: boolean;
  termos?: string | null;
  regulamento_url?: string | null;
  metadata?: Record<string, any>;
}

export interface UpdatePromotionData extends Partial<CreatePromotionData> {
  id: string;
}

// -----------------------------------------------------------------------------
// Filtros
// -----------------------------------------------------------------------------

export interface MTPromotionFilters {
  search?: string;
  status?: MTPromotionStatus;
  tipo?: MTPromotionTipo;
  publico_alvo?: MTPromotionPublicoAlvo;
  franchise_id?: string;
  ativa_em?: string; // date string, filters promotions active on this date
}

// -----------------------------------------------------------------------------
// Stats
// -----------------------------------------------------------------------------

export interface MTPromotionStats {
  total: number;
  rascunho: number;
  ativas: number;
  pausadas: number;
  expiradas: number;
  canceladas: number;
  usos_total: number;
  leads_gerados: number;
  influenciadoras_aderidas: number;
}
