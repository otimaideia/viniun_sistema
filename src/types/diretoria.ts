export interface Diretoria {
  id: string;
  nome: string;
  regiao: string | null;
  descricao: string | null;
  responsavel_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Campos calculados (join)
  franquias_count?: number;
  responsavel_nome?: string;
}

export interface DiretoriaFormData {
  nome: string;
  regiao?: string;
  descricao?: string;
  responsavel_id?: string;
  is_active?: boolean;
}

export interface DiretoriaStats {
  total: number;
  ativas: number;
  inativas: number;
}
