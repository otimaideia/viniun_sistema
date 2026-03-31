// Serviço para upload de mídia WhatsApp para Supabase Storage
// Resolve problema de URLs expiradas do WAHA salvando no nosso bucket
// Viniun Sistema

import { supabase } from '@/integrations/supabase/client';
import { wahaClient } from '@/services/waha/wahaDirectClient';

const BUCKET_NAME = 'whatsapp-media';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

interface MediaInfo {
  url: string;
  mimetype?: string;
  filename?: string;
  messageId: string;
  conversationId: string;
  franqueadoId: string;
}

/**
 * Faz download da mídia do WAHA e upload para o Supabase Storage
 */
export async function uploadMediaToStorage(media: MediaInfo): Promise<UploadResult> {
  try {
    if (!media.url) {
      return { success: false, error: 'URL de mídia não fornecida' };
    }

    // 1. Fazer download da mídia do WAHA (com autenticação se for URL do WAHA)
    const isWahaUrl = media.url.includes('waha') || media.url.includes('/api/files/');
    const fetchOptions: RequestInit = {};

    if (isWahaUrl) {
      // Obter headers de autenticação do WAHA
      const authHeaders = await wahaClient.getAuthHeaders();
      fetchOptions.headers = authHeaders;
    }

    const response = await fetch(media.url, fetchOptions);

    if (!response.ok) {
      console.error(`[MediaStorage] Erro ao baixar mídia: ${response.status}`);
      return { success: false, error: `Erro ao baixar mídia: ${response.status}` };
    }

    const blob = await response.blob();

    // Verificar tamanho
    if (blob.size > MAX_FILE_SIZE) {
      console.error(`[MediaStorage] Arquivo muito grande: ${blob.size} bytes`);
      return { success: false, error: 'Arquivo muito grande (máximo 50MB)' };
    }

    // 2. Determinar extensão do arquivo
    const extension = getExtensionFromMimetype(media.mimetype || blob.type) ||
                      getExtensionFromFilename(media.filename) ||
                      getExtensionFromUrl(media.url) ||
                      'bin';

    // 3. Gerar caminho único no storage
    // Estrutura: franqueado_id/conversation_id/message_id.ext
    const timestamp = Date.now();
    const storagePath = `${media.franqueadoId}/${media.conversationId}/${media.messageId}_${timestamp}.${extension}`;

    // 4. Fazer upload para o Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, blob, {
        contentType: media.mimetype || blob.type || 'application/octet-stream',
        cacheControl: '31536000', // Cache por 1 ano
        upsert: true, // Substituir se já existir
      });

    if (error) {
      console.error(`[MediaStorage] Erro no upload:`, error);
      return { success: false, error: error.message };
    }

    // 5. Gerar URL pública
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    const publicUrl = publicUrlData?.publicUrl;

    if (!publicUrl) {
      console.error(`[MediaStorage] Não foi possível gerar URL pública`);
      return { success: false, error: 'Não foi possível gerar URL pública' };
    }

    return {
      success: true,
      url: publicUrl,
      path: storagePath,
    };
  } catch (error) {
    console.error(`[MediaStorage] Erro inesperado:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

/**
 * Atualiza a URL de mídia de uma mensagem no banco de dados
 * storage_path recebe a URL completa para compatibilidade com o componente
 */
export async function updateMessageMediaUrl(
  messageId: string,
  storageUrl: string,
  storagePath: string
): Promise<boolean> {
  try {

    const { error } = await supabase
      .from('mt_whatsapp_messages')
      .update({
        // storage_path recebe a URL COMPLETA (não o caminho relativo)
        // para compatibilidade com o componente que espera URL direta
        storage_path: storageUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', messageId);

    if (error) {
      console.error(`[MediaStorage] Erro ao atualizar mensagem:`, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`[MediaStorage] Erro ao atualizar mensagem:`, error);
    return false;
  }
}

/**
 * Processa mídia de uma mensagem: download do WAHA + upload para Storage
 */
export async function processMessageMedia(
  wahaMediaUrl: string,
  messageId: string,
  conversationId: string,
  franqueadoId: string,
  mimetype?: string,
  filename?: string
): Promise<string | null> {
  // Verificar se a URL já é do nosso storage
  if (wahaMediaUrl.includes('supabase') || wahaMediaUrl.includes(BUCKET_NAME)) {
    return wahaMediaUrl;
  }

  const result = await uploadMediaToStorage({
    url: wahaMediaUrl,
    mimetype,
    filename,
    messageId,
    conversationId,
    franqueadoId,
  });

  if (result.success && result.url) {
    // Atualizar no banco se tivermos um ID real de mensagem
    if (messageId && !messageId.startsWith('false_') && !messageId.startsWith('true_')) {
      await updateMessageMediaUrl(messageId, result.url, result.path || '');
    }
    return result.url;
  }

  return null;
}

// ========================================
// FUNÇÕES AUXILIARES
// ========================================

function getExtensionFromMimetype(mimetype?: string): string | null {
  if (!mimetype) return null;

  const mimeMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/ogg': 'ogg',
    'audio/opus': 'opus',
    'audio/wav': 'wav',
    'audio/webm': 'weba',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'application/zip': 'zip',
    'application/x-rar-compressed': 'rar',
    'text/plain': 'txt',
  };

  return mimeMap[mimetype.toLowerCase()] || null;
}

function getExtensionFromFilename(filename?: string): string | null {
  if (!filename) return null;
  const parts = filename.split('.');
  if (parts.length > 1) {
    return parts[parts.length - 1].toLowerCase();
  }
  return null;
}

function getExtensionFromUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split('.');
    if (parts.length > 1) {
      const ext = parts[parts.length - 1].toLowerCase();
      // Verificar se é uma extensão válida (não muito longa)
      if (ext.length <= 5 && /^[a-z0-9]+$/.test(ext)) {
        return ext;
      }
    }
  } catch {
    // URL inválida
  }
  return null;
}

/**
 * Verifica se o bucket existe, se não existir tenta criar
 */
export async function ensureBucketExists(): Promise<boolean> {
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error(`[MediaStorage] Erro ao listar buckets:`, listError);
      return false;
    }

    const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);

    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true, // Acesso público para exibir imagens
        fileSizeLimit: MAX_FILE_SIZE,
        allowedMimeTypes: [
          'image/*',
          'video/*',
          'audio/*',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.*',
          'application/vnd.ms-*',
        ],
      });

      if (createError) {
        console.error(`[MediaStorage] Erro ao criar bucket:`, createError);
        return false;
      }

    }

    return true;
  } catch (error) {
    console.error(`[MediaStorage] Erro ao verificar bucket:`, error);
    return false;
  }
}
