import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MTInfluencerReferral {
  id: string;
  tenant_id: string;
  influencer_id: string;
  lead_id: string | null;
  franchise_id: string | null;
  codigo_usado: string;
  status: 'pendente' | 'convertido' | 'cancelado';
  valor_servico: number | null;
  comissao: number | null;
  data_conversao: string | null;
  created_at: string;

  // Relacionamentos
  influencer?: {
    id: string;
    nome: string;
    nome_artistico: string | null;
    whatsapp: string | null;
    instagram: string | null;
  };
  lead?: {
    id: string;
    nome: string;
    email: string | null;
    telefone: string | null;
    status: string;
  };
  franchise?: {
    id: string;
    nome: string;
    cidade: string | null;
    estado: string | null;
  };
}

export interface ReferralFilters {
  influencer_id?: string;
  status?: 'pendente' | 'convertido' | 'cancelado';
  franchise_id?: string;
  data_inicio?: string;
  data_fim?: string;
}

export function useInfluencerReferralsMT(filters?: ReferralFilters) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // Query principal
  const query = useQuery({
    queryKey: ['mt-influencer-referrals', tenant?.id, franchise?.id, filters],
    queryFn: async () => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado');
      }

      let q = supabase
        .from('mt_influencer_referrals')
        .select(`
          *,
          influencer:mt_influencers(id, nome, nome_artistico, whatsapp, instagram),
          lead:mt_leads(id, nome, email, telefone, status),
          franchise:mt_franchises(id, nome, cidade, estado)
        `)
        .order('created_at', { ascending: false });

      // Filtros por nível de acesso
      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise && tenant) {
        q = q.eq('tenant_id', tenant.id);
        q = q.or(`franchise_id.eq.${franchise.id},franchise_id.is.null`);
      }

      // Filtros específicos
      if (filters?.influencer_id) {
        q = q.eq('influencer_id', filters.influencer_id);
      }
      if (filters?.status) {
        q = q.eq('status', filters.status);
      }
      if (filters?.franchise_id) {
        q = q.eq('franchise_id', filters.franchise_id);
      }
      if (filters?.data_inicio) {
        q = q.gte('created_at', filters.data_inicio);
      }
      if (filters?.data_fim) {
        q = q.lte('created_at', filters.data_fim);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as MTInfluencerReferral[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Mutation: Criar indicação
  const create = useMutation({
    mutationFn: async (newReferral: {
      influencer_id: string;
      codigo_usado: string;
      lead_id?: string;
      franchise_id?: string;
    }) => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      const { data, error } = await supabase
        .from('mt_influencer_referrals')
        .insert({
          ...newReferral,
          tenant_id: tenant?.id,
          franchise_id: newReferral.franchise_id || franchise?.id,
          status: 'pendente',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-influencer-referrals'] });
      toast.success('Indicação registrada com sucesso');
    },
    onError: (error: any) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Mutation: Converter indicação (vincular lead)
  const convert = useMutation({
    mutationFn: async ({
      id,
      lead_id,
      valor_servico,
    }: {
      id: string;
      lead_id: string;
      valor_servico?: number;
    }) => {
      const { data, error } = await supabase
        .from('mt_influencer_referrals')
        .update({
          lead_id,
          status: 'convertido',
          data_conversao: new Date().toISOString(),
          valor_servico,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-influencer-referrals'] });
      toast.success('Indicação convertida com sucesso');
    },
  });

  // Mutation: Atualizar comissão
  const updateCommission = useMutation({
    mutationFn: async ({
      id,
      comissao,
      valor_servico,
    }: {
      id: string;
      comissao: number;
      valor_servico?: number;
    }) => {
      const updates: any = { comissao };
      if (valor_servico !== undefined) {
        updates.valor_servico = valor_servico;
      }

      const { data, error } = await supabase
        .from('mt_influencer_referrals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-influencer-referrals'] });
      toast.success('Comissão atualizada com sucesso');
    },
  });

  // Mutation: Cancelar indicação
  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_influencer_referrals')
        .update({ status: 'cancelado' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-influencer-referrals'] });
      toast.success('Indicação cancelada');
    },
  });

  // Estatísticas
  const stats = {
    total: query.data?.length || 0,
    pendentes: query.data?.filter(r => r.status === 'pendente').length || 0,
    convertidos: query.data?.filter(r => r.status === 'convertido').length || 0,
    cancelados: query.data?.filter(r => r.status === 'cancelado').length || 0,
    valor_total: query.data?.reduce((sum, r) => sum + (r.valor_servico || 0), 0) || 0,
    comissao_total: query.data?.reduce((sum, r) => sum + (r.comissao || 0), 0) || 0,
  };

  return {
    referrals: query.data || [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    stats,
    create,
    convert,
    updateCommission,
    cancel,
  };
}
