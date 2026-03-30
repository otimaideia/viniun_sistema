import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sanitizeObjectForJSON } from '@/utils/unicodeSanitizer';

type ExportFormat = 'json' | 'csv' | 'txt';

interface ExportOptions {
  format: ExportFormat;
  includeMedia?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

interface Message {
  id: string;
  content: string;
  from_me: boolean;
  timestamp: string;
  tipo: string;
  status: string;
}

/**
 * Hook para exportar histórico de conversas do WhatsApp
 */
export function useExportHistory(conversaId: string | undefined) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const fetchMessages = async (options?: ExportOptions): Promise<Message[]> => {
    if (!conversaId) return [];

    let query = supabase
      .from('mt_whatsapp_messages')
      .select('id, content, from_me, timestamp, tipo, status')
      .eq('conversa_id', conversaId)
      .order('timestamp', { ascending: true });

    if (options?.dateRange) {
      query = query
        .gte('timestamp', options.dateRange.start)
        .lte('timestamp', options.dateRange.end);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as Message[];
  };

  const formatToJSON = (messages: Message[]): string => {
    // Sanitizar mensagens para prevenir erros com caracteres Unicode inválidos
    const sanitizedMessages = sanitizeObjectForJSON(messages);
    return JSON.stringify(sanitizedMessages, null, 2);
  };

  const formatToCSV = (messages: Message[]): string => {
    const headers = ['ID', 'Data/Hora', 'Remetente', 'Tipo', 'Conteúdo', 'Status'];
    const rows = messages.map(m => [
      m.id,
      m.timestamp,
      m.from_me ? 'Você' : 'Contato',
      m.tipo || 'text',
      `"${(m.content || '').replace(/"/g, '""')}"`,
      m.status,
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  };

  const formatToTXT = (messages: Message[]): string => {
    return messages
      .map(m => {
        const date = new Date(m.timestamp).toLocaleString('pt-BR');
        const sender = m.from_me ? 'Você' : 'Contato';
        return `[${date}] ${sender}: ${m.content || '(mídia)'}`;
      })
      .join('\n');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportHistory = async (options: ExportOptions = { format: 'txt' }) => {
    if (!conversaId) {
      toast.error('Conversa não selecionada');
      return;
    }

    setIsExporting(true);
    setProgress(10);

    try {
      // Buscar mensagens
      setProgress(30);
      const messages = await fetchMessages(options);

      if (messages.length === 0) {
        toast.error('Nenhuma mensagem para exportar');
        return;
      }

      setProgress(60);

      // Formatar conteúdo
      let content: string;
      let filename: string;
      let mimeType: string;
      const timestamp = new Date().toISOString().slice(0, 10);

      switch (options.format) {
        case 'json':
          content = formatToJSON(messages);
          filename = `whatsapp-export-${timestamp}.json`;
          mimeType = 'application/json';
          break;
        case 'csv':
          content = formatToCSV(messages);
          filename = `whatsapp-export-${timestamp}.csv`;
          mimeType = 'text/csv';
          break;
        case 'txt':
        default:
          content = formatToTXT(messages);
          filename = `whatsapp-export-${timestamp}.txt`;
          mimeType = 'text/plain';
      }

      setProgress(80);

      // Download
      downloadFile(content, filename, mimeType);

      setProgress(100);
      toast.success(`Histórico exportado! ${messages.length} mensagens`);
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error('Erro ao exportar histórico');
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  };

  const exportAsJSON = (options?: Omit<ExportOptions, 'format'>) => {
    return exportHistory({ ...options, format: 'json' });
  };

  const exportAsCSV = (options?: Omit<ExportOptions, 'format'>) => {
    return exportHistory({ ...options, format: 'csv' });
  };

  const exportAsTXT = (options?: Omit<ExportOptions, 'format'>) => {
    return exportHistory({ ...options, format: 'txt' });
  };

  return {
    exportHistory,
    exportAsJSON,
    exportAsCSV,
    exportAsTXT,
    isExporting,
    progress,
  };
}

export default useExportHistory;
