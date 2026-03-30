// =============================================================================
// ROUND ROBIN SERVICE - Distribuição automática de leads
// =============================================================================
//
// Distribui leads entre membros de uma equipe ou departamento vinculado
// a uma sessão WhatsApp usando algoritmo round-robin (rotativo).
//
// Fluxo:
// 1. Verifica se sessão tem round_robin_enabled
// 2. Busca membros ativos da equipe ou departamento
// 3. Pega próximo usuário na rotação (round robin state)
// 4. Atualiza o índice para a próxima atribuição
// 5. Retorna o user_id do próximo responsável
//
// =============================================================================

import { supabase } from '@/integrations/supabase/client';

export interface RoundRobinConfig {
  session_id: string;
  tenant_id: string;
  round_robin_enabled: boolean;
  round_robin_mode: 'team' | 'department' | 'custom';
  team_id?: string | null;
  department_id?: string | null;
  responsible_user_id?: string | null;
}

export interface RoundRobinResult {
  user_id: string | null;
  user_name?: string;
  method: 'round_robin' | 'fixed' | 'none';
}

/**
 * Busca membros ativos de uma equipe
 */
async function getTeamMembers(teamId: string): Promise<Array<{ user_id: string; nome: string }>> {
  const { data, error } = await supabase
    .from('mt_team_members')
    .select(`
      user_id,
      user:mt_users!user_id(id, nome, is_active)
    `)
    .eq('team_id', teamId)
    .eq('is_active', true);

  if (error || !data) return [];

  return data
    .filter((m: any) => m.user?.is_active)
    .map((m: any) => ({
      user_id: m.user_id,
      nome: m.user?.nome || 'Sem nome',
    }));
}

/**
 * Busca membros ativos de um departamento
 */
async function getDepartmentMembers(departmentId: string): Promise<Array<{ user_id: string; nome: string }>> {
  const { data, error } = await supabase
    .from('mt_user_departments')
    .select(`
      user_id,
      user:mt_users!user_id(id, nome, is_active)
    `)
    .eq('department_id', departmentId)
    .eq('is_active', true);

  if (error || !data) return [];

  return data
    .filter((m: any) => m.user?.is_active)
    .map((m: any) => ({
      user_id: m.user_id,
      nome: m.user?.nome || 'Sem nome',
    }));
}

/**
 * Busca ou cria o state de round robin para uma sessão
 */
async function getOrCreateState(sessionId: string, tenantId: string) {
  const { data: existing } = await supabase
    .from('mt_whatsapp_round_robin_state')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (existing) return existing;

  // Criar novo state
  const { data: created, error } = await supabase
    .from('mt_whatsapp_round_robin_state')
    .insert({
      session_id: sessionId,
      tenant_id: tenantId,
      current_user_index: 0,
      total_assigned: 0,
      user_order: [],
    })
    .select()
    .single();

  if (error) {
    console.error('[RoundRobin] Erro ao criar state:', error);
    return null;
  }

  return created;
}

/**
 * Função principal: obtém o próximo responsável via Round Robin
 *
 * @param config - Configuração da sessão
 * @returns RoundRobinResult com user_id do próximo responsável
 */
export async function getNextResponsible(config: RoundRobinConfig): Promise<RoundRobinResult> {
  // Se round robin não está habilitado, usar responsável fixo
  if (!config.round_robin_enabled) {
    return {
      user_id: config.responsible_user_id || null,
      method: config.responsible_user_id ? 'fixed' : 'none',
    };
  }

  // Buscar membros baseado no modo
  let members: Array<{ user_id: string; nome: string }> = [];

  if (config.round_robin_mode === 'team' && config.team_id) {
    members = await getTeamMembers(config.team_id);
  } else if (config.round_robin_mode === 'department' && config.department_id) {
    members = await getDepartmentMembers(config.department_id);
  }

  // Se não há membros, fallback para responsável fixo
  if (members.length === 0) {
    console.warn('[RoundRobin] Nenhum membro encontrado, usando responsável fixo');
    return {
      user_id: config.responsible_user_id || null,
      method: config.responsible_user_id ? 'fixed' : 'none',
    };
  }

  // Buscar ou criar state
  const state = await getOrCreateState(config.session_id, config.tenant_id);
  if (!state) {
    // Fallback: pegar o primeiro membro
    return {
      user_id: members[0].user_id,
      user_name: members[0].nome,
      method: 'round_robin',
    };
  }

  // Calcular o índice atual (circular)
  const currentIndex = (state.current_user_index || 0) % members.length;
  const selectedMember = members[currentIndex];

  // Atualizar state para próxima atribuição
  const nextIndex = (currentIndex + 1) % members.length;
  await supabase
    .from('mt_whatsapp_round_robin_state')
    .update({
      current_user_index: nextIndex,
      last_assigned_user_id: selectedMember.user_id,
      last_assigned_at: new Date().toISOString(),
      total_assigned: (state.total_assigned || 0) + 1,
      user_order: members.map(m => m.user_id),
      updated_at: new Date().toISOString(),
    })
    .eq('id', state.id);

  console.log(`[RoundRobin] Atribuído a ${selectedMember.nome} (${currentIndex + 1}/${members.length})`);

  return {
    user_id: selectedMember.user_id,
    user_name: selectedMember.nome,
    method: 'round_robin',
  };
}

/**
 * Busca config de round robin de uma sessão específica
 */
export async function getSessionRoundRobinConfig(sessionId: string): Promise<RoundRobinConfig | null> {
  const { data, error } = await supabase
    .from('mt_whatsapp_sessions')
    .select('id, tenant_id, round_robin_enabled, round_robin_mode, team_id, department_id, responsible_user_id')
    .eq('id', sessionId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    session_id: data.id,
    tenant_id: data.tenant_id,
    round_robin_enabled: data.round_robin_enabled ?? false,
    round_robin_mode: data.round_robin_mode || 'team',
    team_id: data.team_id,
    department_id: data.department_id,
    responsible_user_id: data.responsible_user_id,
  };
}
