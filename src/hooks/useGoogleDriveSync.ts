// =============================================================================
// USE GOOGLE DRIVE SYNC - Hook Multi-Tenant REAL
// =============================================================================
//
// Hook para sincronização com Google Drive
// SISTEMA 100% MT - Usa mt_platform_settings para configurações
//
// =============================================================================

import { useState, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MarketingService } from "@/services/marketing-service";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SyncProgress {
  status: "idle" | "loading_config" | "previewing" | "syncing" | "done" | "error";
  message: string;
  progress?: number;
}

interface PreviewResult {
  totalNew: number;
  totalExisting: number;
  folders: Array<{
    folder: string;
    category: string;
    newImages: Array<{ name: string; url: string; thumbnailLink?: string }>;
    existingImages: number;
    totalImages: number;
  }>;
}

interface SyncResult {
  success: boolean;
  summary: {
    totalCreated: number;
    totalSkipped: number;
    totalErrors: number;
    foldersProcessed: number;
  };
  details: Array<{
    folder: string;
    category: string;
    created: number;
    skipped: number;
    errors: string[];
  }>;
}

interface GoogleDriveConfig {
  apiKey: string;
  defaultFolderId: string;
  isConfigured: boolean;
}

export function useGoogleDriveSync() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [progress, setProgress] = useState<SyncProgress>({
    status: "idle",
    message: "",
  });
  const [previewData, setPreviewData] = useState<PreviewResult | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [config, setConfig] = useState<GoogleDriveConfig>({
    apiKey: "",
    defaultFolderId: "",
    isConfigured: false,
  });
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  // Carregar configuração do banco
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = useCallback(async () => {
    setIsLoadingConfig(true);
    try {
      // SISTEMA 100% MT - Usar mt_platform_settings
      const { data, error } = await supabase
        .from("mt_platform_settings")
        .select("chave, valor")
        .in("chave", ["GOOGLE_DRIVE_API_KEY", "GOOGLE_DRIVE_DEFAULT_FOLDER"]);

      if (!error && data) {
        const configMap = data.reduce((acc, item) => {
          acc[item.chave] = item.valor;
          return acc;
        }, {} as Record<string, string>);

        setConfig({
          apiKey: configMap["GOOGLE_DRIVE_API_KEY"] || "",
          defaultFolderId: configMap["GOOGLE_DRIVE_DEFAULT_FOLDER"] || "",
          isConfigured: !!configMap["GOOGLE_DRIVE_API_KEY"],
        });
      }
    } catch (error) {
      console.error("Erro ao carregar configuração do Google Drive:", error);
    } finally {
      setIsLoadingConfig(false);
    }
  }, []);

  // Validar link do Drive
  const validateDriveUrl = useCallback((url: string): boolean => {
    const folderId = MarketingService.extractDriveFolderId(url);
    return folderId !== null;
  }, []);

  // Preview da sincronização
  const preview = useCallback(
    async (driveUrl: string) => {
      if (!config.isConfigured) {
        toast({
          title: "API Key não configurada",
          description: "Configure a Google API Key em Configurações → Integrações",
          variant: "destructive",
        });
        return null;
      }

      if (!validateDriveUrl(driveUrl)) {
        toast({
          title: "Link inválido",
          description: "O link do Google Drive não é válido",
          variant: "destructive",
        });
        return null;
      }

      setProgress({ status: "previewing", message: "Analisando pasta do Drive..." });
      setPreviewData(null);
      setSyncResult(null);

      try {
        // A API Key vem do banco, então passamos string vazia
        const result = await MarketingService.previewDriveSync(driveUrl, "");
        setPreviewData(result);
        setProgress({
          status: "idle",
          message: `${result.totalNew} novas imagens encontradas`,
        });
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro desconhecido";
        setProgress({ status: "error", message });
        toast({
          title: "Erro ao analisar",
          description: message,
          variant: "destructive",
        });
        return null;
      }
    },
    [config.isConfigured, validateDriveUrl, toast]
  );

  // Executar sincronização
  const sync = useCallback(
    async (driveUrl: string) => {
      if (!config.isConfigured) {
        toast({
          title: "API Key não configurada",
          description: "Configure a Google API Key em Configurações → Integrações",
          variant: "destructive",
        });
        return null;
      }

      if (!validateDriveUrl(driveUrl)) {
        toast({
          title: "Link inválido",
          description: "O link do Google Drive não é válido",
          variant: "destructive",
        });
        return null;
      }

      setProgress({ status: "syncing", message: "Sincronizando imagens..." });
      setSyncResult(null);

      try {
        // A API Key vem do banco
        const result = await MarketingService.syncFromDrive(
          driveUrl,
          "",
          (msg) => setProgress({ status: "syncing", message: msg })
        );

        setSyncResult(result);
        setProgress({
          status: "done",
          message: `${result.summary.totalCreated} imagens importadas`,
        });

        // Invalidar cache dos assets
        queryClient.invalidateQueries({ queryKey: ["marketing-assets"] });

        toast({
          title: "Sincronização concluída",
          description: `${result.summary.totalCreated} novas imagens, ${result.summary.totalSkipped} já existentes`,
        });

        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro desconhecido";
        setProgress({ status: "error", message });
        toast({
          title: "Erro na sincronização",
          description: message,
          variant: "destructive",
        });
        return null;
      }
    },
    [config.isConfigured, validateDriveUrl, queryClient, toast]
  );

  // Reset state
  const reset = useCallback(() => {
    setProgress({ status: "idle", message: "" });
    setPreviewData(null);
    setSyncResult(null);
  }, []);

  return {
    // State
    progress,
    previewData,
    syncResult,
    config,
    isLoadingConfig,
    isLoading: progress.status === "previewing" || progress.status === "syncing",
    isPreviewing: progress.status === "previewing",
    isSyncing: progress.status === "syncing",
    isDone: progress.status === "done",
    hasError: progress.status === "error",

    // Actions
    preview,
    sync,
    reset,
    loadConfig,
    validateDriveUrl,
  };
}
