/**
 * MetaConversations - Lista de Conversas Meta Messenger & Instagram
 *
 * Features:
 * - Selecionar página/conta para visualizar conversas
 * - Lista de conversas com preview de última mensagem
 * - Filtros: status, pesquisa, não lidas
 * - Marcar como lida, arquivar
 * - Vincular a lead existente
 * - Navegar para chat completo
 * - Real-time updates
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenantContext } from '@/contexts/TenantContext';
import { useMetaPagesMT } from '@/hooks/multitenant/useMetaPagesMT';
import { useMetaConversationsMT } from '@/hooks/multitenant/useMetaConversationsMT';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Facebook,
  Instagram,
  Search,
  MessageSquare,
  Loader2,
  AlertCircle,
  CheckCheck,
  Archive,
  Link as LinkIcon,
  Filter,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function MetaConversations() {
  const navigate = useNavigate();
  const { tenant, franchise } = useTenantContext();

  // State
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);

  // Hooks
  const { pages, isLoading: isLoadingPages } = useMetaPagesMT({ is_active: true });

  const {
    conversations,
    isLoading: isLoadingConversations,
    markAsRead,
    archiveConversation
  } = useMetaConversationsMT(selectedPageId || undefined, {
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: searchTerm || undefined,
    unread: unreadOnly || undefined
  });

  // Derivar página selecionada
  const selectedPage = pages?.find(p => p.id === selectedPageId);

  // Handlers
  const handleSelectPage = (pageId: string) => {
    setSelectedPageId(pageId);
  };

  const handleConversationClick = (conversationId: string) => {
    navigate(`/meta-messenger/chat/${conversationId}`);
  };

  const handleMarkAsRead = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    markAsRead.mutate(conversationId);
  };

  const handleArchive = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    archiveConversation.mutate(conversationId);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setUnreadOnly(false);
  };

  const hasFilters = searchTerm || statusFilter !== 'all' || unreadOnly;
  const isLoading = isLoadingPages || isLoadingConversations;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Conversas - Meta Messenger</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie conversas do Facebook Messenger e Instagram Direct
          </p>
        </div>

        {/* Alert de contexto */}
        {tenant && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Visualizando: <strong>{tenant.nome_fantasia}</strong>
              {franchise && ` - ${franchise.nome}`}
            </AlertDescription>
          </Alert>
        )}

        {/* Seletor de Página */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">
                  Selecione uma página/conta:
                </label>
                <Select value={selectedPageId || undefined} onValueChange={handleSelectPage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha uma página..." />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingPages ? (
                      <div className="p-4 text-center">
                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      </div>
                    ) : pages && pages.length > 0 ? (
                      pages.map((page) => (
                        <SelectItem key={page.id} value={page.id}>
                          <div className="flex items-center gap-2">
                            {page.platform === 'facebook' ? (
                              <Facebook className="h-4 w-4" />
                            ) : (
                              <Instagram className="h-4 w-4" />
                            )}
                            <span>{page.page_name}</span>
                            {page.page_username && (
                              <span className="text-muted-foreground text-xs">
                                @{page.page_username}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-4 text-center text-muted-foreground text-sm">
                        Nenhuma página ativa. Configure em Meta Messenger.
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedPage && (
                <div className="flex items-center gap-2 pt-6">
                  {selectedPage.platform === 'facebook' ? (
                    <Facebook className="h-5 w-5 text-primary" />
                  ) : (
                    <Instagram className="h-5 w-5 text-primary" />
                  )}
                  <Badge variant="outline" className="capitalize">
                    {selectedPage.platform}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Filtros */}
        {selectedPageId && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 flex-wrap">
                {/* Search */}
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="active">Ativas</SelectItem>
                    <SelectItem value="archived">Arquivadas</SelectItem>
                  </SelectContent>
                </Select>

                {/* Unread Only */}
                <Button
                  variant={unreadOnly ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setUnreadOnly(!unreadOnly)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Não Lidas
                </Button>

                {/* Clear Filters */}
                {hasFilters && (
                  <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Limpar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de Conversas */}
        {selectedPageId ? (
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : conversations && conversations.length > 0 ? (
                <div className="divide-y">
                  {conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => handleConversationClick(conversation.id)}
                      className={cn(
                        "p-4 hover:bg-accent cursor-pointer transition-colors",
                        !conversation.is_read && "bg-primary/5"
                      )}
                    >
                      <div className="flex items-start gap-4">
                        {/* Avatar Placeholder */}
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <MessageSquare className="h-6 w-6 text-primary" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className={cn(
                                  "font-medium truncate",
                                  !conversation.is_read && "font-bold"
                                )}>
                                  {conversation.participant_name || 'Participante'}
                                </h4>
                                {conversation.participant_username && (
                                  <span className="text-xs text-muted-foreground">
                                    @{conversation.participant_username}
                                  </span>
                                )}
                              </div>

                              {/* Last Message Preview */}
                              {conversation.last_message_text && (
                                <p className={cn(
                                  "text-sm truncate mt-1",
                                  !conversation.is_read ? "text-foreground font-medium" : "text-muted-foreground"
                                )}>
                                  {conversation.last_message_text}
                                </p>
                              )}

                              {/* Labels */}
                              {conversation.labels && conversation.labels.length > 0 && (
                                <div className="flex gap-1 mt-2">
                                  {conversation.labels.map((label: string) => (
                                    <Badge key={label} variant="secondary" className="text-xs">
                                      {label}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Timestamp & Actions */}
                            <div className="flex flex-col items-end gap-2">
                              {conversation.last_message_at && (
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {formatDistanceToNow(new Date(conversation.last_message_at), {
                                    addSuffix: true,
                                    locale: ptBR
                                  })}
                                </span>
                              )}

                              <div className="flex items-center gap-1">
                                {/* Unread Badge */}
                                {!conversation.is_read && (
                                  <div className="h-2 w-2 rounded-full bg-primary" />
                                )}

                                {/* Mark as Read */}
                                {!conversation.is_read && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => handleMarkAsRead(conversation.id, e)}
                                    disabled={markAsRead.isPending}
                                  >
                                    <CheckCheck className="h-4 w-4" />
                                  </Button>
                                )}

                                {/* Archive */}
                                {conversation.status === 'active' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => handleArchive(conversation.id, e)}
                                    disabled={archiveConversation.isPending}
                                  >
                                    <Archive className="h-4 w-4" />
                                  </Button>
                                )}

                                {/* Link to Lead (if linked) */}
                                {conversation.lead_id && (
                                  <Badge variant="outline" className="gap-1">
                                    <LinkIcon className="h-3 w-3" />
                                    Lead
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma conversa encontrada.</p>
                  {hasFilters && (
                    <Button variant="link" onClick={handleClearFilters} className="mt-2">
                      Limpar filtros
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Facebook className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Selecione uma página acima para ver as conversas.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
