import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, RefreshCw, Smartphone, CheckCircle2, XCircle, Play } from "lucide-react";
import { wahaClient } from "@/services/waha/wahaDirectClient";
import { useWahaConfigAdapter } from "@/hooks/useWahaConfigAdapter";
import type { WhatsAppSessao } from "@/types/whatsapp-sessao";

const DEBUG = import.meta.env.DEV;

interface QRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessao: WhatsAppSessao | null;
  onConnected?: () => void;
}

// Função para tocar som de sucesso
const playSuccessSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(1108.73, audioContext.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(1318.51, audioContext.currentTime + 0.2);

    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.15);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.25);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (e) {
    if (DEBUG) console.warn("Não foi possível tocar som de notificação:", e);
  }
};

export function QRCodeModal({ open, onOpenChange, sessao, onConnected }: QRCodeModalProps) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Refs para controle de retry
  const failureCountRef = useRef(0);
  const lastStatusRef = useRef<string>("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const MAX_FAILURES_BEFORE_ERROR = 3; // Número de falhas antes de mostrar erro

  const { config, isLoading: loadingConfig } = useWahaConfigAdapter();

  // Função para buscar QR Code
  const fetchQRCode = useCallback(async () => {
    if (!sessao) return false;

    if (!config?.api_url || !config?.api_key) {
      console.warn("[QRCodeModal] Config não carregada:", { config });
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (DEBUG) console.warn("[QRCodeModal] Buscando QR Code para:", sessao.session_name);
      const result = await wahaClient.getQRCode(sessao.session_name);

      if (DEBUG) console.warn("[QRCodeModal] Resultado:", { success: result.success, hasData: !!result.data });

      if (result.success && result.data?.value) {
        const qrValue = result.data.value;
        const qrBase64 = qrValue.startsWith('data:')
          ? qrValue
          : `data:image/png;base64,${qrValue}`;
        setQrCode(qrBase64);
        setStatusMessage(null);
        if (DEBUG) console.warn("[QRCodeModal] QR Code carregado com sucesso");
        setIsLoading(false);
        return true;
      } else {
        console.warn("[QRCodeModal] QR Code não disponível:", result.error);
        setIsLoading(false);
        return false;
      }
    } catch (err) {
      console.error("[QRCodeModal] Erro ao buscar QR Code:", err);
      setIsLoading(false);
      return false;
    }
  }, [sessao, config]);

  // Função para reiniciar a sessão
  const restartSession = useCallback(async () => {
    if (!sessao) return false;

    if (DEBUG) console.warn("[QRCodeModal] Tentando reiniciar sessão:", sessao.session_name);
    setIsRestarting(true);
    setStatusMessage("Reiniciando sessão...");

    try {
      // Tentar parar a sessão primeiro
      await wahaClient.stopSession(sessao.session_name);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Iniciar novamente
      const startResult = await wahaClient.startSession(sessao.session_name);

      if (startResult.success) {
        if (DEBUG) console.warn("[QRCodeModal] Sessão reiniciada com sucesso");
        setStatusMessage("Sessão reiniciada. Aguardando QR Code...");

        // Aguardar um pouco e buscar QR Code
        await new Promise(resolve => setTimeout(resolve, 2000));

        const qrLoaded = await fetchQRCode();
        if (qrLoaded) {
          failureCountRef.current = 0;
          setIsRestarting(false);
          return true;
        }
      }

      setIsRestarting(false);
      return false;
    } catch (err) {
      console.error("[QRCodeModal] Erro ao reiniciar sessão:", err);
      setIsRestarting(false);
      return false;
    }
  }, [sessao, fetchQRCode]);

  // Função para lidar com estado FAILED/STOPPED
  const handleFailedStatus = useCallback(async (status: string) => {
    failureCountRef.current++;
    if (DEBUG) console.warn(`[QRCodeModal] Status ${status}, tentativa ${failureCountRef.current}/${MAX_FAILURES_BEFORE_ERROR}`);

    // Se ainda não atingiu o limite, tentar reiniciar automaticamente
    if (failureCountRef.current < MAX_FAILURES_BEFORE_ERROR) {
      setStatusMessage(`Sessão ${status === 'STOPPED' ? 'parou' : 'falhou'}. Tentando reiniciar... (${failureCountRef.current}/${MAX_FAILURES_BEFORE_ERROR})`);

      const restarted = await restartSession();
      if (restarted) {
        return; // Conseguiu reiniciar, continua polling
      }
    }

    // Se chegou aqui, esgotou as tentativas
    if (failureCountRef.current >= MAX_FAILURES_BEFORE_ERROR) {
      setError("Não foi possível manter a sessão ativa. Clique em 'Reiniciar Sessão' para tentar novamente.");
      setStatusMessage(null);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [restartSession]);

  // Polling para verificar status da sessão
  useEffect(() => {
    if (!open || !sessao || loadingConfig) return;
    if (!config?.api_url || !config?.api_key) return;

    if (DEBUG) console.warn("[QRCodeModal] Iniciando polling para sessão:", sessao.session_name);

    // Reset refs
    failureCountRef.current = 0;
    lastStatusRef.current = "";

    // Buscar QR Code inicial
    fetchQRCode();

    let qrRefreshCount = 0;
    const MAX_QR_REFRESHES = 12; // Refresh QR up to 12 times (4 minutos total)

    intervalRef.current = setInterval(async () => {
      try {
        if (DEBUG) console.warn("[QRCodeModal] Verificando status da sessão...");
        const result = await wahaClient.getSession(sessao.session_name);

        if (!result.success || !result.data) {
          console.warn("[QRCodeModal] Falha ao obter status:", result.error);
          // Não desistir em erros transitórios, mas contar como falha
          failureCountRef.current++;
          if (failureCountRef.current >= MAX_FAILURES_BEFORE_ERROR * 2) {
            setError("Não foi possível conectar ao servidor WAHA. Verifique a conexão.");
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
          }
          return;
        }

        const session = result.data;
        const currentStatus = session.status;

        // Só logar se status mudou
        if (currentStatus !== lastStatusRef.current) {
          if (DEBUG) console.warn("[QRCodeModal] Status mudou:", lastStatusRef.current, "→", currentStatus);
          lastStatusRef.current = currentStatus;
        }

        switch (currentStatus) {
          case "WORKING":
            // Conectado com sucesso!
            if (DEBUG) console.warn("[QRCodeModal] Sessão conectada com sucesso!");
            setIsConnected(true);
            setStatusMessage(null);
            playSuccessSound();
            onConnected?.();
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            break;

          case "SCAN_QR_CODE":
            // Aguardando scan - tudo OK
            failureCountRef.current = 0; // Reset failure count
            setStatusMessage(null);
            qrRefreshCount++;

            // Refresh QR a cada ~30 segundos (3 polls de 10s)
            if (qrRefreshCount % 3 === 0 && qrRefreshCount < MAX_QR_REFRESHES) {
              if (DEBUG) console.warn("[QRCodeModal] Auto-refreshing QR Code...");
              fetchQRCode();
            }
            break;

          case "STARTING":
            // Sessão iniciando - aguardar
            setStatusMessage("Iniciando sessão...");
            break;

          case "STOPPED":
          case "FAILED":
            // Sessão parou ou falhou - tentar recuperar
            await handleFailedStatus(currentStatus);
            break;

          default:
            if (DEBUG) console.warn("[QRCodeModal] Status desconhecido:", currentStatus);
            setStatusMessage(`Status: ${currentStatus}`);
        }
      } catch (err) {
        console.error("[QRCodeModal] Erro ao verificar status:", err);
      }
    }, 10000); // Check every 10 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [open, sessao, config, loadingConfig, fetchQRCode, handleFailedStatus, onConnected]);

  // Reset state when closing
  useEffect(() => {
    if (!open) {
      setQrCode(null);
      setError(null);
      setIsConnected(false);
      setIsRestarting(false);
      setStatusMessage(null);
      failureCountRef.current = 0;
      lastStatusRef.current = "";
    }
  }, [open]);

  // Handler para botão de reiniciar manual
  const handleManualRestart = async () => {
    setError(null);
    failureCountRef.current = 0;
    const success = await restartSession();
    if (!success) {
      setError("Não foi possível reiniciar a sessão. Tente fechar e abrir novamente.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Conectar WhatsApp
          </DialogTitle>
          <DialogDescription>
            {sessao?.nome} - Escaneie o QR Code com seu WhatsApp
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center py-4">
          {isConnected ? (
            <div className="text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-green-600">Conectado com sucesso!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Seu WhatsApp está pronto para uso.
                </p>
              </div>
              <Button onClick={() => onOpenChange(false)}>Fechar</Button>
            </div>
          ) : isLoading || isRestarting ? (
            <div className="h-64 w-64 flex flex-col items-center justify-center bg-muted rounded-lg gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              {statusMessage && (
                <p className="text-sm text-muted-foreground text-center px-4">{statusMessage}</p>
              )}
            </div>
          ) : error ? (
            <div className="text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <div className="flex flex-col gap-2 w-full">
                <Button onClick={handleManualRestart} className="w-full">
                  <Play className="h-4 w-4 mr-2" />
                  Reiniciar Sessão
                </Button>
                <Button onClick={fetchQRCode} variant="outline" className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar Novamente
                </Button>
              </div>
            </div>
          ) : qrCode ? (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg shadow-inner">
                <img
                  src={qrCode}
                  alt="QR Code WhatsApp"
                  className="h-64 w-64 object-contain"
                />
              </div>
              {statusMessage && (
                <p className="text-sm text-center text-amber-600">{statusMessage}</p>
              )}
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Abra o WhatsApp no seu celular, vá em <strong>Configurações → Dispositivos vinculados</strong> e escaneie este código.
                </p>
              </div>
              <Button onClick={fetchQRCode} variant="outline" className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar QR Code
              </Button>
            </div>
          ) : (
            <div className="h-64 w-64 flex flex-col items-center justify-center bg-muted rounded-lg gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Aguardando QR Code...</p>
              {statusMessage && (
                <p className="text-xs text-muted-foreground text-center px-4">{statusMessage}</p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
