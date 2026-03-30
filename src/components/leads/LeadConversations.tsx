import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLeadConversations } from '@/hooks/useLeadConversations';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MessageCircle,
  ExternalLink,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LeadConversationsProps {
  leadId: string;
  leadPhone?: string;
}

// Tipo alinhado com colunas reais de mt_whatsapp_conversations
interface MTConversation {
  id: string;
  session_id: string;
  chat_id: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_avatar: string | null;
  unread_count: number | null;
  last_message_text: string | null;
  last_message_at: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Join com sessão
  sessao?: {
    id: string;
    session_name: string;
    nome: string;
  };
}

interface MTMessage {
  id: string;
  body: string | null;
  direction?: string;
  from_me?: boolean;
  timestamp?: string;
  created_at: string;
}

interface ConversationCardProps {
  conversation: MTConversation;
  onFetchMessages: (conversaId: string) => Promise<MTMessage[]>;
}

function ConversationCard({ conversation, onFetchMessages }: ConversationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<MTMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const handleToggle = async () => {
    if (!expanded && messages.length === 0) {
      setLoadingMessages(true);
      try {
        const msgs = await onFetchMessages(conversation.id);
        setMessages(msgs);
      } catch (error) {
        console.error('Erro ao buscar mensagens:', error);
      } finally {
        setLoadingMessages(false);
      }
    }
    setExpanded(!expanded);
  };

  const contactInitial = conversation.contact_name?.charAt(0).toUpperCase() || '?';

  return (
    <Card className="overflow-hidden">
      <div
        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={handleToggle}
      >
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={conversation.contact_avatar || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {contactInitial}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium truncate">
                  {conversation.contact_name || conversation.contact_phone || 'Contato'}
                </span>
                {(conversation.unread_count || 0) > 0 && (
                  <Badge variant="default" className="bg-primary text-xs">
                    {conversation.unread_count}
                  </Badge>
                )}
              </div>
              {expanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
            </div>

            {conversation.last_message_text && (
              <p className="text-sm text-muted-foreground truncate mt-1">
                {conversation.last_message_text}
              </p>
            )}

            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              {conversation.last_message_at && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(conversation.last_message_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              )}
              {conversation.sessao?.nome && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {conversation.sessao.nome}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t bg-muted/30">
          {loadingMessages ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : messages.length > 0 ? (
            <ScrollArea className="h-[200px] p-4">
              <div className="space-y-2">
                {messages.slice(-5).map((msg) => {
                  const isOutbound = msg.direction === 'outbound' || msg.from_me === true;
                  return (
                    <div
                      key={msg.id}
                      className={`p-2 rounded-lg text-sm max-w-[85%] ${
                        isOutbound
                          ? 'bg-primary text-primary-foreground ml-auto'
                          : 'bg-background'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.body || '[Midia]'}</p>
                      <span className="text-[10px] opacity-70 block text-right mt-1">
                        {new Date(msg.timestamp || msg.created_at).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <p className="p-4 text-sm text-muted-foreground text-center">
              Nenhuma mensagem encontrada
            </p>
          )}

          <div className="p-3 border-t flex justify-end">
            <Button asChild size="sm" variant="outline">
              <Link
                to={`/whatsapp/conversas/${conversation.session_id}?chat=${conversation.id}`}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir Chat Completo
              </Link>
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export function LeadConversations({ leadId, leadPhone }: LeadConversationsProps) {
  const { conversations, isLoading, error, refetch, fetchMessages, totalUnread } =
    useLeadConversations(leadId, leadPhone);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-9 w-24" />
        </div>
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="py-6 text-center">
          <p className="text-destructive mb-2">Erro ao carregar conversas</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Conversas WhatsApp</h3>
          {totalUnread > 0 && (
            <Badge variant="default" className="bg-primary">
              {totalUnread} nao lida{totalUnread > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {conversations.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">
              Nenhuma conversa encontrada para este lead
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              As conversas aparecerao aqui quando o lead enviar mensagens
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {conversations.map((conversation: any) => (
            <ConversationCard
              key={conversation.id}
              conversation={conversation}
              onFetchMessages={fetchMessages}
            />
          ))}
        </div>
      )}
    </div>
  );
}
