// =============================================================================
// LEAD ACTIVITY LOGGER - Utilitário para registrar atividades de leads
// =============================================================================
//
// Função standalone (fire-and-forget) para inserir registros em mt_lead_activities.
// Usada por múltiplos hooks: useLeadsMT, useAgendamentosMT, useVendasMT, etc.
//
// =============================================================================

import { supabase } from '@/integrations/supabase/client';
import type { LeadActivityType } from '@/types/lead-mt';

export interface LogLeadActivityParams {
  tenantId: string;
  leadId: string;
  tipo: LeadActivityType;
  titulo: string;
  descricao: string;
  dados?: Record<string, unknown>;
  statusAnterior?: string;
  statusNovo?: string;
  userId?: string;
  userNome?: string;
}

/**
 * Registra uma atividade no histórico do lead (fire-and-forget).
 * Não lança erro - falhas são logadas no console silenciosamente.
 */
export async function logLeadActivity(params: LogLeadActivityParams): Promise<void> {
  try {
    await supabase.from('mt_lead_activities').insert({
      tenant_id: params.tenantId,
      lead_id: params.leadId,
      tipo: params.tipo,
      titulo: params.titulo,
      descricao: params.descricao,
      dados: params.dados || {},
      status_anterior: params.statusAnterior,
      status_novo: params.statusNovo,
      user_id: params.userId,
      user_nome: params.userNome || 'Sistema',
    });
  } catch (err) {
    console.error('[logLeadActivity] Erro ao registrar atividade:', err);
  }
}

/**
 * Busca o tenant_id e lead_id a partir de um registro que tem lead_id.
 * Útil para hooks de agendamentos, vendas, etc. que precisam logar no lead.
 */
export async function getLeadTenantId(leadId: string): Promise<{ tenantId: string; leadNome: string } | null> {
  try {
    const { data } = await supabase
      .from('mt_leads')
      .select('tenant_id, nome')
      .eq('id', leadId)
      .single();
    if (data) return { tenantId: data.tenant_id, leadNome: data.nome };
  } catch {
    // silently fail
  }
  return null;
}

// Labels amigáveis para campos de lead
export const FIELD_LABELS: Record<string, string> = {
  nome: 'Nome', sobrenome: 'Sobrenome', email: 'E-mail', telefone: 'Telefone',
  whatsapp: 'WhatsApp', cpf: 'CPF', data_nascimento: 'Data de Nascimento',
  genero: 'Gênero', profissao: 'Profissão', empresa: 'Empresa', cargo: 'Cargo',
  cep: 'CEP', endereco: 'Endereço', bairro: 'Bairro', cidade: 'Cidade', estado: 'Estado',
  servico_interesse: 'Serviço de Interesse', valor_estimado: 'Valor Estimado',
  temperatura: 'Temperatura', observacoes: 'Observações', tags: 'Tags',
  origem: 'Origem', campanha: 'Campanha', como_conheceu: 'Como Conheceu',
  urgencia: 'Urgência', status: 'Status', atribuido_para: 'Responsável',
  franchise_id: 'Franquia', canal_entrada: 'Canal de Entrada',
};
