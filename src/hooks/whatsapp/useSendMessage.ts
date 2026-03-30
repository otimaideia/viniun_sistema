// Hook para enviar mensagens WhatsApp
// Usa o wahaDirectClient para comunicação direta com o WAHA

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { wahaClient } from '@/services/waha/wahaDirectClient';
import { toast } from 'sonner';

interface SendMessageInput {
  sessionName: string;
  chatId: string;
  text: string;
  conversationId?: string;
}

interface SendMediaInput {
  sessionName: string;
  chatId: string;
  mediaUrl: string;
  caption?: string;
  filename?: string;
  conversationId?: string;
}

/**
 * @deprecated Use useWhatsAppChatAdapter instead. This hook lacks tenant isolation.
 */
export function useSendMessage() {
  const queryClient = useQueryClient();
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (input: SendMessageInput) => {
    const { sessionName, chatId, text } = input;

    if (!sessionName || !chatId || !text.trim()) {
      setError('Dados inválidos para envio');
      return null;
    }

    setIsSending(true);
    setError(null);

    try {
      // Enviar via WAHA
      const result = await wahaClient.sendText(sessionName, chatId, text);

      if (!result.success) {
        throw new Error(result.error || 'Erro ao enviar mensagem');
      }

      // IMPORTANTE: NÃO salvamos a mensagem aqui
      // O webhook do WAHA vai salvar automaticamente (evita duplicatas)
      console.log('✅ Mensagem enviada via WAHA - webhook vai salvar no banco');

      // Invalidar queries para atualizar UI
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });

      return result.data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao enviar mensagem';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    } finally {
      setIsSending(false);
    }
  }, [queryClient]);

  const sendImage = useCallback(async (input: SendMediaInput) => {
    const { sessionName, chatId, mediaUrl, caption } = input;

    if (!sessionName || !chatId || !mediaUrl) {
      setError('Dados inválidos para envio de imagem');
      return null;
    }

    setIsSending(true);
    setError(null);

    try {
      const result = await wahaClient.sendImage(
        sessionName,
        chatId,
        { url: mediaUrl },
        { caption }
      );

      if (!result.success) {
        throw new Error(result.error || 'Erro ao enviar imagem');
      }

      // IMPORTANTE: NÃO salvamos a imagem aqui
      // O webhook do WAHA vai salvar automaticamente (evita duplicatas)
      console.log('✅ Imagem enviada via WAHA - webhook vai salvar no banco');

      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });

      return result.data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao enviar imagem';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    } finally {
      setIsSending(false);
    }
  }, [queryClient]);

  const sendDocument = useCallback(async (input: SendMediaInput) => {
    const { sessionName, chatId, mediaUrl, caption, filename } = input;

    if (!sessionName || !chatId || !mediaUrl || !filename) {
      setError('Dados inválidos para envio de documento');
      return null;
    }

    setIsSending(true);
    setError(null);

    try {
      const result = await wahaClient.sendDocument(sessionName, chatId, mediaUrl, filename, caption);

      if (!result.success) {
        throw new Error(result.error || 'Erro ao enviar documento');
      }

      // IMPORTANTE: NÃO salvamos o documento aqui
      // O webhook do WAHA vai salvar automaticamente (evita duplicatas)
      console.log('✅ Documento enviado via WAHA - webhook vai salvar no banco');

      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });

      return result.data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao enviar documento';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    } finally {
      setIsSending(false);
    }
  }, [queryClient]);

  const sendVoice = useCallback(async (input: { sessionName: string; chatId: string; base64Audio: string }) => {
    const { sessionName, chatId, base64Audio } = input;

    if (!sessionName || !chatId || !base64Audio) {
      setError('Dados inválidos para envio de áudio');
      return null;
    }

    setIsSending(true);
    setError(null);

    try {
      const result = await wahaClient.sendVoice(
        sessionName,
        chatId,
        { base64: base64Audio, mimetype: 'audio/ogg' }
      );

      if (!result.success) {
        throw new Error(result.error || 'Erro ao enviar áudio');
      }

      console.log('✅ Áudio enviado via WAHA - webhook vai salvar no banco');

      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });

      return result.data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao enviar áudio';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    } finally {
      setIsSending(false);
    }
  }, [queryClient]);

  const sendVideo = useCallback(async (input: SendMediaInput) => {
    const { sessionName, chatId, mediaUrl, caption } = input;

    if (!sessionName || !chatId || !mediaUrl) {
      setError('Dados inválidos para envio de vídeo');
      return null;
    }

    setIsSending(true);
    setError(null);

    try {
      const result = await wahaClient.sendVideo(
        sessionName,
        chatId,
        { url: mediaUrl },
        { caption }
      );

      if (!result.success) {
        throw new Error(result.error || 'Erro ao enviar vídeo');
      }

      console.log('✅ Vídeo enviado via WAHA - webhook vai salvar no banco');

      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });

      return result.data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao enviar vídeo';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    } finally {
      setIsSending(false);
    }
  }, [queryClient]);

  return {
    sendMessage,
    sendImage,
    sendDocument,
    sendVoice,
    sendVideo,
    isSending,
    error,
  };
}
