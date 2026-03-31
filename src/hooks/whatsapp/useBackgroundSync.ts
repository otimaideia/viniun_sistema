// Hook para sincronização em background de mensagens WhatsApp

import { useEffect, useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWhatsAppSessoes } from './useWhatsAppSessoes';

interface SyncStatus {
  isRunning: boolean;
  lastSyncAt?: Date;
  progress?: number;
  currentSession?: string;
  error?: string;
}

interface UseBackgroundSyncOptions {
  // Intervalo de sincronização em ms (padrão: 60 segundos)
  syncInterval?: number;
  // Auto-iniciar sync ao montar
  autoStart?: boolean;
  // Callback quando sync completar
  onSyncComplete?: () => void;
}

/**
 * @deprecated Legacy hook, used internally by adapter. This hook lacks tenant isolation.
 */
export function useBackgroundSync(
  franqueadoId?: string,
  options: UseBackgroundSyncOptions = {}
) {
  const {
    syncInterval = 60000,
    autoStart = true,
    onSyncComplete,
  } = options;

  const queryClient = useQueryClient();
  const { sessoes } = useWhatsAppSessoes();

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ isRunning: false });
  const [isActive, setIsActive] = useState(false);
  const onSyncCompleteRef = useRef(onSyncComplete);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  // Atualizar ref quando callback mudar
  useEffect(() => {
    onSyncCompleteRef.current = onSyncComplete;
  }, [onSyncComplete]);

  // Filtrar sessões do franqueado
  const filteredSessions = franqueadoId
    ? sessoes.filter(s => s.franqueado_id === franqueadoId)
    : sessoes;

  // Sincronizar uma sessão
  const syncSession = useCallback(async (sessionName: string) => {
    setSyncStatus(prev => ({
      ...prev,
      isRunning: true,
      currentSession: sessionName,
    }));

    try {
      // Invalidar queries para forçar refresh
      await queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      await queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });

      setSyncStatus(prev => ({
        ...prev,
        lastSyncAt: new Date(),
        error: undefined,
      }));
    } catch (error) {
      console.error('[useBackgroundSync] Erro ao sincronizar:', error);
      setSyncStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }));
    } finally {
      setSyncStatus(prev => ({
        ...prev,
        isRunning: false,
        currentSession: undefined,
      }));
    }
  }, [queryClient]);

  // Sincronizar todas as sessões
  const syncAllSessions = useCallback(async () => {
    const connectedSessions = filteredSessions.filter(s => s.status === 'connected');

    if (connectedSessions.length === 0) {
      return;
    }

    for (let i = 0; i < connectedSessions.length; i++) {
      const session = connectedSessions[i];
      setSyncStatus(prev => ({
        ...prev,
        progress: Math.round(((i + 1) / connectedSessions.length) * 100),
      }));

      await syncSession(session.session_name);
    }

    onSyncCompleteRef.current?.();
  }, [filteredSessions, syncSession]);

  // Iniciar sync automático
  const startSync = useCallback(() => {
    if (filteredSessions.length > 0 && !isActive) {
      setIsActive(true);

      // Sync imediato
      syncAllSessions();

      // Configurar intervalo
      intervalRef.current = setInterval(() => {
        syncAllSessions();
      }, syncInterval);
    }
  }, [filteredSessions, isActive, syncAllSessions, syncInterval]);

  // Parar sync automático
  const stopSync = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
    setIsActive(false);
  }, []);

  // Sync imediato (manual)
  const syncNow = useCallback(async () => {
    await syncAllSessions();
  }, [syncAllSessions]);

  // Auto-iniciar se configurado
  useEffect(() => {
    if (autoStart && filteredSessions.length > 0 && !isActive) {
      startSync();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoStart, filteredSessions, isActive, startSync]);

  return {
    // Status
    syncStatus,
    isActive,
    isSyncing: syncStatus.isRunning,

    // Controles
    startSync,
    stopSync,
    syncNow,
  };
}
