export interface MTConstrutora {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  user_id: string | null;
  legacy_id: number | null;
  nome: string;
  logo_url: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cep: string | null;
  cidade: string | null;
  estado: string | null;
  ponto_referencia: string | null;
  email: string | null;
  telefone: string | null;
  celular: string | null;
  responsavel: string | null;
  site: string | null;
  seo_titulo: string | null;
  seo_descricao: string | null;
  seo_palavras_chave: string | null;
  mostrar_endereco: boolean;
  status: string;
  observacao: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MTConstrutoraCreate {
  tenant_id?: string;
  franchise_id?: string;
  nome: string;
  logo_url?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cep?: string;
  cidade?: string;
  estado?: string;
  ponto_referencia?: string;
  email?: string;
  telefone?: string;
  celular?: string;
  responsavel?: string;
  site?: string;
  seo_titulo?: string;
  seo_descricao?: string;
  mostrar_endereco?: boolean;
}

export interface MTConstrutoraUpdate extends Partial<MTConstrutoraCreate> {
  id: string;
}
