// Tipos para o sistema de módulos por franquia

export interface Modulo {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  icone: string;
  categoria: string;
  ordem: number;
  is_core: boolean;
  created_at: string;
}

export interface FranqueadoModulo {
  id: string;
  franqueado_id: string;
  modulo_id: string;
  is_active: boolean;
  ativado_em?: string;
  ativado_por?: string;
  configuracoes: Record<string, any>;
  created_at: string;
  // Campos do JOIN com módulo
  modulo?: Modulo;
}

// Códigos de módulos disponíveis (sincronizado com mt_modules)
export type ModuloCodigo =
  // SISTEMA
  | 'dashboard'
  | 'usuarios'
  | 'relatorios'
  | 'automacoes'
  | 'api_webhooks'
  | 'configuracoes'
  | 'integracoes'
  | 'aprovacoes'
  | 'documentos'
  // VENDAS
  | 'leads'
  | 'funil'
  | 'vendas'
  // OPERAÇÃO
  | 'agendamentos'
  | 'estoque'
  | 'checklist'
  | 'processos'
  | 'tarefas'
  // COMUNICAÇÃO
  | 'whatsapp'
  | 'chatbot'
  | 'meta_messenger'
  | 'ai_agents'
  | 'broadcast'
  | 'yesia'
  // MARKETING
  | 'formularios'
  | 'influenciadoras'
  | 'parcerias'
  | 'campanhas'
  | 'promocoes'
  | 'marketing'
  // GESTÃO
  | 'franqueados'
  | 'metas'
  | 'servicos'
  | 'financeiro'
  | 'precificacao'
  | 'projecao'
  | 'patrimonio'
  | 'departamentos'
  | 'produtividade'
  | 'equipes'
  | 'diretorias'
  // RH
  | 'recrutamento'
  | 'treinamentos'
  // RELATÓRIOS
  | 'ranking';

// Categorias de módulos
export type ModuloCategoria =
  | 'vendas'
  | 'sistema'
  | 'gestao'
  | 'organizacao'
  | 'marketing'
  | 'comunicacao'
  | 'operacao'
  | 'rh'
  | 'relatorios';

// Mapeamento de rotas por módulo (sincronizado com mt_modules + App.tsx)
export const MODULO_ROUTES: Record<ModuloCodigo, string[]> = {
  // SISTEMA
  dashboard: ['/'],
  usuarios: ['/usuarios'],
  relatorios: ['/relatorios'],
  automacoes: ['/automacoes'],
  api_webhooks: ['/api-webhooks'],
  configuracoes: ['/configuracoes/cargos'],
  integracoes: ['/integracoes'],
  aprovacoes: ['/aprovacoes'],
  documentos: ['/documentos'],
  // VENDAS
  leads: ['/leads', '/leads/dashboard', '/indicacoes'],
  funil: ['/funil', '/funil/relatorios'],
  vendas: ['/vendas', '/vendas/tabela-precos', '/vendas/comissoes', '/vendas/tratamentos'],
  // OPERAÇÃO
  agendamentos: ['/agendamentos'],
  estoque: ['/estoque', '/estoque/insumos', '/estoque/movimentacoes', '/estoque/consumos', '/estoque/vinculos', '/estoque/fornecedores'],
  checklist: ['/checklist', '/checklist/diario', '/checklist/diario/gestor', '/checklist/relatorios'],
  processos: ['/processos', '/processos/categorias', '/processos/dashboard', '/faq', '/faq/dashboard'],
  tarefas: ['/tarefas', '/tarefas/dashboard', '/tarefas/configuracoes'],
  // COMUNICAÇÃO
  whatsapp: ['/whatsapp/conversas', '/whatsapp/sessoes', '/whatsapp/configuracoes'],
  chatbot: ['/chatbot'],
  meta_messenger: ['/meta-messenger/config', '/meta-messenger/conversations'],
  ai_agents: ['/ia', '/ia/config', '/ia/agentes', '/ia/custos', '/ia/knowledge', '/ia/memoria', '/ia/treinamento', '/ia/aprendizado', '/ia/analytics', '/ia/proatividade', '/ia/trafego'],
  broadcast: ['/whatsapp/broadcast', '/whatsapp/listas'],
  yesia: ['/yesia'],
  // MARKETING
  formularios: ['/formularios'],
  influenciadoras: ['/influenciadoras'],
  parcerias: ['/parcerias'],
  campanhas: ['/marketing/campanhas'],
  promocoes: ['/promocoes'],
  marketing: ['/marketing', '/marketing/galeria'],
  // GESTÃO
  franqueados: ['/franqueados', '/minha-franquia', '/franquia'],
  metas: ['/metas'],
  servicos: ['/servicos'],
  financeiro: ['/financeiro', '/financeiro/lancamentos', '/financeiro/contas', '/financeiro/categorias', '/financeiro/relatorios'],
  precificacao: ['/precificacao'],
  projecao: ['/financeiro/projecao'],
  patrimonio: ['/patrimonio'],
  departamentos: ['/configuracoes/departamentos'],
  produtividade: ['/produtividade', '/produtividade/ponto', '/produtividade/escala-impressao', '/produtividade/resumo', '/meu-ponto'],
  equipes: ['/configuracoes/equipes'],
  diretorias: ['/configuracoes/diretorias'],
  // RH
  recrutamento: ['/recrutamento', '/vagas', '/candidatos', '/entrevistas'],
  treinamentos: ['/treinamentos', '/treinamentos/trilhas', '/aprender', '/gamificacao', '/gamificacao/ranking', '/gamificacao/conquistas'],
  // RELATÓRIOS
  ranking: ['/ranking'],
};

// Labels para categorias
export const CATEGORIA_LABELS: Record<ModuloCategoria, string> = {
  vendas: 'Vendas',
  sistema: 'Sistema',
  gestao: 'Gestão',
  organizacao: 'Organização',
  marketing: 'Marketing',
  comunicacao: 'Comunicação',
  operacao: 'Operação',
  rh: 'Recursos Humanos',
  relatorios: 'Relatórios',
};
