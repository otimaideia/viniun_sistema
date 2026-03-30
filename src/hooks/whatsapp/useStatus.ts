// Hook para gerenciar Status/Stories do WhatsApp
// Usa cliente direto (wahaClient) como fallback quando proxy falha

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { wahaClient } from '@/services/waha/wahaDirectClient';
import { toast } from 'sonner';

// Cores de fundo disponíveis para status de texto
export const STATUS_BACKGROUND_COLORS = [
  { id: 'teal', hex: '#00BFA5', name: 'Verde-azulado' },
  { id: 'blue', hex: '#1E88E5', name: 'Azul' },
  { id: 'purple', hex: '#7B1FA2', name: 'Roxo' },
  { id: 'pink', hex: '#D81B60', name: 'Rosa' },
  { id: 'orange', hex: '#F4511E', name: 'Laranja' },
  { id: 'green', hex: '#43A047', name: 'Verde' },
  { id: 'brown', hex: '#795548', name: 'Marrom' },
  { id: 'gray', hex: '#607D8B', name: 'Cinza' },
];

// Fontes disponíveis para status de texto
export const STATUS_FONTS = [
  { id: 0, name: 'Sans Serif' },
  { id: 1, name: 'Serif' },
  { id: 2, name: 'Norican' },
  { id: 3, name: 'Bryndan Write' },
  { id: 4, name: 'Bebasneue' },
  { id: 5, name: 'Oswald' },
];

interface UseStatusOptions {
  sessionName: string;
  onSuccess?: () => void;
}

interface SendTextStatusParams {
  text: string;
  backgroundColor?: string;
  font?: number;
  contacts?: string[];
}

interface SendMediaStatusParams {
  file: {
    url?: string;
    base64?: string;
    mimetype?: string;
  };
  caption?: string;
  contacts?: string[];
}

interface SendVoiceStatusParams {
  file: {
    url?: string;
    base64?: string;
    mimetype?: string;
  };
  contacts?: string[];
}

/**
 * @deprecated Use useWhatsAppSessionsMT instead. This hook lacks tenant isolation.
 */
export function useStatus({ sessionName, onSuccess }: UseStatusOptions) {
  const queryClient = useQueryClient();

  // Enviar status de texto
  const sendTextStatus = useMutation({
    mutationFn: async ({ text, backgroundColor, font, contacts }: SendTextStatusParams) => {
      console.log('[useStatus] Enviando status de texto...');
      const result = await wahaClient.sendStatusText(sessionName, text, {
        backgroundColor,
        font,
        contacts,
      });

      if (!result.success) {
        throw new Error(result.error || 'Erro ao publicar status');
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
      toast.success('Status publicado!');
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao publicar status: ${error.message}`);
    },
  });

  // Enviar status de imagem
  const sendImageStatus = useMutation({
    mutationFn: async ({ file, caption, contacts }: SendMediaStatusParams) => {
      console.log('[useStatus] Enviando status de imagem...');
      const result = await wahaClient.sendStatusImage(sessionName, file, {
        caption,
        contacts,
      });

      if (!result.success) {
        throw new Error(result.error || 'Erro ao publicar status de imagem');
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
      toast.success('Status de imagem publicado!');
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao publicar status: ${error.message}`);
    },
  });

  // Enviar status de vídeo
  const sendVideoStatus = useMutation({
    mutationFn: async ({ file, caption, contacts }: SendMediaStatusParams) => {
      console.log('[useStatus] Enviando status de vídeo...');
      const result = await wahaClient.sendStatusVideo(sessionName, file, {
        caption,
        contacts,
      });

      if (!result.success) {
        throw new Error(result.error || 'Erro ao publicar status de vídeo');
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
      toast.success('Status de vídeo publicado!');
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao publicar status: ${error.message}`);
    },
  });

  // Enviar status de voz
  const sendVoiceStatus = useMutation({
    mutationFn: async ({ file, contacts }: SendVoiceStatusParams) => {
      console.log('[useStatus] Enviando status de voz...');
      const result = await wahaClient.sendStatusVoice(sessionName, file, {
        contacts,
      });

      if (!result.success) {
        throw new Error(result.error || 'Erro ao publicar status de voz');
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
      toast.success('Status de voz publicado!');
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao publicar status: ${error.message}`);
    },
  });

  // Deletar status
  const deleteStatus = useMutation({
    mutationFn: async (messageId: string) => {
      console.log('[useStatus] Deletando status...');
      const result = await wahaClient.deleteStatus(sessionName, messageId);

      if (!result.success) {
        throw new Error(result.error || 'Erro ao deletar status');
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
      toast.success('Status deletado!');
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao deletar status: ${error.message}`);
    },
  });

  return {
    sendTextStatus,
    sendImageStatus,
    sendVideoStatus,
    sendVoiceStatus,
    deleteStatus,
    isLoading:
      sendTextStatus.isPending ||
      sendImageStatus.isPending ||
      sendVideoStatus.isPending ||
      sendVoiceStatus.isPending ||
      deleteStatus.isPending,
  };
}
