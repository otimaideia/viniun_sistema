// =============================================================================
// USE FORMULARIOS ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter 100% MT para formulários usando tabelas mt_forms e mt_form_fields
// SISTEMA 100% MT - Sem fallback para legacy
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';

// =============================================================================
// Types
// =============================================================================

export interface FormFieldMT {
  id: string;
  form_id: string;
  tenant_id?: string;
  nome: string;
  label: string;
  placeholder?: string;
  helper_text?: string;
  tipo: string;
  obrigatorio: boolean;
  ordem: number;
  largura: string;
  validacao?: Record<string, unknown>;
  opcoes?: Record<string, unknown>;
  valor_padrao?: string;
  condicao?: Record<string, unknown>;
  mapear_para_lead?: string;
  created_at: string;
  updated_at: string;
  // Compatibilidade
  formulario_id?: string;
}

export interface FormMT {
  id: string;
  tenant_id: string;
  franchise_id?: string | null;
  nome: string;
  slug: string;
  descricao?: string;
  titulo_pagina?: string;
  subtitulo?: string;
  imagem_header?: string;
  cor_primaria?: string;
  cor_fundo?: string;
  redirect_url?: string;
  mensagem_sucesso?: string;
  email_notificacao?: string[];
  webhook_url?: string;
  criar_lead: boolean;
  funil_id?: string;
  is_active: boolean;
  publicado: boolean;
  publicado_em?: string;
  limite_submissoes?: number;
  data_inicio?: string;
  data_fim?: string;
  total_visualizacoes: number;
  total_submissoes: number;
  taxa_conversao?: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  deleted_at?: string | null;
  campos?: FormFieldMT[];
  franchise?: {
    id: string;
    codigo: string;
    nome: string;
  };
  tenant?: {
    id: string;
    slug: string;
    nome_fantasia: string;
  };
  scope?: 'global' | 'tenant' | 'franchise';
  // Campos mapeados para compatibilidade
  ativo?: boolean;
  status?: string;
  franqueado_id?: string | null;
}

export interface FormStats {
  total: number;
  ativos: number;
  publicados: number;
  rascunhos: number;
  total_submissoes: number;
  taxa_conversao_media: number;
}

// =============================================================================
// Query Keys
// =============================================================================

const QUERY_KEY = 'mt-formularios';
const QUERY_KEY_SINGLE = 'mt-formulario';
const QUERY_KEY_FIELDS = 'mt-formulario-campos';

// =============================================================================
// Hook Principal: useFormulariosAdapter
// =============================================================================

interface UseFormulariosAdapterOptions {
  franchiseId?: string;
  includeStats?: boolean;
  status?: string;
  includeGlobal?: boolean;
  onlyPublished?: boolean;
}

export function useFormulariosAdapter(options: UseFormulariosAdapterOptions = {}) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const {
    franchiseId,
    includeGlobal = true,
    onlyPublished = false,
  } = options;

  // ==========================================================================
  // Query: Listar Formulários
  // ==========================================================================
  const {
    data: formularios = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: [QUERY_KEY, tenant?.id, franchise?.id, franchiseId, accessLevel, onlyPublished],
    queryFn: async () => {
      let query = supabase
        .from('mt_forms')
        .select(`
          *,
          campos:mt_form_fields(*),
          franchise:mt_franchises(id, codigo, nome),
          tenant:mt_tenants(id, slug, nome_fantasia)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Filtrar por escopo
      const currentFranchiseId = franchiseId || franchise?.id;
      const tenantId = tenant?.id;

      if (accessLevel === 'franchise' && currentFranchiseId) {
        if (includeGlobal) {
          query = query.or(`franchise_id.is.null,franchise_id.eq.${currentFranchiseId}`);
          if (tenantId) {
            query = query.eq('tenant_id', tenantId);
          }
        } else {
          query = query.eq('franchise_id', currentFranchiseId);
        }
      } else if (accessLevel === 'tenant' && tenantId) {
        query = query.eq('tenant_id', tenantId);
      }
      // Platform admin vê todos

      // Filtrar apenas publicados
      if (onlyPublished) {
        query = query.eq('publicado', true).eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[MT] Erro ao buscar formulários:', error);
        throw error;
      }

      // Mapear para formato com campos de compatibilidade
      return (data || []).map((form) => ({
        ...form,
        scope: form.franchise_id ? 'franchise' : 'tenant',
        // Campos mapeados para compatibilidade legacy
        ativo: form.is_active,
        status: form.publicado ? 'publicado' : 'rascunho',
        franqueado_id: form.franchise_id,
      })) as FormMT[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // ==========================================================================
  // Mutation: Criar Formulário
  // ==========================================================================
  const createMutation = useMutation({
    mutationFn: async (data: Partial<FormMT>) => {
      const slug = data.slug || data.nome?.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '') || `form-${Date.now()}`;

      const { data: created, error } = await supabase
        .from('mt_forms')
        .insert({
          tenant_id: tenant?.id,
          franchise_id: data.franchise_id || data.franqueado_id || franchise?.id || null,
          nome: data.nome,
          slug,
          descricao: data.descricao || null,
          titulo_pagina: data.titulo_pagina || data.nome,
          subtitulo: data.subtitulo || null,
          imagem_header: data.imagem_header || null,
          cor_primaria: data.cor_primaria || '#E91E63',
          cor_fundo: data.cor_fundo || '#FFFFFF',
          redirect_url: data.redirect_url || null,
          mensagem_sucesso: data.mensagem_sucesso || 'Obrigado por enviar o formulário!',
          email_notificacao: data.email_notificacao || [],
          webhook_url: data.webhook_url || null,
          criar_lead: data.criar_lead ?? true,
          funil_id: data.funil_id || null,
          is_active: true,
          publicado: false,
          total_visualizacoes: 0,
          total_submissoes: 0,
        })
        .select(`
          *,
          franchise:mt_franchises(id, codigo, nome)
        `)
        .single();

      if (error) {
        console.error('[MT] Erro ao criar formulário:', error);
        throw error;
      }

      return {
        ...created,
        ativo: created.is_active,
        status: created.publicado ? 'publicado' : 'rascunho',
        franqueado_id: created.franchise_id,
      } as FormMT;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Formulário criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar formulário: ${error.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Atualizar Formulário
  // ==========================================================================
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<FormMT> & { id: string }) => {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      // Mapear campos
      if (data.nome !== undefined) updateData.nome = data.nome;
      if (data.slug !== undefined) updateData.slug = data.slug;
      if (data.descricao !== undefined) updateData.descricao = data.descricao;
      if (data.titulo_pagina !== undefined) updateData.titulo_pagina = data.titulo_pagina;
      if (data.subtitulo !== undefined) updateData.subtitulo = data.subtitulo;
      if (data.imagem_header !== undefined) updateData.imagem_header = data.imagem_header;
      if (data.cor_primaria !== undefined) updateData.cor_primaria = data.cor_primaria;
      if (data.cor_fundo !== undefined) updateData.cor_fundo = data.cor_fundo;
      if (data.redirect_url !== undefined) updateData.redirect_url = data.redirect_url;
      if (data.mensagem_sucesso !== undefined) updateData.mensagem_sucesso = data.mensagem_sucesso;
      if (data.email_notificacao !== undefined) updateData.email_notificacao = data.email_notificacao;
      if (data.webhook_url !== undefined) updateData.webhook_url = data.webhook_url;
      if (data.criar_lead !== undefined) updateData.criar_lead = data.criar_lead;
      if (data.funil_id !== undefined) updateData.funil_id = data.funil_id;
      if (data.is_active !== undefined) updateData.is_active = data.is_active;
      if (data.ativo !== undefined) updateData.is_active = data.ativo;
      if (data.publicado !== undefined) {
        updateData.publicado = data.publicado;
        if (data.publicado) {
          updateData.publicado_em = new Date().toISOString();
        }
      }
      if (data.limite_submissoes !== undefined) updateData.limite_submissoes = data.limite_submissoes;
      if (data.data_inicio !== undefined) updateData.data_inicio = data.data_inicio;
      if (data.data_fim !== undefined) updateData.data_fim = data.data_fim;

      const { data: updated, error } = await supabase
        .from('mt_forms')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          franchise:mt_franchises(id, codigo, nome)
        `)
        .single();

      if (error) {
        console.error('[MT] Erro ao atualizar formulário:', error);
        throw error;
      }

      return {
        ...updated,
        ativo: updated.is_active,
        status: updated.publicado ? 'publicado' : 'rascunho',
        franqueado_id: updated.franchise_id,
      } as FormMT;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Formulário atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar formulário: ${error.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Deletar Formulário (Soft Delete)
  // ==========================================================================
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_forms')
        .update({
          is_active: false,
          deleted_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('[MT] Erro ao deletar formulário:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Formulário excluído com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir formulário: ${error.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Duplicar Formulário
  // ==========================================================================
  const duplicateMutation = useMutation({
    mutationFn: async ({ id, newName }: { id: string; newName?: string }) => {
      // Buscar formulário original com campos
      const { data: original, error: fetchError } = await supabase
        .from('mt_forms')
        .select('*, campos:mt_form_fields(*)')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (!original) throw new Error('Formulário não encontrado');

      const {
        id: _,
        created_at,
        updated_at,
        deleted_at,
        campos,
        publicado_em,
        total_visualizacoes,
        total_submissoes,
        taxa_conversao,
        ...formData
      } = original;

      // Criar novo formulário
      const newSlug = `${original.slug}-copia-${Date.now()}`;
      const { data: newForm, error: createError } = await supabase
        .from('mt_forms')
        .insert({
          ...formData,
          nome: newName || `${original.nome} (Cópia)`,
          slug: newSlug,
          publicado: false,
          total_visualizacoes: 0,
          total_submissoes: 0,
          taxa_conversao: null,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Duplicar campos
      if (campos && campos.length > 0) {
        const newCampos = campos.map(({
          id: fieldId,
          form_id,
          created_at: fca,
          updated_at: fua,
          ...campo
        }: FormFieldMT) => ({
          ...campo,
          form_id: newForm.id,
          tenant_id: tenant?.id,
        }));

        await supabase.from('mt_form_fields').insert(newCampos);
      }

      return {
        ...newForm,
        ativo: newForm.is_active,
        status: newForm.publicado ? 'publicado' : 'rascunho',
        franqueado_id: newForm.franchise_id,
      } as FormMT;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Formulário duplicado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao duplicar formulário: ${error.message}`);
    },
  });

  // ==========================================================================
  // Stats Computados
  // ==========================================================================
  const stats: FormStats = {
    total: formularios.length,
    ativos: formularios.filter((f) => f.is_active).length,
    publicados: formularios.filter((f) => f.publicado && f.is_active).length,
    rascunhos: formularios.filter((f) => !f.publicado && f.is_active).length,
    total_submissoes: formularios.reduce((acc, f) => acc + (f.total_submissoes || 0), 0),
    taxa_conversao_media: formularios.length > 0
      ? formularios.reduce((acc, f) => acc + (f.taxa_conversao || 0), 0) / formularios.length
      : 0,
  };

  // ==========================================================================
  // getFormulario - Buscar formulário por ID
  // ==========================================================================
  const getFormulario = async (id: string): Promise<FormMT | null> => {
    const { data, error } = await supabase
      .from('mt_forms')
      .select(`
        *,
        campos:mt_form_fields(*),
        franchise:mt_franchises(id, codigo, nome),
        tenant:mt_tenants(id, slug, nome_fantasia)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('[MT] Erro ao buscar formulário:', error);
      throw error;
    }

    if (!data) return null;

    // Ordenar campos por ordem
    if (data.campos) {
      data.campos.sort((a: FormFieldMT, b: FormFieldMT) => a.ordem - b.ordem);
    }

    return {
      ...data,
      scope: data.franchise_id ? 'franchise' : 'tenant',
      ativo: data.is_active,
      status: data.publicado ? 'publicado' : 'rascunho',
      franqueado_id: data.franchise_id,
    } as FormMT;
  };

  return {
    formularios,
    stats,
    isLoading: isLoading || isTenantLoading,
    error,
    refetch,
    isFetching,
    getFormulario,
    createFormulario: createMutation.mutateAsync,
    updateFormulario: (data: Partial<FormMT> & { id: string }) => updateMutation.mutateAsync(data),
    deleteFormulario: deleteMutation.mutateAsync,
    duplicateFormulario: (id: string, newName?: string) =>
      duplicateMutation.mutateAsync({ id, newName }),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    _mode: 'mt' as const,
  };
}

// =============================================================================
// Hook: useFormularioAdapter (singular)
// =============================================================================

export function useFormularioAdapter(id: string | undefined) {
  const { tenant, isLoading: isTenantLoading } = useTenantContext();

  const {
    data: formulario,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY_SINGLE, id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('mt_forms')
        .select(`
          *,
          campos:mt_form_fields(*),
          franchise:mt_franchises(id, codigo, nome),
          tenant:mt_tenants(id, slug, nome_fantasia)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('[MT] Erro ao buscar formulário:', error);
        throw error;
      }

      // Ordenar campos por ordem
      if (data?.campos) {
        data.campos.sort((a: FormFieldMT, b: FormFieldMT) => a.ordem - b.ordem);
      }

      return {
        ...data,
        scope: data.franchise_id ? 'franchise' : 'tenant',
        ativo: data.is_active,
        status: data.publicado ? 'publicado' : 'rascunho',
        franqueado_id: data.franchise_id,
      } as FormMT;
    },
    enabled: !!id && !isTenantLoading,
  });

  // Incrementar visualização
  const incrementView = async () => {
    if (!id) return;

    try {
      await supabase.rpc('increment_form_views', { form_id: id });
    } catch (err) {
      console.error('[MT] Erro ao incrementar visualização:', err);
    }
  };

  return {
    formulario,
    isLoading: isLoading || isTenantLoading,
    error,
    refetch,
    incrementView,
    _mode: 'mt' as const,
  };
}

// =============================================================================
// Hook: useFormFieldsAdapter
// =============================================================================

export function useFormFieldsAdapter(formId: string | undefined) {
  const { tenant, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ==========================================================================
  // Query: Listar Campos
  // ==========================================================================
  const {
    data: fields = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY_FIELDS, formId],
    queryFn: async () => {
      if (!formId) return [];

      const { data, error } = await supabase
        .from('mt_form_fields')
        .select('*')
        .eq('form_id', formId)
        .order('ordem', { ascending: true });

      if (error) {
        console.error('[MT] Erro ao buscar campos:', error);
        throw error;
      }

      // Mapear para formato com compatibilidade
      return (data || []).map((f) => ({
        ...f,
        formulario_id: f.form_id,
      })) as FormFieldMT[];
    },
    enabled: !!formId && !isTenantLoading,
  });

  // ==========================================================================
  // Mutation: Criar Campo
  // ==========================================================================
  const createMutation = useMutation({
    mutationFn: async (data: Partial<FormFieldMT>) => {
      if (!formId) throw new Error('Form ID não definido');

      // Determinar próxima ordem
      const maxOrdem = fields.length > 0
        ? Math.max(...fields.map((f) => f.ordem))
        : -1;

      const { data: created, error } = await supabase
        .from('mt_form_fields')
        .insert({
          form_id: formId,
          tenant_id: tenant?.id,
          nome: data.nome || `field_${Date.now()}`,
          label: data.label || 'Novo Campo',
          placeholder: data.placeholder || null,
          helper_text: data.helper_text || null,
          tipo: data.tipo || 'text',
          obrigatorio: data.obrigatorio ?? false,
          ordem: data.ordem ?? maxOrdem + 1,
          largura: data.largura || 'full',
          validacao: data.validacao || null,
          opcoes: data.opcoes || null,
          valor_padrao: data.valor_padrao || null,
          condicao: data.condicao || null,
          mapear_para_lead: data.mapear_para_lead || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[MT] Erro ao criar campo:', error);
        throw error;
      }

      return {
        ...created,
        formulario_id: created.form_id,
      } as FormFieldMT;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_FIELDS, formId] });
      toast.success('Campo adicionado');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar campo: ${error.message}`);
    },
  });

  // ==========================================================================
  // Mutation: Atualizar Campo
  // ==========================================================================
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<FormFieldMT> & { id: string }) => {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (data.nome !== undefined) updateData.nome = data.nome;
      if (data.label !== undefined) updateData.label = data.label;
      if (data.placeholder !== undefined) updateData.placeholder = data.placeholder;
      if (data.helper_text !== undefined) updateData.helper_text = data.helper_text;
      if (data.tipo !== undefined) updateData.tipo = data.tipo;
      if (data.obrigatorio !== undefined) updateData.obrigatorio = data.obrigatorio;
      if (data.ordem !== undefined) updateData.ordem = data.ordem;
      if (data.largura !== undefined) updateData.largura = data.largura;
      if (data.validacao !== undefined) updateData.validacao = data.validacao;
      if (data.opcoes !== undefined) updateData.opcoes = data.opcoes;
      if (data.valor_padrao !== undefined) updateData.valor_padrao = data.valor_padrao;
      if (data.condicao !== undefined) updateData.condicao = data.condicao;
      if (data.mapear_para_lead !== undefined) updateData.mapear_para_lead = data.mapear_para_lead;

      const { data: updated, error } = await supabase
        .from('mt_form_fields')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[MT] Erro ao atualizar campo:', error);
        throw error;
      }

      return {
        ...updated,
        formulario_id: updated.form_id,
      } as FormFieldMT;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_FIELDS, formId] });
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
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_FIELDS, formId] });
      toast.success('Campo removido');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover campo: ${error.message}`);
    },
  });

  // ==========================================================================
  // Reordenar Campos
  // ==========================================================================
  const reorderFields = async (fieldIds: string[]): Promise<void> => {
    const updates = fieldIds.map((id, index) =>
      supabase
        .from('mt_form_fields')
        .update({ ordem: index })
        .eq('id', id)
    );

    await Promise.all(updates);
    queryClient.invalidateQueries({ queryKey: [QUERY_KEY_FIELDS, formId] });
  };

  return {
    fields,
    isLoading: isLoading || isTenantLoading,
    createField: createMutation.mutateAsync,
    updateField: (id: string, data: Partial<FormFieldMT>) =>
      updateMutation.mutateAsync({ id, ...data }),
    deleteField: deleteMutation.mutateAsync,
    reorderFields,
    refetch,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    _mode: 'mt' as const,
  };
}

// =============================================================================
// Helper: Verificar modo atual (sempre MT)
// =============================================================================

export function getFormularioMode(): 'mt' {
  return 'mt';
}

export function setFormularioMode(_mode: 'legacy' | 'mt') {
  // Não faz nada - sempre MT
  console.warn('[MT] setFormularioMode está deprecated - sistema é 100% MT');
}

export default useFormulariosAdapter;
