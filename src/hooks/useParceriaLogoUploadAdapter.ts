// =============================================================================
// USE PARCERIA LOGO UPLOAD ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter 100% MT para upload de logos de parcerias
// SISTEMA 100% MT - Usa Supabase Storage com contexto de tenant
//
// =============================================================================

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';

// =============================================================================
// Constantes
// =============================================================================

const BUCKET_NAME = 'parcerias-logos';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// =============================================================================
// Types
// =============================================================================

interface UploadResult {
  url: string;
  path: string;
}

interface UseParceriaLogoUploadReturn {
  uploadLogo: (file: File, parceriaId: string) => Promise<UploadResult | null>;
  deleteLogo: (path: string) => Promise<boolean>;
  isUploading: boolean;
  progress: number;
  error: string | null;
  tenant: ReturnType<typeof useTenantContext>['tenant'];
  franchise: ReturnType<typeof useTenantContext>['franchise'];
  accessLevel: ReturnType<typeof useTenantContext>['accessLevel'];
  _mode: 'mt';
}

// =============================================================================
// Hook Principal
// =============================================================================

export function useParceriaLogoUploadAdapter(): UseParceriaLogoUploadReturn {
  const { tenant, franchise, accessLevel } = useTenantContext();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // ==========================================================================
  // Verificar se bucket existe
  // ==========================================================================
  const ensureBucketExists = useCallback(async (): Promise<boolean> => {
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME);

      if (!bucketExists) {
        const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
          public: true,
          fileSizeLimit: MAX_FILE_SIZE,
          allowedMimeTypes: ALLOWED_TYPES,
        });

        if (createError) {
          console.error('[MT] Erro ao criar bucket:', createError);
        }
      }

      return true;
    } catch (err) {
      console.error('[MT] Erro ao verificar bucket:', err);
      return true;
    }
  }, []);

  // ==========================================================================
  // Upload de Logo
  // ==========================================================================
  const uploadLogo = useCallback(
    async (file: File, parceriaId: string): Promise<UploadResult | null> => {
      setIsUploading(true);
      setProgress(0);
      setError(null);

      try {
        // Validar tipo de arquivo
        if (!ALLOWED_TYPES.includes(file.type)) {
          throw new Error('Tipo de arquivo não permitido. Use JPEG, PNG, WebP ou GIF.');
        }

        // Validar tamanho
        if (file.size > MAX_FILE_SIZE) {
          throw new Error('Arquivo muito grande. Tamanho máximo: 5MB');
        }

        // Verificar bucket
        await ensureBucketExists();
        setProgress(10);

        // Gerar nome único com tenant context
        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const tenantSlug = tenant?.slug || 'default';
        const fileName = `${tenantSlug}/${parceriaId}/${Date.now()}.${fileExt}`;

        setProgress(20);

        // Fazer upload
        const { data, error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          throw uploadError;
        }

        setProgress(80);

        // Obter URL pública
        const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path);

        setProgress(100);

        return {
          url: urlData.publicUrl,
          path: data.path,
        };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao fazer upload do logo';
        console.error('[MT] Erro ao fazer upload:', err);
        setError(errorMessage);
        toast.error(errorMessage);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [ensureBucketExists, tenant]
  );

  // ==========================================================================
  // Deletar Logo
  // ==========================================================================
  const deleteLogo = useCallback(async (path: string): Promise<boolean> => {
    try {
      if (!path) return true;

      const { error: deleteError } = await supabase.storage.from(BUCKET_NAME).remove([path]);

      if (deleteError) {
        throw deleteError;
      }

      return true;
    } catch (err) {
      console.error('[MT] Erro ao deletar logo:', err);
      toast.error('Erro ao remover logo anterior');
      return false;
    }
  }, []);

  return {
    uploadLogo,
    deleteLogo,
    isUploading,
    progress,
    error,

    // Context info
    tenant,
    franchise,
    accessLevel,

    _mode: 'mt' as const,
  };
}

// =============================================================================
// Função Helper: Extrair path de URL
// =============================================================================

export function getPathFromLogoUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split(`/${BUCKET_NAME}/`);
    if (pathParts.length > 1) {
      return pathParts[1];
    }
    return null;
  } catch {
    return null;
  }
}

// =============================================================================
// Helper: Verificar modo atual (sempre MT)
// =============================================================================

export function getParceriaLogoUploadMode(): 'mt' {
  return 'mt';
}

export default useParceriaLogoUploadAdapter;
