import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BUCKET_NAME = "servicos-imagens";

interface UploadResult {
  url: string;
  path: string;
}

export function useStorageUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Criar bucket se não existir (apenas admin pode fazer isso)
  const ensureBucketExists = async () => {
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);

      if (!bucketExists) {
        const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
          public: true,
          fileSizeLimit: 5 * 1024 * 1024, // 5MB
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
        });

        if (error && !error.message.includes('already exists')) {
          console.error('Error creating bucket:', error);
          return false;
        }
      }
      return true;
    } catch (err) {
      console.error('Error checking bucket:', err);
      return false;
    }
  };

  // Upload de uma única imagem
  const uploadImage = async (file: File, servicoId: string): Promise<UploadResult | null> => {
    setIsUploading(true);
    setProgress(0);

    try {
      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        toast.error('Arquivo deve ser uma imagem');
        return null;
      }

      // Validar tamanho (5MB máximo)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Imagem deve ter no máximo 5MB');
        return null;
      }

      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${servicoId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      setProgress(30);

      // Upload para o Supabase Storage
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        toast.error(`Erro no upload: ${error.message}`);
        return null;
      }

      setProgress(80);

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(data.path);

      setProgress(100);

      return {
        url: urlData.publicUrl,
        path: data.path
      };
    } catch (err: any) {
      console.error('Upload failed:', err);
      toast.error('Falha no upload da imagem');
      return null;
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  // Upload de múltiplas imagens
  const uploadMultipleImages = async (files: File[], servicoId: string): Promise<UploadResult[]> => {
    setIsUploading(true);
    const results: UploadResult[] = [];
    const totalFiles = files.length;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress(Math.round(((i) / totalFiles) * 100));

        const result = await uploadImage(file, servicoId);
        if (result) {
          results.push(result);
        }
      }

      if (results.length > 0) {
        toast.success(`${results.length} imagem(ns) enviada(s) com sucesso!`);
      }

      return results;
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  // Deletar imagem do storage
  const deleteImage = async (path: string): Promise<boolean> => {
    try {
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([path]);

      if (error) {
        console.error('Delete error:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Delete failed:', err);
      return false;
    }
  };

  // Extrair path de uma URL do Supabase Storage
  const getPathFromUrl = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
      return pathMatch ? pathMatch[1] : null;
    } catch {
      return null;
    }
  };

  return {
    uploadImage,
    uploadMultipleImages,
    deleteImage,
    getPathFromUrl,
    ensureBucketExists,
    isUploading,
    progress,
    bucketName: BUCKET_NAME
  };
}
