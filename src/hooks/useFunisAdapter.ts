import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { sanitizeObjectForJSON } from '@/utils/unicodeSanitizer';
import { toast } from 'sonner';
import type { Funil, FunilCreate, FunilUpdate, FunilEtapa } from '@/types/funil';

// =============================================================================
// HOOKS MT PARA FUNIS
// Usam tabelas mt_funnels e mt_funnel_stages com isolamento por tenant
// =============================================================================

const QUERY_KEY = 'mt-funnels';

/**
 * Hook MT para listar funis
 */
export function useFunisAdapter(options?: { includeTemplates?: boolean; apenasAtivos?: boolean }) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const { includeTemplates = true, apenasAtivos = true } = options || {};

  const {
    data: funis = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, { includeTemplates, apenasAtivos }],
    queryFn: async () => {
      let query = supabase
        .from('mt_funnels')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Filtro por tenant/franchise
      if (accessLevel === 'platform') {
        // Platform vê todos
      } else if (tenant?.id && franchise?.id) {
        // Com franquia: funis da franquia + funis compartilhados (sem franchise_id)
        query = query.eq('tenant_id', tenant.id)
          .or(`franchise_id.eq.${franchise.id},franchise_id.is.null`);
      } else if (tenant?.id) {
        // Sem franquia: todos do tenant
        query = query.eq('tenant_id', tenant.id);
      }

      if (!includeTemplates) {
        query = query.eq('is_template', false);
      }

      if (apenasAtivos) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Sanitizar e mapear campos MT para campos legacy
      return (data || []).map((item) => mapMTFunilToLegacy(sanitizeObjectForJSON(item) as MTFunnel));
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  return { funis, isLoading: isLoading || isTenantLoading, error, refetch, _mode: 'mt' as const };
}

/**
 * Hook MT para buscar um funil específico
 */
export function useFunilAdapter(funilId: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const {
    data: funil,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, funilId],
    queryFn: async () => {
      if (!funilId) return null;

      const { data, error } = await supabase
        .from('mt_funnels')
        .select('*')
        .eq('id', funilId)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      return mapMTFunilToLegacy(sanitizeObjectForJSON(data) as MTFunnel);
    },
    enabled: !!funilId && !isTenantLoading,
  });

  return { funil, isLoading: isLoading || isTenantLoading, error, refetch, _mode: 'mt' as const };
}

/**
 * Hook MT para mutations de funil
 */
export function useFunilMutationsAdapter() {
  const { tenant, franchise, accessLevel } = useTenantContext();
  const queryClient = useQueryClient();

  const createFunil = useMutation({
    mutationFn: async (data: FunilCreate) => {
      if (!tenant?.id && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      const insertData = {
        tenant_id: tenant?.id,
        franchise_id: data.franqueado_id || franchise?.id || null,
        nome: data.nome,
        descricao: data.descricao || null,
        is_template: data.is_template || false,
        template_origem_id: data.template_origem_id || null,
        is_active: true,
      };

      const { data: funil, error } = await supabase
        .from('mt_funnels')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return mapMTFunilToLegacy(funil);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Funil criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar funil: ${error.message}`);
    },
  });

  const updateFunil = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FunilUpdate }) => {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (data.nome !== undefined) updateData.nome = data.nome;
      if (data.descricao !== undefined) updateData.descricao = data.descricao;
      if (data.ativo !== undefined) updateData.is_active = data.ativo;

      const { data: funil, error } = await supabase
        .from('mt_funnels')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return mapMTFunilToLegacy(funil);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Funil atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar funil: ${error.message}`);
    },
  });

  const deleteFunil = useMutation({
    mutationFn: async (id: string) => {
      // Soft delete
      const { error } = await supabase
        .from('mt_funnels')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Funil excluído com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir funil: ${error.message}`);
    },
  });

  const cloneFunil = useMutation({
    mutationFn: async ({
      funilOrigemId,
      novoNome,
      franqueadoId,
    }: {
      funilOrigemId: string;
      novoNome: string;
      franqueadoId?: string;
    }) => {
      // 1. Buscar funil original
      const { data: funilOrigem, error: errorOrigem } = await supabase
        .from('mt_funnels')
        .select('*')
        .eq('id', funilOrigemId)
        .single();

      if (errorOrigem) throw errorOrigem;

      // 2. Criar novo funil
      const { data: novoFunil, error: errorFunil } = await supabase
        .from('mt_funnels')
        .insert({
          tenant_id: tenant?.id || funilOrigem.tenant_id,
          franchise_id: franqueadoId || franchise?.id || null,
          nome: novoNome,
          descricao: funilOrigem.descricao,
          is_template: false,
          template_origem_id: funilOrigemId,
          is_active: true,
        })
        .select()
        .single();

      if (errorFunil) throw errorFunil;

      // 3. Buscar etapas do funil original
      const { data: etapasOrigem, error: errorEtapas } = await supabase
        .from('mt_funnel_stages')
        .select('*')
        .eq('funnel_id', funilOrigemId)
        .is('deleted_at', null)
        .order('ordem');

      if (errorEtapas) throw errorEtapas;

      // 4. Criar mapa de IDs antigos -> novos
      const idMap: Record<string, string> = {};

      // 5. Clonar etapas (primeira passagem sem automacao_destino_id)
      for (const etapa of etapasOrigem || []) {
        const { data: novaEtapa, error: errorNovaEtapa } = await supabase
          .from('mt_funnel_stages')
          .insert({
            tenant_id: novoFunil.tenant_id,
            funnel_id: novoFunil.id,
            nome: etapa.nome,
            descricao: etapa.descricao,
            cor: etapa.cor,
            icone: etapa.icone,
            ordem: etapa.ordem,
            tipo: etapa.tipo,
            meta_dias: etapa.meta_dias,
            automacao_dias: etapa.automacao_dias,
            automacao_destino_id: null,
          })
          .select()
          .single();

        if (errorNovaEtapa) throw errorNovaEtapa;
        idMap[etapa.id] = novaEtapa.id;
      }

      // 6. Atualizar automacao_destino_id com novos IDs
      for (const etapa of etapasOrigem || []) {
        if (etapa.automacao_destino_id && idMap[etapa.automacao_destino_id]) {
          await supabase
            .from('mt_funnel_stages')
            .update({ automacao_destino_id: idMap[etapa.automacao_destino_id] })
            .eq('id', idMap[etapa.id]);
        }
      }

      return mapMTFunilToLegacy(novoFunil);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['mt-funnel-stages'] });
      toast.success('Funil clonado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao clonar funil: ${error.message}`);
    },
  });

  const createFunilComEtapasPadrao = useMutation({
    mutationFn: async ({
      funilData,
      etapas,
    }: {
      funilData: FunilCreate;
      etapas: Omit<FunilEtapa, 'id' | 'funil_id' | 'created_at'>[];
    }) => {
      if (!tenant?.id && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      // 1. Criar funil
      const { data: funil, error: errorFunil } = await supabase
        .from('mt_funnels')
        .insert({
          tenant_id: tenant?.id,
          franchise_id: funilData.franqueado_id || franchise?.id || null,
          nome: funilData.nome,
          descricao: funilData.descricao || null,
          is_template: funilData.is_template || false,
          is_active: true,
        })
        .select()
        .single();

      if (errorFunil) throw errorFunil;

      // 2. Criar etapas
      const etapasComFunilId = etapas.map((etapa) => ({
        tenant_id: tenant?.id,
        funnel_id: funil.id,
        nome: etapa.nome,
        descricao: etapa.descricao || null,
        cor: etapa.cor,
        icone: etapa.icone,
        ordem: etapa.ordem,
        tipo: etapa.tipo,
        meta_dias: etapa.meta_dias,
        automacao_dias: etapa.automacao_dias,
        automacao_destino_id: etapa.automacao_destino_id,
      }));

      const { error: errorEtapas } = await supabase
        .from('mt_funnel_stages')
        .insert(etapasComFunilId);

      if (errorEtapas) throw errorEtapas;

      return mapMTFunilToLegacy(funil);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['mt-funnel-stages'] });
      toast.success('Funil criado com etapas padrão!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar funil: ${error.message}`);
    },
  });

  return {
    createFunil,
    updateFunil,
    deleteFunil,
    cloneFunil,
    createFunilComEtapasPadrao,
    isCreating: createFunil.isPending,
    isUpdating: updateFunil.isPending,
    isDeleting: deleteFunil.isPending,
    isCloning: cloneFunil.isPending,
    _mode: 'mt' as const,
  };
}

/**
 * Hook MT para buscar templates de funil
 */
export function useFunilTemplatesAdapter() {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const {
    data: templates = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, 'templates', tenant?.id],
    queryFn: async () => {
      let query = supabase
        .from('mt_funnels')
        .select('*')
        .eq('is_template', true)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('nome');

      // Templates podem ser globais ou do tenant
      if (tenant?.id && accessLevel !== 'platform') {
        query = query.or(`tenant_id.eq.${tenant.id},tenant_id.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).map(mapMTFunilToLegacy);
    },
    enabled: !isTenantLoading,
  });

  return { templates, isLoading: isLoading || isTenantLoading, error, refetch, _mode: 'mt' as const };
}

// =============================================================================
// HELPERS
// =============================================================================

interface MTFunnel {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  nome: string;
  descricao: string | null;
  is_template: boolean;
  template_origem_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function mapMTFunilToLegacy(mtFunnel: MTFunnel): Funil {
  return {
    id: mtFunnel.id,
    nome: mtFunnel.nome,
    descricao: mtFunnel.descricao,
    franqueado_id: mtFunnel.franchise_id,
    is_template: mtFunnel.is_template,
    template_origem_id: mtFunnel.template_origem_id,
    ativo: mtFunnel.is_active,
    created_at: mtFunnel.created_at,
    updated_at: mtFunnel.updated_at,
  };
}
