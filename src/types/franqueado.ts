export interface Franqueado {
  id: string;
  status: string;
  id_api: number | null;
  diretoria_id: string | null; // Vinculação com diretoria regional
  nome_fantasia: string;
  slug: string | null; // Slug para URL amigável (totem/portal)
  endereco: string | null;
  cep: string | null;
  cidade: string | null;
  estado: string | null;
  responsavel: string | null;
  relacionamento: string | null;
  whatsapp_business: string | null;
  ultima_recarga: string | null;
  cnpj: string | null;
  email: string | null;
  senha_email: string | null;
  google_ads_id: string | null;
  id_metrica: string | null;
  meu_negocio: string | null;
  youtube: string | null;
  google_tags_conectadas: boolean;
  google_vinc_mcc: boolean;
  facebook: string | null;
  facebook_pagina: string | null;
  instagram: string | null;
  senha_instagram: string | null;
  meta_ads_id: string | null;
  meta_tags_conectadas: boolean;
  meta_vinc_mcc: boolean;
  conversoes_personalizadas: boolean;
  publico_personalizado: boolean;
  tiktok: string | null;
  tiktok_ads: string | null;
  tiktok_senha: string | null;
  tiktok_id: string | null;
  tiktok_tags_conectadas: boolean;
  tiktok_vinc_mcc: boolean;
  landing_page_nova: string | null;
  landing_page_site: string | null;
  site_tags_conectadas: boolean;
  cadastro_kinghost: boolean;
  acoes_realizadas: string | null;
  api_token: string | null;
  created_at: string;
  updated_at: string;
}

export const FRANQUEADO_STATUS = [
  'Concluído',
  'Em configuração',
  'Falta LP',
  'Não inaugurada',
  'A iniciar'
] as const;

export const ESTADOS_BRASIL = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
] as const;
