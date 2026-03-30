import { useState, useEffect, useRef, useCallback } from 'react';
import { wahaClient } from '@/services/waha/wahaDirectClient';

interface ContactPresence {
  isOnline: boolean;
  isTyping: boolean;
  lastSeen: string | null;
}

/**
 * Hook para monitorar presença e typing do contato selecionado.
 * Faz polling a cada 15s para presença e escuta eventos do webhook via Supabase real-time.
 */
export function useContactPresence(
  sessionName: string | null,
  chatId: string | null,
  isGroup: boolean = false
): ContactPresence {
  const [isOnline, setIsOnline] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // Format lastSeen timestamp
  const formatLastSeen = useCallback((timestamp: number | null | undefined): string | null => {
    if (!timestamp) return null;
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `há ${diffMins}min`;
    if (diffMins < 1440) {
      const hours = Math.floor(diffMins / 60);
      return `há ${hours}h`;
    }
    return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }, []);

  // Fetch presence from WAHA
  const fetchPresence = useCallback(async () => {
    if (!sessionName || !chatId || isGroup) return;
    try {
      const result = await wahaClient.getContactPresence(sessionName, chatId);
      if (result.success && result.data && isMountedRef.current) {
        setIsOnline(result.data.isOnline || false);
        if (result.data.lastSeen) {
          setLastSeen(formatLastSeen(result.data.lastSeen));
        }
      }
    } catch {
      // Silencioso - presença é best-effort
    }
  }, [sessionName, chatId, isGroup, formatLastSeen]);

  // Poll presence every 15s
  useEffect(() => {
    isMountedRef.current = true;
    if (!sessionName || !chatId || isGroup) {
      setIsOnline(false);
      setIsTyping(false);
      setLastSeen(null);
      return;
    }

    // Initial fetch
    fetchPresence();

    // Polling
    const interval = setInterval(fetchPresence, 15000);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [sessionName, chatId, isGroup, fetchPresence]);

  // Reset when chat changes
  useEffect(() => {
    setIsOnline(false);
    setIsTyping(false);
    setLastSeen(null);
  }, [chatId]);

  return { isOnline, isTyping, lastSeen };
}
