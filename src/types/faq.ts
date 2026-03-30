// Tipos para o módulo de FAQ / Perguntas Frequentes

export interface MTFAQCategory {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  department_id: string | null;
  nome: string;
  descricao: string | null;
  icone: string | null;
  cor: string | null;
  parent_id: string | null;
  ordem: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joins
  children?: MTFAQCategory[];
  faqs_count?: number;
  department?: { id: string; nome: string };
}

export interface MTFAQ {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  category_id: string | null;
  department_id: string | null;
  sop_id: string | null;
  pergunta: string;
  resposta: string;
  tags: string[] | null;
  ordem: number;
  is_pinned: boolean;
  is_published: boolean;
  views_count: number;
  helpful_count: number;
  not_helpful_count: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joins
  category?: MTFAQCategory;
  department?: { id: string; nome: string };
  sop?: { id: string; codigo: string; titulo: string };
  user_vote?: boolean | null;
}

export interface MTFAQVote {
  id: string;
  tenant_id: string;
  faq_id: string;
  user_id: string;
  is_helpful: boolean;
  created_at: string;
}

export interface MTFAQView {
  id: string;
  tenant_id: string;
  faq_id: string;
  user_id: string | null;
  viewed_at: string;
}

export interface FAQFilters {
  search?: string;
  category_id?: string;
  department_id?: string;
  sop_id?: string;
  tags?: string[];
  is_published?: boolean;
  is_pinned?: boolean;
}

export interface FAQMetrics {
  total_faqs: number;
  published: number;
  total_views: number;
  total_votes: number;
  helpful_pct: number;
  most_viewed: { id: string; pergunta: string; views_count: number }[];
  least_helpful: { id: string; pergunta: string; helpful_count: number; not_helpful_count: number }[];
  categories_count: number;
  tags_cloud: { tag: string; count: number }[];
}
