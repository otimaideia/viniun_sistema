import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UploadOptions {
  /** Supabase Storage bucket name */
  bucket: string;
  /** Path prefix inside the bucket (e.g. "comprovantes/") */
  pathPrefix?: string;
  /** Max file size in bytes (default 10MB) */
  maxSizeBytes?: number;
  /** Allowed MIME types (empty = allow all) */
  allowedMimeTypes?: string[];
  /** Whether to upsert (overwrite) existing files */
  upsert?: boolean;
}

interface UploadResult {
  publicUrl: string;
  path: string;
}

/**
 * Generic storage upload hook that works with any Supabase bucket.
 * Use this instead of direct supabase.storage calls in page components.
 */
export function useStorageBucketUpload(options: UploadOptions) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const {
    bucket,
    pathPrefix = '',
    maxSizeBytes = 10 * 1024 * 1024,
    allowedMimeTypes = [],
    upsert = false,
  } = options;

  const upload = async (file: File, customPath?: string): Promise<UploadResult | null> => {
    // Validate MIME type
    if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.type)) {
      toast.error('Tipo de arquivo nao permitido.');
      return null;
    }

    // Validate size
    if (file.size > maxSizeBytes) {
      const maxMB = (maxSizeBytes / (1024 * 1024)).toFixed(0);
      toast.error(`Arquivo deve ter no maximo ${maxMB}MB`);
      return null;
    }

    setIsUploading(true);
    setProgress(30);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
      const safeName = file.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = customPath || `${pathPrefix}${Date.now()}_${safeName}`;

      setProgress(60);

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          contentType: file.type,
          upsert,
        });

      if (uploadError) throw uploadError;

      setProgress(90);

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      setProgress(100);

      return {
        publicUrl: urlData.publicUrl,
        path: filePath,
      };
    } catch (err: any) {
      console.error(`[useStorageBucketUpload] Erro no upload (bucket: ${bucket}):`, err);
      toast.error(err.message || 'Erro ao enviar arquivo');
      return null;
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  return {
    upload,
    isUploading,
    progress,
    bucket,
  };
}
