// Matches mt_roles enum in database
// Hierarquia de acesso (do mais alto para o mais baixo):
// super_admin = acesso total a todas as franquias
// admin = administrador da franquia (acesso total na unidade)
// diretoria = diretoria regional (acesso total)
// franqueado = dono/gestor da franquia
// central = central de atendimento (leads + whatsapp de todas unidades)
// gerente = gerente da unidade (gerencia equipe e operação)
// marketing = equipe de marketing (campanhas, influenciadoras, formulários)
// sdr = pré-vendas (prospecção e qualificação de leads)
// consultora_vendas = consultora de vendas (antigo atendente)
// avaliadora = avaliadora técnica (antigo avaliador)
// aplicadora = profissional que realiza serviços (vê própria agenda)
// esteticista = profissional especializado (vê própria agenda)
// unidade = colaborador da unidade (somente visualização)
export type AppRole =
  | 'super_admin'
  | 'admin'
  | 'diretoria'
  | 'franqueado'
  | 'central'
  | 'gerente'
  | 'marketing'
  | 'sdr'
  | 'consultora_vendas'
  | 'avaliadora'
  | 'aplicadora'
  | 'esteticista'
  | 'unidade'
  | 'corretor'
  | 'captador';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  unidade_id: string | null; // uuid - links to mt_franchises
  is_admin: boolean;
  is_approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface UserWithRole extends UserProfile {
  role: AppRole;
}

// Módulos do sistema
export type ModuleName =
  | 'dashboard'
  | 'leads'
  | 'funil'
  | 'agendamentos'
  | 'whatsapp'
  | 'franqueados'
  | 'recrutamento'
  | 'influenciadoras'
  | 'marketing'
  | 'formularios'
  | 'relatorios'
  | 'usuarios'
  | 'configuracoes'
  | 'aprovacoes'
  | 'broadcast'
  | 'estoque'
  | 'vendas'
  | 'financeiro'
  | 'servicos'
  | 'processos'
  | 'treinamentos'
  | 'precificacao'
  | 'documentos'
  | 'patrimonio';

// Permissões por módulo
export interface ModulePermission {
  id: string;
  role: AppRole;
  modulo_id: string;
  modulo_nome: ModuleName;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

// Unidades vinculadas ao usuário
export interface UserUnidade {
  id: string;
  user_id: string;
  unidade_id: string;
  unidade_nome?: string;
  created_at: string;
}

// Fases do funil de vendas
export type FunilFase =
  | 'lead_novo'
  | 'lead_quente'
  | 'avaliacao'
  | 'cliente'
  | 'recuperacao'
  | 'inativo';

// Status dentro de cada fase
export type FunilStatus =
  // Lead Quente
  | 'fluxo_cadencia'
  | 'interessada'
  | 'negociacao_iniciada'
  | 'proposta_enviada'
  // Avaliação
  | 'avaliacao_agendada_presencial'
  | 'avaliacao_agendada_online'
  | 'checkin_totem'
  | 'checkin_online'
  // Cliente
  | 'marcou_pagamento'
  | 'link_enviado'
  | 'pago'
  // Inativo
  | 'perdido'
  | 'sem_retorno';
