export interface MTPropertyNews {
  id: string;
  tenant_id: string;
  titulo: string;
  slug: string | null;
  conteudo: string | null;
  resumo: string | null;
  imagem_url: string | null;
  autor: string | null;
  status: 'rascunho' | 'publicado';
  publicado_em: string | null;
  seo_title: string | null;
  seo_descricao: string | null;
  seo_palavras_chave: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MTPropertyPage {
  id: string;
  tenant_id: string;
  titulo: string;
  slug: string | null;
  conteudo: string | null;
  status: 'rascunho' | 'publicado';
  ordem: number;
  seo_title: string | null;
  seo_descricao: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
