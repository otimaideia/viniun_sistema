// Hook para exportação de histórico de conversas WhatsApp

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type ExportFormat = 'txt' | 'csv' | 'json' | 'html';

export interface ExportOptions {
  conversationId?: string;
  sessionId?: string;
  startDate?: Date;
  endDate?: Date;
  format: ExportFormat;
  includeMedia?: boolean;
}

interface Message {
  id: string;
  body: string;
  from_me: boolean;
  timestamp_waha: string;
  tipo: string;
  media_url?: string;
}

interface Conversation {
  id: string;
  contact_name: string;
  phone_number: string;
  messages?: Message[];
}

/**
 * @deprecated Use useWhatsAppChatAdapter instead. This hook lacks tenant isolation.
 */
export function useExportHistory() {
  const { user } = useAuth();
  const franqueadoId = user?.user_metadata?.franqueado_id;
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  // Buscar mensagens para exportação
  const fetchMessages = useCallback(async (options: ExportOptions): Promise<{ conversation: Conversation; messages: Message[] }[]> => {
    const { conversationId, sessionId, startDate, endDate } = options;

    let conversationsQuery = supabase
      .from('mt_whatsapp_conversations')
      .select('id, contact_name, phone_number, session_id');

    if (conversationId) {
      conversationsQuery = conversationsQuery.eq('id', conversationId);
    } else if (sessionId) {
      conversationsQuery = conversationsQuery.eq('session_id', sessionId);
    } else if (franqueadoId) {
      conversationsQuery = conversationsQuery.eq('franqueado_id', franqueadoId);
    }

    const { data: conversations, error: convError } = await conversationsQuery;

    if (convError) throw convError;
    if (!conversations || conversations.length === 0) return [];

    const results: { conversation: Conversation; messages: Message[] }[] = [];

    for (let i = 0; i < conversations.length; i++) {
      const conv = conversations[i];
      setProgress(Math.round(((i + 1) / conversations.length) * 100));

      let messagesQuery = supabase
        .from('mt_whatsapp_messages')
        .select('id, body, from_me, timestamp_waha, tipo, media_url')
        .eq('conversation_id', conv.id)
        .order('timestamp_waha', { ascending: true });

      if (startDate) {
        messagesQuery = messagesQuery.gte('timestamp_waha', startDate.toISOString());
      }
      if (endDate) {
        messagesQuery = messagesQuery.lte('timestamp_waha', endDate.toISOString());
      }

      const { data: messages, error: msgError } = await messagesQuery;

      if (msgError) {
        console.error(`Erro ao buscar mensagens da conversa ${conv.id}:`, msgError);
        continue;
      }

      if (messages && messages.length > 0) {
        results.push({
          conversation: conv as Conversation,
          messages: messages as Message[]
        });
      }
    }

    return results;
  }, [franqueadoId]);

  // Formatar para TXT
  const formatToTxt = (data: { conversation: Conversation; messages: Message[] }[]): string => {
    let output = '='.repeat(60) + '\n';
    output += 'EXPORTAÇÃO DE HISTÓRICO WHATSAPP - YESLASER\n';
    output += `Data da exportação: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}\n`;
    output += '='.repeat(60) + '\n\n';

    for (const { conversation, messages } of data) {
      output += '-'.repeat(60) + '\n';
      output += `Contato: ${conversation.contact_name || 'Sem nome'}\n`;
      output += `Telefone: ${conversation.phone_number}\n`;
      output += `Total de mensagens: ${messages.length}\n`;
      output += '-'.repeat(60) + '\n\n';

      for (const msg of messages) {
        const time = format(parseISO(msg.timestamp_waha), "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
        const sender = msg.from_me ? 'Você' : (conversation.contact_name || 'Contato');

        output += `[${time}] ${sender}:\n`;

        if (msg.tipo !== 'text') {
          output += `  [${msg.tipo.toUpperCase()}]`;
          if (msg.media_url) {
            output += ` - ${msg.media_url}`;
          }
          output += '\n';
        }

        if (msg.body) {
          output += `  ${msg.body}\n`;
        }

        output += '\n';
      }

      output += '\n';
    }

    return output;
  };

  // Formatar para CSV
  const formatToCsv = (data: { conversation: Conversation; messages: Message[] }[]): string => {
    const headers = ['Data/Hora', 'Contato', 'Telefone', 'Remetente', 'Tipo', 'Mensagem', 'URL da Mídia'];
    let output = headers.join(',') + '\n';

    for (const { conversation, messages } of data) {
      for (const msg of messages) {
        const time = format(parseISO(msg.timestamp_waha), "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
        const sender = msg.from_me ? 'Você' : (conversation.contact_name || 'Contato');

        const row = [
          `"${time}"`,
          `"${(conversation.contact_name || '').replace(/"/g, '""')}"`,
          `"${conversation.phone_number}"`,
          `"${sender.replace(/"/g, '""')}"`,
          `"${msg.tipo}"`,
          `"${(msg.body || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
          `"${msg.media_url || ''}"`
        ];

        output += row.join(',') + '\n';
      }
    }

    return output;
  };

  // Formatar para JSON
  const formatToJson = (data: { conversation: Conversation; messages: Message[] }[]): string => {
    const exportData = {
      exportDate: new Date().toISOString(),
      system: 'YESlaser WhatsApp',
      totalConversations: data.length,
      totalMessages: data.reduce((acc, d) => acc + d.messages.length, 0),
      conversations: data.map(({ conversation, messages }) => ({
        contact: {
          name: conversation.contact_name,
          phone: conversation.phone_number
        },
        messageCount: messages.length,
        messages: messages.map(msg => ({
          timestamp: msg.timestamp_waha,
          from_me: msg.from_me,
          sender: msg.from_me ? 'Você' : conversation.contact_name,
          type: msg.tipo,
          body: msg.body,
          mediaUrl: msg.media_url || null
        }))
      }))
    };

    return JSON.stringify(exportData, null, 2);
  };

  // Formatar para HTML
  const formatToHtml = (data: { conversation: Conversation; messages: Message[] }[]): string => {
    let html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Exportação WhatsApp YESlaser - ${format(new Date(), "dd/MM/yyyy", { locale: ptBR })}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #e5ddd5; padding: 20px; }
    .header { background: #9f1239; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .header h1 { font-size: 24px; margin-bottom: 5px; }
    .header p { font-size: 14px; opacity: 0.8; }
    .conversation { background: white; border-radius: 8px; margin-bottom: 20px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .conversation-header { background: #f0f2f5; padding: 15px; border-bottom: 1px solid #e0e0e0; }
    .conversation-header h2 { font-size: 18px; color: #333; }
    .conversation-header p { font-size: 13px; color: #666; margin-top: 3px; }
    .messages { padding: 15px; background: #ece5dd; }
    .message { max-width: 65%; padding: 8px 12px; border-radius: 8px; margin-bottom: 8px; position: relative; word-wrap: break-word; }
    .message.sent { background: #dcf8c6; margin-left: auto; border-bottom-right-radius: 0; }
    .message.received { background: white; border-bottom-left-radius: 0; }
    .message .sender { font-size: 12px; font-weight: 600; color: #9f1239; margin-bottom: 3px; }
    .message .body { font-size: 14px; color: #303030; line-height: 1.4; }
    .message .time { font-size: 11px; color: #999; text-align: right; margin-top: 4px; }
    .message .media-badge { background: #e0e0e0; padding: 4px 8px; border-radius: 4px; font-size: 12px; color: #666; display: inline-block; margin-bottom: 5px; }
    .stats { background: white; padding: 15px; border-radius: 8px; margin-top: 20px; }
    .stats h3 { font-size: 16px; margin-bottom: 10px; color: #333; }
    .stats p { font-size: 14px; color: #666; margin-bottom: 5px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Exportação de Histórico WhatsApp - YESlaser</h1>
    <p>Data da exportação: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
  </div>
`;

    for (const { conversation, messages } of data) {
      html += `
  <div class="conversation">
    <div class="conversation-header">
      <h2>${conversation.contact_name || 'Sem nome'}</h2>
      <p>${conversation.phone_number} • ${messages.length} mensagens</p>
    </div>
    <div class="messages">
`;

      for (const msg of messages) {
        const time = format(parseISO(msg.timestamp_waha), "HH:mm", { locale: ptBR });
        const date = format(parseISO(msg.timestamp_waha), "dd/MM/yyyy", { locale: ptBR });
        const className = msg.from_me ? 'sent' : 'received';
        const sender = msg.from_me ? '' : `<div class="sender">${conversation.contact_name || 'Contato'}</div>`;

        let bodyContent = '';
        if (msg.tipo !== 'text') {
          bodyContent += `<span class="media-badge">${msg.tipo.toUpperCase()}</span><br>`;
        }
        if (msg.body) {
          bodyContent += msg.body.replace(/\n/g, '<br>').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }

        html += `
      <div class="message ${className}">
        ${sender}
        <div class="body">${bodyContent}</div>
        <div class="time">${date} ${time}</div>
      </div>
`;
      }

      html += `
    </div>
  </div>
`;
    }

    const totalMessages = data.reduce((acc, d) => acc + d.messages.length, 0);

    html += `
  <div class="stats">
    <h3>Estatísticas</h3>
    <p>Total de conversas: ${data.length}</p>
    <p>Total de mensagens: ${totalMessages}</p>
  </div>
</body>
</html>`;

    return html;
  };

  // Função principal de exportação
  const exportHistory = useCallback(async (options: ExportOptions) => {
    setIsExporting(true);
    setProgress(0);

    try {
      toast.info('Iniciando exportação...');

      const data = await fetchMessages(options);

      if (data.length === 0) {
        toast.warning('Nenhuma mensagem encontrada para exportar');
        return null;
      }

      let content: string;
      let mimeType: string;
      let extension: string;

      switch (options.format) {
        case 'txt':
          content = formatToTxt(data);
          mimeType = 'text/plain';
          extension = 'txt';
          break;
        case 'csv':
          content = formatToCsv(data);
          mimeType = 'text/csv';
          extension = 'csv';
          break;
        case 'json':
          content = formatToJson(data);
          mimeType = 'application/json';
          extension = 'json';
          break;
        case 'html':
          content = formatToHtml(data);
          mimeType = 'text/html';
          extension = 'html';
          break;
        default:
          throw new Error('Formato não suportado');
      }

      // Criar e baixar arquivo
      const blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `yeslaser-whatsapp-export-${format(new Date(), 'yyyy-MM-dd-HHmm')}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const totalMessages = data.reduce((acc, d) => acc + d.messages.length, 0);
      toast.success(`Exportação concluída! ${data.length} conversas, ${totalMessages} mensagens`);

      return { conversations: data.length, messages: totalMessages };
    } catch (error) {
      console.error('Erro na exportação:', error);
      toast.error('Erro ao exportar histórico');
      throw error;
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  }, [fetchMessages]);

  return {
    exportHistory,
    isExporting,
    progress
  };
}

export default useExportHistory;
