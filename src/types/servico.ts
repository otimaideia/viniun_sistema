// === TAMANHO DE ÁREA ===

export type TamanhoArea = 'P' | 'M' | 'G';

export const TAMANHO_AREA_LABELS: Record<TamanhoArea, string> = {
  P: 'Pequena',
  M: 'Média',
  G: 'Grande',
};

export const AREA_CORPORAL_LABELS: Record<string, string> = {
  axilas: 'Axilas',
  virilha_cavada: 'Virilha Cavada',
  virilha_completa: 'Virilha Completa',
  perianal: 'Perianal',
  gluteos: 'Glúteos',
  interglutea: 'Interglútea',
  labios: 'Lábios',
  buço: 'Buço',
  queixo: 'Queixo',
  orelhas: 'Orelhas',
  nariz: 'Nariz',
  rosto_completo: 'Rosto Completo',
  meia_perna: 'Meia Perna',
  pernas_completas: 'Pernas Completas',
  coxas: 'Coxas',
  bracos: 'Braços',
  antebracos: 'Antebraços',
  maos: 'Mãos',
  pes: 'Pés',
  abdomen: 'Abdômen',
  costas_superior: 'Costas Superior',
  costas_inferior: 'Costas Inferior',
  costas_completa: 'Costas Completa',
  lombar: 'Lombar',
  pescoco: 'Pescoço',
  nuca: 'Nuca',
  ombros: 'Ombros',
  peito: 'Peito',
  areolas: 'Aréolas',
  linha_alba: 'Linha Alba',
  peitoral_completo: 'Peitoral Completo',
  barba: 'Barba',
  dorso_maos: 'Dorso das Mãos',
  dorso_pes: 'Dorso dos Pés',
  corpo_inteiro_feminino: 'Corpo Inteiro Feminino',
  corpo_inteiro_masculino: 'Corpo Inteiro Masculino',
  testa: 'Testa',
};

export interface Servico {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null; // 'feminino', 'masculino', 'estetica_facial', 'estetica_corporal'
  duracao_minutos: number | null; // Tempo do serviço em minutos (controle interno)
  imagem_url: string | null; // URL da imagem principal/capa
  ativo: boolean;
  created_at: string;
  updated_at: string;
  // Campos de classificação de área
  area_corporal?: string | null;
  tamanho_area?: TamanhoArea | null;
  sessoes_protocolo?: number | null;
  preco_por_sessao?: number | null;
  // Relacionamento virtual (carregado separadamente)
  imagens?: ServicoImagem[];
}

// Imagem individual da galeria de um serviço
export interface ServicoImagem {
  id: string;
  servico_id: string;
  url: string;
  ordem: number;
  legenda: string | null;
  created_at: string;
}

export interface FranqueadoServico {
  id: string;
  franqueado_id: string;
  servico_id: string;
  ativo: boolean;
  created_at: string;
}

/** @deprecated Use useServiceCategoriesMT().getCategoryLabel() - categorias agora são dinâmicas no banco */
export const CATEGORIA_LABELS: Record<string, string> = {
  feminino: "Serviços Femininos",
  masculino: "Serviços Masculinos",
  estetica_facial: "Serviços Especializados",
  estetica_corporal: "Serviços Corporativos",
};
