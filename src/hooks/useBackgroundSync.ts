import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface SyncStatus {
  lastSync: Date | null;
  isSyncing: boolean;
  error: string | null;
  syncCount: number;
}

interface BackgroundSyncOptions {
  intervalMs?: number;
  enabled?: boolean;
  onSyncComplete?: (stats: { chats: number; messages: number }) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook para sincronização em background com o servidor WAHA
 * Mantém os dados locais atualizados periodicamente
 */
export function useBackgroundSync(
  sessionName: string | undefined,
  sessaoId: string | undefined,
  options: BackgroundSyncOptions = {}
) {
  const {
    intervalMs = 60000, // 1 minuto por padrão
    enabled = true,
    onSyncComplete,
    onError,
  } = options;

  const queryClient = useQueryClient();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [status, setStatus] = useState<SyncStatus>({
    lastSync: null,
    isSyncing: false,
    error: null,
    syncCount: 0,
  });

  const syncChats = useCallback(async () => {
    if (!sessionName || !sessaoId) return { chats: 0, messages: 0 };

    setStatus(prev => ({ ...prev, isSyncing: true, error: null }));

    try {
      // Chamar edge function para sincronizar
      const { data, error } = await supabase.functions.invoke('waha-proxy', {
        body: {
          action: 'sync-chats',
          sessionName,
          sessaoId,
        },
      });

      if (error) throw error;

      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['whatsapp_chats', sessaoId] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp_messages'] });

      const stats = {
        chats: data?.chatsCount || 0,
        messages: data?.messagesCount || 0,
      };

      setStatus(prev => ({
        ...prev,
        lastSync: new Date(),
        isSyncing: false,
        syncCount: prev.syncCount + 1,
      }));

      onSyncComplete?.(stats);
      return stats;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro na sincronização');
      setStatus(prev => ({
        ...prev,
        isSyncing: false,
        error: error.message,
      }));
      onError?.(error);
      return { chats: 0, messages: 0 };
    }
  }, [sessionName, sessaoId, queryClient, onSyncComplete, onError]);

  // Iniciar/parar sincronização automática
  useEffect(() => {
    if (!enabled || !sessionName || !sessaoId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Sincronizar imediatamente
    syncChats();

    // Configurar intervalo
    intervalRef.current = setInterval(syncChats, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, sessionName, sessaoId, intervalMs, syncChats]);

  // Forçar sincronização manual
  const forceSync = useCallback(() => {
    return syncChats();
  }, [syncChats]);

  // Pausar sincronização
  const pause = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Retomar sincronização
  const resume = useCallback(() => {
    if (!intervalRef.current && enabled && sessionName && sessaoId) {
      intervalRef.current = setInterval(syncChats, intervalMs);
    }
  }, [enabled, sessionName, sessaoId, intervalMs, syncChats]);

  return {
    ...status,
    forceSync,
    pause,
    resume,
    isEnabled: enabled && !!intervalRef.current,
  };
}

export default useBackgroundSync;
