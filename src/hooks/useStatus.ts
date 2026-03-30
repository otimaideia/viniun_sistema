import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Cores de fundo disponíveis para status de texto
export const STATUS_BACKGROUND_COLORS = [
  { id: 1, name: 'Verde', hex: '#25D366' },
  { id: 2, name: 'Azul', hex: '#0088cc' },
  { id: 3, name: 'Roxo', hex: '#9b59b6' },
  { id: 4, name: 'Rosa', hex: '#e91e63' },
  { id: 5, name: 'Vermelho', hex: '#e74c3c' },
  { id: 6, name: 'Laranja', hex: '#f39c12' },
  { id: 7, name: 'Amarelo', hex: '#f1c40f' },
  { id: 8, name: 'Ciano', hex: '#00bcd4' },
  { id: 9, name: 'Cinza', hex: '#607d8b' },
  { id: 10, name: 'Preto', hex: '#212121' },
];

// Fontes disponíveis para status de texto
export const STATUS_FONTS = [
  { id: 0, name: 'Sans Serif' },
  { id: 1, name: 'Serif' },
  { id: 2, name: 'Norican Script' },
  { id: 3, name: 'Bryndan Write' },
  { id: 4, name: 'Bebasneue Regular' },
  { id: 5, name: 'Oswald Heavy' },
];

interface TextStatusInput {
  text: string;
  backgroundColor: string;
  font?: number;
}

interface MediaStatusInput {
  file: {
    base64: string;
    mimetype: string;
  };
  caption?: string;
}

interface UseStatusProps {
  sessionName: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Hook para gerenciar publicação de Status/Stories do WhatsApp
 */
export function useStatus({ sessionName, onSuccess, onError }: UseStatusProps) {
  // Enviar status de texto
  const sendTextStatus = useMutation({
    mutationFn: async (data: TextStatusInput) => {
      if (!sessionName) throw new Error('Sessão não configurada');

      const { data: result, error } = await supabase.functions.invoke('waha-proxy', {
        body: {
          action: 'send-text-status',
          sessionName,
          text: data.text,
          backgroundColor: data.backgroundColor,
          font: data.font || 0,
        },
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast.success('Status publicado com sucesso!');
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao publicar status: ${error.message}`);
      onError?.(error);
    },
  });

  // Enviar status de imagem
  const sendImageStatus = useMutation({
    mutationFn: async (data: MediaStatusInput) => {
      if (!sessionName) throw new Error('Sessão não configurada');

      const { data: result, error } = await supabase.functions.invoke('waha-proxy', {
        body: {
          action: 'send-image-status',
          sessionName,
          file: data.file,
          caption: data.caption,
        },
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast.success('Status de imagem publicado!');
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao publicar imagem: ${error.message}`);
      onError?.(error);
    },
  });

  // Enviar status de vídeo
  const sendVideoStatus = useMutation({
    mutationFn: async (data: MediaStatusInput) => {
      if (!sessionName) throw new Error('Sessão não configurada');

      const { data: result, error } = await supabase.functions.invoke('waha-proxy', {
        body: {
          action: 'send-video-status',
          sessionName,
          file: data.file,
          caption: data.caption,
        },
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast.success('Status de vídeo publicado!');
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao publicar vídeo: ${error.message}`);
      onError?.(error);
    },
  });

  return {
    sendTextStatus,
    sendImageStatus,
    sendVideoStatus,
    isLoading: sendTextStatus.isPending || sendImageStatus.isPending || sendVideoStatus.isPending,
  };
}

export default useStatus;
