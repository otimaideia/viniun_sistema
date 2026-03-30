// =============================================================================
// USE DIRETORIAS ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para gestão de diretorias usando tabela MT
// SISTEMA 100% MT - Usa mt_directories com isolamento por tenant
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { Diretoria, DiretoriaFormData, DiretoriaStats } from '@/types/diretoria';

// =============================================================================
// Types MT
// =============================================================================

interface MTDirectory {
  id: string;
  tenant_id: string;
  name: string;
  code: string | null;
  description: string | null;
  director_name: string | null;
  director_email: string | null;
  director_phone: string | null;
  region: string | null;
  is_active: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  tenant?: {
    id: string;
    slug: string;
    nome_fantasia: string;
  };
}

export interface DiretoriaAdaptada extends Diretoria {
  tenant_id?: string;
}

// =============================================================================
// Helper: Mapear MT para Legacy
// =============================================================================

function mapMTToLegacy(mtDir: MTDirectory, franchiseCount: number = 0): DiretoriaAdaptada {
  return {
    id: mtDir.id,
    nome: mtDir.name,
    regiao: mtDir.region || undefined,
    descricao: mtDir.description || undefined,
    responsavel_id: undefined, // MT usa director_name diretamente
    is_active: mtDir.is_active,
    created_at: mtDir.created_at,
    updated_at: mtDir.updated_at,
    franquias_count: franchiseCount,
    tenant_id: mtDir.tenant_id,
  };
}

// =============================================================================
// Query Keys
// =============================================================================

const QUERY_KEY = 'mt-diretorias';

// =============================================================================
// Hook Principal
// =============================================================================

export function useDiretoriasAdapter() {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ==========================================================================
  // Query: Listar Diretorias
  // ==========================================================================
  const {
    data: diretoriasRaw = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, accessLevel],
    queryFn: async () => {
      let query = supabase
        .from('mt_directories')
        .select(`
          *,
          tenant:mt_tenants(id, slug, nome_fantasia)
        `)
        .order('name', { ascending: true });

      // Filtrar por nível de acesso
      if (accessLevel === 'tenant' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      } else if (accessLevel !== 'platform') {
        if (tenant) {
          query = query.eq('tenant_id', tenant.id);
        }
      }

      const { data: directories, error: dirError } = await query;

      if (dirError) {
        console.error('[MT] Erro ao buscar diretorias:', dirError);
        throw dirError;
      }

      // Buscar contagem de franquias por diretoria
      // Nota: mt_franchises tem campo directory_id
      const directoryIds = (directories || []).map((d: MTDirectory) => d.id);

      let franchiseCounts: Record<string, number> = {};
      if (directoryIds.length > 0) {
        const { data: franchises } = await supabase
          .from('mt_franchises')
          .select('directory_id')
          .in('directory_id', directoryIds);

        if (franchises) {
          franchises.forEach((f: { directory_id: string | null }) => {
            if (f.directory_id) {
              franchiseCounts[f.directory_id] = (franchiseCounts[f.directory_id] || 0) + 1;
            }
          });
        }
      }

      return (directories || []).map((d: MTDirectory) => ({
        ...d,
        franchiseCount: franchiseCounts[d.id] || 0,
      }));
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Mapear para formato legacy
  const diretorias: DiretoriaAdaptada[] = diretoriasRaw.map(
    (d: MTDirectory & { franchiseCount: number }) => mapMTToLegacy(d, d.franchiseCount)
  );

  // ==========================================================================
  // Mutation: Criar Diretoria
  // ==========================================================================
  const createMutation = useMutation({
    mutationFn: async (data: DiretoriaFormData) => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      const mtData = {
        tenant_id: tenant?.id,
        name: data.nome,
        region: data.regiao || null,
        description: data.descricao || null,
        is_active: data.is_active ?? true,
      };

      const { data: created, error } = await supabase
        .from('mt_directories')
        .insert(mtData)
        .select(`
          *,
          tenant:mt_tenants(id, slug, nome_fantasia)
        `)
        .single();

      if (error) {
        console.error('[MT] Erro ao criar diretoria:', error);
        throw error;
      }

      return mapMTToLegacy(created as MTDirectory);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Diretoria criada com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Error creating diretoria:', error);
      toast.error('Erro ao criar diretoria');
    },
  });

  // ==========================================================================
  // Mutation: Atualizar Diretoria
  // ==========================================================================
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: DiretoriaFormData & { id: string }) => {
      const mtData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (data.nome !== undefined) mtData.name = data.nome;
      if (data.regiao !== undefined) mtData.region = data.regiao;
      if (data.descricao !== undefined) mtData.description = data.descricao;
      if (data.is_active !== undefined) mtData.is_active = data.is_active;

      const { data: updated, error } = await supabase
        .from('mt_directories')
        .update(mtData)
        .eq('id', id)
        .select(`
          *,
          tenant:mt_tenants(id, slug, nome_fantasia)
        `)
        .single();

      if (error) {
        console.error('[MT] Erro ao atualizar diretoria:', error);
        throw error;
      }

      return mapMTToLegacy(updated as MTDirectory);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Diretoria atualizada com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Error updating diretoria:', error);
      toast.error('Erro ao atualizar diretoria');
    },
  });

  // ==========================================================================
  // Mutation: Deletar Diretoria
  // ==========================================================================
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Primeiro, desvincula franquias
      await supabase
        .from('mt_franchises')
        .update({ directory_id: null })
        .eq('directory_id', id);

      // Depois, deleta a diretoria
      const { error } = await supabase
        .from('mt_directories')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[MT] Erro ao deletar diretoria:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['mt-franchises'] });
      toast.success('Diretoria removida com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Error deleting diretoria:', error);
      toast.error('Erro ao remover diretoria');
    },
  });

  // ==========================================================================
  // Mutation: Vincular Franquia
  // ==========================================================================
  const vincularFranquiaMutation = useMutation({
    mutationFn: async ({
      franqueadoId,
      diretoriaId,
    }: {
      franqueadoId: string;
      diretoriaId: string | null;
    }) => {
      const { error } = await supabase
        .from('mt_franchises')
        .update({ directory_id: diretoriaId })
        .eq('id', franqueadoId);

      if (error) {
        console.error('[MT] Erro ao vincular franquia:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['mt-franchises'] });
      toast.success('Franquia vinculada com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Error linking franquia:', error);
      toast.error('Erro ao vincular franquia');
    },
  });

  // ==========================================================================
  // Stats Computados
  // ==========================================================================
  const getStats = (): DiretoriaStats => {
    return {
      total: diretorias.length,
      ativas: diretorias.filter((d) => d.is_active).length,
      inativas: diretorias.filter((d) => !d.is_active).length,
    };
  };

  return {
    diretorias,
    isLoading: isLoading || isTenantLoading,
    error,
    refetch,
    stats: getStats(),
    createDiretoria: createMutation.mutate,
    updateDiretoria: updateMutation.mutate,
    deleteDiretoria: deleteMutation.mutate,
    vincularFranquia: vincularFranquiaMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    _mode: 'mt' as const,
  };
}

// Re-exportar tipos
export type { Diretoria, DiretoriaFormData, DiretoriaStats } from '@/types/diretoria';

// =============================================================================
// Helper: Verificar modo atual (sempre MT)
// =============================================================================

export function getDiretoriasMode(): 'mt' {
  return 'mt';
}

export default useDiretoriasAdapter;
