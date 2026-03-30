export interface Campanha {
  id: string;
  nome: string;
  tipo: CampanhaTipo;
  status: CampanhaStatus;
  orcamento_mensal: number | null;
  franqueado_id: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  descricao: string | null;
  created_at: string;
  updated_at: string;
  // Campos calculados
  leads_count?: number;
  cpl?: number; // Cost Per Lead
  // Joins
  franqueado_nome?: string;
}

export type CampanhaTipo = 'google_ads' | 'meta_ads' | 'tiktok_ads' | 'linkedin_ads' | 'organico' | 'indicacao';

export type CampanhaStatus = 'ativa' | 'pausada' | 'finalizada';

export interface CampanhaFormData {
  nome: string;
  tipo: CampanhaTipo;
  status?: CampanhaStatus;
  orcamento_mensal?: number;
  franqueado_id?: string;
  data_inicio?: string;
  data_fim?: string;
  descricao?: string;
}

export interface CampanhaStats {
  total: number;
  ativas: number;
  leads_total: number;
  orcamento_total: number;
}

export const CAMPANHA_TIPOS: { value: CampanhaTipo; label: string; color: string; icon: string }[] = [
  { value: 'google_ads', label: 'Google Ads', color: 'bg-blue-500', icon: 'Search' },
  { value: 'meta_ads', label: 'Meta Ads', color: 'bg-blue-700', icon: 'Facebook' },
  { value: 'tiktok_ads', label: 'TikTok Ads', color: 'bg-gray-900', icon: 'Music' },
  { value: 'linkedin_ads', label: 'LinkedIn Ads', color: 'bg-blue-600', icon: 'Linkedin' },
  { value: 'organico', label: 'Orgânico', color: 'bg-green-500', icon: 'Leaf' },
  { value: 'indicacao', label: 'Indicação', color: 'bg-purple-500', icon: 'Users' },
];

export const CAMPANHA_STATUS: { value: CampanhaStatus; label: string; color: string }[] = [
  { value: 'ativa', label: 'Ativa', color: 'bg-green-500' },
  { value: 'pausada', label: 'Pausada', color: 'bg-yellow-500' },
  { value: 'finalizada', label: 'Finalizada', color: 'bg-gray-500' },
];
