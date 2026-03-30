// Types for Marketing Module

export type TemplateType = 'whatsapp' | 'email' | 'social_media' | 'landing_page';
export type CampanhaTipo = 'geral' | 'unidade_especifica';
export type CampanhaStatus = 'ativa' | 'pausada' | 'finalizada';
export type AssetTipo = 'imagem' | 'video' | 'banner' | 'logo' | 'arte_social';
export type AssetCategoria =
  | 'destaques'
  | 'material_yeslaser'
  | 'material_aedgel'
  | 'stories'
  | 'tv_interna'
  | 'promocoes'
  | 'datas_comemorativas'
  | 'institucional';

export interface MarketingTemplate {
  id: string;
  nome_template: string;
  template_content: string;
  tipo: TemplateType;
  variaveis_disponiveis: string[];
  is_default?: boolean;
  ativo: boolean;
  unidade_id?: string | null;
  created_at: string;
  updated_at: string;
  mt_franchises?: {
    id: string;
    nome_fantasia: string;
  };
}

export interface MarketingCampanha {
  id: string;
  nome: string;
  descricao?: string;
  tipo: CampanhaTipo;
  status: CampanhaStatus;
  unidade_id?: string | null;
  data_inicio?: string;
  data_fim?: string;
  budget_estimado?: number;
  budget_real?: number;
  leads_gerados?: number;
  conversoes?: number;
  receita_gerada?: number;
  objetivo?: string;
  publico_alvo?: string;
  canais: string[];
  metricas?: Record<string, any>;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  ativa: boolean;
  created_at: string;
  updated_at: string;
  mt_franchises?: {
    id: string;
    nome_fantasia: string;
  };
}

export interface MarketingAsset {
  id: string;
  nome: string;
  descricao?: string;
  tipo: AssetTipo;
  categoria?: AssetCategoria | null;
  unidade_id?: string | null;
  campanha_id?: string | null;
  file_url: string;
  file_size?: number;
  file_type?: string;
  tags: string[];
  dimensoes?: {
    width?: number;
    height?: number;
  };
  ativo: boolean;
  created_at: string;
  updated_at: string;
  mt_franchises?: {
    id: string;
    nome_fantasia: string;
  };
  mt_campaigns?: {
    id: string;
    nome: string;
  };
}

// Form types for creation/update
export interface MarketingTemplateFormData {
  nome_template: string;
  template_content: string;
  tipo: TemplateType;
  variaveis_disponiveis?: string[];
  is_default?: boolean;
  ativo?: boolean;
  unidade_id?: string | null;
}

export interface MarketingCampanhaFormData {
  nome: string;
  descricao?: string;
  tipo: CampanhaTipo;
  status?: CampanhaStatus;
  unidade_id?: string | null;
  data_inicio?: string;
  data_fim?: string;
  budget_estimado?: number;
  budget_real?: number;
  receita_gerada?: number;
  objetivo?: string;
  publico_alvo?: string;
  canais?: string[];
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

export interface MarketingAssetFormData {
  nome: string;
  descricao?: string;
  tipo: AssetTipo;
  categoria?: AssetCategoria | null;
  unidade_id?: string | null;
  campanha_id?: string | null;
  file_url: string;
  file_size?: number;
  file_type?: string;
  tags?: string[];
  dimensoes?: {
    width?: number;
    height?: number;
  };
  ativo?: boolean;
}

// Channel options for campaigns
export const CANAIS_OPTIONS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'google', label: 'Google Ads' },
  { value: 'tiktok', label: 'TikTok' },
] as const;

// Template type options
export const TEMPLATE_TYPE_OPTIONS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'social_media', label: 'Redes Sociais' },
  { value: 'landing_page', label: 'Landing Page' },
] as const;

// Asset type options
export const ASSET_TYPE_OPTIONS = [
  { value: 'imagem', label: 'Imagem' },
  { value: 'video', label: 'Vídeo' },
  { value: 'banner', label: 'Banner' },
  { value: 'logo', label: 'Logo' },
  { value: 'arte_social', label: 'Arte Social' },
] as const;

// Asset category options (based on Google Drive structure)
export const ASSET_CATEGORY_OPTIONS = [
  { value: 'destaques', label: 'Destaques' },
  { value: 'material_yeslaser', label: 'Material Yes Laser' },
  { value: 'material_aedgel', label: 'Material A-Edgel' },
  { value: 'stories', label: 'Stories' },
  { value: 'tv_interna', label: 'TV Interna' },
  { value: 'promocoes', label: 'Promoções' },
  { value: 'datas_comemorativas', label: 'Datas Comemorativas' },
  { value: 'institucional', label: 'Institucional' },
] as const;

// Campaign status options
export const CAMPANHA_STATUS_OPTIONS = [
  { value: 'ativa', label: 'Ativa' },
  { value: 'pausada', label: 'Pausada' },
  { value: 'finalizada', label: 'Finalizada' },
] as const;

// Campaign type options
export const CAMPANHA_TIPO_OPTIONS = [
  { value: 'geral', label: 'Geral' },
  { value: 'unidade_especifica', label: 'Unidade Específica' },
] as const;

// Default template variables
export const DEFAULT_TEMPLATE_VARIABLES = [
  '{nome}',
  '{email}',
  '{telefone}',
  '{unidade}',
  '{servico}',
  '{data}',
  '{horario}',
  '{valor}',
  '{link}',
] as const;
