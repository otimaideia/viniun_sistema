import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  FolderSync,
  Link2,
  Eye,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FolderOpen,
  Image as ImageIcon,
  Settings,
} from "lucide-react";
import { useGoogleDriveSyncAdapter } from "@/hooks/useGoogleDriveSyncAdapter";

interface DriveSyncModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DriveSyncModal({ open, onOpenChange }: DriveSyncModalProps) {
  const {
    progress,
    previewData,
    syncResult,
    config,
    isLoadingConfig,
    isLoading,
    isPreviewing,
    isSyncing,
    isDone,
    hasError,
    preview,
    sync,
    reset,
    validateDriveUrl,
  } = useGoogleDriveSyncAdapter();

  const [driveUrl, setDriveUrl] = useState("");

  const isValidUrl = driveUrl.trim() !== "" && validateDriveUrl(driveUrl);
  const isConfigured = config.isConfigured;

  const handlePreview = async () => {
    await preview(driveUrl);
  };

  const handleSync = async () => {
    await sync(driveUrl);
  };

  const handleClose = () => {
    reset();
    setDriveUrl("");
    onOpenChange(false);
  };

  const renderPreviewContent = () => {
    if (!previewData) return null;

    return (
      <div className="space-y-4">
        {/* Resumo */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">
              {previewData.totalNew}
            </div>
            <div className="text-sm text-muted-foreground">Novas imagens</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-500">
              {previewData.totalExisting}
            </div>
            <div className="text-sm text-muted-foreground">Já existentes</div>
          </div>
        </div>

        {/* Pastas */}
        <ScrollArea className="h-[300px]">
          <Accordion type="multiple" className="w-full">
            {previewData.folders.map((folder, index) => (
              <AccordionItem key={folder.folder || `folder-${index}`} value={`folder-${index}`}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2 text-left">
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{folder.folder}</span>
                    <Badge variant="secondary" className="ml-2">
                      {folder.category}
                    </Badge>
                    {folder.newImages.length > 0 && (
                      <Badge variant="default" className="bg-green-500">
                        +{folder.newImages.length}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pl-6 space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {folder.totalImages} imagens total • {folder.newImages.length}{" "}
                      novas • {folder.existingImages} existentes
                    </p>
                    {folder.newImages.length > 0 && (
                      <div className="grid grid-cols-4 gap-2">
                        {folder.newImages.slice(0, 8).map((img, imgIndex) => (
                          <div
                            key={imgIndex}
                            className="aspect-square bg-muted rounded overflow-hidden"
                            title={img.name}
                          >
                            {img.thumbnailLink ? (
                              <img
                                src={img.thumbnailLink}
                                alt={img.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        ))}
                        {folder.newImages.length > 8 && (
                          <div className="aspect-square bg-muted rounded flex items-center justify-center">
                            <span className="text-sm text-muted-foreground">
                              +{folder.newImages.length - 8}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>
      </div>
    );
  };

  const renderSyncResult = () => {
    if (!syncResult) return null;

    return (
      <div className="space-y-4">
        <Alert
          className={
            syncResult.summary.totalErrors > 0
              ? "border-yellow-500"
              : "border-green-500"
          }
        >
          <CheckCircle2
            className={`h-4 w-4 ${
              syncResult.summary.totalErrors > 0
                ? "text-yellow-500"
                : "text-green-500"
            }`}
          />
          <AlertDescription>
            <div className="font-medium">
              Sincronização {syncResult.summary.totalErrors > 0 ? "concluída com avisos" : "concluída com sucesso"}!
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {syncResult.summary.totalCreated} imagens importadas •{" "}
              {syncResult.summary.totalSkipped} já existiam
              {syncResult.summary.totalErrors > 0 && (
                <span className="text-yellow-600">
                  {" "}• {syncResult.summary.totalErrors} erros
                </span>
              )}
            </div>
          </AlertDescription>
        </Alert>

        {/* Detalhes por pasta */}
        <ScrollArea className="h-[200px]">
          <div className="space-y-2">
            {syncResult.details.map((detail, index) => (
              <div
                key={detail.folder || `detail-${index}`}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  <span>{detail.folder}</span>
                  <Badge variant="outline">{detail.category}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  {detail.created > 0 && (
                    <Badge variant="default" className="bg-green-500">
                      +{detail.created}
                    </Badge>
                  )}
                  {detail.errors.length > 0 && (
                    <Badge variant="destructive">{detail.errors.length} erros</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderSync className="h-5 w-5" />
            Sincronizar Google Drive
          </DialogTitle>
          <DialogDescription>
            Importe imagens de uma pasta do Google Drive para a galeria. As
            subpastas serão convertidas em categorias automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Input do link */}
          <div className="space-y-2">
            <Label htmlFor="drive-url" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Link da pasta do Google Drive
            </Label>
            <Input
              id="drive-url"
              placeholder="https://drive.google.com/drive/folders/..."
              value={driveUrl}
              onChange={(e) => setDriveUrl(e.target.value)}
              disabled={isLoading}
            />
            {driveUrl && !isValidUrl && (
              <p className="text-sm text-destructive">
                Link inválido. Cole o link de uma pasta do Google Drive.
              </p>
            )}
          </div>

          {/* Status da Configuração */}
          {isLoadingConfig ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando configuração...
            </div>
          ) : !isConfigured ? (
            <Alert>
              <Settings className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>API Key do Google Drive não configurada.</span>
                <Button variant="link" size="sm" asChild className="p-0 h-auto">
                  <Link to="/configuracoes/integracoes">
                    Configurar em Integrações
                  </Link>
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Google Drive configurado
            </div>
          )}

          {/* Progress */}
          {isLoading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">{progress.message}</span>
              </div>
              <Progress value={undefined} className="h-2" />
            </div>
          )}

          {/* Error */}
          {hasError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{progress.message}</AlertDescription>
            </Alert>
          )}

          {/* Preview Result */}
          {previewData && !syncResult && renderPreviewContent()}

          {/* Sync Result */}
          {syncResult && renderSyncResult()}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            {isDone ? "Fechar" : "Cancelar"}
          </Button>

          {!previewData && !syncResult && (
            <Button
              onClick={handlePreview}
              disabled={!isValidUrl || !isConfigured || isLoading}
            >
              {isPreviewing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Visualizar
                </>
              )}
            </Button>
          )}

          {previewData && !syncResult && (
            <Button
              onClick={handleSync}
              disabled={previewData.totalNew === 0 || isLoading}
            >
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar {previewData.totalNew} imagens
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
