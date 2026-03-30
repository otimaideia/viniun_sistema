// =============================================================================
// USE MARKETING TEMPLATES ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para templates de marketing usando tabela MT
// SISTEMA 100% MT - Usa mt_marketing_templates com isolamento por tenant
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type { MarketingTemplate, MarketingTemplateFormData } from '@/types/marketing';

// =============================================================================
// Types MT
// =============================================================================

interface MTMarketingTemplate {
  id: string;
  tenant_id: string;
  template_type: string | null;
  name: string;
  description: string | null;
  content: string | null;
  preview_url: string | null;
  variables: Record<string, unknown> | null;
  category: string | null;
  tags: string[] | null;
  is_active: boolean;
  is_default: boolean;
  usage_count: number;
  metadata: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  tenant?: {
    id: string;
    slug: string;
    nome_fantasia: string;
  };
}

export interface MarketingTemplateAdaptada extends MarketingTemplate {
  tenant_id?: string;
  franchise_id?: string | null;
}

// =============================================================================
// Helper: Mapear MT para Legacy
// =============================================================================

function mapMTToLegacy(mtTemplate: MTMarketingTemplate): MarketingTemplateAdaptada {
  // Extrair variáveis como array de strings do objeto variables
  let variaveisDisponiveis: string[] = [];
  if (mtTemplate.variables) {
    if (Array.isArray(mtTemplate.variables)) {
      variaveisDisponiveis = mtTemplate.variables as unknown as string[];
    } else if (typeof mtTemplate.variables === 'object') {
      variaveisDisponiveis = Object.keys(mtTemplate.variables);
    }
  }

  return {
    id: mtTemplate.id,
    nome_template: mtTemplate.name,
    template_content: mtTemplate.content || '',
    tipo: mtTemplate.template_type || 'whatsapp',
    variaveis_disponiveis: variaveisDisponiveis,
    is_default: mtTemplate.is_default,
    ativo: mtTemplate.is_active,
    unidade_id: null, // MT templates não têm franchise_id, são por tenant
    created_at: mtTemplate.created_at,
    updated_at: mtTemplate.updated_at,
    tenant_id: mtTemplate.tenant_id,
    franchise_id: null,
  };
}

// =============================================================================
// Query Keys
// =============================================================================

const QUERY_KEY = 'mt-marketing-templates';

// =============================================================================
// Hook Principal
// =============================================================================

export function useMarketingTemplatesAdapter() {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ==========================================================================
  // Query: Listar Templates
  // ==========================================================================
  const {
    data: templatesRaw = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, accessLevel],
    queryFn: async () => {
      let query = supabase
        .from('mt_marketing_templates')
        .select(`
          *,
          tenant:mt_tenants(id, slug, nome_fantasia)
        `)
        .order('created_at', { ascending: false });

      // Filtrar por nível de acesso
      if (accessLevel === 'tenant' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && tenant) {
        // Franquias veem templates do tenant
        query = query.eq('tenant_id', tenant.id);
      } else if (accessLevel !== 'platform') {
        // Usuário comum - filtrar por tenant
        if (tenant) {
          query = query.eq('tenant_id', tenant.id);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('[MT] Erro ao buscar templates:', error);
        throw error;
      }

      return (data || []) as MTMarketingTemplate[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Mapear para formato legacy
  const templates: MarketingTemplateAdaptada[] = templatesRaw.map(mapMTToLegacy);

  // ==========================================================================
  // Mutation: Criar Template
  // ==========================================================================
  const createMutation = useMutation({
    mutationFn: async (data: MarketingTemplateFormData) => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      // Converter array de variáveis para objeto JSONB
      const variablesObj: Record<string, string> = {};
      if (data.variaveis_disponiveis && Array.isArray(data.variaveis_disponiveis)) {
        data.variaveis_disponiveis.forEach((v: string) => {
          variablesObj[v] = v;
        });
      }

      const mtData = {
        tenant_id: tenant?.id,
        template_type: data.tipo || 'whatsapp',
        name: data.nome_template,
        content: data.template_content || null,
        variables: variablesObj,
        is_active: data.ativo !== false,
        is_default: data.is_default || false,
      };

      const { data: created, error } = await supabase
        .from('mt_marketing_templates')
        .insert(mtData)
        .select(`
          *,
          tenant:mt_tenants(id, slug, nome_fantasia)
        `)
        .single();

      if (error) {
        console.error('[MT] Erro ao criar template:', error);
        throw error;
      }

      return mapMTToLegacy(created as MTMarketingTemplate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Template criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar template: ${error.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Atualizar Template
  // ==========================================================================
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MarketingTemplateFormData> }) => {
      const mtData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      // Mapear campos legacy para MT
      if (data.nome_template !== undefined) mtData.name = data.nome_template;
      if (data.template_content !== undefined) mtData.content = data.template_content;
      if (data.tipo !== undefined) mtData.template_type = data.tipo;
      if (data.is_default !== undefined) mtData.is_default = data.is_default;
      if (data.ativo !== undefined) mtData.is_active = data.ativo;

      // Converter variáveis para objeto JSONB
      if (data.variaveis_disponiveis !== undefined) {
        const variablesObj: Record<string, string> = {};
        if (Array.isArray(data.variaveis_disponiveis)) {
          data.variaveis_disponiveis.forEach((v: string) => {
            variablesObj[v] = v;
          });
        }
        mtData.variables = variablesObj;
      }

      const { data: updated, error } = await supabase
        .from('mt_marketing_templates')
        .update(mtData)
        .eq('id', id)
        .select(`
          *,
          tenant:mt_tenants(id, slug, nome_fantasia)
        `)
        .single();

      if (error) {
        console.error('[MT] Erro ao atualizar template:', error);
        throw error;
      }

      return mapMTToLegacy(updated as MTMarketingTemplate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Template atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar template: ${error.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Deletar Template
  // ==========================================================================
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_marketing_templates')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[MT] Erro ao deletar template:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Template excluído com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir template: ${error.message}`);
    },
  });

  return {
    templates,
    isLoading: isLoading || isTenantLoading,
    error,
    refetch,
    createTemplate: createMutation.mutateAsync,
    updateTemplate: (id: string, data: Partial<MarketingTemplateFormData>) =>
      updateMutation.mutateAsync({ id, data }),
    deleteTemplate: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    _mode: 'mt' as const,
  };
}

// =============================================================================
// Helper: Verificar modo atual (sempre MT)
// =============================================================================

export function getMarketingTemplatesMode(): 'mt' {
  return 'mt';
}

export default useMarketingTemplatesAdapter;
