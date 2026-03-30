// Hook Multi-Tenant para Respostas Rápidas WhatsApp
// Tabela: mt_whatsapp_quick_replies

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type {
  MTWhatsAppQuickReply,
  CreateQuickReplyInput,
  UpdateQuickReplyInput,
} from '@/types/whatsapp-mt';

interface QuickReplyFilters {
  category?: string;
  search?: string;
}

export function useWhatsAppQuickRepliesMT(filters?: QuickReplyFilters) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // Query: Listar respostas rápidas
  const query = useQuery({
    queryKey: ['mt-whatsapp-quick-replies', tenant?.id, franchise?.id, filters],
    queryFn: async (): Promise<MTWhatsAppQuickReply[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado');
      }

      let q = supabase
        .from('mt_whatsapp_quick_replies')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('usage_count', { ascending: false, nullsFirst: false });

      // Filtros por nível de acesso
      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        // Respostas da franchise ou globais do tenant
        q = q.eq('tenant_id', tenant!.id).or(`franchise_id.eq.${franchise.id},franchise_id.is.null`);
      }

      // Filtros adicionais
      if (filters?.category) {
        q = q.eq('category', filters.category);
      }
      if (filters?.search) {
        q = q.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%,shortcut.ilike.%${filters.search}%`);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar respostas rápidas MT:', error);
        throw error;
      }

      return (data || []) as MTWhatsAppQuickReply[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Mutation: Criar resposta rápida
  const createQuickReply = useMutation({
    mutationFn: async (input: CreateQuickReplyInput): Promise<MTWhatsAppQuickReply> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      // Verificar se shortcut já existe
      const { data: existing } = await supabase
        .from('mt_whatsapp_quick_replies')
        .select('id')
        .eq('tenant_id', tenant?.id)
        .eq('shortcut', input.shortcut)
        .eq('is_active', true)
        .single();

      if (existing) {
        throw new Error(`Atalho "${input.shortcut}" já existe`);
      }

      const { data, error } = await supabase
        .from('mt_whatsapp_quick_replies')
        .insert({
          ...input,
          tenant_id: tenant?.id,
          franchise_id: input.franchise_id || franchise?.id,
          is_active: true,
          usage_count: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MTWhatsAppQuickReply;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-quick-replies'] });
      toast.success('Resposta rápida criada');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Mutation: Atualizar resposta rápida
  const updateQuickReply = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateQuickReplyInput): Promise<MTWhatsAppQuickReply> => {
      // Verificar se shortcut já existe (se foi alterado)
      if (updates.shortcut) {
        const { data: existing } = await supabase
          .from('mt_whatsapp_quick_replies')
          .select('id')
          .eq('tenant_id', tenant?.id)
          .eq('shortcut', updates.shortcut)
          .eq('is_active', true)
          .neq('id', id)
          .single();

        if (existing) {
          throw new Error(`Atalho "${updates.shortcut}" já existe`);
        }
      }

      const { data, error } = await supabase
        .from('mt_whatsapp_quick_replies')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MTWhatsAppQuickReply;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-quick-replies'] });
      toast.success('Resposta rápida atualizada');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Mutation: Deletar resposta rápida (soft delete)
  const deleteQuickReply = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_whatsapp_quick_replies')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-quick-replies'] });
      toast.success('Resposta rápida removida');
    },
  });

  // Mutation: Usar resposta rápida (incrementa contador)
  const useQuickReply = useMutation({
    mutationFn: async (id: string) => {
      const { data: quickReply } = await supabase
        .from('mt_whatsapp_quick_replies')
        .select('usage_count')
        .eq('id', id)
        .single();

      await supabase
        .from('mt_whatsapp_quick_replies')
        .update({
          usage_count: (quickReply?.usage_count || 0) + 1,
        })
        .eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-quick-replies'] });
    },
  });

  // Buscar por shortcut
  const getByShortcut = async (shortcut: string): Promise<MTWhatsAppQuickReply | null> => {
    const normalizedShortcut = shortcut.startsWith('/') ? shortcut.slice(1) : shortcut;

    const { data } = await supabase
      .from('mt_whatsapp_quick_replies')
      .select('*')
      .eq('tenant_id', tenant?.id)
      .eq('shortcut', normalizedShortcut)
      .eq('is_active', true)
      .single();

    return data as MTWhatsAppQuickReply | null;
  };

  // Renderizar conteúdo com variáveis
  const renderContent = (quickReply: MTWhatsAppQuickReply, variables?: Record<string, string>): string => {
    let content = quickReply.content;

    if (variables) {
      for (const [key, value] of Object.entries(variables)) {
        content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      }
    }

    // Substituir variáveis padrão
    const now = new Date();
    content = content
      .replace(/\{\{data\}\}/g, now.toLocaleDateString('pt-BR'))
      .replace(/\{\{hora\}\}/g, now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));

    return content;
  };

  // Agrupar por categoria
  const quickRepliesByCategory = query.data?.reduce(
    (acc, qr) => {
      const cat = qr.category || 'Geral';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(qr);
      return acc;
    },
    {} as Record<string, MTWhatsAppQuickReply[]>
  );

  // Lista de categorias únicas
  const categories = [...new Set(query.data?.map((qr) => qr.category || 'Geral') || [])].sort();

  return {
    quickReplies: query.data || [],
    quickRepliesByCategory,
    categories,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    createQuickReply,
    updateQuickReply,
    deleteQuickReply,
    useQuickReply,
    getByShortcut,
    renderContent,
  };
}
