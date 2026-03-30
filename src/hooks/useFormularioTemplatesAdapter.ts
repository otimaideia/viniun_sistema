// =============================================================================
// USE FORMULARIO TEMPLATES ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para templates de formulários usando tabelas MT
// SISTEMA 100% MT - Usa mt_form_templates e mt_forms diretamente
//
// NOTA: Templates são armazenados em mt_form_templates se existir,
// ou derivados de mt_forms com is_template = true
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { FormularioTemplate, FormularioTemplateCategoria } from '@/types/formulario';
import { TEMPLATE_CATEGORIAS } from '@/types/formulario';

// =============================================================================
// Types
// =============================================================================

interface UseFormularioTemplatesOptions {
  categoria?: FormularioTemplateCategoria;
  onlySystem?: boolean;
}

interface MTFormTemplate {
  id: string;
  tenant_id: string | null;
  franchise_id: string | null;
  nome: string;
  descricao: string | null;
  categoria: string;
  thumbnail_url?: string | null;
  is_sistema: boolean;
  is_active: boolean;
  uso_count: number;
  config: Record<string, unknown> | null;
  campos: Record<string, unknown>[] | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

// =============================================================================
// Query Keys
// =============================================================================

const QUERY_KEY = 'mt-formulario-templates';

// =============================================================================
// Mapper: MT → Legacy format
// =============================================================================

function mapMTToLegacy(template: MTFormTemplate): FormularioTemplate {
  return {
    id: template.id,
    nome: template.nome,
    descricao: template.descricao,
    categoria: template.categoria as FormularioTemplateCategoria,
    thumbnail_url: template.thumbnail_url || null,
    is_sistema: template.is_sistema,
    ativo: template.is_active,
    uso_count: template.uso_count,
    config: template.config,
    campos: template.campos as FormularioTemplate['campos'],
    created_at: template.created_at,
    updated_at: template.updated_at,
  };
}

// =============================================================================
// Hook Principal
// =============================================================================

export function useFormularioTemplatesAdapter(options: UseFormularioTemplatesOptions = {}) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ==========================================================================
  // Query: Listar Templates
  // ==========================================================================
  const {
    data: templates = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, options.categoria, options.onlySystem],
    queryFn: async (): Promise<FormularioTemplate[]> => {
      // Try to fetch from mt_form_templates first
      let query = supabase
        .from('mt_form_templates')
        .select('*')
        .eq('is_active', true)
        .order('uso_count', { ascending: false });

      // Filter by categoria
      if (options.categoria) {
        query = query.eq('categoria', options.categoria);
      }

      // Filter only system templates
      if (options.onlySystem) {
        query = query.eq('is_sistema', true);
      }

      // Filter by tenant access
      if (accessLevel === 'tenant' && tenant) {
        // See system templates (tenant_id = null) or own tenant templates
        query = query.or(`tenant_id.is.null,tenant_id.eq.${tenant.id}`);
      } else if (accessLevel === 'franchise' && tenant) {
        // Franchises see system templates or their tenant's templates
        query = query.or(`tenant_id.is.null,tenant_id.eq.${tenant.id}`);
      }
      // Platform admin sees all

      const { data, error: queryError } = await query;

      if (queryError) {
        // If table doesn't exist, return empty - templates may not be migrated yet
        if (queryError.code === '42P01') {
          console.warn('[MT] mt_form_templates table not found, returning empty');
          return [];
        }
        console.error('[MT] Erro ao buscar templates:', queryError);
        throw queryError;
      }

      return (data || []).map((t) => mapMTToLegacy(t as MTFormTemplate));
    },
    enabled: !isTenantLoading,
  });

  // ==========================================================================
  // Get Template by ID
  // ==========================================================================
  const getTemplate = async (id: string): Promise<FormularioTemplate | null> => {
    const { data, error } = await supabase
      .from('mt_form_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[MT] Erro ao buscar template:', error);
      return null;
    }

    return data ? mapMTToLegacy(data as MTFormTemplate) : null;
  };

  // ==========================================================================
  // Create Form from Template
  // ==========================================================================
  const createFromTemplate = async (
    templateId: string,
    franqueadoId: string,
    nome: string,
    slug: string
  ) => {
    const template = await getTemplate(templateId);
    if (!template) {
      toast.error('Template não encontrado');
      return null;
    }

    try {
      // Create form with template settings
      const formData = {
        tenant_id: tenant?.id,
        franchise_id: franqueadoId || null,
        name: nome,
        slug,
        is_active: false,
        is_published: false,
        ...(template.config || {}),
      };

      const { data: form, error: formError } = await supabase
        .from('mt_forms')
        .insert(formData)
        .select()
        .single();

      if (formError) throw formError;

      // Create template fields
      if (template.campos && template.campos.length > 0) {
        const fieldsData = template.campos.map((campo, index) => ({
          form_id: form.id,
          name: campo.nome || `campo_${index}`,
          field_type: campo.tipo || 'text',
          label: campo.label || `Campo ${index + 1}`,
          placeholder: campo.placeholder || null,
          is_required: campo.obrigatorio ?? false,
          order_index: campo.ordem ?? index,
          width: campo.largura || 'full',
          is_active: true,
          options: campo.opcoes || null,
          mask: campo.mascara || null,
          step: campo.etapa || 1,
          lead_field: campo.campo_lead || null,
        }));

        const { error: fieldsError } = await supabase
          .from('mt_form_fields')
          .insert(fieldsData);

        if (fieldsError) {
          console.error('[MT] Erro ao criar campos:', fieldsError);
        }
      }

      // Increment template usage counter
      await supabase
        .from('mt_form_templates')
        .update({ uso_count: (template.uso_count || 0) + 1 })
        .eq('id', templateId);

      queryClient.invalidateQueries({ queryKey: ['mt-formularios'] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });

      toast.success('Formulário criado a partir do template!');
      return form;
    } catch (err) {
      console.error('[MT] Erro ao criar formulário a partir do template:', err);
      toast.error('Erro ao criar formulário');
      return null;
    }
  };

  // ==========================================================================
  // Mutation: Create Custom Template
  // ==========================================================================
  const createMutation = useMutation({
    mutationFn: async (
      template: Omit<FormularioTemplate, 'id' | 'created_at' | 'updated_at' | 'uso_count'>
    ) => {
      const { data, error } = await supabase
        .from('mt_form_templates')
        .insert({
          tenant_id: tenant?.id || null,
          nome: template.nome,
          descricao: template.descricao || null,
          categoria: template.categoria,
          thumbnail_url: template.thumbnail_url || null,
          is_sistema: false,
          is_active: template.ativo ?? true,
          uso_count: 0,
          config: template.config || null,
          campos: template.campos || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[MT] Erro ao criar template:', error);
        throw error;
      }

      return mapMTToLegacy(data as MTFormTemplate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Template criado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar template: ${error.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Increment Usage
  // ==========================================================================
  const incrementUsageMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const template = templates.find((t) => t.id === templateId);
      const currentCount = template?.uso_count || 0;

      const { error } = await supabase
        .from('mt_form_templates')
        .update({ uso_count: currentCount + 1 })
        .eq('id', templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
    onError: (error: Error) => {
      console.error('[MT] Erro ao incrementar uso:', error);
    },
  });

  // ==========================================================================
  // Mutation: Delete Template
  // ==========================================================================
  const deleteMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('mt_form_templates')
        .delete()
        .eq('id', templateId)
        .eq('is_sistema', false); // Can only delete non-system templates

      if (error) {
        console.error('[MT] Erro ao deletar template:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Template excluído!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir template: ${error.message}`);
    },
  });

  // ==========================================================================
  // Group Templates by Category
  // ==========================================================================
  const getTemplatesByCategory = (): Record<FormularioTemplateCategoria, FormularioTemplate[]> => {
    const grouped: Record<FormularioTemplateCategoria, FormularioTemplate[]> = {
      lead_capture: [],
      agendamento: [],
      orcamento: [],
      contato: [],
      pesquisa: [],
      cadastro: [],
      evento: [],
      avaliacao: [],
      indicacao: [],
    };

    templates.forEach((template) => {
      if (grouped[template.categoria]) {
        grouped[template.categoria].push(template);
      }
    });

    return grouped;
  };

  // ==========================================================================
  // List Categories with Templates
  // ==========================================================================
  const getCategoriesWithTemplates = () => {
    const grouped = getTemplatesByCategory();
    return Object.entries(grouped)
      .filter(([, categoryTemplates]) => categoryTemplates.length > 0)
      .map(([categoria]) => ({
        categoria: categoria as FormularioTemplateCategoria,
        ...TEMPLATE_CATEGORIAS[categoria as FormularioTemplateCategoria],
        count: grouped[categoria as FormularioTemplateCategoria].length,
      }));
  };

  return {
    // Data
    templates,
    templatesByCategory: getTemplatesByCategory(),
    categoriesWithTemplates: getCategoriesWithTemplates(),
    categorias: TEMPLATE_CATEGORIAS,

    // States
    isLoading: isLoading || isTenantLoading,
    error,

    // Actions
    refetch,
    getTemplate,
    getTemplateById: getTemplate,
    createFromTemplate,
    createTemplate: createMutation.mutate,
    incrementUsage: incrementUsageMutation.mutate,
    deleteTemplate: deleteMutation.mutateAsync,

    // Mutation states
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,

    _mode: 'mt' as const,
  };
}

// =============================================================================
// Re-export Types
// =============================================================================

export type { FormularioTemplate, FormularioTemplateCategoria } from '@/types/formulario';
export { TEMPLATE_CATEGORIAS } from '@/types/formulario';

// =============================================================================
// Helper: Verificar modo atual (sempre MT)
// =============================================================================

export function getFormularioTemplatesMode(): 'mt' {
  return 'mt';
}

export default useFormularioTemplatesAdapter;
