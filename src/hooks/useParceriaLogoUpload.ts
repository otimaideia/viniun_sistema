import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// =====================================================
// Constantes
// =====================================================

const BUCKET_NAME = "parcerias-logos";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// =====================================================
// Types
// =====================================================

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
}

// =====================================================
// Hook Principal
// =====================================================

export function useParceriaLogoUpload(): UseParceriaLogoUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // =====================================================
  // Verificar se bucket existe
  // =====================================================

  const ensureBucketExists = useCallback(async (): Promise<boolean> => {
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME);

      if (!bucketExists) {
        // Tentar criar o bucket
        const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
          public: true,
          fileSizeLimit: MAX_FILE_SIZE,
          allowedMimeTypes: ALLOWED_TYPES,
        });

        if (createError) {
          console.error("Erro ao criar bucket:", createError);
          // Bucket pode já existir ou não temos permissão - tentar usar mesmo assim
        }
      }

      return true;
    } catch (err) {
      console.error("Erro ao verificar bucket:", err);
      return true; // Tentar usar mesmo assim
    }
  }, []);

  // =====================================================
  // Upload de Logo
  // =====================================================

  const uploadLogo = useCallback(
    async (file: File, parceriaId: string): Promise<UploadResult | null> => {
      setIsUploading(true);
      setProgress(0);
      setError(null);

      try {
        // Validar tipo de arquivo
        if (!ALLOWED_TYPES.includes(file.type)) {
          throw new Error("Tipo de arquivo não permitido. Use JPEG, PNG, WebP ou GIF.");
        }

        // Validar tamanho
        if (file.size > MAX_FILE_SIZE) {
          throw new Error("Arquivo muito grande. Tamanho máximo: 5MB");
        }

        // Verificar bucket
        await ensureBucketExists();
        setProgress(10);

        // Gerar nome único
        const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const fileName = `${parceriaId}/${Date.now()}.${fileExt}`;

        setProgress(20);

        // Fazer upload
        const { data, error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(fileName, file, {
            cacheControl: "3600",
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
      } catch (err: any) {
        console.error("Erro ao fazer upload:", err);
        const errorMessage = err.message || "Erro ao fazer upload do logo";
        setError(errorMessage);
        toast.error(errorMessage);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [ensureBucketExists]
  );

  // =====================================================
  // Deletar Logo
  // =====================================================

  const deleteLogo = useCallback(async (path: string): Promise<boolean> => {
    try {
      if (!path) return true;

      const { error: deleteError } = await supabase.storage.from(BUCKET_NAME).remove([path]);

      if (deleteError) {
        throw deleteError;
      }

      return true;
    } catch (err) {
      console.error("Erro ao deletar logo:", err);
      toast.error("Erro ao remover logo anterior");
      return false;
    }
  }, []);

  // =====================================================
  // Return
  // =====================================================

  return {
    uploadLogo,
    deleteLogo,
    isUploading,
    progress,
    error,
  };
}

// =====================================================
// Função Helper: Extrair path de URL
// =====================================================

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

export default useParceriaLogoUpload;
