import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';

// =============================================================================
// TIPOS
// =============================================================================

export interface FormField {
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
}

export interface Form {
  id: string;
  tenant_id: string;
  franchise_id?: string;
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
  // Relacionamentos
  campos?: FormField[];
  franchise?: {
    id: string;
    codigo: string;
    nome: string;
  };
  scope?: 'global' | 'tenant' | 'franchise';
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
// HOOK: useFormulariosMT
// Gerencia formulários com suporte multi-tenant
// =============================================================================

interface UseFormulariosMTOptions {
  includeGlobal?: boolean;
  franchiseId?: string;
  onlyPublished?: boolean;
}

export function useFormulariosMT(options: UseFormulariosMTOptions = {}) {
  const { includeGlobal = true, franchiseId, onlyPublished = false } = options;
  const [forms, setForms] = useState<Form[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { tenant, franchise } = useTenantContext();

  // Carregar formulários
  const fetchForms = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('mt_forms')
        .select(`
          *,
          campos:mt_form_fields(*),
          franchise:mt_franchises(id, codigo, nome)
        `)
        .order('created_at', { ascending: false });

      // Filtrar por escopo
      const currentFranchiseId = franchiseId || franchise?.id;
      const tenantId = tenant?.id;

      if (currentFranchiseId) {
        // Franquia específica: ver globais + tenant + franquia
        if (includeGlobal) {
          query = query.or(`franchise_id.is.null,franchise_id.eq.${currentFranchiseId}`);
          if (tenantId) {
            query = query.eq('tenant_id', tenantId);
          }
        } else {
          query = query.eq('franchise_id', currentFranchiseId);
        }
      } else if (tenantId) {
        // Tenant: ver todos do tenant
        query = query.eq('tenant_id', tenantId);
      }

      // Filtrar apenas publicados
      if (onlyPublished) {
        query = query.eq('publicado', true).eq('is_active', true);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Adicionar escopo calculado
      const formsWithScope = (data || []).map((form) => ({
        ...form,
        scope: form.franchise_id ? 'franchise' : 'tenant',
      })) as Form[];

      setForms(formsWithScope);
    } catch (err) {
      console.error('Erro ao carregar formulários:', err);
      setError(err instanceof Error ? err : new Error('Erro ao carregar formulários'));
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, franchise?.id, franchiseId, includeGlobal, onlyPublished]);

  // Criar formulário
  const createForm = useCallback(async (data: Partial<Form>): Promise<Form> => {
    const { data: created, error: createError } = await supabase
      .from('mt_forms')
      .insert({
        tenant_id: tenant?.id,
        franchise_id: data.franchise_id || franchise?.id || null,
        nome: data.nome,
        slug: data.slug || data.nome?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
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
      .select()
      .single();

    if (createError) throw createError;

    await fetchForms();
    return created as Form;
  }, [fetchForms, tenant?.id, franchise?.id]);

  // Atualizar formulário
  const updateForm = useCallback(async (id: string, data: Partial<Form>): Promise<Form> => {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Só atualizar campos que foram passados
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
    if (data.publicado !== undefined) {
      updateData.publicado = data.publicado;
      if (data.publicado) {
        updateData.publicado_em = new Date().toISOString();
      }
    }
    if (data.limite_submissoes !== undefined) updateData.limite_submissoes = data.limite_submissoes;
    if (data.data_inicio !== undefined) updateData.data_inicio = data.data_inicio;
    if (data.data_fim !== undefined) updateData.data_fim = data.data_fim;

    const { data: updated, error: updateError } = await supabase
      .from('mt_forms')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    await fetchForms();
    return updated as Form;
  }, [fetchForms]);

  // Deletar formulário (soft delete)
  const deleteForm = useCallback(async (id: string): Promise<void> => {
    const { error: deleteError } = await supabase
      .from('mt_forms')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (deleteError) throw deleteError;

    await fetchForms();
  }, [fetchForms]);

  // Publicar/Despublicar formulário
  const togglePublish = useCallback(async (id: string, publish: boolean): Promise<Form> => {
    return updateForm(id, { publicado: publish });
  }, [updateForm]);

  // Duplicar formulário
  const duplicateForm = useCallback(async (id: string, newName?: string): Promise<Form> => {
    // Buscar formulário original
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
      const newCampos = campos.map(({ id: fieldId, form_id, created_at, updated_at, ...campo }: FormField) => ({
        ...campo,
        form_id: newForm.id,
        tenant_id: tenant?.id,
      }));

      await supabase.from('mt_form_fields').insert(newCampos);
    }

    await fetchForms();
    return newForm as Form;
  }, [fetchForms, tenant?.id]);

  // Carregar ao montar
  useEffect(() => {
    if (tenant?.id) {
      fetchForms();
    }
  }, [fetchForms, tenant?.id]);

  // Calcular estatísticas
  const stats: FormStats = {
    total: forms.length,
    ativos: forms.filter(f => f.is_active).length,
    publicados: forms.filter(f => f.publicado && f.is_active).length,
    rascunhos: forms.filter(f => !f.publicado && f.is_active).length,
    total_submissoes: forms.reduce((acc, f) => acc + (f.total_submissoes || 0), 0),
    taxa_conversao_media: forms.length > 0
      ? forms.reduce((acc, f) => acc + (f.taxa_conversao || 0), 0) / forms.length
      : 0,
  };

  return {
    forms,
    stats,
    isLoading,
    error,
    createForm,
    updateForm,
    deleteForm,
    togglePublish,
    duplicateForm,
    refetch: fetchForms,
  };
}

// =============================================================================
// HOOK: useFormularioMT (singular)
// Carrega um formulário específico por ID ou slug
// =============================================================================

export function useFormularioMT(formIdOrSlug: string | undefined, bySlug: boolean = false) {
  const [form, setForm] = useState<Form | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchForm = useCallback(async () => {
    if (!formIdOrSlug) {
      setForm(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('mt_forms')
        .select(`
          *,
          campos:mt_form_fields(*),
          franchise:mt_franchises(id, codigo, nome),
          tenant:mt_tenants(id, slug, nome_fantasia)
        `);

      if (bySlug) {
        query = query.eq('slug', formIdOrSlug);
      } else {
        query = query.eq('id', formIdOrSlug);
      }

      const { data, error: fetchError } = await query.single();

      if (fetchError) throw fetchError;

      // Ordenar campos por ordem
      if (data?.campos) {
        data.campos.sort((a: FormField, b: FormField) => a.ordem - b.ordem);
      }

      setForm({
        ...data,
        scope: data.franchise_id ? 'franchise' : 'tenant',
      } as Form);
    } catch (err) {
      console.error('Erro ao carregar formulário:', err);
      setError(err instanceof Error ? err : new Error('Erro ao carregar formulário'));
    } finally {
      setIsLoading(false);
    }
  }, [formIdOrSlug, bySlug]);

  // Incrementar visualização
  const incrementView = useCallback(async () => {
    if (!form?.id) return;

    await supabase.rpc('increment_form_views', { form_id: form.id });
  }, [form?.id]);

  useEffect(() => {
    fetchForm();
  }, [fetchForm]);

  return { form, isLoading, error, refetch: fetchForm, incrementView };
}

// =============================================================================
// HOOK: useFormFieldsMT
// Gerencia campos de um formulário
// =============================================================================

export function useFormFieldsMT(formId: string | undefined) {
  const [fields, setFields] = useState<FormField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant } = useTenantContext();

  const fetchFields = useCallback(async () => {
    if (!formId) {
      setFields([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('mt_form_fields')
        .select('*')
        .eq('form_id', formId)
        .order('ordem', { ascending: true });

      if (error) throw error;

      setFields(data || []);
    } catch (err) {
      console.error('Erro ao carregar campos:', err);
    } finally {
      setIsLoading(false);
    }
  }, [formId]);

  const createField = useCallback(async (data: Partial<FormField>): Promise<FormField> => {
    if (!formId) throw new Error('Form ID não definido');

    // Determinar próxima ordem
    const maxOrdem = fields.length > 0
      ? Math.max(...fields.map(f => f.ordem))
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

    if (error) throw error;

    await fetchFields();
    return created as FormField;
  }, [formId, fields, fetchFields, tenant?.id]);

  const updateField = useCallback(async (id: string, data: Partial<FormField>): Promise<FormField> => {
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

    if (error) throw error;

    await fetchFields();
    return updated as FormField;
  }, [fetchFields]);

  const deleteField = useCallback(async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('mt_form_fields')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await fetchFields();
  }, [fetchFields]);

  const reorderFields = useCallback(async (fieldIds: string[]): Promise<void> => {
    // Atualizar ordem de cada campo
    const updates = fieldIds.map((id, index) =>
      supabase
        .from('mt_form_fields')
        .update({ ordem: index })
        .eq('id', id)
    );

    await Promise.all(updates);
    await fetchFields();
  }, [fetchFields]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  return {
    fields,
    isLoading,
    createField,
    updateField,
    deleteField,
    reorderFields,
    refetch: fetchFields,
  };
}

export default useFormulariosMT;
