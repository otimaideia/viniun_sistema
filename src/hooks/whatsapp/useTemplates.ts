// Hook para gerenciar Templates de Mensagem

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import type {
  MessageTemplate,
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplateFilters,
} from '@/types/whatsapp';
import { extractVariables } from '@/types/whatsapp/template';
import { toast } from 'sonner';

const TEMPLATES_KEY = 'whatsapp-templates';

/**
 * @deprecated Use useWhatsAppTemplatesAdapter instead. This hook lacks tenant isolation.
 */
export function useTemplates(
  franqueadoId?: string,
  filters?: TemplateFilters
) {
  const queryClient = useQueryClient();
  const { tenant, franchise } = useTenantContext();

  // Listar templates
  const templatesQuery = useQuery({
    queryKey: [TEMPLATES_KEY, franqueadoId, filters],
    queryFn: async () => {
      let query = supabase
        .from('mt_message_templates')
        .select('*')
        .order('ordem', { ascending: true })
        .order('name', { ascending: true });

      if (franqueadoId) {
        query = query.eq('franqueado_id', franqueadoId);
      }

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      if (filters?.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,content.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as MessageTemplate[];
    },
    enabled: true,
  });

  // Buscar template por ID
  const getTemplate = async (templateId: string) => {
    const { data, error } = await supabase
      .from('mt_message_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) throw error;
    return data as MessageTemplate;
  };

  // Criar template
  const createTemplate = useMutation({
    mutationFn: async ({
      franqueadoId,
      input,
    }: {
      franqueadoId: string;
      input: CreateTemplateInput;
    }) => {
      if (!tenant?.id) {
        throw new Error('Tenant não identificado');
      }

      // Extrair variáveis automaticamente se não fornecidas
      const variables = input.variables || extractVariables(input.content);

      const { data, error } = await supabase
        .from('mt_message_templates')
        .insert({
          tenant_id: tenant.id, // OBRIGATÓRIO para MT
          franchise_id: franchise?.id || null,
          franqueado_id: franqueadoId,
          name: input.name,
          category: input.category,
          content: input.content,
          variables,
          media_type: input.media_type,
          media_url: input.media_url,
          media_filename: input.media_filename,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MessageTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_KEY] });
      toast.success('Template criado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar template: ${error.message}`);
    },
  });

  // Atualizar template
  const updateTemplate = useMutation({
    mutationFn: async ({
      templateId,
      input,
    }: {
      templateId: string;
      input: UpdateTemplateInput;
    }) => {
      // Se conteúdo foi alterado, re-extrair variáveis
      let updateData: UpdateTemplateInput = { ...input };
      if (input.content && !input.variables) {
        updateData.variables = extractVariables(input.content);
      }

      const { data, error } = await supabase
        .from('mt_message_templates')
        .update(updateData)
        .eq('id', templateId)
        .select()
        .single();

      if (error) throw error;
      return data as MessageTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_KEY] });
      toast.success('Template atualizado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  // Deletar template
  const deleteTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('mt_message_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_KEY] });
      toast.success('Template deletado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao deletar: ${error.message}`);
    },
  });

  // Duplicar template
  const duplicateTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      if (!tenant?.id) {
        throw new Error('Tenant não identificado');
      }

      const original = await getTemplate(templateId);

      const { data, error } = await supabase
        .from('mt_message_templates')
        .insert({
          tenant_id: tenant.id, // OBRIGATÓRIO para MT
          franchise_id: franchise?.id || null,
          franqueado_id: original.franqueado_id,
          name: `${original.name} (cópia)`,
          category: original.category,
          content: original.content,
          variables: original.variables,
          media_type: original.media_type,
          media_url: original.media_url,
          media_filename: original.media_filename,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MessageTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_KEY] });
      toast.success('Template duplicado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao duplicar: ${error.message}`);
    },
  });

  // Reordenar templates
  const reorderTemplates = useMutation({
    mutationFn: async (
      items: { id: string; ordem: number }[]
    ) => {
      const promises = items.map((item) =>
        supabase
          .from('mt_message_templates')
          .update({ ordem: item.ordem })
          .eq('id', item.id)
      );

      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_KEY] });
    },
  });

  return {
    templates: templatesQuery.data || [],
    isLoading: templatesQuery.isLoading,
    error: templatesQuery.error,
    refetch: templatesQuery.refetch,

    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    reorderTemplates,
  };
}
