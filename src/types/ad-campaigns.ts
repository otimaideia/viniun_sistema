// Types for Ad Campaigns / Traffic Manager module

export interface AdCampaign {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  campaign_id: string | null;

  // Meta Ads IDs
  meta_campaign_id: string | null;
  meta_adset_id: string | null;
  meta_ad_id: string | null;
  meta_account_id: string | null;

  // Details
  nome: string;
  plataforma: 'meta' | 'google' | 'tiktok';
  tipo: string | null;
  objetivo: string | null;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';

  // Audience & Creative
  publico_config: Record<string, any>;
  criativo_config: Record<string, any>;

  // Budget
  budget_diario: number | null;
  budget_total: number | null;
  budget_gasto: number;

  // Metrics
  impressions: number;
  alcance: number;
  cliques: number;
  ctr: number;
  cpc: number;
  cpm: number;

  // Conversions
  leads_gerados: number;
  leads_qualificados: number;
  agendamentos: number;
  vendas: number;
  receita_gerada: number;

  // ROI
  cpl: number;
  cpa: number;
  cpv: number;
  roas: number;
  roi_percent: number;

  // UTM
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;

  // WhatsApp
  whatsapp_session_id: string | null;
  whatsapp_leads_count: number;
  whatsapp_keyword: string | null;

  // AI
  ai_score: number | null;
  ai_suggestions: any[];
  ai_last_analysis_at: string | null;
  auto_generated: boolean;

  // Dates
  data_inicio: string | null;
  data_fim: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  deleted_at: string | null;
}

export interface AdAttribution {
  id: string;
  tenant_id: string;
  lead_id: string | null;
  form_submission_id: string | null;
  whatsapp_conversation_id: string | null;
  appointment_id: string | null;
  sale_id: string | null;
  ad_campaign_id: string | null;
  campaign_id: string | null;

  attribution_method: 'fbclid' | 'utm' | 'whatsapp_keyword' | 'phone_match' | 'referrer' | 'manual';

  fbclid: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer_url: string | null;
  landing_page: string | null;

  first_touch_at: string | null;
  lead_created_at: string | null;
  appointment_at: string | null;
  sale_at: string | null;
  sale_value: number | null;

  ad_cost_at_attribution: number | null;
  is_conversion: boolean;
  conversion_type: 'lead' | 'appointment' | 'sale' | null;

  created_at: string;
}

// Campaign status labels in PT-BR
export const CAMPAIGN_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Rascunho', color: 'text-gray-600 bg-gray-100' },
  active: { label: 'Ativo', color: 'text-green-600 bg-green-100' },
  paused: { label: 'Pausado', color: 'text-yellow-600 bg-yellow-100' },
  completed: { label: 'Concluído', color: 'text-blue-600 bg-blue-100' },
  archived: { label: 'Arquivado', color: 'text-gray-400 bg-gray-50' },
};

// Platform labels
export const PLATFORM_LABELS: Record<string, { label: string; icon: string }> = {
  meta: { label: 'Meta Ads', icon: 'Facebook' },
  google: { label: 'Google Ads', icon: 'Search' },
  tiktok: { label: 'TikTok Ads', icon: 'Video' },
};

// Attribution method labels
export const ATTRIBUTION_METHOD_LABELS: Record<string, string> = {
  fbclid: 'Facebook Click ID',
  utm: 'UTM Parameters',
  whatsapp_keyword: 'Keyword WhatsApp',
  phone_match: 'Telefone',
  referrer: 'Referrer URL',
  manual: 'Manual',
};
