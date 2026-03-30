// ============================================================
// TIPOS PARA UNIDADES (tabela mt_franchises)
// ============================================================

export type UnidadeModelo = 'franquia' | 'propria' | 'parceira';

export interface Unidade {
  id: string;
  nome: string;
  razao_social: string | null;
  cnpj: string | null;
  cidade: string | null;
  estado: string | null;
  endereco: string | null;
  email: string | null;
  telefone: string | null;
  id_api: number | null; // ID na API Yeslaser Office
  modelo: UnidadeModelo | null;
  created_at: string;
}

export interface UnidadeWithStats extends Unidade {
  total_leads?: number;
  total_agendamentos?: number;
  total_clientes?: number;
}

export const UNIDADE_MODELO_LABELS: Record<UnidadeModelo, string> = {
  franquia: 'Franquia',
  propria: 'Unidade Própria',
  parceira: 'Parceira',
};
