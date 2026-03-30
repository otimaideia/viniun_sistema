/**
 * useMetaPagesMT - Hook Multi-Tenant
 *
 * Gerencia páginas do Facebook e contas Instagram Business
 *
 * Features:
 * - Listar páginas conectadas
 * - Ativar/desativar página
 * - Configurar webhook
 * - Sincronizar conversas
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MetaPage {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  account_id: string;
  page_id: string; // Facebook Page ID ou Instagram Account ID
  page_name: string;
  page_username: string | null;
  page_category: string | null;
  page_access_token: string;
  platform: 'facebook' | 'instagram';
  instagram_business_account_id: string | null;
  is_active: boolean;
  webhook_subscribed: boolean;
  last_webhook_at: string | null;
  last_sync_at: string | null;
  raw_data: any;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;

  // Relacionamentos
  account?: {
    user_name: string;
    platform: string;
  };
  tenant?: {
    slug: string;
    nome_fantasia: string;
  };
  franchise?: {
    nome: string;
  };
}

export function useMetaPagesMT(filters?: {
  account_id?: string;
  platform?: 'facebook' | 'instagram';
  is_active?: boolean;
}) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // Query: Listar páginas
  const {
    data: pages,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['mt-meta-pages', tenant?.id, franchise?.id, filters],
    queryFn: async () => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado');
      }

      let query = supabase
        .from('mt_meta_pages')
        .select(
          `
          *,
          account:mt_meta_accounts(user_name, platform),
          tenant:mt_tenants(slug, nome_fantasia),
          franchise:mt_franchises(nome)
        `
        )
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Filtros por nível de acesso
      if (accessLevel === 'tenant' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        query = query.eq('franchise_id', franchise.id);
      }

      // Filtros adicionais
      if (filters?.account_id) {
        query = query.eq('account_id', filters.account_id);
      }

      if (filters?.platform) {
        query = query.eq('platform', filters.platform);
      }

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as MetaPage[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Mutation: Ativar/Desativar página
  const togglePageActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('mt_meta_pages')
        .update({
          is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mt-meta-pages'] });
      toast.success(data.is_active ? 'Página ativada!' : 'Página desativada!');
    },
    onError: (error: any) => {
      console.error('Erro ao alterar status da página:', error);
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Mutation: Sincronizar conversas da página
  const syncPage = useMutation({
    mutationFn: async (pageId: string) => {
      toast.info('Sincronizando conversas...', { duration: 2000 });

      const { data, error } = await supabase.functions.invoke('meta-sync', {
        body: {
          page_id: pageId,
          limit: 50,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mt-meta-pages'] });
      queryClient.invalidateQueries({ queryKey: ['mt-meta-conversations'] });
      toast.success(`${data.synced} conversas sincronizadas!`);

      // Se houver mais, continuar sincronização
      if (data.has_more && data.next_cursor) {
        toast.info('Há mais conversas. Clique novamente para continuar.');
      }
    },
    onError: (error: any) => {
      console.error('Erro ao sincronizar página:', error);
      toast.error(`Erro na sincronização: ${error.message}`);
    },
  });

  // Mutation: Configurar webhook (subscrever)
  const subscribeWebhook = useMutation({
    mutationFn: async (pageId: string) => {
      // Buscar página
      const { data: page } = await supabase
        .from('mt_meta_pages')
        .select('page_id, page_access_token')
        .eq('id', pageId)
        .single();

      if (!page) throw new Error('Página não encontrada');

      // Chamar Graph API para subscrever webhook
      const response = await fetch(
        `https://graph.facebook.com/v19.0/${page.page_id}/subscribed_apps`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subscribed_fields: 'messages,message_deliveries,message_reads,messaging_postbacks,messaging_referrals',
            access_token: page.page_access_token,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Erro ao configurar webhook');
      }

      // Atualizar no banco
      await supabase
        .from('mt_meta_pages')
        .update({
          webhook_subscribed: true,
          last_webhook_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', pageId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-meta-pages'] });
      toast.success('Webhook configurado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao configurar webhook:', error);
      toast.error(`Erro ao configurar webhook: ${error.message}`);
    },
  });

  // Mutation: Remover página (soft delete)
  const removePage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_meta_pages')
        .update({
          is_active: false,
          deleted_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-meta-pages'] });
      toast.success('Página removida com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao remover página:', error);
      toast.error(`Erro ao remover página: ${error.message}`);
    },
  });

  // Helper: Contar conversas por página
  const getConversationCount = async (pageId: string): Promise<number> => {
    const { count } = await supabase
      .from('mt_meta_conversations')
      .select('id', { count: 'exact', head: true })
      .eq('page_id', pageId)
      .is('deleted_at', null);

    return count || 0;
  };

  return {
    // Data
    pages: pages || [],
    isLoading: isLoading || isTenantLoading,
    error,

    // Mutations
    togglePageActive,
    syncPage,
    subscribeWebhook,
    removePage,

    // Helpers
    getConversationCount,
    refetch,
  };
}

/**
 * Hook para buscar uma página específica
 */
export function useMetaPageMT(pageId: string) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: ['mt-meta-page', pageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mt_meta_pages')
        .select(
          `
          *,
          account:mt_meta_accounts(user_name, platform),
          tenant:mt_tenants(slug, nome_fantasia),
          franchise:mt_franchises(nome)
        `
        )
        .eq('id', pageId)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      return data as MetaPage;
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform') && !!pageId,
  });
}
