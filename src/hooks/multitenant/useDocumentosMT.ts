// =============================================================================
// USE DOCUMENTOS MT - Hook Multi-Tenant para Gestão de Documentos
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import type {
  MTDocument,
  MTDocumentCreate,
  MTDocumentUpdate,
  MTDocumentCategory,
  MTDocumentCategoryCreate,
  MTDocumentFilters,
} from '@/types/documento';

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function getErrorMessage(error: any): string {
  if (error?.message?.includes('Failed to fetch')) {
    return 'Erro de conexão. Verifique sua internet.';
  }
  const pgCode = error?.code;
  switch (pgCode) {
    case '23505': return 'Este registro já existe.';
    case '23503': return 'Este registro está vinculado a outros dados.';
    case '23502': return 'Preencha todos os campos obrigatórios.';
    case '42501': return 'Você não tem permissão para esta operação.';
    default: return error?.message || 'Erro desconhecido.';
  }
}

// Bucket name para documentos
const STORAGE_BUCKET = 'documentos';

// -----------------------------------------------------------------------------
// Hook: useDocumentosMT - CRUD principal de documentos
// -----------------------------------------------------------------------------

export function useDocumentosMT(filters?: MTDocumentFilters) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // Query: listar documentos
  const query = useQuery({
    queryKey: ['mt-documentos', tenant?.id, franchise?.id, filters],
    queryFn: async () => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado');
      }

      let q = (supabase as any)
        .from('mt_documents')
        .select('*, category:mt_document_categories(id, nome, cor, icone)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Filtros por nível de acesso
      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('franchise_id', franchise.id);
      }

      // Filtros opcionais
      if (filters?.search) {
        q = q.or(`titulo.ilike.%${filters.search}%,descricao.ilike.%${filters.search}%,arquivo_nome.ilike.%${filters.search}%`);
      }
      if (filters?.category_id) {
        q = q.eq('category_id', filters.category_id);
      }
      if (filters?.is_active !== undefined) {
        q = q.eq('is_active', filters.is_active);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as MTDocument[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // Mutation: criar documento
  const create = useMutation({
    mutationFn: async (newDoc: MTDocumentCreate) => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      const { data, error } = await (supabase as any)
        .from('mt_documents')
        .insert({
          ...newDoc,
          tenant_id: tenant?.id,
          franchise_id: newDoc.franchise_id || franchise?.id || null,
        })
        .select('*, category:mt_document_categories(id, nome, cor, icone)')
        .single();

      if (error) throw error;
      return data as MTDocument;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-documentos'] });
      toast.success('Documento salvo com sucesso');
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error));
    },
  });

  // Mutation: atualizar documento
  const update = useMutation({
    mutationFn: async ({ id, ...updates }: MTDocumentUpdate) => {
      const { data, error } = await (supabase as any)
        .from('mt_documents')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*, category:mt_document_categories(id, nome, cor, icone)')
        .single();

      if (error) throw error;
      return data as MTDocument;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-documentos'] });
      toast.success('Documento atualizado com sucesso');
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error));
    },
  });

  // Mutation: soft delete
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('mt_documents')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-documentos'] });
      toast.success('Documento removido com sucesso');
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error));
    },
  });

  return {
    data: query.data || [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    create,
    update,
    remove,
  };
}

// -----------------------------------------------------------------------------
// Hook: useDocumentoMT - Documento individual
// -----------------------------------------------------------------------------

export function useDocumentoMT(id: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const query = useQuery({
    queryKey: ['mt-documento', id],
    queryFn: async () => {
      if (!id) throw new Error('ID não informado');

      const { data, error } = await (supabase as any)
        .from('mt_documents')
        .select('*, category:mt_document_categories(id, nome, cor, icone)')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as MTDocument;
    },
    enabled: !!id && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  return {
    data: query.data,
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// -----------------------------------------------------------------------------
// Hook: useDocumentCategoriesMT - Categorias de documentos
// -----------------------------------------------------------------------------

export function useDocumentCategoriesMT() {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['mt-document-categories', tenant?.id],
    queryFn: async () => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado');
      }

      let q = (supabase as any)
        .from('mt_document_categories')
        .select('*')
        .eq('is_active', true)
        .order('ordem', { ascending: true });

      if (accessLevel !== 'platform' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as MTDocumentCategory[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  const create = useMutation({
    mutationFn: async (newCat: MTDocumentCategoryCreate) => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      const { data, error } = await (supabase as any)
        .from('mt_document_categories')
        .insert({
          ...newCat,
          tenant_id: tenant?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MTDocumentCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-document-categories'] });
      toast.success('Categoria criada com sucesso');
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error));
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<MTDocumentCategoryCreate>) => {
      const { data, error } = await (supabase as any)
        .from('mt_document_categories')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MTDocumentCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-document-categories'] });
      toast.success('Categoria atualizada');
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error));
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('mt_document_categories')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-document-categories'] });
      toast.success('Categoria removida');
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error));
    },
  });

  return {
    data: query.data || [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    create,
    update,
    remove,
  };
}

// -----------------------------------------------------------------------------
// Hook: useDocumentUpload - Upload de arquivos para Supabase Storage
// -----------------------------------------------------------------------------

export function useDocumentUpload() {
  const { tenant } = useTenantContext();

  const uploadFile = async (file: File): Promise<{ url: string; nome: string; tipo: string; tamanho: number }> => {
    if (!tenant) throw new Error('Tenant não definido');

    const fileExt = file.name.split('.').pop();
    const timestamp = Date.now();
    const filePath = `${tenant.id}/${timestamp}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      // Se bucket não existe, tentar criar e reupar
      if (uploadError.message?.includes('not found') || uploadError.message?.includes('Bucket')) {
        // Fallback: salvar URL como data URI ou usar outro bucket
        throw new Error('Bucket de documentos não configurado. Contacte o administrador.');
      }
      throw uploadError;
    }

    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      nome: file.name,
      tipo: file.type || 'application/octet-stream',
      tamanho: file.size,
    };
  };

  const deleteFile = async (url: string) => {
    if (!tenant) return;

    // Extrair path do URL
    const bucketUrl = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
    const idx = url.indexOf(bucketUrl);
    if (idx === -1) return;

    const filePath = url.substring(idx + bucketUrl.length);
    await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
  };

  return { uploadFile, deleteFile };
}
