import { useState } from 'react';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const BUCKET = 'checklist-evidencias';
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Hook para upload de fotos/evidências em itens do checklist.
 * Usa Supabase Storage, bucket `checklist-evidencias`.
 */
export function useChecklistPhotoUpload(dailyId: string | undefined) {
  const { tenant } = useTenantContext();
  const [uploading, setUploading] = useState(false);

  const uploadPhoto = async (itemId: string, file: File): Promise<string | null> => {
    if (!tenant?.id || !dailyId) {
      toast.error('Contexto não carregado');
      return null;
    }

    if (file.size > MAX_SIZE) {
      toast.error('Arquivo muito grande (máx 5MB)');
      return null;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Apenas imagens são permitidas');
      return null;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${tenant.id}/${dailyId}/${itemId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(path);

      return urlData.publicUrl;
    } catch (err: any) {
      toast.error(`Erro no upload: ${err.message}`);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const uploadAndSave = async (itemId: string, file: File): Promise<string | null> => {
    const url = await uploadPhoto(itemId, file);
    if (!url) return null;

    // Salvar URL no item
    const { error } = await (supabase
      .from('mt_checklist_daily_items') as any)
      .update({
        foto_url: url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId);

    if (error) {
      toast.error(`Erro ao salvar: ${error.message}`);
      return null;
    }

    toast.success('Foto enviada');
    return url;
  };

  return {
    uploadPhoto,
    uploadAndSave,
    uploading,
  };
}
