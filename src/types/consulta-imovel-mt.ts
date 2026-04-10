export type InquiryTipo = 'consulta' | 'encomenda' | 'mais_info' | 'fale_conosco' | 'desbloqueio' | 'ligacao';
export type InquiryStatus = 'novo' | 'respondido' | 'agendado' | 'convertido' | 'perdido' | 'em_atendimento';

export interface MTPropertyInquiry {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  property_id: string | null;
  lead_id: string | null;
  appointment_id: string | null;
  corretor_id: string | null;
  tipo: InquiryTipo;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  mensagem: string | null;
  forma_contato: string | null;
  como_conheceu: string | null;
  source_url: string | null;
  source_portal: string | null;
  // Encomenda
  encomenda_tipo_imovel: string | null;
  encomenda_dormitorios: number | null;
  encomenda_area_min: number | null;
  encomenda_area_max: number | null;
  encomenda_valor_min: number | null;
  encomenda_valor_max: number | null;
  encomenda_localizacao: string | null;
  encomenda_descricao: string | null;
  encomenda_financiamento: boolean;
  // Status
  status: InquiryStatus;
  prioridade: string;
  respondido_em: string | null;
  respondido_por: string | null;
  notas_internas: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joins
  property?: { id: string; titulo: string; ref_code: string };
  corretor?: { id: string; nome: string };
}

export interface MTPropertyView {
  id: string;
  tenant_id: string;
  property_id: string;
  lead_id: string | null;
  visitor_session: string | null;
  ip_address: string | null;
  user_agent: string | null;
  referrer: string | null;
  source: string | null;
  duracao_segundos: number | null;
  viewed_at: string;
}

export interface MTPropertyFavorite {
  id: string;
  tenant_id: string;
  property_id: string;
  lead_id: string | null;
  user_id: string | null;
  session_id: string | null;
  created_at: string;
}

export interface MTPropertyOrder {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  client_id: string | null;
  property_id: string | null;
  items: unknown[];
  status: string;
  valor_total: number | null;
  observacoes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
