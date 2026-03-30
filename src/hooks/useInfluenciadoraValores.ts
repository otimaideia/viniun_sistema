// =============================================================================
// USE INFLUENCIADORA VALORES - Hook Multi-Tenant para Valores/Preços
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';

// =============================================================================
// Types - Mapeados para as colunas reais da tabela MT
// =============================================================================

export interface MTInfluencerValue {
  id: string;
  tenant_id: string;
  influencer_id: string;
  content_type: string; // 'post' | 'story' | 'reels' | 'video' | 'live'
  platform: string; // 'instagram' | 'tiktok' | 'youtube' | etc.
  base_value: number;
  min_value: number | null;
  max_value: number | null;
  currency: string;
  includes_rights: boolean;
  rights_duration_days: number | null;
  notes: string | null;
  is_negotiable: boolean;
  is_active: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface MTInfluencerValueCreate {
  influencer_id: string;
  content_type: string;
  platform: string;
  base_value: number;
  min_value?: number | null;
  max_value?: number | null;
  currency?: string;
  includes_rights?: boolean;
  rights_duration_days?: number | null;
  notes?: string | null;
  is_negotiable?: boolean;
  is_active?: boolean;
}

export interface MTInfluencerValueUpdate extends Partial<Omit<MTInfluencerValueCreate, 'influencer_id'>> {
  id: string;
}

// Interface adaptada para compatibilidade com código legado
export interface InfluenciadoraValorAdaptado {
  id: string;
  influenciadora_id: string;
  plataforma: string;
  tipo_conteudo: string;
  valor: number;
  valor_minimo: number | null;
  valor_maximo: number | null;
  moeda: string;
  inclui_direitos: boolean;
  dias_direitos: number | null;
  descricao: string | null;
  negociavel: boolean;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function mapMTToAdaptado(mtValue: MTInfluencerValue): InfluenciadoraValorAdaptado {
  return {
    id: mtValue.id,
    influenciadora_id: mtValue.influencer_id,
    plataforma: mtValue.platform,
    tipo_conteudo: mtValue.content_type,
    valor: mtValue.base_value,
    valor_minimo: mtValue.min_value,
    valor_maximo: mtValue.max_value,
    moeda: mtValue.currency || 'BRL',
    inclui_direitos: mtValue.includes_rights,
    dias_direitos: mtValue.rights_duration_days,
    descricao: mtValue.notes,
    negociavel: mtValue.is_negotiable,
    ativo: mtValue.is_active,
    created_at: mtValue.created_at,
    updated_at: mtValue.updated_at,
  };
}

// =============================================================================
// Hook Principal
// =============================================================================

export function useInfluenciadoraValores(influenciadoraId?: string) {
  const { tenant, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ==========================================================================
  // Query: Buscar valores de uma influenciadora
  // ==========================================================================
  const {
    data: valoresRaw,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['mt-influencer-values', influenciadoraId, tenant?.id],
    queryFn: async (): Promise<MTInfluencerValue[]> => {
      if (!influenciadoraId) return [];

      const { data, error: fetchError } = await supabase
        .from('mt_influencer_values')
        .select('*')
        .eq('influencer_id', influenciadoraId)
        .eq('is_active', true)
        .order('platform', { ascending: true })
        .order('content_type', { ascending: true });

      if (fetchError) throw fetchError;
      return (data || []) as MTInfluencerValue[];
    },
    enabled: !!influenciadoraId && !isTenantLoading,
  });

  // Mapear para formato adaptado
  const valores = valoresRaw?.map(mapMTToAdaptado) || [];

  // Agrupar valores por plataforma
  const valoresPorPlataforma = valores.reduce((acc, valor) => {
    if (!acc[valor.plataforma]) {
      acc[valor.plataforma] = [];
    }
    acc[valor.plataforma].push(valor);
    return acc;
  }, {} as Record<string, InfluenciadoraValorAdaptado[]>);

  // ==========================================================================
  // Mutation: Criar valor
  // ==========================================================================
  const createValor = useMutation({
    mutationFn: async (valor: {
      influenciadora_id: string;
      plataforma: string;
      tipo_conteudo: string;
      valor: number;
      negociavel?: boolean;
      descricao?: string;
    }) => {
      if (!tenant) throw new Error('Tenant não carregado');

      // Verificar se já existe esse tipo de valor
      const { data: existing } = await supabase
        .from('mt_influencer_values')
        .select('id')
        .eq('influencer_id', valor.influenciadora_id)
        .eq('platform', valor.plataforma)
        .eq('content_type', valor.tipo_conteudo)
        .maybeSingle();

      if (existing) {
        // Atualizar ao invés de criar
        const { data, error: updateError } = await supabase
          .from('mt_influencer_values')
          .update({
            base_value: valor.valor,
            is_negotiable: valor.negociavel ?? false,
            notes: valor.descricao || null,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (updateError) throw updateError;
        return data;
      }

      // Criar novo
      const { data, error: insertError } = await supabase
        .from('mt_influencer_values')
        .insert({
          tenant_id: tenant.id,
          influencer_id: valor.influenciadora_id,
          platform: valor.plataforma,
          content_type: valor.tipo_conteudo,
          base_value: valor.valor,
          is_negotiable: valor.negociavel ?? false,
          notes: valor.descricao || null,
          is_active: true,
          currency: 'BRL',
          includes_rights: false,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-influencer-values'] });
      toast.success('Valor salvo com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar valor: ${error.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Atualizar valor
  // ==========================================================================
  const updateValor = useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      valor?: number;
      negociavel?: boolean;
      descricao?: string;
    }) => {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.valor !== undefined) updateData.base_value = updates.valor;
      if (updates.negociavel !== undefined) updateData.is_negotiable = updates.negociavel;
      if (updates.descricao !== undefined) updateData.notes = updates.descricao;

      const { data, error: updateError } = await supabase
        .from('mt_influencer_values')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-influencer-values'] });
      toast.success('Valor atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar valor: ${error.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Salvar múltiplos valores
  // ==========================================================================
  const saveValores = useMutation({
    mutationFn: async (novosValores: Array<{
      influenciadora_id: string;
      plataforma: string;
      tipo_conteudo: string;
      valor: number;
      negociavel?: boolean;
      descricao?: string;
    }>) => {
      if (!tenant) throw new Error('Tenant não carregado');

      for (const valor of novosValores) {
        const { data: existing } = await supabase
          .from('mt_influencer_values')
          .select('id')
          .eq('influencer_id', valor.influenciadora_id)
          .eq('platform', valor.plataforma)
          .eq('content_type', valor.tipo_conteudo)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('mt_influencer_values')
            .update({
              base_value: valor.valor,
              is_negotiable: valor.negociavel ?? false,
              notes: valor.descricao || null,
              is_active: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('mt_influencer_values')
            .insert({
              tenant_id: tenant.id,
              influencer_id: valor.influenciadora_id,
              platform: valor.plataforma,
              content_type: valor.tipo_conteudo,
              base_value: valor.valor,
              is_negotiable: valor.negociavel ?? false,
              notes: valor.descricao || null,
              is_active: true,
              currency: 'BRL',
              includes_rights: false,
            });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-influencer-values'] });
      toast.success('Todos os valores foram salvos');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar valores: ${error.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Desativar valor (soft delete)
  // ==========================================================================
  const desativarValor = useMutation({
    mutationFn: async (id: string) => {
      const { data, error: updateError } = await supabase
        .from('mt_influencer_values')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-influencer-values'] });
      toast.success('Valor removido');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover valor: ${error.message}`);
    },
  });

  return {
    valores,
    valoresPorPlataforma,
    isLoading: isLoading || isTenantLoading,
    error,
    refetch,
    createValor,
    updateValor,
    saveValores,
    desativarValor,
  };
}

export default useInfluenciadoraValores;
