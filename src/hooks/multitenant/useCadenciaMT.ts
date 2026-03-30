import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';

// =============================================================================
// TIPOS
// =============================================================================

export interface CadenciaConfig {
  id: string;
  tenant_id: string;
  franchise_id?: string | null;
  funnel_id?: string | null;
  stage_id?: string | null;
  nome: string;
  is_active: boolean;
  min_tentativas: number;
  max_tentativas: number;
  intervalo_dias: number[];
  canais: string[];
  acao_max_tentativas: string;
  etapa_destino_sem_resposta?: string | null;
  etapa_destino_respondeu?: string | null;
  templates_por_tentativa?: string[] | null;
  session_id?: string | null;
  created_at: string;
  updated_at: string;
}

export type CadenciaStatus = 'ativa' | 'pausada' | 'respondeu' | 'esgotada' | 'convertida';

export interface CadenciaExecucao {
  id: string;
  tenant_id: string;
  cadencia_config_id?: string | null;
  lead_id: string;
  funnel_lead_id?: string | null;
  tentativa_atual: number;
  status: CadenciaStatus;
  ultima_tentativa_em?: string | null;
  proxima_tentativa_em?: string | null;
  respondeu_em?: string | null;
  canal_resposta?: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  config?: CadenciaConfig | null;
  lead?: { id: string; nome: string; telefone?: string } | null;
}

export interface CadenciaTentativa {
  id: string;
  execucao_id: string;
  tentativa_numero: number;
  canal: string;
  template_id?: string | null;
  mensagem_enviada?: string | null;
  status: string;
  enviada_em: string;
  entregue_em?: string | null;
  lida_em?: string | null;
  respondida_em?: string | null;
  resultado_ligacao?: string | null;
  duracao_segundos?: number | null;
  created_at: string;
}

export interface CadenciaLeadInfo {
  tentativa_atual: number;
  max_tentativas: number;
  status: CadenciaStatus;
  proxima_tentativa_em?: string | null;
  ultima_tentativa_em?: string | null;
  atrasado: boolean;
}

// =============================================================================
// HOOK: useCadenciaConfig - Config da cadência por funil/etapa
// =============================================================================

export function useCadenciaConfig(funnelId?: string, stageId?: string) {
  const { tenant, isLoading: isTenantLoading } = useTenantContext();

  const query = useQuery({
    queryKey: ['mt-cadencia-config', tenant?.id, funnelId, stageId],
    queryFn: async () => {
      let q = supabase
        .from('mt_cadencia_config' as any)
        .select('*')
        .eq('is_active', true);

      if (tenant?.id) q = q.eq('tenant_id', tenant.id);
      if (funnelId) q = q.eq('funnel_id', funnelId);
      if (stageId) q = q.eq('stage_id', stageId);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as CadenciaConfig[];
    },
    enabled: !isTenantLoading && !!tenant,
  });

  return {
    configs: query.data || [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
  };
}

// =============================================================================
// HOOK: useCadenciaExecucao - Estado da cadência de um lead
// =============================================================================

export function useCadenciaExecucao(leadId?: string) {
  const { tenant, isLoading: isTenantLoading } = useTenantContext();

  const query = useQuery({
    queryKey: ['mt-cadencia-execucao', leadId],
    queryFn: async () => {
      if (!leadId) return null;

      const { data, error } = await supabase
        .from('mt_cadencia_execucao' as any)
        .select('*, config:mt_cadencia_config(*)')
        .eq('lead_id', leadId)
        .eq('status', 'ativa')
        .maybeSingle();

      if (error) throw error;
      return data as CadenciaExecucao | null;
    },
    enabled: !isTenantLoading && !!leadId,
  });

  return {
    execucao: query.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
  };
}

// =============================================================================
// HOOK: useCadenciaLeadInfo - Info resumida para KanbanCard
// =============================================================================

export function useCadenciaLeadInfo(leadId?: string): CadenciaLeadInfo | null {
  const { execucao, isLoading } = useCadenciaExecucao(leadId);

  if (isLoading || !execucao) return null;

  const config = execucao.config as CadenciaConfig | null;
  const maxTentativas = config?.max_tentativas || 5;
  const agora = new Date();
  const proximaTentativa = execucao.proxima_tentativa_em
    ? new Date(execucao.proxima_tentativa_em)
    : null;

  return {
    tentativa_atual: execucao.tentativa_atual,
    max_tentativas: maxTentativas,
    status: execucao.status,
    proxima_tentativa_em: execucao.proxima_tentativa_em,
    ultima_tentativa_em: execucao.ultima_tentativa_em,
    atrasado: proximaTentativa ? agora > proximaTentativa : false,
  };
}

// =============================================================================
// HOOK: useCadenciaMutations - Registrar tentativas e ações
// =============================================================================

export function useCadenciaMutations() {
  const { tenant } = useTenantContext();
  const queryClient = useQueryClient();

  // Iniciar cadência para um lead
  const iniciarCadencia = useMutation({
    mutationFn: async ({ leadId, configId, funnelLeadId }: {
      leadId: string;
      configId: string;
      funnelLeadId?: string;
    }) => {
      if (!tenant?.id) throw new Error('Tenant não definido');

      // Buscar config para calcular próxima tentativa
      const { data: config } = await supabase
        .from('mt_cadencia_config' as any)
        .select('intervalo_dias')
        .eq('id', configId)
        .single();

      const intervaloDias = (config as any)?.intervalo_dias || [1];
      const proximaTentativa = new Date();
      proximaTentativa.setDate(proximaTentativa.getDate() + intervaloDias[0]);

      const { data, error } = await supabase
        .from('mt_cadencia_execucao' as any)
        .upsert({
          tenant_id: tenant.id,
          cadencia_config_id: configId,
          lead_id: leadId,
          funnel_lead_id: funnelLeadId,
          tentativa_atual: 0,
          status: 'ativa',
          proxima_tentativa_em: proximaTentativa.toISOString(),
        }, { onConflict: 'cadencia_config_id,lead_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-cadencia-execucao'] });
    },
  });

  // Registrar tentativa de contato
  const registrarTentativa = useMutation({
    mutationFn: async ({
      execucaoId,
      canal,
      mensagem,
      templateId,
      resultadoLigacao,
    }: {
      execucaoId: string;
      canal: string;
      mensagem?: string;
      templateId?: string;
      resultadoLigacao?: string;
    }) => {
      // Buscar execução atual
      const { data: execucao } = await supabase
        .from('mt_cadencia_execucao' as any)
        .select('*, config:mt_cadencia_config(*)')
        .eq('id', execucaoId)
        .single();

      if (!execucao) throw new Error('Execução não encontrada');

      const config = (execucao as any).config;
      const novaTentativa = ((execucao as any).tentativa_atual || 0) + 1;
      const intervaloDias = config?.intervalo_dias || [1, 2, 2, 3, 3, 4];
      const maxTentativas = config?.max_tentativas || 8;

      // Registrar tentativa
      const { error: tentError } = await supabase
        .from('mt_cadencia_tentativas' as any)
        .insert({
          execucao_id: execucaoId,
          tentativa_numero: novaTentativa,
          canal,
          template_id: templateId || null,
          mensagem_enviada: mensagem || null,
          resultado_ligacao: resultadoLigacao || null,
        });

      if (tentError) throw tentError;

      // Calcular próxima tentativa
      const indiceDias = Math.min(novaTentativa, intervaloDias.length - 1);
      const diasAteProxima = intervaloDias[indiceDias] || 3;
      const proximaTentativa = new Date();
      proximaTentativa.setDate(proximaTentativa.getDate() + diasAteProxima);

      // Atualizar execução
      const novoStatus = novaTentativa >= maxTentativas ? 'esgotada' : 'ativa';

      const { error: updateError } = await supabase
        .from('mt_cadencia_execucao' as any)
        .update({
          tentativa_atual: novaTentativa,
          status: novoStatus,
          ultima_tentativa_em: new Date().toISOString(),
          proxima_tentativa_em: novoStatus === 'ativa' ? proximaTentativa.toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', execucaoId);

      if (updateError) throw updateError;

      return { novaTentativa, novoStatus, maxTentativas };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['mt-cadencia-execucao'] });
      if (result.novoStatus === 'esgotada') {
        toast.warning(`Cadência esgotada (${result.maxTentativas} tentativas). Lead será movido.`);
      } else {
        toast.success(`Tentativa ${result.novaTentativa}/${result.maxTentativas} registrada`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Erro ao registrar tentativa: ${error.message}`);
    },
  });

  // Marcar como respondeu
  const marcarRespondeu = useMutation({
    mutationFn: async ({ execucaoId, canal }: { execucaoId: string; canal: string }) => {
      const { error } = await supabase
        .from('mt_cadencia_execucao' as any)
        .update({
          status: 'respondeu',
          respondeu_em: new Date().toISOString(),
          canal_resposta: canal,
          proxima_tentativa_em: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', execucaoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-cadencia-execucao'] });
      toast.success('Lead respondeu! Movendo para Interessada.');
    },
  });

  return {
    iniciarCadencia,
    registrarTentativa,
    marcarRespondeu,
  };
}

// =============================================================================
// HOOK: useCadenciaStats - Métricas da cadência
// =============================================================================

export function useCadenciaStats(funnelId?: string) {
  const { tenant, isLoading: isTenantLoading } = useTenantContext();

  const query = useQuery({
    queryKey: ['mt-cadencia-stats', tenant?.id, funnelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mt_cadencia_execucao' as any)
        .select('status, proxima_tentativa_em, tentativa_atual');

      if (error) throw error;

      const items = (data || []) as CadenciaExecucao[];
      const agora = new Date();

      return {
        total: items.length,
        ativas: items.filter(e => e.status === 'ativa').length,
        responderam: items.filter(e => e.status === 'respondeu').length,
        esgotadas: items.filter(e => e.status === 'esgotada').length,
        convertidas: items.filter(e => e.status === 'convertida').length,
        atrasadas: items.filter(e =>
          e.status === 'ativa' &&
          e.proxima_tentativa_em &&
          new Date(e.proxima_tentativa_em) < agora
        ).length,
        mediasTentativas: items.length > 0
          ? Math.round(items.reduce((sum, e) => sum + (e.tentativa_atual || 0), 0) / items.length * 10) / 10
          : 0,
      };
    },
    enabled: !isTenantLoading && !!tenant,
  });

  return {
    stats: query.data,
    isLoading: query.isLoading || isTenantLoading,
  };
}

// =============================================================================
// HOOK: useCadenciaBatch - Carrega cadência de todos os leads de um funil (para Kanban)
// =============================================================================

export function useCadenciaBatch(funnelId?: string) {
  const { tenant, isLoading: isTenantLoading } = useTenantContext();

  const query = useQuery({
    queryKey: ['mt-cadencia-batch', funnelId],
    queryFn: async () => {
      if (!funnelId) return {};

      const { data, error } = await supabase
        .from('mt_cadencia_execucao' as any)
        .select('lead_id, tentativa_atual, status, proxima_tentativa_em, ultima_tentativa_em, config:mt_cadencia_config(max_tentativas)')
        .eq('status', 'ativa');

      if (error) throw error;

      const agora = new Date();
      const map: Record<string, CadenciaLeadInfo> = {};

      for (const item of (data || []) as any[]) {
        const maxTentativas = item.config?.max_tentativas || 5;
        const proximaTentativa = item.proxima_tentativa_em ? new Date(item.proxima_tentativa_em) : null;

        map[item.lead_id] = {
          tentativa_atual: item.tentativa_atual || 0,
          max_tentativas: maxTentativas,
          status: item.status,
          proxima_tentativa_em: item.proxima_tentativa_em,
          ultima_tentativa_em: item.ultima_tentativa_em,
          atrasado: proximaTentativa ? agora > proximaTentativa : false,
        };
      }

      return map;
    },
    enabled: !isTenantLoading && !!funnelId,
    staleTime: 60000, // 1 min
  });

  return {
    cadenciaMap: query.data || {},
    isLoading: query.isLoading || isTenantLoading,
  };
}
