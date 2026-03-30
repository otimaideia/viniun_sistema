/**
 * SessionProfileDialog - Editar perfil da sessão WhatsApp via WAHA API
 *
 * Permite editar:
 * - Nome de exibição (display name)
 * - Status / about
 *
 * Usa wahaApi.setSessionProfileName / setSessionProfileStatus
 * e atualiza mt_whatsapp_sessions.display_name no banco.
 */
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, User, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { wahaApi } from "@/services/waha-api";
import { supabase } from "@/integrations/supabase/client";

interface SessionProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  sessionName: string;
  wahaUrl?: string | null;
  // wahaApiKey removido — a API key nunca deve ser exposta como prop (visível em DevTools)
  // O wahaApi obtém a key internamente via setConfig/loadConfig
  currentDisplayName?: string | null;
  currentProfilePicture?: string | null;
}

export function SessionProfileDialog({
  open,
  onOpenChange,
  sessionId,
  sessionName,
  wahaUrl: _wahaUrl, // mantido na interface por compatibilidade, não usado internamente
  currentDisplayName,
  currentProfilePicture,
}: SessionProfileDialogProps) {
  const [displayName, setDisplayName] = useState(currentDisplayName || "");
  const [statusText, setStatusText] = useState("");
  const [profilePicUrl, setProfilePicUrl] = useState(currentProfilePicture || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);

  // Carregar perfil quando o dialog abre
  // Nota: wahaApi já está configurado globalmente — a API key NÃO é passada como prop
  // para não expô-la em DevTools. O singleton wahaApi usa a configuração carregada
  // anteriormente (via useWahaConfig / wahaDirectClient.loadConfig).
  useEffect(() => {
    if (open) {
      fetchCurrentProfile();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fetchCurrentProfile = async () => {
    setIsFetchingProfile(true);
    try {
      const profile = await wahaApi.getSessionProfile(sessionName);
      if (profile) {
        setDisplayName(profile.name || profile.pushname || currentDisplayName || "");
        setStatusText(profile.status || "");
        setProfilePicUrl(profile.profilePictureURL || currentProfilePicture || "");
      }
    } catch (err) {
      console.warn('[SessionProfile] Erro ao carregar perfil:', err);
    } finally {
      setIsFetchingProfile(false);
    }
  };

  const handleSave = async () => {
    // Validação de input do displayName
    if (displayName.trim().length === 0) {
      toast.error('Nome não pode ser vazio');
      return;
    }
    if (displayName.trim().length > 25) {
      toast.error('Nome deve ter no máximo 25 caracteres');
      return;
    }

    setIsLoading(true);
    let hasError = false;

    try {
      // Set display name if changed
      if (displayName.trim() && displayName.trim() !== currentDisplayName) {
        try {
          await wahaApi.setSessionProfileName(sessionName, displayName.trim());
        } catch (err) {
          console.warn("[SessionProfile] Erro ao definir nome no WAHA:", err);
          toast.warning("Nome pode não ter sido atualizado no WhatsApp (sessão pode estar desconectada).");
          hasError = true;
        }

        // Always update DB
        await supabase
          .from("mt_whatsapp_sessions")
          .update({ display_name: displayName.trim() })
          .eq("id", sessionId);
      }

      // Set status if provided
      if (statusText.trim()) {
        try {
          await wahaApi.setSessionProfileStatus(sessionName, statusText.trim());
        } catch (err) {
          console.warn("[SessionProfile] Erro ao definir status no WAHA:", err);
          toast.warning("Status pode não ter sido atualizado no WhatsApp.");
          hasError = true;
        }
      }

      if (!hasError) {
        toast.success("Perfil atualizado com sucesso!");
      }
      onOpenChange(false);
    } catch (err) {
      console.error("[SessionProfile] Erro ao salvar perfil:", err);
      toast.error("Erro ao salvar perfil");
    } finally {
      setIsLoading(false);
    }
  };

  const initials = (displayName || sessionName || "?")
    .split(" ")
    .map((w) => Array.from(w)[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-green-600" />
            Editar Perfil da Sessão
          </DialogTitle>
        </DialogHeader>

        {isFetchingProfile ? (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Carregando perfil do WAHA...</span>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Avatar preview */}
            <div className="flex flex-col items-center gap-3">
              <Avatar className="h-20 w-20">
                {profilePicUrl && <AvatarImage src={profilePicUrl} alt={displayName} />}
                <AvatarFallback className="text-lg bg-green-100 text-green-700">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <p className="text-xs text-muted-foreground">
                Foto de perfil gerenciada pelo WhatsApp
              </p>
            </div>

            {/* Session name (read-only) */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">ID da Sessão</Label>
              <p className="text-sm font-mono bg-muted px-3 py-1.5 rounded-md">{sessionName}</p>
            </div>

            {/* Display name */}
            <div className="space-y-1.5">
              <Label htmlFor="displayName">Nome de Exibição</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ex: YESlaser Vendas"
                maxLength={25}
              />
              <p className="text-xs text-muted-foreground">
                Será atualizado no WhatsApp (máx. 25 caracteres)
              </p>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label htmlFor="statusText">Status / Recado</Label>
              <Textarea
                id="statusText"
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                placeholder="Ex: Atendimento de segunda à sexta, 8h–18h"
                rows={2}
                maxLength={139}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Texto que aparece no perfil do WhatsApp (máx. 139 caracteres)
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCurrentProfile}
            disabled={isFetchingProfile || isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Recarregar
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || isFetchingProfile || !displayName.trim()}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Perfil"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
