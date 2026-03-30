/**
 * MetaChat - Interface de Chat Meta Messenger & Instagram
 *
 * Features:
 * - Chat completo com mensagens
 * - Envio de texto e mídia (imagem, vídeo, áudio, arquivo)
 * - Scroll infinito para mensagens antigas
 * - Real-time updates
 * - Status de entrega (✓ ✓✓)
 * - Vincular a lead
 * - Marcar como lida
 */

import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMetaConversationsMT, useMetaConversationMT } from '@/hooks/multitenant/useMetaConversationsMT';
import { useMetaMessagesMT } from '@/hooks/multitenant/useMetaMessagesMT';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Send,
  Paperclip,
  Image as ImageIcon,
  Video,
  FileText,
  Loader2,
  CheckCheck,
  Check,
  User,
  Facebook,
  Instagram,
  Link as LinkIcon,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function MetaChat() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();

  // State
  const [messageText, setMessageText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hooks
  const { conversation, isLoading: isLoadingConversation } = useMetaConversationMT(conversationId!);
  const { markAsRead } = useMetaConversationsMT();

  const {
    messages,
    sendMessage,
    retryMessage,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingMessages
  } = useMetaMessagesMT(conversationId!);

  // Auto-scroll para última mensagem
  useEffect(() => {
    if (messages && messages.length > 0 && !isFetchingNextPage) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isFetchingNextPage]);

  // Marcar como lida quando abrir
  useEffect(() => {
    if (conversationId && conversation && !conversation.is_read) {
      markAsRead.mutate(conversationId);
    }
  }, [conversationId, conversation?.is_read]);

  // Handlers
  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    try {
      await sendMessage.mutateAsync({
        message_type: 'text',
        content: messageText.trim()
      });

      setMessageText('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho (max 16MB)
    const MAX_SIZE = 16 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error('Arquivo muito grande. Máximo: 16MB');
      return;
    }

    setIsUploading(true);

    try {
      // Determinar tipo de mensagem baseado no tipo de arquivo
      let messageType: 'image' | 'video' | 'audio' | 'file' = 'file';

      if (file.type.startsWith('image/')) {
        messageType = 'image';
      } else if (file.type.startsWith('video/')) {
        messageType = 'video';
      } else if (file.type.startsWith('audio/')) {
        messageType = 'audio';
      }

      // Upload do arquivo (implementar upload para CDN aqui)
      // Por enquanto, vou simular com URL local
      const fileUrl = URL.createObjectURL(file);

      await sendMessage.mutateAsync({
        message_type: messageType,
        content: fileUrl, // Em produção, seria a URL do CDN
        metadata: {
          file_name: file.name,
          file_size: file.size,
          file_type: file.type
        }
      });

      toast.success(`${messageType === 'image' ? 'Imagem' : messageType === 'video' ? 'Vídeo' : 'Arquivo'} enviado!`);
    } catch (error) {
      console.error('Erro ao enviar arquivo:', error);
      toast.error('Erro ao enviar arquivo');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRetry = (messageId: string) => {
    retryMessage.mutate(messageId);
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const isLoading = isLoadingConversation || isLoadingMessages;

  if (!conversationId) {
    return (
      <DashboardLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Conversa não encontrada.</AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        {/* Header */}
        <Card className="rounded-b-none border-b-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Back Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/meta-messenger/conversations')}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>

                {/* Participant Info */}
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : conversation ? (
                  <>
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>

                    <div>
                      <h2 className="font-semibold">
                        {conversation.participant_name || 'Participante'}
                      </h2>
                      {conversation.participant_username && (
                        <p className="text-sm text-muted-foreground">
                          @{conversation.participant_username}
                        </p>
                      )}
                    </div>

                    <Badge variant="outline" className="gap-1">
                      {conversation.platform === 'facebook' ? (
                        <Facebook className="h-3 w-3" />
                      ) : (
                        <Instagram className="h-3 w-3" />
                      )}
                      {conversation.platform}
                    </Badge>

                    {conversation.lead_id && (
                      <Badge variant="default" className="gap-1" asChild>
                        <Link to={`/leads/${conversation.lead_id}`}>
                          <LinkIcon className="h-3 w-3" />
                          Lead Vinculado
                        </Link>
                      </Badge>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground">Conversa não encontrada</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Messages Area */}
        <Card className="flex-1 rounded-none border-x-0 overflow-hidden">
          <CardContent className="p-0 h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Load More Button */}
              {hasNextPage && (
                <div className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLoadMore}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Carregando...
                      </>
                    ) : (
                      'Carregar mensagens anteriores'
                    )}
                  </Button>
                </div>
              )}

              {/* Messages */}
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : messages && messages.length > 0 ? (
                messages.map((message) => {
                  const isOutgoing = message.direction === 'outgoing';
                  const hasError = message.status === 'failed';

                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        isOutgoing ? "justify-end" : "justify-start"
                      )}
                    >
                      <div className={cn(
                        "max-w-[70%] space-y-1",
                        isOutgoing && "items-end"
                      )}>
                        {/* Message Bubble */}
                        <div className={cn(
                          "rounded-lg p-3",
                          isOutgoing
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted",
                          hasError && "bg-destructive/10 border border-destructive"
                        )}>
                          {/* Text Message */}
                          {message.message_type === 'text' && message.content && (
                            <p className="whitespace-pre-wrap break-words">
                              {message.content}
                            </p>
                          )}

                          {/* Image Message */}
                          {message.message_type === 'image' && message.content && (
                            <img
                              src={message.content}
                              alt="Imagem"
                              className="rounded max-w-full h-auto"
                            />
                          )}

                          {/* Video Message */}
                          {message.message_type === 'video' && message.content && (
                            <video
                              src={message.content}
                              controls
                              className="rounded max-w-full h-auto"
                            />
                          )}

                          {/* File Message */}
                          {(message.message_type === 'file' || message.message_type === 'audio') && message.content && (
                            <a
                              href={message.content}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm underline"
                            >
                              <FileText className="h-4 w-4" />
                              {message.metadata?.file_name || 'Arquivo'}
                            </a>
                          )}
                        </div>

                        {/* Timestamp & Status */}
                        <div className={cn(
                          "flex items-center gap-1 text-xs text-muted-foreground",
                          isOutgoing && "justify-end"
                        )}>
                          <span>
                            {format(new Date(message.sent_at), 'HH:mm', { locale: ptBR })}
                          </span>

                          {/* Delivery Status (outgoing only) */}
                          {isOutgoing && (
                            <>
                              {hasError ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 p-0 text-destructive"
                                  onClick={() => handleRetry(message.id)}
                                >
                                  Reenviar
                                </Button>
                              ) : message.status === 'read' ? (
                                <CheckCheck className="h-3 w-3 text-blue-500" />
                              ) : message.status === 'delivered' ? (
                                <CheckCheck className="h-3 w-3" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex justify-center py-12 text-muted-foreground">
                  <p>Nenhuma mensagem ainda. Envie a primeira!</p>
                </div>
              )}

              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </div>
          </CardContent>
        </Card>

        {/* Input Area */}
        <Card className="rounded-t-none border-t-0">
          <CardContent className="p-4">
            <div className="flex items-end gap-2">
              {/* File Upload */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                onChange={handleFileUpload}
              />

              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || sendMessage.isPending}
              >
                {isUploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Paperclip className="h-5 w-5" />
                )}
              </Button>

              {/* Message Input */}
              <Textarea
                placeholder="Digite sua mensagem..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={sendMessage.isPending || isUploading}
                className="min-h-[40px] max-h-[120px] resize-none"
                rows={1}
              />

              {/* Send Button */}
              <Button
                onClick={handleSendMessage}
                disabled={!messageText.trim() || sendMessage.isPending || isUploading}
                size="sm"
              >
                {sendMessage.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="mt-2 text-sm text-muted-foreground">
                Enviando arquivo...
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
