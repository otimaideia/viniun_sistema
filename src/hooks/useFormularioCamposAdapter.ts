// =============================================================================
// USE FORMULARIO CAMPOS ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para campos de formulários usando tabela MT
// SISTEMA 100% MT - Usa mt_form_fields diretamente
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type {
  FormularioCampo,
  FormularioCampoInsert,
  FormularioCampoUpdate,
} from '@/types/formulario';

// =============================================================================
// Types
// =============================================================================

interface MTFormField {
  id: string;
  form_id: string;
  tenant_id: string | null;
  nome: string;
  tipo: string;
  label: string;
  placeholder: string | null;
  helper_text: string | null;
  obrigatorio: boolean;
  ordem: number;
  largura: string;
  validacao: Record<string, unknown> | null;
  opcoes: string[] | null;
  valor_padrao: string | null;
  condicao: Record<string, unknown> | null;
  mapear_para_lead: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Query Keys
// =============================================================================

const QUERY_KEY = 'mt-formulario-campos';

// =============================================================================
// Mapper: MT → Legacy format
// =============================================================================

function mapMTToLegacy(field: MTFormField): FormularioCampo {
  return {
    id: field.id,
    formulario_id: field.form_id,
    nome: field.nome,
    tipo: field.tipo,
    label: field.label,
    placeholder: field.placeholder,
    obrigatorio: field.obrigatorio,
    ordem: field.ordem,
    largura: field.largura as 'full' | 'half' | 'third',
    ativo: true, // Default to true since column doesn't exist
    opcoes: field.opcoes,
    mascara: null, // Extract from validacao if needed
    etapa: 1, // Default
    campo_lead: field.mapear_para_lead,
    min_length: null, // Extract from validacao if needed
    max_length: null, // Extract from validacao if needed
    pattern: null, // Extract from validacao if needed
    mensagem_erro: null,
    condicao_campo: null,
    condicao_valor: null,
    indicados_config: null,
    created_at: field.created_at,
    updated_at: field.updated_at,
  };
}

// =============================================================================
// Hook Principal
// =============================================================================

export function useFormularioCamposAdapter(formularioId: string) {
  const { tenant, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ==========================================================================
  // Query: Listar Campos
  // ==========================================================================
  const {
    data: campos = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, formularioId, tenant?.id],
    queryFn: async (): Promise<FormularioCampo[]> => {
      if (!formularioId) return [];

      const { data, error } = await supabase
        .from('mt_form_fields')
        .select('*')
        .eq('form_id', formularioId)
        .order('ordem', { ascending: true });

      if (error) {
        console.error('[MT] Erro ao buscar campos:', error);
        throw error;
      }

      return (data || []).map(mapMTToLegacy);
    },
    enabled: !!formularioId && !isTenantLoading,
  });

  // ==========================================================================
  // Mutation: Criar Campo
  // ==========================================================================
  const createMutation = useMutation({
    mutationFn: async (campo: Omit<FormularioCampoInsert, 'formulario_id'>) => {
      const { data, error } = await supabase
        .from('mt_form_fields')
        .insert({
          form_id: formularioId,
          nome: campo.nome,
          tipo: campo.tipo,
          label: campo.label,
          placeholder: campo.placeholder || null,
          obrigatorio: campo.obrigatorio ?? false,
          ordem: campo.ordem ?? 0,
          largura: campo.largura || 'full',
          opcoes: campo.opcoes && campo.opcoes.length > 0 ? campo.opcoes : null,
          mapear_para_lead: campo.campo_lead || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[MT] Erro ao criar campo:', error);
        throw error;
      }

      return mapMTToLegacy(data as MTFormField);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, formularioId] });
      toast.success('Campo adicionado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar campo: ${error.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Atualizar Campo
  // ==========================================================================
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: FormularioCampoUpdate & { id: string }) => {
      // Map legacy fields to MT fields
      const mtUpdates: Record<string, unknown> = {};

      if (updates.nome !== undefined) mtUpdates.nome = updates.nome;
      if (updates.tipo !== undefined) mtUpdates.tipo = updates.tipo;
      if (updates.label !== undefined) mtUpdates.label = updates.label;
      if (updates.placeholder !== undefined) mtUpdates.placeholder = updates.placeholder;
      if (updates.obrigatorio !== undefined) mtUpdates.obrigatorio = updates.obrigatorio;
      if (updates.ordem !== undefined) mtUpdates.ordem = updates.ordem;
      if (updates.largura !== undefined) mtUpdates.largura = updates.largura;
      if (updates.opcoes !== undefined) mtUpdates.opcoes = updates.opcoes;
      if (updates.campo_lead !== undefined) mtUpdates.mapear_para_lead = updates.campo_lead;

      mtUpdates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('mt_form_fields')
        .update(mtUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[MT] Erro ao atualizar campo:', error);
        throw error;
      }

      return mapMTToLegacy(data as MTFormField);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, formularioId] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar campo: ${error.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Deletar Campo
  // ==========================================================================
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_form_fields')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[MT] Erro ao deletar campo:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, formularioId] });
      toast.success('Campo removido!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover campo: ${error.message}`);
    },
  });

  // ==========================================================================
  // Reordenar Campos
  // ==========================================================================
  const reorderCampos = async (
    reorderedCampos: { id: string; ordem: number }[]
  ): Promise<boolean> => {
    try {
      const updates = reorderedCampos.map(({ id, ordem }) =>
        supabase
          .from('mt_form_fields')
          .update({ ordem, updated_at: new Date().toISOString() })
          .eq('id', id)
      );

      await Promise.all(updates);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, formularioId] });
      return true;
    } catch (err) {
      console.error('[MT] Erro ao reordenar campos:', err);
      toast.error('Erro ao reordenar campos');
      return false;
    }
  };

  // ==========================================================================
  // Criar Campos em Lote
  // ==========================================================================
  const bulkCreateCampos = async (
    camposToCreate: Omit<FormularioCampoInsert, 'formulario_id'>[]
  ): Promise<FormularioCampo[]> => {
    const camposData = camposToCreate.map((campo) => ({
      form_id: formularioId,
      nome: campo.nome,
      tipo: campo.tipo,
      label: campo.label,
      placeholder: campo.placeholder || null,
      obrigatorio: campo.obrigatorio ?? false,
      ordem: campo.ordem ?? 0,
      largura: campo.largura || 'full',
      opcoes: campo.opcoes && campo.opcoes.length > 0 ? campo.opcoes : null,
      mapear_para_lead: campo.campo_lead || null,
    }));

    const { data, error } = await supabase
      .from('mt_form_fields')
      .insert(camposData)
      .select();

    if (error) {
      console.error('[MT] Erro ao criar campos em lote:', error);
      throw error;
    }

    queryClient.invalidateQueries({ queryKey: [QUERY_KEY, formularioId] });
    return (data || []).map((field) => mapMTToLegacy(field as MTFormField));
  };

  return {
    campos,
    isLoading: isLoading || isTenantLoading,
    error,
    refetch,
    createCampo: createMutation.mutate,
    updateCampo: updateMutation.mutate,
    deleteCampo: deleteMutation.mutate,
    reorderCampos,
    bulkCreateCampos,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    _mode: 'mt' as const,
  };
}

// =============================================================================
// Re-export Types
// =============================================================================

export type {
  FormularioCampo,
  FormularioCampoInsert,
  FormularioCampoUpdate,
} from '@/types/formulario';

// =============================================================================
// Helper: Verificar modo atual (sempre MT)
// =============================================================================

export function getFormularioCamposMode(): 'mt' {
  return 'mt';
}

export default useFormularioCamposAdapter;
