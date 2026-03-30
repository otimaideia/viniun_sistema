import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserProfile } from './useUserProfile';
import { useTenantContext } from '@/contexts/TenantContext';
import { sanitizeObjectForJSON } from '@/utils/unicodeSanitizer';
import {
  createStageEntryEvent,
  createStageExitEvent,
  processPipelineEvent,
} from '@/services/pipelineTriggers';
import type {
  FunilLead,
  FunilLeadCreate,
  FunilLeadUpdate,
  FunilLeadExpanded,
  FunilFilters,
  DropResult,
} from '@/types/funil';

const QUERY_KEY = 'funil_leads';

export function useFunilLeads(funilId: string | undefined, filters?: FunilFilters) {
  const { canViewAllLeads, unidadeId, isLoading: isProfileLoading } = useUserProfile();

  const {
    data: leads = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, funilId, filters, canViewAllLeads, unidadeId],
    queryFn: async () => {
      if (!funilId) return [];

      // Se usuário é de unidade, buscar o nome da franquia para filtrar
      let franqueadoNome: string | null = null;
      if (!canViewAllLeads && unidadeId) {
        const { data: franqueado } = await supabase
          .from('mt_franchises')
          .select('nome_fantasia')
          .eq('id', unidadeId)
          .single();
        franqueadoNome = franqueado?.nome_fantasia || null;
      }

      // Busca com joins - usando nomes de relacionamento corretos (baseados nas colunas FK)
      // Colunas corretas: mt_funnel_stages não tem 'icone' nem 'meta_dias' (usa 'dias_alerta')
      let query = supabase
        .from('mt_funnel_leads')
        .select(`
          *,
          lead:mt_leads(
            id, nome, telefone, whatsapp, email, cidade, estado, status, created_at, foto_url,
            franchise:mt_franchises(id, nome_fantasia),
            whatsapp_conversa:mt_whatsapp_conversations(id, contact_avatar, last_message_text, last_message_at, unread_count, session_id)
          ),
          stage:mt_funnel_stages(
            id, nome, descricao, cor, ordem, tipo, dias_alerta
          )
        `)
        .eq('funnel_id', funilId)
        .is('is_active', true)
        .order('prioridade', { ascending: true });

      // Aplicar filtros
      if (filters?.etapaIds && filters.etapaIds.length > 0) {
        query = query.in('stage_id', filters.etapaIds);
      }

      if (filters?.responsavelId) {
        query = query.eq('responsavel_id', filters.responsavelId);
      }

      if (filters?.valorMin !== undefined) {
        query = query.gte('valor_estimado', filters.valorMin);
      }

      if (filters?.valorMax !== undefined) {
        query = query.lte('valor_estimado', filters.valorMax);
      }

      if (filters?.dataEntradaInicio) {
        query = query.gte('data_entrada', filters.dataEntradaInicio);
      }

      if (filters?.dataEntradaFim) {
        query = query.lte('data_entrada', filters.dataEntradaFim);
      }

      if (filters?.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Processar resultado para o formato esperado (sanitizar para remover surrogates inválidos do WhatsApp)
      let processedLeads = (data || []).map((item) => {
        const sanitizedItem = sanitizeObjectForJSON(item);
        const rawLead = Array.isArray(sanitizedItem.lead) ? sanitizedItem.lead[0] : sanitizedItem.lead;
        const rawStage = Array.isArray(sanitizedItem.stage) ? sanitizedItem.stage[0] : sanitizedItem.stage;

        // Build whatsapp_cache from nested WhatsApp conversation data
        const whatsappConversas = rawLead?.whatsapp_conversa;
        const whatsappConversa = Array.isArray(whatsappConversas) ? whatsappConversas[0] : whatsappConversas;

        // Map franchise to unidade for backward compatibility
        const lead = rawLead ? {
          ...rawLead,
          unidade: rawLead.franchise?.nome_fantasia || null,
        } : undefined;

        // Map dias_alerta to meta_dias for backward compatibility
        const stage = rawStage ? {
          ...rawStage,
          meta_dias: rawStage.dias_alerta, // Alias for backward compat
          icone: null, // Column doesn't exist in MT
        } : undefined;

        // Build whatsapp_cache from conversation data
        const whatsappCache = whatsappConversa ? {
          id: whatsappConversa.id,
          lead_id: rawLead?.id || null,
          conversa_id: whatsappConversa.id,
          telefone_normalizado: rawLead?.telefone || null,
          avatar_url: whatsappConversa.contact_avatar || rawLead?.foto_url || null,
          ultima_mensagem: whatsappConversa.last_message_text || null,
          ultima_mensagem_at: whatsappConversa.last_message_at || null,
          unread_count: whatsappConversa.unread_count || 0,
          session_id: whatsappConversa.session_id || null,
        } : null;

        return {
          ...sanitizedItem,
          // Map MT column names to expected names
          data_entrada: sanitizedItem.entrou_em || sanitizedItem.data_entrada || sanitizedItem.created_at,
          data_etapa: sanitizedItem.updated_at || sanitizedItem.entrou_em || sanitizedItem.data_etapa || sanitizedItem.created_at,
          etapa_id: sanitizedItem.stage_id || sanitizedItem.etapa_id,
          lead,
          etapa: stage, // Map stage to etapa for backward compat
          stage,
          responsavel: Array.isArray(sanitizedItem.responsavel) ? sanitizedItem.responsavel[0] : sanitizedItem.responsavel,
          whatsapp_cache: whatsappCache,
        };
      }) as FunilLeadExpanded[];

      // Filtrar por unidade se o usuário não pode ver todos os leads
      if (!canViewAllLeads && franqueadoNome) {
        // Normalizar nomes removendo prefixos comuns (YESlaser, YES)
        const normalizeName = (name: string) => {
          return name
            .toLowerCase()
            .replace(/^(yeslaser|yes)\s*/i, '') // Remove "YESlaser " ou "YES " do início
            .trim();
        };

        const nomeUnidadeNormalizado = normalizeName(franqueadoNome);

        processedLeads = processedLeads.filter((item) => {
          const leadUnidade = item.lead?.unidade || '';
          const leadUnidadeNormalizado = normalizeName(leadUnidade);

          // Comparar os nomes normalizados
          return (
            leadUnidadeNormalizado === nomeUnidadeNormalizado || // Exato
            leadUnidadeNormalizado.includes(nomeUnidadeNormalizado) || // Lead contém unidade
            nomeUnidadeNormalizado.includes(leadUnidadeNormalizado) // Unidade contém lead
          );
        });
      }

      return processedLeads;
    },
    enabled: !!funilId && !isProfileLoading,
  });

  // Filtro de busca local (nome, telefone, email)
  let leadsFiltrados = leads;
  if (filters?.busca) {
    const busca = filters.busca.toLowerCase();
    leadsFiltrados = leads.filter((l) => {
      const nome = l.lead?.nome?.toLowerCase() || '';
      const telefone = l.lead?.telefone || '';
      const email = l.lead?.email?.toLowerCase() || '';
      return nome.includes(busca) || telefone.includes(busca) || email.includes(busca);
    });
  }

  // Filtro de leads esfriando
  if (filters?.apenasEsfriando) {
    leadsFiltrados = leadsFiltrados.filter((l) => {
      if (!l.etapa?.meta_dias) return false;
      const dataRef = l.data_etapa || l.data_entrada || l.created_at;
      if (!dataRef) return false;
      const diasNaEtapa = Math.floor(
        (Date.now() - new Date(dataRef).getTime()) / (1000 * 60 * 60 * 24)
      );
      return diasNaEtapa >= l.etapa.meta_dias;
    });
  }

  return { leads: leadsFiltrados, isLoading, error, refetch };
}

// Leads agrupados por etapa (para Kanban)
export function useFunilLeadsByEtapa(funilId: string | undefined, filters?: FunilFilters) {
  const { leads, isLoading, error, refetch } = useFunilLeads(funilId, filters);

  const leadsByEtapa = leads.reduce(
    (acc, lead) => {
      const etapaId = lead.stage_id || lead.etapa_id;
      if (!acc[etapaId]) {
        acc[etapaId] = [];
      }
      acc[etapaId].push(lead);
      return acc;
    },
    {} as Record<string, FunilLeadExpanded[]>
  );

  return { leadsByEtapa, leads, isLoading, error, refetch };
}

export function useFunilLeadMutations() {
  const queryClient = useQueryClient();
  const tenantContext = useTenantContext();

  const addLeadToFunil = useMutation({
    mutationFn: async (data: FunilLeadCreate) => {
      const { data: funilLead, error } = await supabase
        .from('mt_funnel_leads')
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      // Registrar entrada na etapa (histórico de tempo por etapa)
      await supabase.from('mt_funnel_stage_history').insert({
        tenant_id: tenantContext.tenant?.id,
        funnel_lead_id: funilLead.id,
        lead_id: funilLead.lead_id,
        funnel_id: funilLead.funil_id,
        stage_id: data.etapa_id,
        entered_at: new Date().toISOString(),
        moved_by: tenantContext.user?.id || null,
        move_reason: 'Adicionado ao funil',
      });

      return funilLead as FunilLead;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.funil_id] });
      toast.success('Lead adicionado ao funil!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar lead: ${error.message}`);
    },
  });

  const updateFunilLead = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FunilLeadUpdate }) => {
      const { data: funilLead, error } = await supabase
        .from('mt_funnel_leads')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return funilLead as FunilLead;
    },
    onSuccess: (lead) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, lead.funil_id] });
      toast.success('Lead atualizado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar lead: ${error.message}`);
    },
  });

  const removeLeadFromFunil = useMutation({
    mutationFn: async ({ id, funilId }: { id: string; funilId: string }) => {
      const { error } = await supabase.from('mt_funnel_leads').delete().eq('id', id);

      if (error) throw error;
      return { id, funilId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.funilId] });
      toast.success('Lead removido do funil!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover lead: ${error.message}`);
    },
  });

  // Mover lead entre etapas (usado no drag & drop)
  const moveLeadToEtapa = useMutation({
    mutationFn: async ({
      funilLeadId,
      sourceEtapaId,
      destinationEtapaId,
      newPrioridade,
      motivo,
    }: DropResult & { motivo?: string }) => {
      // 1. Atualizar a etapa do lead
      const { data: funilLead, error: updateError } = await supabase
        .from('mt_funnel_leads')
        .update({
          stage_id: destinationEtapaId,
          data_etapa: new Date().toISOString(),
          prioridade: newPrioridade ?? 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', funilLeadId)
        .select('*, funnel_id, lead_id')
        .single();

      if (updateError) throw updateError;

      // 2. Registrar saída da etapa anterior no histórico de tempo
      try {
        // Fechar registro anterior
        const { data: currentEntry } = await supabase
          .from('mt_funnel_stage_history')
          .select('id, entered_at')
          .eq('funnel_lead_id', funilLeadId)
          .eq('stage_id', sourceEtapaId)
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
              next_stage_id: destinationEtapaId,
              move_reason: motivo || 'Movido manualmente',
              moved_by: tenantContext?.user?.id || null,
            })
            .eq('id', currentEntry.id);
        }

        // Registrar entrada na nova etapa
        await supabase.from('mt_funnel_stage_history').insert({
          tenant_id: tenantContext?.tenant?.id,
          funnel_lead_id: funilLeadId,
          lead_id: funilLead.lead_id,
          funnel_id: funilLead.funnel_id,
          stage_id: destinationEtapaId,
          entered_at: new Date().toISOString(),
          moved_by: tenantContext?.user?.id || null,
        });
      } catch (historyErr) {
        console.warn('[StageHistory] Erro ao registrar histórico:', historyErr);
      }

      // 3. Disparar Pipeline Triggers (automações)
      if (tenantContext?.tenant?.id && sourceEtapaId !== destinationEtapaId) {
        try {
          // Buscar tipo da etapa destino para determinar evento correto
          const { data: destStage } = await supabase
            .from('mt_funnel_stages')
            .select('tipo')
            .eq('id', destinationEtapaId)
            .single();

          // Evento de saída da etapa anterior
          const exitEvent = createStageExitEvent({
            funilLeadId,
            funilId: funilLead.funnel_id,
            leadId: funilLead.lead_id,
            tenantId: tenantContext.tenant.id,
            franchiseId: tenantContext.franchise?.id,
            sourceStageId: sourceEtapaId,
            destinationStageId: destinationEtapaId,
          });
          processPipelineEvent(exitEvent).catch((err) =>
            console.error('[PipelineTrigger] Erro exit event:', err)
          );

          // Evento de entrada na etapa destino
          const entryEvent = createStageEntryEvent({
            funilLeadId,
            funilId: funilLead.funnel_id,
            leadId: funilLead.lead_id,
            tenantId: tenantContext.tenant.id,
            franchiseId: tenantContext.franchise?.id,
            destinationStageId: destinationEtapaId,
            sourceStageId: sourceEtapaId,
            stageType: destStage?.tipo,
          });
          processPipelineEvent(entryEvent).catch((err) =>
            console.error('[PipelineTrigger] Erro entry event:', err)
          );
        } catch (triggerErr) {
          // Não falhar o move por causa de triggers
          console.error('[PipelineTrigger] Erro ao disparar triggers:', triggerErr);
        }
      }

      return funilLead as FunilLead;
    },
    onSuccess: (lead) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, lead.funnel_id || lead.funil_id] });
      // Não exibir toast para não poluir durante drag & drop
    },
    onError: (error: Error) => {
      toast.error(`Erro ao mover lead: ${error.message}`);
    },
  });

  // Atualizar valor estimado
  const updateValorEstimado = useMutation({
    mutationFn: async ({
      funilLeadId,
      valor,
    }: {
      funilLeadId: string;
      valor: number | null;
    }) => {
      const { data: funilLead, error } = await supabase
        .from('mt_funnel_leads')
        .update({ valor_estimado: valor, updated_at: new Date().toISOString() })
        .eq('id', funilLeadId)
        .select()
        .single();

      if (error) throw error;
      return funilLead as FunilLead;
    },
    onSuccess: (lead) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, lead.funnel_id || lead.funil_id] });
      toast.success('Valor atualizado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar valor: ${error.message}`);
    },
  });

  // Atribuir responsável
  const assignResponsavel = useMutation({
    mutationFn: async ({
      funilLeadId,
      responsavelId,
    }: {
      funilLeadId: string;
      responsavelId: string | null;
    }) => {
      const { data: funilLead, error } = await supabase
        .from('mt_funnel_leads')
        .update({ responsavel_id: responsavelId, updated_at: new Date().toISOString() })
        .eq('id', funilLeadId)
        .select()
        .single();

      if (error) throw error;
      return funilLead as FunilLead;
    },
    onSuccess: (lead) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, lead.funnel_id || lead.funil_id] });
      toast.success('Responsável atribuído!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atribuir responsável: ${error.message}`);
    },
  });

  // Adicionar/remover tags
  const updateTags = useMutation({
    mutationFn: async ({
      funilLeadId,
      tags,
    }: {
      funilLeadId: string;
      tags: string[];
    }) => {
      const { data: funilLead, error } = await supabase
        .from('mt_funnel_leads')
        .update({ tags, updated_at: new Date().toISOString() })
        .eq('id', funilLeadId)
        .select()
        .single();

      if (error) throw error;
      return funilLead as FunilLead;
    },
    onSuccess: (lead) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, lead.funnel_id || lead.funil_id] });
      toast.success('Tags atualizadas!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar tags: ${error.message}`);
    },
  });

  // Adicionar leads em lote ao funil
  const addLeadsInBatch = useMutation({
    mutationFn: async ({
      funilId,
      etapaId,
      leadIds,
      responsavelId,
    }: {
      funilId: string;
      etapaId: string;
      leadIds: string[];
      responsavelId?: string;
    }) => {
      const leadsToInsert = leadIds.map((leadId) => ({
        funnel_id: funilId,
        stage_id: etapaId,
        lead_id: leadId,
        responsavel_id: responsavelId || null,
      }));

      const { data, error } = await supabase
        .from('mt_funnel_leads')
        .upsert(leadsToInsert, { onConflict: 'funnel_id,lead_id' })
        .select();

      if (error) throw error;
      return data as FunilLead[];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.funilId] });
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
      // Remover do funil atual
      const { error: removeError } = await supabase
        .from('mt_funnel_leads')
        .delete()
        .eq('lead_id', leadId)
        .eq('funnel_id', sourceFunnelId);
      if (removeError) throw removeError;

      // Adicionar ao novo funil
      const { data, error: insertError } = await supabase
        .from('mt_funnel_leads')
        .insert({
          funnel_id: destinationFunnelId,
          stage_id: destinationStageId,
          lead_id: leadId,
          tenant_id: tenantContext.tenant?.id,
          prioridade: 0,
          is_active: true,
          data_entrada: new Date().toISOString(),
          data_etapa: new Date().toISOString(),
        })
        .select()
        .single();
      if (insertError) throw insertError;

      // Registrar atividade
      try {
        const { data: funnels } = await supabase
          .from('mt_funnels')
          .select('id, nome')
          .in('id', [sourceFunnelId, destinationFunnelId]);
        const src = funnels?.find(f => f.id === sourceFunnelId);
        const dest = funnels?.find(f => f.id === destinationFunnelId);

        await supabase.from('mt_lead_activities').insert({
          tenant_id: tenantContext.tenant?.id,
          lead_id: leadId,
          tipo: 'status_change',
          titulo: `Transferido para: ${dest?.nome || 'Novo Funil'}`,
          descricao: `De "${src?.nome || 'Funil anterior'}" para "${dest?.nome || 'Novo funil'}"`,
          user_id: tenantContext.user?.id,
          user_nome: tenantContext.user?.email || 'Sistema',
        });
      } catch {}

      return { sourceFunnelId, destinationFunnelId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, result.sourceFunnelId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, result.destinationFunnelId] });
      toast.success('Lead transferido para o novo funil!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao transferir: ${error.message}`);
    },
  });

  return {
    addLeadToFunil,
    updateFunilLead,
    removeLeadFromFunil,
    moveLeadToEtapa,
    updateValorEstimado,
    assignResponsavel,
    updateTags,
    addLeadsInBatch,
    transferToFunnel,
    isAdding: addLeadToFunil.isPending,
    isUpdating: updateFunilLead.isPending,
    isRemoving: removeLeadFromFunil.isPending,
    isMoving: moveLeadToEtapa.isPending,
    isTransferring: transferToFunnel.isPending,
  };
}

// Hook para métricas do funil
export function useFunilLeadMetrics(funilId: string | undefined) {
  const { leads, isLoading, error } = useFunilLeads(funilId);

  const metrics = {
    totalLeads: leads.length,
    totalValor: leads.reduce((acc, l) => acc + (l.valor_estimado || 0), 0),
    leadsPorEtapa: {} as Record<string, { count: number; valor: number }>,
  };

  leads.forEach((lead) => {
    const etapaId = lead.stage_id || lead.etapa_id;
    if (!metrics.leadsPorEtapa[etapaId]) {
      metrics.leadsPorEtapa[etapaId] = { count: 0, valor: 0 };
    }
    metrics.leadsPorEtapa[etapaId].count++;
    metrics.leadsPorEtapa[etapaId].valor += lead.valor_estimado || 0;
  });

  return { metrics, isLoading, error };
}
