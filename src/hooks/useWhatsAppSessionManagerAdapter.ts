// =============================================================================
// USE WHATSAPP SESSION MANAGER ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para gerenciamento de sessões WhatsApp usando tabelas MT
// SISTEMA 100% MT - Usa mt_whatsapp_sessions e mt_tenant_integrations
//
// =============================================================================

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { wahaApi } from '@/services/waha-api';
import { toast } from 'sonner';

// =============================================================================
// Types
// =============================================================================

interface SessionStatus {
  sessionName: string;
  status: 'STARTING' | 'SCAN_QR_CODE' | 'WORKING' | 'FAILED' | 'STOPPED' | 'UNKNOWN';
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
  _mode: 'mt';
}

// =============================================================================
// Global State (para evitar múltiplas verificações concorrentes)
// =============================================================================

let globalIsChecking = false;
let globalCheckPromise: Promise<void> | null = null;
const pendingRequests = new Map<string, Promise<SessionStatus>>();

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

// =============================================================================
// Hook Principal
// =============================================================================

export function useWhatsAppSessionManagerAdapter(): UseWhatsAppSessionManagerReturn {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const [sessionStatuses, setSessionStatuses] = useState<Map<string, SessionStatus>>(new Map());
  const [isChecking, setIsChecking] = useState(false);
  const [isAutoReconnecting, setIsAutoReconnecting] = useState(false);
  const [autoReconnectEnabled, setAutoReconnectEnabled] = useState(true);

  const autoCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<Map<string, number>>(new Map());
  const sessionStatusesRef = useRef<Map<string, SessionStatus>>(new Map());

  const MAX_RECONNECT_ATTEMPTS = 3;
  const MAX_CONCURRENT_CHECKS = 3;

  // Keep ref in sync with state
  useEffect(() => {
    sessionStatusesRef.current = sessionStatuses;
  }, [sessionStatuses]);

  // ==========================================================================
  // Helper: Check if WAHA is configured (uses wahaApi singleton)
  // ==========================================================================
  const isWahaConfigured = useCallback((): boolean => {
    // Verifica se wahaApi já foi configurado por outro hook (useWahaConfigAdapter)
    const config = wahaApi.getConfig();
    return config.isConfigured;
  }, []);

  // ==========================================================================
  // Auto-reconnect a session
  // ==========================================================================
  const tryAutoReconnect = useCallback(async (sessionName: string): Promise<boolean> => {
    if (!autoReconnectEnabled || !isWahaConfigured()) return false;

    const currentAttempts = reconnectAttemptsRef.current.get(sessionName) || 0;
    if (currentAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.log(`[MT] Máximo de tentativas de reconexão atingido para ${sessionName}`);
      return false;
    }

    setIsAutoReconnecting(true);
    reconnectAttemptsRef.current.set(sessionName, currentAttempts + 1);

    try {
      console.log(`[MT] Auto-reconectando sessão ${sessionName} (tentativa ${currentAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);

      await wahaApi.startSession(sessionName);
      await new Promise(resolve => setTimeout(resolve, 3000));

      const session = await wahaApi.getSession(sessionName);

      if (session.status === 'WORKING') {
        toast.success(`Sessão ${sessionName} reconectada automaticamente`);
        reconnectAttemptsRef.current.set(sessionName, 0);

        // Atualizar status no banco MT (usar 'working' que é o tipo MT correto)
        await supabase
          .from('mt_whatsapp_sessions')
          .update({
            status: 'working',
            updated_at: new Date().toISOString(),
          })
          .eq('session_name', sessionName);

        return true;
      } else if (session.status === 'SCAN_QR_CODE') {
        toast.warning(`Sessão ${sessionName} precisa de QR Code`);
        return false;
      }

      return false;
    } catch (err) {
      console.error(`[MT] Falha no auto-reconnect para ${sessionName}:`, err);
      return false;
    } finally {
      setIsAutoReconnecting(false);
    }
  }, [autoReconnectEnabled, isWahaConfigured]);

  // ==========================================================================
  // Check status of a single session
  // ==========================================================================
  const checkSessionStatus = useCallback(async (sessionName: string): Promise<SessionStatus> => {
    if (!isWahaConfigured()) {
      return {
        sessionName,
        status: 'UNKNOWN',
        isConnected: false,
        lastChecked: new Date(),
        error: 'WAHA não configurado',
      };
    }

    // Check if there's already a pending request
    const existingRequest = pendingRequests.get(sessionName);
    if (existingRequest) {
      return existingRequest;
    }

    const requestPromise = (async (): Promise<SessionStatus> => {
      try {
        await rateLimitedDelay();

        const session = await wahaApi.getSession(sessionName);
        const previousStatus = sessionStatusesRef.current.get(sessionName);

        const status: SessionStatus = {
          sessionName,
          status: session.status as SessionStatus['status'],
          isConnected: session.status === 'WORKING',
          lastChecked: new Date(),
          reconnectAttempts: reconnectAttemptsRef.current.get(sessionName) || 0,
        };

        // Update local state
        setSessionStatuses(prev => {
          const newMap = new Map(prev);
          newMap.set(sessionName, status);
          return newMap;
        });

        // Update database MT - usar nomes do tipo WhatsAppSessionStatus (MT)
        const statusMap: Record<string, string> = {
          'WORKING': 'working',
          'SCAN_QR_CODE': 'scan_qr_code',
          'STARTING': 'connecting',
          'FAILED': 'failed',
          'STOPPED': 'stopped',
        };
        const dbStatus = statusMap[status.status as string] || null;

        // Only update DB if we got a known status
        if (dbStatus) {
          await supabase
            .from('mt_whatsapp_sessions')
            .update({
              status: dbStatus,
              updated_at: new Date().toISOString(),
            })
            .eq('session_name', sessionName);
        }

        // Auto-reconnect if disconnected
        if (!status.isConnected && previousStatus?.isConnected && autoReconnectEnabled) {
          console.log(`[MT] Sessão ${sessionName} desconectou, tentando auto-reconnect`);
          tryAutoReconnect(sessionName);
        }

        return status;
      } catch (err) {
        console.error(`[MT] Erro ao verificar sessão ${sessionName}:`, err);
        const errorStatus: SessionStatus = {
          sessionName,
          status: 'UNKNOWN',
          isConnected: false,
          lastChecked: new Date(),
          error: err instanceof Error ? err.message : 'Erro desconhecido',
        };

        setSessionStatuses(prev => {
          const newMap = new Map(prev);
          newMap.set(sessionName, errorStatus);
          return newMap;
        });

        return errorStatus;
      } finally {
        pendingRequests.delete(sessionName);
      }
    })();

    pendingRequests.set(sessionName, requestPromise);
    return requestPromise;
  }, [isWahaConfigured, autoReconnectEnabled, tryAutoReconnect]);

  // ==========================================================================
  // Check all sessions from MT database
  // ==========================================================================
  const checkAllSessions = useCallback(async (): Promise<void> => {
    if (globalIsChecking && globalCheckPromise) {
      return globalCheckPromise;
    }
    if (!isWahaConfigured()) {
      console.warn('[MT] WAHA não configurado, pulando verificação');
      return;
    }

    globalIsChecking = true;
    setIsChecking(true);

    globalCheckPromise = (async () => {
      try {
        // Buscar sessões do banco MT
        let query = supabase
          .from('mt_whatsapp_sessions')
          .select('session_name')
          .not('session_name', 'is', null);

        if (accessLevel === 'tenant' && tenant) {
          query = query.eq('tenant_id', tenant.id);
        }

        const { data: sessions, error } = await query;

        if (error) {
          console.error('[MT] Erro ao buscar sessões:', error);
          return;
        }

        if (!sessions || sessions.length === 0) {
          console.log('[MT] Nenhuma sessão encontrada');
          return;
        }

        // Check sessions in batches
        const sessionNames = sessions.map(s => s.session_name).filter(Boolean);

        for (let i = 0; i < sessionNames.length; i += MAX_CONCURRENT_CHECKS) {
          const batch = sessionNames.slice(i, i + MAX_CONCURRENT_CHECKS);
          await Promise.all(batch.map(name => checkSessionStatus(name)));
        }
      } catch (err) {
        console.error('[MT] Erro ao verificar todas as sessões:', err);
      } finally {
        globalIsChecking = false;
        globalCheckPromise = null;
        setIsChecking(false);
      }
    })();

    return globalCheckPromise;
  }, [tenant, accessLevel, isWahaConfigured, checkSessionStatus]);

  // ==========================================================================
  // Reconnect session
  // ==========================================================================
  const reconnectSession = useCallback(async (sessionName: string): Promise<{ success: boolean; error?: string }> => {
    if (!isWahaConfigured()) {
      return { success: false, error: 'WAHA não configurado' };
    }

    try {
      await wahaApi.startSession(sessionName);
      await new Promise(resolve => setTimeout(resolve, 2000));

      const session = await wahaApi.getSession(sessionName);

      // Update database MT
      await supabase
        .from('mt_whatsapp_sessions')
        .update({
          status: session.status === 'WORKING' ? 'working' : 'scan_qr_code',
          updated_at: new Date().toISOString(),
        })
        .eq('session_name', sessionName);

      if (session.status === 'WORKING') {
        toast.success(`Sessão ${sessionName} conectada`);
        return { success: true };
      } else if (session.status === 'SCAN_QR_CODE') {
        toast.info(`Sessão ${sessionName} aguardando QR Code`);
        return { success: true };
      }

      return { success: false, error: `Status: ${session.status}` };
    } catch (err) {
      console.error(`[MT] Erro ao reconectar ${sessionName}:`, err);
      return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
    }
  }, [isWahaConfigured]);

  // ==========================================================================
  // Restart session
  // ==========================================================================
  const restartSession = useCallback(async (sessionName: string): Promise<{ success: boolean; error?: string }> => {
    if (!isWahaConfigured()) {
      return { success: false, error: 'WAHA não configurado' };
    }

    try {
      // Stop then start
      try {
        await wahaApi.stopSession(sessionName);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch {
        // Ignore stop errors
      }

      await wahaApi.startSession(sessionName);
      await new Promise(resolve => setTimeout(resolve, 2000));

      const session = await wahaApi.getSession(sessionName);

      // Update database MT
      await supabase
        .from('mt_whatsapp_sessions')
        .update({
          status: session.status === 'WORKING' ? 'working' : 'scan_qr_code',
          updated_at: new Date().toISOString(),
        })
        .eq('session_name', sessionName);

      toast.success(`Sessão ${sessionName} reiniciada`);
      return { success: true };
    } catch (err) {
      console.error(`[MT] Erro ao reiniciar ${sessionName}:`, err);
      return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
    }
  }, [isWahaConfigured]);

  // ==========================================================================
  // Auto-check controls
  // ==========================================================================
  const startAutoCheck = useCallback((intervalMs: number = 60000) => {
    if (autoCheckIntervalRef.current) {
      clearInterval(autoCheckIntervalRef.current);
    }

    // Initial check
    checkAllSessions();

    // Start interval
    autoCheckIntervalRef.current = setInterval(() => {
      checkAllSessions();
    }, intervalMs);
  }, [checkAllSessions]);

  const stopAutoCheck = useCallback(() => {
    if (autoCheckIntervalRef.current) {
      clearInterval(autoCheckIntervalRef.current);
      autoCheckIntervalRef.current = null;
    }
  }, []);

  const enableAutoReconnect = useCallback((enable: boolean) => {
    setAutoReconnectEnabled(enable);
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
    isChecking: isChecking || isTenantLoading,
    isAutoReconnecting,
    checkSessionStatus,
    checkAllSessions,
    reconnectSession,
    restartSession,
    startAutoCheck,
    stopAutoCheck,
    enableAutoReconnect,
    _mode: 'mt' as const,
  };
}

// Helper: Verificar modo atual (sempre MT)
export function getWhatsAppSessionManagerMode(): 'mt' {
  return 'mt';
}

export default useWhatsAppSessionManagerAdapter;
