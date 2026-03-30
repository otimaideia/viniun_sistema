// =============================================================================
// USE FUNIL LEADS MT - Hook Multi-Tenant para Funil de Vendas
// =============================================================================
//
// Este hook gerencia leads no funil de vendas com isolamento por tenant.
// Utiliza as tabelas mt_funnel_leads e mt_funnel_stages com RLS.
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { sanitizeObjectForJSON } from '@/utils/unicodeSanitizer';
import { logLeadActivity, getLeadTenantId } from '@/utils/leadActivityLogger';
import type { MTLead } from '@/types/lead-mt';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface MTFunnelStage {
  id: string;
  tenant_id: string;
  funnel_id: string;
  nome: string;
  descricao?: string | null;
  cor: string;
  ordem: number;
  tipo: string; // 'entrada' | 'padrao' | 'ganho' | 'perda'
  dias_alerta?: number | null;
  total_leads?: number;
  tempo_medio_dias?: number | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface MTFunnelLead {
  id: string;
  tenant_id: string;
  funnel_id: string;
  stage_id: string;
  lead_id: string;
  prioridade: number;
  valor_estimado?: number | null;
  responsavel_id?: string | null;
  tags?: string[] | null;
  data_entrada: string;
  data_etapa: string;
  created_at: string;
  updated_at: string;

  // Relacionamentos
  lead?: MTLead;
  stage?: MTFunnelStage;
  responsavel?: {
    id: string;
    nome: string;
    email: string;
    avatar_url?: string;
  };
}

export interface MTFunnel {
  id: string;
  tenant_id: string;
  nome: string;
  descricao?: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  stages?: MTFunnelStage[];
}

export interface MTFunnelFilters {
  stageIds?: string[];
  responsavelId?: string;
  valorMin?: number;
  valorMax?: number;
  dataEntradaInicio?: string;
  dataEntradaFim?: string;
  tags?: string[];
  search?: string;
  apenasEsfriando?: boolean;
}

export interface DropResult {
  funnelLeadId: string;
  sourceStageId: string;
  destinationStageId: string;
  newPrioridade?: number;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-funnel-leads';
const FUNNEL_QUERY_KEY = 'mt-funnels';
const STAGES_QUERY_KEY = 'mt-funnel-stages';

// -----------------------------------------------------------------------------
// Hook: Listar Funis
// -----------------------------------------------------------------------------

export function useFunnelsMT() {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: [FUNNEL_QUERY_KEY, tenant?.id],
    queryFn: async (): Promise<MTFunnel[]> => {
      let q = supabase
        .from('mt_funnels')
        .select(`
          *,
          stages:mt_funnel_stages (
            id, nome, cor, ordem, tipo, dias_alerta
          )
        `)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('is_default', { ascending: false })
        .order('nome', { ascending: true });

      if (tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar funis MT:', error);
        throw error;
      }

      // Ordenar stages por ordem e sanitizar Unicode
      return (data || []).map(funnel => sanitizeObjectForJSON({
        ...funnel,
        stages: (funnel.stages || []).sort((a: MTFunnelStage, b: MTFunnelStage) => a.ordem - b.ordem),
      })) as MTFunnel[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 1, // 1 minuto (Kanban precisa de updates rápidos)
  });
}

// -----------------------------------------------------------------------------
// Hook: Listar Etapas de um Funil
// -----------------------------------------------------------------------------

export function useFunnelStagesMT(funnelId: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: [STAGES_QUERY_KEY, funnelId],
    queryFn: async (): Promise<MTFunnelStage[]> => {
      if (!funnelId) return [];

      const { data, error } = await supabase
        .from('mt_funnel_stages')
        .select('*')
        .eq('funnel_id', funnelId)
        .is('deleted_at', null)
        .order('ordem', { ascending: true });

      if (error) {
        console.error('Erro ao buscar etapas MT:', error);
        throw error;
      }

      return (data || []).map(item => sanitizeObjectForJSON(item)) as MTFunnelStage[];
    },
    enabled: !!funnelId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });
}

// -----------------------------------------------------------------------------
// Hook Principal: Leads no Funil
// -----------------------------------------------------------------------------

export function useFunilLeadsMT(funnelId: string | undefined, filters?: MTFunnelFilters) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: [QUERY_KEY, funnelId, filters, tenant?.id, franchise?.id],
    queryFn: async (): Promise<MTFunnelLead[]> => {
      if (!funnelId) return [];

      let q = supabase
        .from('mt_funnel_leads')
        .select(`
          *,
          lead:mt_leads (
            id, nome, telefone, whatsapp, email, cidade, estado, status, created_at,
            franchise:mt_franchises (id, nome)
          ),
          stage:mt_funnel_stages (
            id, nome, cor, ordem, tipo, dias_alerta
          ),
          responsavel:mt_users (
            id, nome, email, avatar_url
          )
        `)
        .eq('funnel_id', funnelId)
        .order('prioridade', { ascending: true });

      // Filtros por nível de acesso
      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      // Filtros opcionais
      if (filters?.stageIds?.length) {
        q = q.in('stage_id', filters.stageIds);
      }

      if (filters?.responsavelId) {
        q = q.eq('responsavel_id', filters.responsavelId);
      }

      if (filters?.valorMin !== undefined) {
        q = q.gte('valor_estimado', filters.valorMin);
      }

      if (filters?.valorMax !== undefined) {
        q = q.lte('valor_estimado', filters.valorMax);
      }

      if (filters?.dataEntradaInicio) {
        q = q.gte('data_entrada', filters.dataEntradaInicio);
      }

      if (filters?.dataEntradaFim) {
        q = q.lte('data_entrada', filters.dataEntradaFim);
      }

      if (filters?.tags?.length) {
        q = q.overlaps('tags', filters.tags);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar leads do funil MT:', error);
        throw error;
      }

      // Processar resultado e sanitizar Unicode (previne surrogates inválidos)
      let processedLeads = (data || []).map((item) => sanitizeObjectForJSON({
        ...item,
        lead: Array.isArray(item.lead) ? item.lead[0] : item.lead,
        stage: Array.isArray(item.stage) ? item.stage[0] : item.stage,
        responsavel: Array.isArray(item.responsavel) ? item.responsavel[0] : item.responsavel,
      })) as MTFunnelLead[];

      // Filtro de busca local
      if (filters?.search) {
        const search = filters.search.toLowerCase();
        processedLeads = processedLeads.filter((l) => {
          const nome = l.lead?.nome?.toLowerCase() || '';
          const telefone = l.lead?.telefone || '';
          const email = l.lead?.email?.toLowerCase() || '';
          return nome.includes(search) || telefone.includes(search) || email.includes(search);
        });
      }

      // Filtro de leads esfriando (passaram do tempo na etapa)
      if (filters?.apenasEsfriando) {
        processedLeads = processedLeads.filter((l) => {
          if (!l.stage?.dias_alerta) return false;
          const diasNaEtapa = Math.floor(
            (Date.now() - new Date(l.data_etapa).getTime()) / (1000 * 60 * 60 * 24)
          );
          return diasNaEtapa >= l.stage.dias_alerta;
        });
      }

      // Filtrar por franchise se necessário
      if (accessLevel === 'franchise' && franchise) {
        processedLeads = processedLeads.filter((l) => {
          return l.lead?.franchise?.id === franchise.id;
        });
      }

      return processedLeads;
    },
    enabled: !!funnelId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  return {
    leads: query.data || [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

// -----------------------------------------------------------------------------
// Hook: Leads Agrupados por Etapa (para Kanban)
// -----------------------------------------------------------------------------

export function useFunilLeadsByEtapaMT(funnelId: string | undefined, filters?: MTFunnelFilters) {
  const { leads, isLoading, error, refetch } = useFunilLeadsMT(funnelId, filters);

  const leadsByEtapa = leads.reduce(
    (acc, lead) => {
      const stageId = lead.stage_id;
      if (!acc[stageId]) {
        acc[stageId] = [];
      }
      acc[stageId].push(lead);
      return acc;
    },
    {} as Record<string, MTFunnelLead[]>
  );

  return { leadsByEtapa, leads, isLoading, error, refetch };
}

// -----------------------------------------------------------------------------
// Hook: Mutations do Funil
// -----------------------------------------------------------------------------

export function useFunilLeadMutationsMT() {
  const queryClient = useQueryClient();
  const { tenant, franchise } = useTenantContext();
  const { user } = useAuth();

  // Adicionar lead ao funil
  const addLeadToFunnel = useMutation({
    mutationFn: async (data: {
      funnel_id: string;
      stage_id: string;
      lead_id: string;
      responsavel_id?: string | null;
      valor_estimado?: number | null;
    }): Promise<MTFunnelLead> => {
      if (!tenant) throw new Error('Tenant não definido');

      const { data: funnelLead, error } = await supabase
        .from('mt_funnel_leads')
        .insert({
          tenant_id: tenant.id,
          funnel_id: data.funnel_id,
          stage_id: data.stage_id,
          lead_id: data.lead_id,
          responsavel_id: data.responsavel_id,
          valor_estimado: data.valor_estimado,
          prioridade: 0,
          data_entrada: new Date().toISOString(),
          data_etapa: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Registrar entrada no histórico de tempo
      try {
        await supabase.from('mt_funnel_stage_history').insert({
          tenant_id: tenant.id,
          funnel_lead_id: funnelLead.id,
          lead_id: data.lead_id,
          funnel_id: data.funnel_id,
          stage_id: data.stage_id,
          entered_at: new Date().toISOString(),
        });
      } catch (historyErr) {
        console.warn('[StageHistory] Erro ao registrar entrada:', historyErr);
      }

      return funnelLead as MTFunnelLead;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.funnel_id] });
      toast.success('Lead adicionado ao funil!');

      // Log atividade no lead
      if (tenant?.id) {
        logLeadActivity({
          tenantId: tenant.id,
          leadId: variables.lead_id,
          tipo: 'sistema',
          titulo: 'Adicionado ao Funil',
          descricao: 'Lead foi adicionado ao funil de vendas',
          dados: { funnel_id: variables.funnel_id, stage_id: variables.stage_id },
          userId: user?.id,
          userNome: user?.email || 'Sistema',
        });
      }
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar lead: ${error.message}`);
    },
  });

  // Mover lead entre etapas (drag & drop)
  const moveLeadToStage = useMutation({
    mutationFn: async ({
      funnelLeadId,
      sourceStageId,
      destinationStageId,
      newPrioridade,
      motivo,
    }: DropResult & { motivo?: string }): Promise<MTFunnelLead> => {
      const { data: funnelLead, error: updateError } = await supabase
        .from('mt_funnel_leads')
        .update({
          stage_id: destinationStageId,
          data_etapa: new Date().toISOString(),
          prioridade: newPrioridade ?? 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', funnelLeadId)
        .select('*, funnel_id')
        .single();

      if (updateError) throw updateError;

      // Registrar no histórico de tempo por etapa
      try {
        // Fechar registro anterior
        const { data: currentEntry } = await supabase
          .from('mt_funnel_stage_history')
          .select('id, entered_at')
          .eq('funnel_lead_id', funnelLeadId)
          .eq('stage_id', sourceStageId)
          .is('exited_at', null)
          .order('entered_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (currentEntry) {
          const exitedAt = new Date();
          const enteredAt = new Date(currentEntry.entered_at);
          const durationSeconds = Math.floor((exitedAt.getTime() - enteredAt.getTime()) / 1000);

          await supabase
            .from('mt_funnel_stage_history')
            .update({
              exited_at: exitedAt.toISOString(),
              duration_seconds: durationSeconds,
              next_stage_id: destinationStageId,
              move_reason: motivo || 'Movido manualmente',
            })
            .eq('id', currentEntry.id);
        }

        // Registrar entrada na nova etapa
        await supabase.from('mt_funnel_stage_history').insert({
          tenant_id: tenant?.id,
          funnel_lead_id: funnelLeadId,
          lead_id: funnelLead.lead_id,
          funnel_id: funnelLead.funnel_id,
          stage_id: destinationStageId,
          entered_at: new Date().toISOString(),
        });
      } catch (historyErr) {
        console.warn('[StageHistory] Erro ao registrar historico:', historyErr);
      }

      // Registrar atividade no lead (mt_lead_activities)
      try {
        // Buscar nomes das etapas
        const { data: stages } = await supabase
          .from('mt_funnel_stages')
          .select('id, nome')
          .in('id', [sourceStageId, destinationStageId]);

        const sourceStage = stages?.find(s => s.id === sourceStageId);
        const destStage = stages?.find(s => s.id === destinationStageId);

        await supabase.from('mt_lead_activities').insert({
          tenant_id: tenant?.id,
          lead_id: funnelLead.lead_id,
          tipo: 'status_change',
          titulo: `Movido no Funil: ${destStage?.nome || 'Nova Etapa'}`,
          descricao: `De "${sourceStage?.nome || 'Etapa anterior'}" para "${destStage?.nome || 'Nova etapa'}"${motivo ? ` - Motivo: ${motivo}` : ''}`,
          dados: {
            funnel_id: funnelLead.funnel_id,
            source_stage_id: sourceStageId,
            destination_stage_id: destinationStageId,
            source_stage_nome: sourceStage?.nome,
            destination_stage_nome: destStage?.nome,
          },
          user_id: user?.id,
          user_nome: user?.email || 'Sistema',
        });
      } catch (activityErr) {
        console.warn('[FunnelActivity] Erro ao registrar atividade:', activityErr);
      }

      return funnelLead as MTFunnelLead;
    },
    onSuccess: (lead) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, lead.funnel_id] });
      queryClient.invalidateQueries({ queryKey: ['mt-lead-activities'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao mover lead: ${error.message}`);
    },
  });

  // Atualizar valor estimado
  const updateValorEstimado = useMutation({
    mutationFn: async ({
      funnelLeadId,
      valor,
    }: {
      funnelLeadId: string;
      valor: number | null;
    }): Promise<MTFunnelLead> => {
      const { data: funnelLead, error } = await supabase
        .from('mt_funnel_leads')
        .update({ valor_estimado: valor, updated_at: new Date().toISOString() })
        .eq('id', funnelLeadId)
        .select()
        .single();

      if (error) throw error;
      return funnelLead as MTFunnelLead;
    },
    onSuccess: (lead) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, lead.funnel_id] });
      toast.success('Valor atualizado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar valor: ${error.message}`);
    },
  });

  // Atribuir responsável
  const assignResponsavel = useMutation({
    mutationFn: async ({
      funnelLeadId,
      responsavelId,
    }: {
      funnelLeadId: string;
      responsavelId: string | null;
    }): Promise<MTFunnelLead> => {
      const { data: funnelLead, error } = await supabase
        .from('mt_funnel_leads')
        .update({ responsavel_id: responsavelId, updated_at: new Date().toISOString() })
        .eq('id', funnelLeadId)
        .select()
        .single();

      if (error) throw error;
      return funnelLead as MTFunnelLead;
    },
    onSuccess: (lead) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, lead.funnel_id] });
      toast.success('Responsável atribuído!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atribuir responsável: ${error.message}`);
    },
  });

  // Atualizar tags
  const updateTags = useMutation({
    mutationFn: async ({
      funnelLeadId,
      tags,
    }: {
      funnelLeadId: string;
      tags: string[];
    }): Promise<MTFunnelLead> => {
      const { data: funnelLead, error } = await supabase
        .from('mt_funnel_leads')
        .update({ tags, updated_at: new Date().toISOString() })
        .eq('id', funnelLeadId)
        .select()
        .single();

      if (error) throw error;
      return funnelLead as MTFunnelLead;
    },
    onSuccess: (lead) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, lead.funnel_id] });
      toast.success('Tags atualizadas!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar tags: ${error.message}`);
    },
  });

  // Remover lead do funil
  const removeLeadFromFunnel = useMutation({
    mutationFn: async ({ id, funnelId }: { id: string; funnelId: string }): Promise<void> => {
      const { error } = await supabase
        .from('mt_funnel_leads')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.funnelId] });
      toast.success('Lead removido do funil!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover lead: ${error.message}`);
    },
  });

  // Adicionar leads em lote
  const addLeadsInBatch = useMutation({
    mutationFn: async ({
      funnelId,
      stageId,
      leadIds,
      responsavelId,
    }: {
      funnelId: string;
      stageId: string;
      leadIds: string[];
      responsavelId?: string;
    }): Promise<MTFunnelLead[]> => {
      if (!tenant) throw new Error('Tenant não definido');

      const leadsToInsert = leadIds.map((leadId) => ({
        tenant_id: tenant.id,
        funnel_id: funnelId,
        stage_id: stageId,
        lead_id: leadId,
        responsavel_id: responsavelId || null,
        prioridade: 0,
        data_entrada: new Date().toISOString(),
        data_etapa: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from('mt_funnel_leads')
        .upsert(leadsToInsert, { onConflict: 'funnel_id,lead_id' })
        .select();

      if (error) throw error;
      return data as MTFunnelLead[];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.funnelId] });
      toast.success(`${variables.leadIds.length} leads adicionados ao funil!`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar leads: ${error.message}`);
    },
  });

  // Transferir lead para outro funil
  const transferToFunnel = useMutation({
    mutationFn: async ({
      leadId,
      sourceFunnelId,
      destinationFunnelId,
      destinationStageId,
    }: {
      leadId: string;
      sourceFunnelId: string;
      destinationFunnelId: string;
      destinationStageId: string;
    }) => {
      if (!tenant?.id) throw new Error('Tenant não definido');

      // 1. Remover do funil atual
      const { error: removeError } = await supabase
        .from('mt_funnel_leads')
        .delete()
        .eq('lead_id', leadId)
        .eq('funnel_id', sourceFunnelId);

      if (removeError) throw removeError;

      // 2. Adicionar ao novo funil
      const { data: newEntry, error: insertError } = await supabase
        .from('mt_funnel_leads')
        .insert({
          funnel_id: destinationFunnelId,
          stage_id: destinationStageId,
          lead_id: leadId,
          tenant_id: tenant.id,
          prioridade: 0,
          is_active: true,
          data_entrada: new Date().toISOString(),
          data_etapa: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 3. Registrar atividade
      try {
        const { data: funnels } = await supabase
          .from('mt_funnels')
          .select('id, nome')
          .in('id', [sourceFunnelId, destinationFunnelId]);

        const srcFunnel = funnels?.find(f => f.id === sourceFunnelId);
        const destFunnel = funnels?.find(f => f.id === destinationFunnelId);

        await supabase.from('mt_lead_activities').insert({
          tenant_id: tenant.id,
          lead_id: leadId,
          tipo: 'status_change',
          titulo: `Transferido para funil: ${destFunnel?.nome || 'Novo Funil'}`,
          descricao: `De "${srcFunnel?.nome || 'Funil anterior'}" para "${destFunnel?.nome || 'Novo funil'}"`,
          dados: {
            source_funnel_id: sourceFunnelId,
            destination_funnel_id: destinationFunnelId,
            source_funnel_nome: srcFunnel?.nome,
            destination_funnel_nome: destFunnel?.nome,
          },
          user_id: user?.id,
          user_nome: user?.email || 'Sistema',
        });
      } catch (activityErr) {
        console.warn('[TransferFunnel] Erro ao registrar atividade:', activityErr);
      }

      return newEntry as MTFunnelLead;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.sourceFunnelId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.destinationFunnelId] });
      queryClient.invalidateQueries({ queryKey: ['mt-lead-activities'] });
      toast.success('Lead transferido para o novo funil!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao transferir lead: ${error.message}`);
    },
  });

  return {
    addLeadToFunnel,
    moveLeadToStage,
    transferToFunnel,
    updateValorEstimado,
    assignResponsavel,
    updateTags,
    removeLeadFromFunnel,
    addLeadsInBatch,
    isAdding: addLeadToFunnel.isPending,
    isMoving: moveLeadToStage.isPending,
    isRemoving: removeLeadFromFunnel.isPending,
    isTransferring: transferToFunnel.isPending,
  };
}

// -----------------------------------------------------------------------------
// Hook: Métricas do Funil
// -----------------------------------------------------------------------------

export function useFunilMetricsMT(funnelId: string | undefined) {
  const { leads, isLoading, error } = useFunilLeadsMT(funnelId);

  const metrics = {
    totalLeads: leads.length,
    totalValor: leads.reduce((acc, l) => acc + (l.valor_estimado || 0), 0),
    leadsPorEtapa: {} as Record<string, { count: number; valor: number }>,
  };

  leads.forEach((lead) => {
    const stageId = lead.stage_id;
    if (!metrics.leadsPorEtapa[stageId]) {
      metrics.leadsPorEtapa[stageId] = { count: 0, valor: 0 };
    }
    metrics.leadsPorEtapa[stageId].count++;
    metrics.leadsPorEtapa[stageId].valor += lead.valor_estimado || 0;
  });

  return { metrics, isLoading, error };
}

export default useFunilLeadsMT;
