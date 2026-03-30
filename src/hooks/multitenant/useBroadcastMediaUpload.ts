import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';

const BUCKET_NAME = 'broadcast-media';
const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB (WAHA limit)

const ALLOWED_TYPES: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  video: ['video/mp4', 'video/3gpp', 'video/quicktime'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  audio: ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/aac'],
};

interface UploadResult {
  url: string;
  path: string;
}

export function useBroadcastMediaUpload() {
  const { tenant } = useTenantContext();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Bucket 'broadcast-media' já foi criado via service_role.
  // Não tentamos criar/listar aqui pois o usuário pode não ter permissão admin.

  const validateFile = (file: File, mediaType: string): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `Arquivo muito grande. Máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`;
    }

    const allowed = ALLOWED_TYPES[mediaType];
    if (allowed && !allowed.includes(file.type)) {
      return `Tipo de arquivo não permitido para ${mediaType}. Aceitos: ${allowed.map((t) => t.split('/')[1]).join(', ')}`;
    }

    return null;
  };

  const uploadMedia = async (
    file: File,
    mediaType: string
  ): Promise<UploadResult | null> => {
    setIsUploading(true);
    setProgress(0);

    try {
      // Validate
      const validationError = validateFile(file, mediaType);
      if (validationError) {
        toast.error(validationError);
        return null;
      }

      setProgress(20);

      // Build path: tenant_id/timestamp-filename
      const tenantId = tenant?.id || 'default';
      const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
      const safeName = file.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .toLowerCase();
      const filePath = `${tenantId}/${Date.now()}-${safeName}`;

      // Upload
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '31536000', // 1 year
          upsert: false,
        });

      if (error) {
        console.error('[BroadcastUpload] Upload error:', error);
        toast.error(`Erro no upload: ${error.message}`);
        return null;
      }

      setProgress(80);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(data.path);

      setProgress(100);

      toast.success('Arquivo enviado com sucesso!');
      return { url: urlData.publicUrl, path: data.path };
    } catch (err: any) {
      console.error('[BroadcastUpload] Failed:', err);
      toast.error('Falha no upload do arquivo');
      return null;
    } finally {
      setIsUploading(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  const deleteMedia = async (url: string): Promise<boolean> => {
    try {
      const pathMatch = url.match(
        /\/storage\/v1\/object\/public\/[^/]+\/(.+)/
      );
      if (!pathMatch) return false;

      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([pathMatch[1]]);

      if (error) {
        console.error('[BroadcastUpload] Delete error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[BroadcastUpload] Delete failed:', err);
      return false;
    }
  };

  return {
    uploadMedia,
    deleteMedia,
    validateFile,
    isUploading,
    progress,
  };
}
