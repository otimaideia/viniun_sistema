export type CampaignStatus = 'rascunho' | 'agendada' | 'enviando' | 'enviada' | 'cancelada';

export interface MTEmailCampaign {
  id: string;
  tenant_id: string;
  template_id: string | null;
  nome: string;
  assunto: string | null;
  imagem_url: string | null;
  html_body: string | null;
  status: CampaignStatus;
  tipo_envio: string;
  filtros: Record<string, unknown>;
  agendada_para: string | null;
  enviada_em: string | null;
  total_destinatarios: number;
  total_enviados: number;
  total_entregues: number;
  total_abertos: number;
  total_clicados: number;
  total_bounces: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MTEmailTemplate {
  id: string;
  tenant_id: string;
  nome: string;
  assunto_template: string | null;
  html_template: string | null;
  categoria: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MTEmailLog {
  id: string;
  tenant_id: string;
  campaign_id: string;
  client_id: string | null;
  email: string;
  status: string;
  evento_em: string;
  link_clicado: string | null;
}

export interface MTNewsletter {
  id: string;
  tenant_id: string;
  email: string;
  nome: string | null;
  is_active: boolean;
  subscribed_at: string;
  unsubscribed_at: string | null;
}
