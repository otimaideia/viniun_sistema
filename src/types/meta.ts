// =============================================================================
// TIPOS DE METAS - Sistema Multi-Tenant
// =============================================================================
// Metas flexíveis: o usuário escolhe qualquer categoria/módulo e define livremente
// =============================================================================

// Nível de vinculação da meta
export type MetaVinculacao = 'empresa' | 'departamento' | 'equipe' | 'pessoa';

export interface Meta {
  id: string;
  titulo: string;
  tipo: string; // Qualquer código de META_TIPOS ou 'custom'
  valor_meta: number;
  valor_atual: number;
  data_inicio: string;
  data_fim: string;
  franqueado_id: string | null;
  usuario_id: string | null; // criador
  created_at: string;
  updated_at: string;
  // Vinculação multi-nível
  department_id?: string | null;
  team_id?: string | null;
  assigned_to?: string | null; // responsável (diferente do criador)
  // Novos campos do DB agora usados
  descricao?: string | null;
  periodo?: MetaPeriodo | null;
  meta_unidade?: MetaUnidade | null;
  // Campos calculados
  percentual?: number;
  status?: MetaStatus;
  // Joins
  franqueado_nome?: string;
  usuario_nome?: string;
  department_nome?: string;
  team_nome?: string;
  assigned_to_nome?: string;
}

export type MetaStatus = 'atingida' | 'expirada' | 'proxima' | 'em_andamento';

// Períodos disponíveis no DB
export type MetaPeriodo = 'diario' | 'semanal' | 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'custom';

// Unidades de medida
export type MetaUnidade = 'unidades' | 'reais' | 'percentual' | 'minutos' | 'horas' | 'estrelas' | 'pontos';

// =============================================================================
// Categorias (agrupam os tipos)
// =============================================================================

export interface MetaCategoria {
  value: string;
  label: string;
  icon: string;
  cor: string; // Cor do badge
}

export const META_CATEGORIAS: MetaCategoria[] = [
  { value: 'vendas', label: 'Vendas', icon: 'TrendingUp', cor: 'bg-emerald-600' },
  { value: 'operacao', label: 'Operação', icon: 'Calendar', cor: 'bg-blue-600' },
  { value: 'marketing', label: 'Marketing', icon: 'Megaphone', cor: 'bg-purple-600' },
  { value: 'comunicacao', label: 'Comunicação', icon: 'MessageSquare', cor: 'bg-sky-600' },
  { value: 'rh', label: 'RH', icon: 'Briefcase', cor: 'bg-amber-600' },
  { value: 'gestao', label: 'Gestão', icon: 'Building2', cor: 'bg-slate-600' },
  { value: 'qualidade', label: 'Qualidade', icon: 'Star', cor: 'bg-yellow-600' },
  { value: 'financeiro', label: 'Financeiro', icon: 'Wallet', cor: 'bg-green-600' },
  { value: 'custom', label: 'Personalizada', icon: 'Target', cor: 'bg-gray-600' },
];

// =============================================================================
// Tipos de Meta (30+ opções agrupadas por categoria)
// =============================================================================

export interface MetaTipoConfig {
  value: string;
  label: string;
  icon: string;
  categoria: string;
  unidade_padrao: MetaUnidade;
  descricao_hint?: string; // Dica para o campo descrição
}

export const META_TIPOS: MetaTipoConfig[] = [
  // ─── VENDAS ──────────────────────────────────────────────
  { value: 'leads', label: 'Leads Captados', icon: 'UserPlus', categoria: 'vendas', unidade_padrao: 'unidades', descricao_hint: 'Quantidade de novos leads no período' },
  { value: 'conversoes', label: 'Conversões', icon: 'TrendingUp', categoria: 'vendas', unidade_padrao: 'unidades', descricao_hint: 'Leads que fecharam negócio' },
  { value: 'receita', label: 'Receita / Faturamento', icon: 'DollarSign', categoria: 'vendas', unidade_padrao: 'reais', descricao_hint: 'Valor total faturado no período' },
  { value: 'ticket_medio', label: 'Ticket Médio', icon: 'Banknote', categoria: 'vendas', unidade_padrao: 'reais', descricao_hint: 'Valor médio por venda' },
  { value: 'taxa_conversao', label: 'Taxa de Conversão', icon: 'Percent', categoria: 'vendas', unidade_padrao: 'percentual', descricao_hint: 'Percentual de leads convertidos' },
  { value: 'pipeline', label: 'Valor do Pipeline', icon: 'Layers', categoria: 'vendas', unidade_padrao: 'reais', descricao_hint: 'Valor total de oportunidades em aberto' },
  { value: 'recompra', label: 'Recompra / Retorno', icon: 'RefreshCw', categoria: 'vendas', unidade_padrao: 'unidades', descricao_hint: 'Clientes que voltaram a comprar' },

  // ─── OPERAÇÃO ────────────────────────────────────────────
  { value: 'agendamentos', label: 'Agendamentos', icon: 'Calendar', categoria: 'operacao', unidade_padrao: 'unidades', descricao_hint: 'Total de agendamentos realizados' },
  { value: 'atendimentos', label: 'Atendimentos Realizados', icon: 'CheckCircle', categoria: 'operacao', unidade_padrao: 'unidades', descricao_hint: 'Procedimentos/consultas concluídos' },
  { value: 'comparecimento', label: 'Taxa de Comparecimento', icon: 'UserCheck', categoria: 'operacao', unidade_padrao: 'percentual', descricao_hint: 'Percentual que compareceu ao agendamento' },
  { value: 'no_show', label: 'Redução de No-Show', icon: 'UserX', categoria: 'operacao', unidade_padrao: 'percentual', descricao_hint: 'Meta de reduzir ausências (menor é melhor)' },
  { value: 'procedimentos_dia', label: 'Procedimentos por Dia', icon: 'Activity', categoria: 'operacao', unidade_padrao: 'unidades', descricao_hint: 'Média de atendimentos diários' },
  { value: 'ocupacao', label: 'Taxa de Ocupação', icon: 'BarChart3', categoria: 'operacao', unidade_padrao: 'percentual', descricao_hint: 'Percentual de horários preenchidos' },

  // ─── MARKETING ───────────────────────────────────────────
  { value: 'formularios', label: 'Formulários Preenchidos', icon: 'FileText', categoria: 'marketing', unidade_padrao: 'unidades', descricao_hint: 'Submissões de formulários online' },
  { value: 'indicacoes', label: 'Indicações Recebidas', icon: 'Share2', categoria: 'marketing', unidade_padrao: 'unidades', descricao_hint: 'Indicações de influenciadoras/parcerias' },
  { value: 'roi_campanha', label: 'ROI de Campanhas', icon: 'PieChart', categoria: 'marketing', unidade_padrao: 'percentual', descricao_hint: 'Retorno sobre investimento em campanhas' },
  { value: 'cpl', label: 'Custo por Lead (CPL)', icon: 'CircleDollarSign', categoria: 'marketing', unidade_padrao: 'reais', descricao_hint: 'Custo médio para captar cada lead' },
  { value: 'posts', label: 'Posts Publicados', icon: 'Image', categoria: 'marketing', unidade_padrao: 'unidades', descricao_hint: 'Conteúdos publicados nas redes' },
  { value: 'seguidores', label: 'Novos Seguidores', icon: 'Heart', categoria: 'marketing', unidade_padrao: 'unidades', descricao_hint: 'Crescimento de seguidores nas redes sociais' },

  // ─── COMUNICAÇÃO ─────────────────────────────────────────
  { value: 'mensagens', label: 'Mensagens Enviadas', icon: 'Send', categoria: 'comunicacao', unidade_padrao: 'unidades', descricao_hint: 'Volume de mensagens WhatsApp enviadas' },
  { value: 'conversas', label: 'Conversas Atendidas', icon: 'MessageCircle', categoria: 'comunicacao', unidade_padrao: 'unidades', descricao_hint: 'Conversas respondidas/atendidas' },
  { value: 'tempo_resposta', label: 'Tempo de Resposta', icon: 'Timer', categoria: 'comunicacao', unidade_padrao: 'minutos', descricao_hint: 'Tempo médio de primeira resposta' },
  { value: 'chatbot_resolucao', label: 'Resolução pelo Chatbot', icon: 'Bot', categoria: 'comunicacao', unidade_padrao: 'percentual', descricao_hint: 'Percentual resolvido sem humano' },

  // ─── RH ──────────────────────────────────────────────────
  { value: 'contratacoes', label: 'Contratações', icon: 'UserPlus', categoria: 'rh', unidade_padrao: 'unidades', descricao_hint: 'Profissionais contratados no período' },
  { value: 'vagas', label: 'Vagas Preenchidas', icon: 'Briefcase', categoria: 'rh', unidade_padrao: 'unidades', descricao_hint: 'Posições efetivamente preenchidas' },
  { value: 'entrevistas', label: 'Entrevistas Realizadas', icon: 'Users', categoria: 'rh', unidade_padrao: 'unidades', descricao_hint: 'Total de entrevistas conduzidas' },
  { value: 'turnover', label: 'Redução de Turnover', icon: 'ArrowDownRight', categoria: 'rh', unidade_padrao: 'percentual', descricao_hint: 'Meta de reduzir rotatividade' },

  // ─── GESTÃO ──────────────────────────────────────────────
  { value: 'franquias_novas', label: 'Novas Franquias', icon: 'Building2', categoria: 'gestao', unidade_padrao: 'unidades', descricao_hint: 'Franquias inauguradas/abertas' },
  { value: 'servicos_vendidos', label: 'Serviços Vendidos', icon: 'Package', categoria: 'gestao', unidade_padrao: 'unidades', descricao_hint: 'Quantidade de serviços comercializados' },
  { value: 'treinamentos', label: 'Treinamentos Concluídos', icon: 'GraduationCap', categoria: 'gestao', unidade_padrao: 'unidades', descricao_hint: 'Cursos/capacitações finalizados' },
  { value: 'equipes_completas', label: 'Equipes Completas', icon: 'UsersRound', categoria: 'gestao', unidade_padrao: 'unidades', descricao_hint: 'Equipes com quadro completo' },

  // ─── QUALIDADE ───────────────────────────────────────────
  { value: 'nps', label: 'NPS / Satisfação', icon: 'Star', categoria: 'qualidade', unidade_padrao: 'pontos', descricao_hint: 'Net Promoter Score (0-100)' },
  { value: 'avaliacao_google', label: 'Avaliação Google', icon: 'Star', categoria: 'qualidade', unidade_padrao: 'estrelas', descricao_hint: 'Nota média no Google Meu Negócio' },
  { value: 'reclamacoes', label: 'Redução de Reclamações', icon: 'AlertTriangle', categoria: 'qualidade', unidade_padrao: 'unidades', descricao_hint: 'Meta de reduzir reclamações' },
  { value: 'avaliacao_interna', label: 'Avaliação Interna', icon: 'ClipboardCheck', categoria: 'qualidade', unidade_padrao: 'pontos', descricao_hint: 'Score de auditoria interna' },

  // ─── FINANCEIRO ──────────────────────────────────────────
  { value: 'lucro', label: 'Lucro Líquido', icon: 'TrendingUp', categoria: 'financeiro', unidade_padrao: 'reais', descricao_hint: 'Lucro após despesas' },
  { value: 'despesas', label: 'Controle de Despesas', icon: 'TrendingDown', categoria: 'financeiro', unidade_padrao: 'reais', descricao_hint: 'Meta de limite de despesas' },
  { value: 'inadimplencia', label: 'Redução Inadimplência', icon: 'AlertCircle', categoria: 'financeiro', unidade_padrao: 'percentual', descricao_hint: 'Meta de reduzir inadimplência' },
  { value: 'margem', label: 'Margem de Lucro', icon: 'Percent', categoria: 'financeiro', unidade_padrao: 'percentual', descricao_hint: 'Percentual de margem sobre vendas' },

  // ─── PERSONALIZADA ───────────────────────────────────────
  { value: 'custom', label: 'Meta Personalizada', icon: 'Target', categoria: 'custom', unidade_padrao: 'unidades', descricao_hint: 'Defina livremente sua meta' },
];

// =============================================================================
// Períodos com labels
// =============================================================================

export const META_PERIODOS: { value: MetaPeriodo; label: string }[] = [
  { value: 'diario', label: 'Diário' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'mensal', label: 'Mensal' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral', label: 'Semestral' },
  { value: 'anual', label: 'Anual' },
  { value: 'custom', label: 'Personalizado' },
];

// =============================================================================
// Unidades com labels e formatação
// =============================================================================

export const META_UNIDADES: { value: MetaUnidade; label: string; prefix?: string; suffix?: string }[] = [
  { value: 'unidades', label: 'Unidades', suffix: '' },
  { value: 'reais', label: 'Reais (R$)', prefix: 'R$ ' },
  { value: 'percentual', label: 'Percentual (%)', suffix: '%' },
  { value: 'minutos', label: 'Minutos', suffix: ' min' },
  { value: 'horas', label: 'Horas', suffix: 'h' },
  { value: 'estrelas', label: 'Estrelas', suffix: ' ★' },
  { value: 'pontos', label: 'Pontos', suffix: ' pts' },
];

// =============================================================================
// Form Data (expandido)
// =============================================================================

export interface MetaFormData {
  titulo: string;
  tipo: string;
  valor_meta: number;
  data_inicio: string;
  data_fim: string;
  franqueado_id?: string;
  // Vinculação multi-nível
  department_id?: string;
  team_id?: string;
  assigned_to?: string;
  // Outros campos
  descricao?: string;
  periodo?: MetaPeriodo;
  meta_unidade?: MetaUnidade;
}

// =============================================================================
// Histórico
// =============================================================================

export interface MetaHistorico {
  id: string;
  meta_id: string;
  valor_anterior: number;
  valor_novo: number;
  usuario_id: string | null;
  created_at: string;
  usuario_nome?: string;
}

// =============================================================================
// Stats
// =============================================================================

export interface MetaStats {
  total: number;
  atingidas: number;
  em_andamento: number;
  progresso_medio: number;
}

// =============================================================================
// Helpers
// =============================================================================

/** Busca configuração de um tipo de meta pelo código */
export function getMetaTipoConfig(tipo: string): MetaTipoConfig | undefined {
  return META_TIPOS.find(t => t.value === tipo);
}

/** Busca categoria de um tipo de meta */
export function getMetaCategoria(tipo: string): MetaCategoria | undefined {
  const tipoConfig = getMetaTipoConfig(tipo);
  if (!tipoConfig) return META_CATEGORIAS.find(c => c.value === 'custom');
  return META_CATEGORIAS.find(c => c.value === tipoConfig.categoria);
}

/** Busca config de unidade */
export function getMetaUnidadeConfig(unidade: MetaUnidade | string | null | undefined) {
  return META_UNIDADES.find(u => u.value === unidade) || META_UNIDADES[0]; // fallback: unidades
}

/** Formata valor com unidade */
export function formatMetaValor(valor: number, unidade?: MetaUnidade | string | null): string {
  const config = getMetaUnidadeConfig(unidade as MetaUnidade);
  if (config?.prefix) {
    return `${config.prefix}${valor.toLocaleString('pt-BR')}`;
  }
  if (config?.suffix) {
    return `${valor.toLocaleString('pt-BR')}${config.suffix}`;
  }
  return valor.toLocaleString('pt-BR');
}

/** Agrupa META_TIPOS por categoria */
export function getMetaTiposAgrupados(): Record<string, MetaTipoConfig[]> {
  const grupos: Record<string, MetaTipoConfig[]> = {};
  for (const tipo of META_TIPOS) {
    if (!grupos[tipo.categoria]) {
      grupos[tipo.categoria] = [];
    }
    grupos[tipo.categoria].push(tipo);
  }
  return grupos;
}
