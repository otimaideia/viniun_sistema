// Hook para configurar webhooks do WAHA para sincronização em tempo real

import { useState, useCallback } from 'react';
import { wahaClient } from '@/services/waha/wahaDirectClient';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// URL do webhook da Edge Function
const WEBHOOK_URL = 'https://supabase.viniun.com.br/functions/v1/waha-webhook';

// Eventos que queremos receber
const WEBHOOK_EVENTS = [
  'message',
  'message.any',
  'message.ack',
  'session.status',
];

// Buscar webhook secret do banco (se configurado)
async function getWebhookSecret(): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('mt_system_config')
      .select('value')
      .eq('key', 'WAHA_WEBHOOK_SECRET')
      .single();

    if (error || !data?.value) {
      return null;
    }

    return data.value;
  } catch (err) {
    console.error('[Webhook] Erro ao buscar secret:', err);
    return null;
  }
}

interface WebhookConfig {
  url: string;
  events: string[];
}

interface UseWebhookConfigReturn {
  isConfiguring: boolean;
  isChecking: boolean;
  currentConfig: WebhookConfig | null;
  configureWebhook: (sessionName: string) => Promise<boolean>;
  checkWebhookConfig: (sessionName: string) => Promise<WebhookConfig | null>;
  webhookUrl: string;
}

/**
 * @deprecated Use useWahaConfigAdapter instead. This hook lacks tenant isolation.
 */
export function useWebhookConfig(): UseWebhookConfigReturn {
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<WebhookConfig | null>(null);

  // Verificar configuração atual do webhook
  const checkWebhookConfig = useCallback(async (sessionName: string): Promise<WebhookConfig | null> => {
    setIsChecking(true);
    try {
      const result = await wahaClient.getSessionConfig(sessionName);

      if (result.success && result.data) {
        const sessionData = result.data as {
          config?: {
            webhooks?: Array<{
              url: string;
              events: string[];
            }>;
          };
        };

        const webhooks = sessionData.config?.webhooks;
        if (webhooks && webhooks.length > 0) {
          const config = {
            url: webhooks[0].url,
            events: webhooks[0].events || [],
          };
          setCurrentConfig(config);
          return config;
        }
      }

      setCurrentConfig(null);
      return null;
    } catch (error) {
      console.error('[Webhook] Erro ao verificar config:', error);
      setCurrentConfig(null);
      return null;
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Configurar webhook para uma sessão
  const configureWebhook = useCallback(async (sessionName: string): Promise<boolean> => {
    setIsConfiguring(true);
    try {

      const result = await wahaClient.setWebhook(sessionName, WEBHOOK_URL, WEBHOOK_EVENTS);

      if (result.success) {
        toast.success('Webhook configurado!', {
          description: 'Mensagens serão sincronizadas em tempo real.',
        });

        // Atualizar config atual
        setCurrentConfig({
          url: WEBHOOK_URL,
          events: WEBHOOK_EVENTS,
        });

        return true;
      } else {
        toast.error('Erro ao configurar webhook', {
          description: result.error || 'Tente novamente.',
        });
        return false;
      }
    } catch (error) {
      console.error('[Webhook] Erro ao configurar:', error);
      toast.error('Erro ao configurar webhook', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
      return false;
    } finally {
      setIsConfiguring(false);
    }
  }, []);

  return {
    isConfiguring,
    isChecking,
    currentConfig,
    configureWebhook,
    checkWebhookConfig,
    webhookUrl: WEBHOOK_URL,
  };
}
