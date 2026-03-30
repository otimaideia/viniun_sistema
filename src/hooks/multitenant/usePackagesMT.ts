// =============================================================================
// USE PACKAGES MT - Hook Multi-Tenant para Gerenciamento de Pacotes
// =============================================================================
//
// CRUD completo para mt_packages + mt_package_items
// Pacotes agrupam serviços/produtos com preço promocional
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { MTService } from './useServicosMT';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface MTPackageItem {
  id: string;
  tenant_id: string;
  package_id: string;
  service_id: string;
  quantidade: number;
  preco_unitario: number | null;
  ordem: number;
  created_at: string;
  // Relations
  service?: MTService;
}

export interface MTPackage {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  codigo: string | null;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  // Pricing
  preco_original: number;
  preco_pacote: number;
  desconto_percentual: number | null;
  moeda: string;
  // Validade
  data_inicio: string | null;
  data_fim: string | null;
  // Visual
  imagem_url: string | null;
  // Link de compra
  url: string | null;
  url_slug: string | null;
  // Link com campanha
  campanha_id: string | null;
  // Controle
  tags: string[] | null;
  is_active: boolean;
  is_promocional: boolean;
  destaque: boolean;
  max_vendas: number | null;
  vendas_realizadas: number;
  ordem: number;
  // Timestamps
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Relations
  items?: MTPackageItem[];
  tenant?: {
    id: string;
    slug: string;
    nome_fantasia: string;
  };
  campanha?: {
    id: string;
    nome: string;
  };
}

export interface MTPackageCreate {
  nome: string;
  preco_pacote: number;
  tenant_id?: string;
  franchise_id?: string;
  codigo?: string;
  descricao?: string;
  categoria?: string;
  preco_original?: number;
  moeda?: string;
  data_inicio?: string;
  data_fim?: string;
  imagem_url?: string;
  url?: string;
  url_slug?: string;
  campanha_id?: string;
  tags?: string[];
  is_active?: boolean;
  is_promocional?: boolean;
  destaque?: boolean;
  max_vendas?: number;
  ordem?: number;
}

export interface MTPackageUpdate extends Partial<MTPackageCreate> {
  id: string;
}

export interface MTPackageItemCreate {
  package_id: string;
  service_id: string;
  tenant_id?: string;
  quantidade?: number;
  preco_unitario?: number;
  ordem?: number;
}

export interface MTPackageFilters {
  categoria?: string;
  is_active?: boolean;
  is_promocional?: boolean;
  destaque?: boolean;
  vigentes?: boolean; // Filtra apenas pacotes dentro da validade
  search?: string;
}

// -----------------------------------------------------------------------------
// Constantes
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-packages';

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

function getErrorMessage(error: any): string {
  if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
    return 'Erro de conexão. Verifique sua internet e tente novamente.';
  }

  const pgCode = error?.code;
  if (pgCode) {
    switch (pgCode) {
      case '23505':
        return 'Este pacote já existe (código duplicado).';
      case '23503':
        return 'Este pacote está vinculado a outros dados.';
      case '23502':
        return 'Preencha todos os campos obrigatórios.';
      case '42501':
        return 'Você não tem permissão para realizar esta ação.';
      default:
        break;
    }
  }

  return error?.message || 'Erro desconhecido. Tente novamente.';
}

// -----------------------------------------------------------------------------
// Hook Principal
// -----------------------------------------------------------------------------

export function usePackagesMT(filters?: MTPackageFilters) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query Principal - Listar Pacotes com Itens
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, filters?.categoria, filters?.is_active, filters?.vigentes, filters?.search],
    queryFn: async (): Promise<MTPackage[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado.');
      }

      let q = supabase
        .from('mt_packages')
        .select(`
          *,
          tenant:mt_tenants (id, slug, nome_fantasia),
          campanha:mt_campaigns (id, nome),
          items:mt_package_items (
            id, tenant_id, package_id, service_id, quantidade, preco_unitario, ordem, created_at,
            service:mt_services (id, nome, nome_curto, preco, tipo, categoria, imagem_url, duracao_minutos)
          )
        `)
        .is('deleted_at', null)
        .order('ordem', { ascending: true })
        .order('nome', { ascending: true });

      // Filtro por tenant
      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      // Filtros opcionais
      if (filters?.categoria) {
        q = q.eq('categoria', filters.categoria);
      }

      if (filters?.is_active !== undefined) {
        q = q.eq('is_active', filters.is_active);
      }

      if (filters?.is_promocional !== undefined) {
        q = q.eq('is_promocional', filters.is_promocional);
      }

      if (filters?.destaque !== undefined) {
        q = q.eq('destaque', filters.destaque);
      }

      // Filtro de validade (vigentes)
      if (filters?.vigentes) {
        const hoje = new Date().toISOString().split('T')[0];
        q = q.or(`data_inicio.is.null,data_inicio.lte.${hoje}`)
             .or(`data_fim.is.null,data_fim.gte.${hoje}`);
      }

      if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        q = q.or(`nome.ilike.${searchTerm},descricao.ilike.${searchTerm},codigo.ilike.${searchTerm}`);
      }

      const { data, error } = await q;

      if (error) {
        // Tabela pode não existir ainda
        if (error.code === '42P01') {
          console.warn('Tabela mt_packages não existe ainda');
          return [];
        }
        console.error('Erro ao buscar pacotes MT:', error);
        throw error;
      }

      return (data || []) as MTPackage[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 5,
  });

  // ---------------------------------------------------------------------------
  // Mutation: Criar Pacote
  // ---------------------------------------------------------------------------

  const createPackage = useMutation({
    mutationFn: async (newPkg: MTPackageCreate): Promise<MTPackage> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const pkgData = {
        ...newPkg,
        tenant_id: newPkg.tenant_id || tenant!.id,
        franchise_id: newPkg.franchise_id || franchise?.id || null,
        is_active: newPkg.is_active ?? true,
        is_promocional: newPkg.is_promocional ?? false,
        destaque: newPkg.destaque ?? false,
        ordem: newPkg.ordem ?? 0,
        moeda: newPkg.moeda || 'BRL',
        vendas_realizadas: 0,
      };

      const { data, error } = await supabase
        .from('mt_packages')
        .insert(pkgData)
        .select(`
          *,
          tenant:mt_tenants (id, slug, nome_fantasia),
          campanha:mt_campaigns (id, nome)
        `)
        .single();

      if (error) {
        console.error('Erro ao criar pacote MT:', error);
        throw error;
      }

      return data as MTPackage;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Pacote "${data.nome}" criado com sucesso!`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar Pacote
  // ---------------------------------------------------------------------------

  const updatePackage = useMutation({
    mutationFn: async ({ id, ...updates }: MTPackageUpdate): Promise<MTPackage> => {
      if (!id) {
        throw new Error('ID do pacote é obrigatório.');
      }

      const { data, error } = await supabase
        .from('mt_packages')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
          *,
          tenant:mt_tenants (id, slug, nome_fantasia),
          campanha:mt_campaigns (id, nome)
        `)
        .single();

      if (error) {
        console.error('Erro ao atualizar pacote MT:', error);
        throw error;
      }

      return data as MTPackage;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Pacote "${data.nome}" atualizado!`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Deletar Pacote (soft delete)
  // ---------------------------------------------------------------------------

  const deletePackage = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!id) {
        throw new Error('ID do pacote é obrigatório.');
      }

      const { error } = await supabase
        .from('mt_packages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar pacote MT:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Pacote removido com sucesso!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Adicionar Item ao Pacote
  // ---------------------------------------------------------------------------

  const addItem = useMutation({
    mutationFn: async (item: MTPackageItemCreate): Promise<MTPackageItem> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const { data, error } = await supabase
        .from('mt_package_items')
        .insert({
          ...item,
          tenant_id: item.tenant_id || tenant!.id,
          quantidade: item.quantidade ?? 1,
          ordem: item.ordem ?? 0,
        })
        .select(`
          *,
          service:mt_services (id, nome, nome_curto, preco, tipo, categoria, imagem_url, duracao_minutos)
        `)
        .single();

      if (error) {
        console.error('Erro ao adicionar item ao pacote:', error);
        throw error;
      }

      return data as MTPackageItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Remover Item do Pacote
  // ---------------------------------------------------------------------------

  const removeItem = useMutation({
    mutationFn: async (itemId: string): Promise<void> => {
      const { error } = await supabase
        .from('mt_package_items')
        .delete()
        .eq('id', itemId);

      if (error) {
        console.error('Erro ao remover item do pacote:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar Itens em Lote (substituir todos os itens)
  // ---------------------------------------------------------------------------

  const replaceItems = useMutation({
    mutationFn: async ({ packageId, items }: {
      packageId: string;
      items: Omit<MTPackageItemCreate, 'package_id'>[];
    }): Promise<void> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido.');
      }

      const tenantId = tenant!.id;

      // 1. Remover itens existentes
      const { error: deleteError } = await supabase
        .from('mt_package_items')
        .delete()
        .eq('package_id', packageId);

      if (deleteError) {
        console.error('Erro ao remover itens existentes:', deleteError);
        throw deleteError;
      }

      // 2. Inserir novos itens
      if (items.length > 0) {
        const novosItens = items.map((item, idx) => ({
          package_id: packageId,
          service_id: item.service_id,
          tenant_id: item.tenant_id || tenantId,
          quantidade: item.quantidade ?? 1,
          preco_unitario: item.preco_unitario ?? null,
          ordem: item.ordem ?? idx,
        }));

        const { error: insertError } = await supabase
          .from('mt_package_items')
          .insert(novosItens);

        if (insertError) {
          console.error('Erro ao inserir novos itens:', insertError);
          throw insertError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Itens do pacote atualizados!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    pacotes: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: query.refetch,

    createPacote: {
      mutate: createPackage.mutate,
      mutateAsync: createPackage.mutateAsync,
      isPending: createPackage.isPending,
    },
    updatePacote: {
      mutate: updatePackage.mutate,
      mutateAsync: updatePackage.mutateAsync,
      isPending: updatePackage.isPending,
    },
    deletePacote: {
      mutate: deletePackage.mutate,
      mutateAsync: deletePackage.mutateAsync,
      isPending: deletePackage.isPending,
    },

    addItem: {
      mutate: addItem.mutate,
      mutateAsync: addItem.mutateAsync,
      isPending: addItem.isPending,
    },
    removeItem: {
      mutate: removeItem.mutate,
      mutateAsync: removeItem.mutateAsync,
      isPending: removeItem.isPending,
    },
    replaceItems: {
      mutate: replaceItems.mutate,
      mutateAsync: replaceItems.mutateAsync,
      isPending: replaceItems.isPending,
    },

    isCreating: createPackage.isPending,
    isUpdating: updatePackage.isPending,
    isDeleting: deletePackage.isPending,
  };
}

// -----------------------------------------------------------------------------
// Hook: Buscar Pacote por ID
// -----------------------------------------------------------------------------

export function usePackageMT(id: string | undefined) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: async (): Promise<MTPackage | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('mt_packages')
        .select(`
          *,
          tenant:mt_tenants (id, slug, nome_fantasia),
          campanha:mt_campaigns (id, nome),
          items:mt_package_items (
            id, tenant_id, package_id, service_id, quantidade, preco_unitario, ordem, created_at,
            service:mt_services (id, nome, nome_curto, preco, tipo, categoria, imagem_url, duracao_minutos)
          )
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data as MTPackage;
    },
    enabled: !!id && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });
}

export default usePackagesMT;
