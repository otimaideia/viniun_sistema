import { useState, useCallback, useEffect, useRef } from "react";
import { wahaApi } from "@/services/waha-api";
import { supabase } from "@/integrations/supabase/client";
import { useWahaConfig } from "./useWahaConfig";
import { toast } from "sonner";

interface SessionStatus {
  sessionName: string;
  status: "STARTING" | "SCAN_QR_CODE" | "WORKING" | "FAILED" | "STOPPED" | "UNKNOWN";
  isConnected: boolean;
  lastChecked: Date;
  error?: string;
  reconnectAttempts?: number;
}

interface UseWhatsAppSessionManagerReturn {
  sessionStatuses: Map<string, SessionStatus>;
  isChecking: boolean;
  isAutoReconnecting: boolean;
  checkSessionStatus: (sessionName: string) => Promise<SessionStatus>;
  checkAllSessions: () => Promise<void>;
  reconnectSession: (sessionName: string) => Promise<{ success: boolean; error?: string }>;
  restartSession: (sessionName: string) => Promise<{ success: boolean; error?: string }>;
  startAutoCheck: (intervalMs?: number) => void;
  stopAutoCheck: () => void;
  enableAutoReconnect: (enable: boolean) => void;
}

// Global state to prevent multiple concurrent checks across hook instances
let globalIsChecking = false;
let globalCheckPromise: Promise<void> | null = null;
const pendingRequests = new Map<string, Promise<SessionStatus>>();

// Rate limiter: max 2 requests per second
const RATE_LIMIT_DELAY = 1000;
let lastRequestTime = 0;

async function rateLimitedDelay(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();
}

export function useWhatsAppSessionManager(): UseWhatsAppSessionManagerReturn {
  const [sessionStatuses, setSessionStatuses] = useState<Map<string, SessionStatus>>(new Map());
  const [isChecking, setIsChecking] = useState(false);
  const [isAutoReconnecting, setIsAutoReconnecting] = useState(false);
  const [autoReconnectEnabled, setAutoReconnectEnabled] = useState(true);
  const autoCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<Map<string, number>>(new Map());
  const sessionStatusesRef = useRef<Map<string, SessionStatus>>(new Map());
  const MAX_RECONNECT_ATTEMPTS = 3;
  const MAX_CONCURRENT_CHECKS = 3; // Limit concurrent session checks
  const { config, isLoading: loadingConfig } = useWahaConfig();

  // Keep ref in sync with state
  useEffect(() => {
    sessionStatusesRef.current = sessionStatuses;
  }, [sessionStatuses]);

  // Ensure WAHA is configured
  useEffect(() => {
    if (config?.api_url && config?.api_key) {
      wahaApi.setConfig(config.api_url, config.api_key);
    }
  }, [config]);

  // Auto-reconnect a session
  const tryAutoReconnect = useCallback(async (sessionName: string): Promise<boolean> => {
    if (!autoReconnectEnabled) return false;

    const currentAttempts = reconnectAttemptsRef.current.get(sessionName) || 0;
    if (currentAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.log(`Máximo de tentativas de reconexão atingido para ${sessionName}`);
      return false;
    }

    setIsAutoReconnecting(true);
    reconnectAttemptsRef.current.set(sessionName, currentAttempts + 1);

    try {
      console.log(`Auto-reconectando sessão ${sessionName} (tentativa ${currentAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);

      await wahaApi.startSession(sessionName);
      await new Promise(resolve => setTimeout(resolve, 3000));

      const session = await wahaApi.getSession(sessionName);

      if (session.status === "WORKING") {
        toast.success(`Sessão ${sessionName} reconectada automaticamente`);
        reconnectAttemptsRef.current.set(sessionName, 0); // Reset attempts
        return true;
      } else if (session.status === "SCAN_QR_CODE") {
        toast.warning(`Sessão ${sessionName} precisa de QR Code`);
        return false;
      }

      return false;
    } catch (err) {
      console.error(`Falha no auto-reconnect para ${sessionName}:`, err);
      return false;
    } finally {
      setIsAutoReconnecting(false);
    }
  }, [autoReconnectEnabled]);

  // Check status of a single session with deduplication
  const checkSessionStatus = useCallback(async (sessionName: string): Promise<SessionStatus> => {
    if (!config?.api_url || !config?.api_key) {
      return {
        sessionName,
        status: "UNKNOWN",
        isConnected: false,
        lastChecked: new Date(),
        error: "WAHA não configurado",
      };
    }

    // Check if there's already a pending request for this session
    const existingRequest = pendingRequests.get(sessionName);
    if (existingRequest) {
      return existingRequest;
    }

    const requestPromise = (async (): Promise<SessionStatus> => {
      try {
        // Apply rate limiting
        await rateLimitedDelay();

        const session = await wahaApi.getSession(sessionName);
        const previousStatus = sessionStatusesRef.current.get(sessionName);

        const status: SessionStatus = {
          sessionName,
          status: session.status as SessionStatus["status"],
          isConnected: session.status === "WORKING",
          lastChecked: new Date(),
          reconnectAttempts: reconnectAttemptsRef.current.get(sessionName) || 0,
        };

        // Update local state
        setSessionStatuses(prev => {
          const newMap = new Map(prev);
          newMap.set(sessionName, status);
          return newMap;
        });

        // Update database status (non-blocking)
        updateDatabaseStatus(sessionName, session.status).catch(console.error);

        // Check for status changes and notify (only if significant change)
        if (previousStatus) {
          if (previousStatus.isConnected && !status.isConnected) {
            // Session disconnected - try auto-reconnect
            toast.warning(`Sessão ${sessionName} desconectada`);

            if (autoReconnectEnabled && session.status !== "SCAN_QR_CODE") {
              // Schedule auto-reconnect with longer delay
              setTimeout(() => tryAutoReconnect(sessionName), 5000);
            }
          } else if (!previousStatus.isConnected && status.isConnected) {
            // Session connected
            toast.success(`Sessão ${sessionName} conectada`);
            reconnectAttemptsRef.current.set(sessionName, 0);
          }
        }

        // Reset attempts if connected
        if (status.isConnected) {
          reconnectAttemptsRef.current.set(sessionName, 0);
        }

        return status;
      } catch (err) {
        // Only log once, not spam console
        if (!sessionStatusesRef.current.get(sessionName)?.error) {
          console.warn(`Erro ao verificar sessão ${sessionName}:`, err instanceof Error ? err.message : err);
        }

        const errorStatus: SessionStatus = {
          sessionName,
          status: "UNKNOWN",
          isConnected: false,
          lastChecked: new Date(),
          error: err instanceof Error ? err.message : "Erro desconhecido",
          reconnectAttempts: reconnectAttemptsRef.current.get(sessionName) || 0,
        };

        setSessionStatuses(prev => {
          const newMap = new Map(prev);
          newMap.set(sessionName, errorStatus);
          return newMap;
        });

        return errorStatus;
      } finally {
        // Clean up pending request
        pendingRequests.delete(sessionName);
      }
    })();

    pendingRequests.set(sessionName, requestPromise);
    return requestPromise;
  }, [config, autoReconnectEnabled, tryAutoReconnect]);

  // Update session status in database
  const updateDatabaseStatus = async (sessionName: string, wahaStatus: string) => {
    try {
      // Map WAHA status to our database status - only known statuses
      const statusMap: Record<string, string> = {
        "WORKING": "working",
        "SCAN_QR_CODE": "qr_code",
        "STARTING": "starting",
        "FAILED": "failed",
        "STOPPED": "stopped",
      };

      const dbStatus = statusMap[wahaStatus];
      if (!dbStatus) {
        console.warn(`[SessionManager] Status desconhecido ignorado: ${wahaStatus}`);
        return;
      }

      await supabase
        .from("mt_whatsapp_sessions")
        .update({
          status: dbStatus,
          ultimo_check: new Date().toISOString(),
        })
        .eq("session_name", sessionName);
    } catch (err) {
      console.error("Erro ao atualizar status no banco:", err);
    }
  };

  // Check all sessions from database with global lock to prevent concurrent runs
  const checkAllSessions = useCallback(async () => {
    if (loadingConfig || !config?.api_url) return;

    // If already checking globally, return the existing promise
    if (globalIsChecking && globalCheckPromise) {
      return globalCheckPromise;
    }

    globalIsChecking = true;
    setIsChecking(true);

    globalCheckPromise = (async () => {
      try {
        // Get all sessions from database
        const { data: sessions, error } = await supabase
          .from("mt_whatsapp_sessions")
          .select("session_name")
          .eq("ativo", true);

        if (error) {
          console.error("Erro ao buscar sessões:", error);
          return;
        }

        if (!sessions || sessions.length === 0) return;

        // Process sessions in batches with limited concurrency
        const batchSize = MAX_CONCURRENT_CHECKS;
        for (let i = 0; i < sessions.length; i += batchSize) {
          const batch = sessions.slice(i, i + batchSize);

          // Process batch concurrently (limited)
          await Promise.allSettled(
            batch.map(session => checkSessionStatus(session.session_name))
          );

          // Delay between batches to avoid overwhelming WAHA
          if (i + batchSize < sessions.length) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      } catch (err) {
        console.error("Erro ao verificar todas as sessões:", err);
      } finally {
        globalIsChecking = false;
        globalCheckPromise = null;
        setIsChecking(false);
      }
    })();

    return globalCheckPromise;
  }, [config, loadingConfig, checkSessionStatus]);

  // Reconnect a disconnected session (restart it)
  const reconnectSession = useCallback(async (sessionName: string): Promise<{ success: boolean; error?: string }> => {
    if (!config?.api_url || !config?.api_key) {
      return { success: false, error: "WAHA não configurado" };
    }

    try {
      console.log(`Tentando reconectar sessão: ${sessionName}`);

      // First check current status
      const currentStatus = await checkSessionStatus(sessionName);

      if (currentStatus.isConnected) {
        return { success: true }; // Already connected
      }

      // If session is in SCAN_QR_CODE, it needs QR scan (can't auto-reconnect)
      if (currentStatus.status === "SCAN_QR_CODE") {
        return {
          success: false,
          error: "Sessão precisa de escaneamento do QR Code"
        };
      }

      // Try to start the session
      if (currentStatus.status === "STOPPED" || currentStatus.status === "FAILED") {
        await wahaApi.startSession(sessionName);

        // Wait a bit and check status
        await new Promise(resolve => setTimeout(resolve, 2000));
        const newStatus = await checkSessionStatus(sessionName);

        if (newStatus.isConnected) {
          return { success: true };
        } else if (newStatus.status === "SCAN_QR_CODE") {
          return {
            success: false,
            error: "Sessão iniciada, mas precisa de escaneamento do QR Code"
          };
        }
      }

      return { success: false, error: "Não foi possível reconectar" };
    } catch (err) {
      console.error(`Erro ao reconectar sessão ${sessionName}:`, err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Erro ao reconectar"
      };
    }
  }, [config, checkSessionStatus]);

  // Restart a session completely
  const restartSession = useCallback(async (sessionName: string): Promise<{ success: boolean; error?: string }> => {
    if (!config?.api_url || !config?.api_key) {
      return { success: false, error: "WAHA não configurado" };
    }

    try {
      console.log(`Reiniciando sessão: ${sessionName}`);

      await wahaApi.restartSession(sessionName);

      // Wait and check status
      await new Promise(resolve => setTimeout(resolve, 3000));
      const status = await checkSessionStatus(sessionName);

      if (status.isConnected) {
        return { success: true };
      } else if (status.status === "SCAN_QR_CODE") {
        return {
          success: true,
          error: "Sessão reiniciada, escaneie o QR Code para conectar"
        };
      }

      return { success: false, error: "Falha ao reiniciar sessão" };
    } catch (err) {
      console.error(`Erro ao reiniciar sessão ${sessionName}:`, err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Erro ao reiniciar"
      };
    }
  }, [config, checkSessionStatus]);

  // Ref to hold checkAllSessions for stable reference in interval
  const checkAllSessionsRef = useRef(checkAllSessions);
  useEffect(() => {
    checkAllSessionsRef.current = checkAllSessions;
  }, [checkAllSessions]);

  // Start automatic status checking
  const startAutoCheck = useCallback((intervalMs: number = 60000) => {
    // Clear existing interval
    if (autoCheckIntervalRef.current) {
      clearInterval(autoCheckIntervalRef.current);
    }

    // Minimum interval of 60 seconds to prevent abuse
    const safeInterval = Math.max(intervalMs, 60000);

    // Initial check (delayed to avoid immediate burst)
    setTimeout(() => {
      if (!globalIsChecking) {
        checkAllSessionsRef.current();
      }
    }, 1000);

    // Set up interval using ref for stable function reference
    autoCheckIntervalRef.current = setInterval(() => {
      if (!globalIsChecking) {
        checkAllSessionsRef.current();
      }
    }, safeInterval);

    console.log(`Auto-check de sessões iniciado (intervalo: ${safeInterval}ms)`);
  }, []); // Empty deps - uses refs internally

  // Stop automatic checking
  const stopAutoCheck = useCallback(() => {
    if (autoCheckIntervalRef.current) {
      clearInterval(autoCheckIntervalRef.current);
      autoCheckIntervalRef.current = null;
      console.log("Auto-check de sessões parado");
    }
  }, []);

  // Enable/disable auto-reconnect
  const enableAutoReconnect = useCallback((enable: boolean) => {
    setAutoReconnectEnabled(enable);
    if (!enable) {
      // Reset all reconnect attempts when disabled
      reconnectAttemptsRef.current.clear();
    }
    console.log(`Auto-reconnect ${enable ? "habilitado" : "desabilitado"}`);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoCheckIntervalRef.current) {
        clearInterval(autoCheckIntervalRef.current);
      }
    };
  }, []);

  return {
    sessionStatuses,
    isChecking,
    isAutoReconnecting,
    checkSessionStatus,
    checkAllSessions,
    reconnectSession,
    restartSession,
    startAutoCheck,
    stopAutoCheck,
    enableAutoReconnect,
  };
}
