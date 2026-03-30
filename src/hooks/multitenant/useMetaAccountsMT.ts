/**
 * useMetaAccountsMT - Hook Multi-Tenant
 *
 * Gerencia contas Facebook/Instagram conectadas via OAuth
 *
 * Features:
 * - CRUD de accounts
 * - Verificar status de conexão
 * - Iniciar OAuth flow
 * - Renovar token manualmente
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMetaSettings } from '@/hooks/usePlatformSettings';

export interface MetaAccount {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  user_id: string; // Facebook User ID
  user_name: string;
  user_email: string | null;
  access_token: string;
  token_expires_at: string;
  platform: 'facebook' | 'instagram';
  is_active: boolean;
  last_sync_at: string | null;
  raw_data: any;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;

  // Relacionamentos
  tenant?: {
    slug: string;
    nome_fantasia: string;
  };
  franchise?: {
    nome: string;
  };
}

export function useMetaAccountsMT() {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();
  const { metaAppId, metaRedirectUri, isLoading: isLoadingSettings } = useMetaSettings();

  // Query: Listar accounts
  const {
    data: accounts,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['mt-meta-accounts', tenant?.id, franchise?.id],
    queryFn: async () => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado');
      }

      let query = supabase
        .from('mt_meta_accounts')
        .select(
          `
          *,
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

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as MetaAccount[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Mutation: Criar account (via OAuth callback)
  const createAccount = useMutation({
    mutationFn: async (newAccount: Partial<MetaAccount>) => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      const { data, error } = await supabase
        .from('mt_meta_accounts')
        .insert({
          tenant_id: tenant?.id || newAccount.tenant_id,
          franchise_id: franchise?.id || newAccount.franchise_id || null,
          user_id: newAccount.user_id!,
          user_name: newAccount.user_name!,
          user_email: newAccount.user_email,
          access_token: newAccount.access_token!,
          token_expires_at: newAccount.token_expires_at!,
          platform: newAccount.platform!,
          is_active: true,
          raw_data: newAccount.raw_data,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-meta-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['mt-meta-pages'] });
      toast.success('Conta conectada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao criar account:', error);
      toast.error(`Erro ao conectar conta: ${error.message}`);
    },
  });

  // Mutation: Atualizar account
  const updateAccount = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MetaAccount> & { id: string }) => {
      const { data, error } = await supabase
        .from('mt_meta_accounts')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-meta-accounts'] });
      toast.success('Conta atualizada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar account:', error);
      toast.error(`Erro ao atualizar conta: ${error.message}`);
    },
  });

  // Mutation: Desconectar account (soft delete)
  const disconnectAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_meta_accounts')
        .update({
          is_active: false,
          deleted_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-meta-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['mt-meta-pages'] });
      toast.success('Conta desconectada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao desconectar account:', error);
      toast.error(`Erro ao desconectar conta: ${error.message}`);
    },
  });

  // Mutation: Renovar token manualmente
  const refreshToken = useMutation({
    mutationFn: async (accountId: string) => {
      // Chamar Edge Function meta-token-refresh para este account específico
      const { data, error } = await supabase.functions.invoke('meta-token-refresh', {
        body: { account_id: accountId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-meta-accounts'] });
      toast.success('Token renovado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao renovar token:', error);
      toast.error(`Erro ao renovar token: ${error.message}`);
    },
  });

  // Helper: Iniciar OAuth flow
  const startOAuthFlow = (platform: 'facebook' | 'instagram') => {
    if (!tenant) {
      toast.error('Tenant não identificado');
      return;
    }

    // Gerar state (JSON com tenant_id e franchise_id)
    const state = encodeURIComponent(JSON.stringify({
      tenant_id: tenant.id,
      franchise_id: franchise?.id || null
    }));

    // Scopes necessários (API v24.0)
    // Ref: https://developers.facebook.com/docs/permissions/reference
    //
    // ✅ ADMIN/DEVELOPER DO APP: Pode usar todos os scopes
    // Scopes completos para acessar páginas e Instagram:
    const scopes = 'public_profile,email,pages_show_list,pages_manage_metadata,instagram_basic';

    // Se não for admin/tester, usar apenas scopes básicos:
    // const scopes = 'public_profile,email';

    // URL de autorização do Facebook (API v24.0)
    const authUrl = `https://www.facebook.com/v24.0/dialog/oauth?` +
      `client_id=${metaAppId}&` +
      `redirect_uri=${encodeURIComponent(metaRedirectUri)}&` +
      `scope=${scopes}&` +
      `state=${state}&` +
      `response_type=code`;

    // Abrir em nova janela
    window.open(authUrl, '_blank', 'width=600,height=700');
  };

  // Helper: Verificar se token está expirando (7 dias)
  const isTokenExpiringSoon = (account: MetaAccount): boolean => {
    const expiresAt = new Date(account.token_expires_at);
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return expiresAt < sevenDaysFromNow;
  };

  // Helper: Dias até expiração
  const daysUntilExpiry = (account: MetaAccount): number => {
    const expiresAt = new Date(account.token_expires_at);
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    return Math.floor(diff / (24 * 60 * 60 * 1000));
  };

  return {
    // Data
    accounts: accounts || [],
    isLoading: isLoading || isTenantLoading || isLoadingSettings,
    error,

    // Mutations
    createAccount,
    updateAccount,
    disconnectAccount,
    refreshToken,

    // Helpers
    startOAuthFlow,
    isTokenExpiringSoon,
    daysUntilExpiry,
    refetch,
  };
}

/**
 * Hook para buscar uma account específica
 */
export function useMetaAccountMT(accountId: string) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: ['mt-meta-account', accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mt_meta_accounts')
        .select(
          `
          *,
          tenant:mt_tenants(slug, nome_fantasia),
          franchise:mt_franchises(nome)
        `
        )
        .eq('id', accountId)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      return data as MetaAccount;
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform') && !!accountId,
  });
}
