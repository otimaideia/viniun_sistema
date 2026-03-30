// Hook Multi-Tenant para Templates WhatsApp
// Tabela: mt_whatsapp_templates

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type {
  MTWhatsAppTemplate,
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplateCategory,
} from '@/types/whatsapp-mt';

// Categorias de templates
export const TEMPLATE_CATEGORIES: { value: TemplateCategory; label: string; icon: string }[] = [
  { value: 'saudacao', label: 'Saudação', icon: '👋' },
  { value: 'agendamento', label: 'Agendamento', icon: '📅' },
  { value: 'confirmacao', label: 'Confirmação', icon: '✅' },
  { value: 'lembrete', label: 'Lembrete', icon: '⏰' },
  { value: 'promocao', label: 'Promoção', icon: '🎉' },
  { value: 'atendimento', label: 'Atendimento', icon: '💬' },
  { value: 'cobranca', label: 'Cobrança', icon: '💰' },
  { value: 'outro', label: 'Outro', icon: '📝' },
];

interface TemplateFilters {
  categoria?: TemplateCategory;
  search?: string;
}

export function useWhatsAppTemplatesMT(filters?: TemplateFilters) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // Query: Listar templates
  const query = useQuery({
    queryKey: ['mt-whatsapp-templates', tenant?.id, franchise?.id, filters],
    queryFn: async (): Promise<MTWhatsAppTemplate[]> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado');
      }

      let q = supabase
        .from('mt_whatsapp_templates')
        .select('*')
        .eq('is_active', true)
        .order('uso_count', { ascending: false, nullsFirst: false })
        .order('nome', { ascending: true });

      // Filtros por nível de acesso
      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        // Templates da franchise ou globais do tenant
        q = q.eq('tenant_id', tenant!.id).or(`franchise_id.eq.${franchise.id},franchise_id.is.null`);
      }

      // Filtros adicionais
      if (filters?.categoria) {
        q = q.eq('categoria', filters.categoria);
      }
      if (filters?.search) {
        q = q.or(`nome.ilike.%${filters.search}%,conteudo.ilike.%${filters.search}%`);
      }

      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar templates MT:', error);
        throw error;
      }

      return (data || []) as MTWhatsAppTemplate[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Mutation: Criar template
  const createTemplate = useMutation({
    mutationFn: async (input: CreateTemplateInput): Promise<MTWhatsAppTemplate> => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      // Extrair variáveis do conteúdo (formato {{variavel}})
      const variaveisMatch = input.conteudo.match(/\{\{(\w+)\}\}/g);
      const variaveis = variaveisMatch
        ? [...new Set(variaveisMatch.map((v) => v.replace(/\{\{|\}\}/g, '')))]
        : [];

      const { data, error } = await supabase
        .from('mt_whatsapp_templates')
        .insert({
          ...input,
          tenant_id: tenant?.id,
          franchise_id: input.franchise_id || franchise?.id,
          variaveis: input.variaveis || variaveis,
          is_active: true,
          uso_count: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MTWhatsAppTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-templates'] });
      toast.success('Template criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar template: ${error.message}`);
    },
  });

  // Mutation: Atualizar template
  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateTemplateInput): Promise<MTWhatsAppTemplate> => {
      // Se o conteúdo foi atualizado, re-extrair variáveis
      if (updates.conteudo) {
        const variaveisMatch = updates.conteudo.match(/\{\{(\w+)\}\}/g);
        updates.variaveis = variaveisMatch
          ? [...new Set(variaveisMatch.map((v) => v.replace(/\{\{|\}\}/g, '')))]
          : [];
      }

      const { data, error } = await supabase
        .from('mt_whatsapp_templates')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MTWhatsAppTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-templates'] });
      toast.success('Template atualizado');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar template: ${error.message}`);
    },
  });

  // Mutation: Deletar template (soft delete)
  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_whatsapp_templates')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-templates'] });
      toast.success('Template removido');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover template: ${error.message}`);
    },
  });

  // Mutation: Usar template (incrementa contador)
  const useTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_whatsapp_templates')
        .update({
          uso_count: supabase.rpc('increment', { row_id: id }),
          ultimo_uso: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        // Fallback: incrementar manualmente
        const { data: template } = await supabase
          .from('mt_whatsapp_templates')
          .select('uso_count')
          .eq('id', id)
          .single();

        await supabase
          .from('mt_whatsapp_templates')
          .update({
            uso_count: (template?.uso_count || 0) + 1,
            ultimo_uso: new Date().toISOString(),
          })
          .eq('id', id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-templates'] });
    },
  });

  // Duplicar template
  const duplicateTemplate = useMutation({
    mutationFn: async (id: string): Promise<MTWhatsAppTemplate> => {
      const { data: original } = await supabase
        .from('mt_whatsapp_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (!original) throw new Error('Template não encontrado');

      const { data, error } = await supabase
        .from('mt_whatsapp_templates')
        .insert({
          tenant_id: original.tenant_id,
          franchise_id: original.franchise_id,
          nome: `${original.nome} (cópia)`,
          categoria: original.categoria,
          descricao: original.descricao,
          conteudo: original.conteudo,
          variaveis: original.variaveis,
          tem_midia: original.tem_midia,
          midia_tipo: original.midia_tipo,
          midia_url: original.midia_url,
          is_active: true,
          uso_count: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MTWhatsAppTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-whatsapp-templates'] });
      toast.success('Template duplicado');
    },
  });

  // Renderizar template com variáveis
  const renderTemplate = (template: MTWhatsAppTemplate, variables: Record<string, string>): string => {
    let content = template.conteudo;

    for (const [key, value] of Object.entries(variables)) {
      content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }

    return content;
  };

  // Agrupar por categoria
  const templatesByCategory = query.data?.reduce(
    (acc, template) => {
      const cat = template.categoria || 'outro';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(template);
      return acc;
    },
    {} as Record<TemplateCategory, MTWhatsAppTemplate[]>
  );

  return {
    templates: query.data || [],
    templatesByCategory,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    useTemplate,
    duplicateTemplate,
    renderTemplate,
  };
}

// Hook para template individual
export function useWhatsAppTemplateMT(templateId: string | undefined) {
  const query = useQuery({
    queryKey: ['mt-whatsapp-template', templateId],
    queryFn: async (): Promise<MTWhatsAppTemplate | null> => {
      if (!templateId) return null;

      const { data, error } = await supabase
        .from('mt_whatsapp_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) {
        console.error('Erro ao buscar template:', error);
        return null;
      }

      return data as MTWhatsAppTemplate;
    },
    enabled: !!templateId,
  });

  return {
    template: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}
