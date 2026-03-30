import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// MIME types permitidos por extensão
const MIME_MAP: Record<string, string[]> = {
  ".pdf": ["application/pdf"],
  ".doc": ["application/msword"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
};

interface FileUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  bucket?: string;
  folder?: string;
  accept?: string;
  maxSizeMB?: number;
}

export function FileUpload({
  value,
  onChange,
  bucket = "curriculos",
  folder = "recrutamento",
  accept = ".pdf,.doc,.docx",
  maxSizeMB = 5,
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Arquivo muito grande. Máximo: ${maxSizeMB}MB`);
      return;
    }

    // Validação de extensão
    const allowedTypes = accept.split(",").map((t) => t.trim());
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!allowedTypes.includes(ext)) {
      toast.error(`Tipo de arquivo não permitido. Use: ${accept}`);
      return;
    }

    // Validação de MIME type real
    const allowedMimes = allowedTypes.flatMap((e) => MIME_MAP[e] || []);
    if (allowedMimes.length > 0 && !allowedMimes.includes(file.type)) {
      toast.error(`Tipo de arquivo inválido. O conteúdo não corresponde à extensão.`);
      return;
    }

    setIsUploading(true);
    setProgress(30);

    try {
      const safeName = file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${folder}/${Date.now()}_${safeName}`;

      setProgress(60);

      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true });

      if (error) throw error;

      setProgress(90);

      // Bucket privado: usar signed URL (1h de validade)
      const { data: signedData, error: signedError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 3600);

      if (signedError || !signedData?.signedUrl) {
        // Fallback: salvar path relativo
        onChange(path);
      } else {
        setSignedUrl(signedData.signedUrl);
        onChange(path); // Salvar path no banco (não a URL temporária)
      }

      setProgress(100);
      toast.success("Arquivo enviado com sucesso");
    } catch (err: any) {
      toast.error(`Erro no upload: ${err.message}`);
      onChange(null);
    } finally {
      setIsUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = () => {
    onChange(null);
    setSignedUrl(null);
  };

  // Gerar signed URL para visualizar arquivo existente (path salvo no banco)
  const handleViewFile = async () => {
    if (!value) return;

    // Se já é uma URL completa (legacy), abrir direto
    if (value.startsWith("http")) {
      window.open(value, "_blank");
      return;
    }

    // Path relativo: gerar signed URL
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(value, 3600);

    if (error || !data?.signedUrl) {
      toast.error("Erro ao gerar link de visualização");
      return;
    }

    window.open(data.signedUrl, "_blank");
  };

  if (value) {
    return (
      <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
        <FileText className="h-5 w-5 text-primary shrink-0" />
        <button
          type="button"
          onClick={handleViewFile}
          className="text-sm text-primary hover:underline truncate flex-1 flex items-center gap-1 text-left"
        >
          Ver arquivo <ExternalLink className="h-3 w-3" />
        </button>
        <Button type="button" variant="ghost" size="icon" onClick={handleRemove} className="shrink-0">
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="w-full"
      >
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Enviando... {progress}%
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Enviar arquivo (máx. {maxSizeMB}MB)
          </>
        )}
      </Button>
      {isUploading && (
        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
