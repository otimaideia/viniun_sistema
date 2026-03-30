/**
 * MetaMessengerConfig - Configuração Meta Messenger & Instagram
 *
 * Features:
 * - Conectar contas Facebook/Instagram via OAuth
 * - Listar contas conectadas
 * - Gerenciar páginas FB e contas IG Business
 * - Ativar/desativar páginas
 * - Sincronizar conversas
 * - Configurar webhook
 */

import { useState } from 'react';
import { useTenantContext } from '@/contexts/TenantContext';
import { useMetaAccountsMT } from '@/hooks/multitenant/useMetaAccountsMT';
import { useMetaPagesMT } from '@/hooks/multitenant/useMetaPagesMT';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Facebook,
  Instagram,
  Plus,
  RefreshCw,
  Power,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Zap,
  Calendar,
  Link as LinkIcon
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function MetaMessengerConfig() {
  const { tenant, franchise, accessLevel } = useTenantContext();
  const [deleteAccountId, setDeleteAccountId] = useState<string | null>(null);
  const [deletePageId, setDeletePageId] = useState<string | null>(null);

  // Hooks
  const {
    accounts,
    isLoading: isLoadingAccounts,
    startOAuthFlow,
    refreshToken,
    disconnectAccount,
    isTokenExpiringSoon,
    daysUntilExpiry
  } = useMetaAccountsMT();

  const {
    pages,
    isLoading: isLoadingPages,
    togglePageActive,
    syncPage,
    subscribeWebhook,
    removePage
  } = useMetaPagesMT();

  // Handlers
  const handleConnectFacebook = () => {
    startOAuthFlow('facebook');
    toast.info('Abrindo janela de autenticação do Facebook...');
  };

  const handleConnectInstagram = () => {
    startOAuthFlow('instagram');
    toast.info('Abrindo janela de autenticação do Instagram...');
  };

  const handleRefreshToken = (accountId: string) => {
    refreshToken.mutate(accountId);
  };

  const handleDisconnectAccount = () => {
    if (deleteAccountId) {
      disconnectAccount.mutate(deleteAccountId, {
        onSuccess: () => {
          setDeleteAccountId(null);
        }
      });
    }
  };

  const handleTogglePage = (pageId: string, currentStatus: boolean) => {
    togglePageActive.mutate({ id: pageId, is_active: !currentStatus });
  };

  const handleSyncPage = (pageId: string) => {
    syncPage.mutate(pageId);
  };

  const handleSubscribeWebhook = (pageId: string) => {
    subscribeWebhook.mutate(pageId);
  };

  const handleRemovePage = () => {
    if (deletePageId) {
      removePage.mutate(deletePageId, {
        onSuccess: () => {
          setDeletePageId(null);
        }
      });
    }
  };

  const isLoading = isLoadingAccounts || isLoadingPages;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Meta Messenger & Instagram</h1>
          <p className="text-muted-foreground mt-2">
            Conecte suas contas do Facebook e Instagram para gerenciar conversas e criar leads automaticamente
          </p>
        </div>

        {/* Alert de contexto */}
        {tenant && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Configurando para: <strong>{tenant.nome_fantasia}</strong>
              {franchise && ` - ${franchise.nome}`}
            </AlertDescription>
          </Alert>
        )}

        {/* Botões de Conexão */}
        <Card>
          <CardHeader>
            <CardTitle>Conectar Nova Conta</CardTitle>
            <CardDescription>
              Conecte uma conta do Facebook ou Instagram para começar a receber mensagens
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button
              onClick={handleConnectFacebook}
              className="flex items-center gap-2"
              variant="default"
            >
              <Facebook className="h-5 w-5" />
              Conectar Facebook
            </Button>
            <Button
              onClick={handleConnectInstagram}
              className="flex items-center gap-2"
              variant="outline"
            >
              <Instagram className="h-5 w-5" />
              Conectar Instagram
            </Button>
          </CardContent>
        </Card>

        {/* Tabs: Contas e Páginas */}
        <Tabs defaultValue="accounts" className="space-y-6">
          <TabsList>
            <TabsTrigger value="accounts">
              Contas Conectadas ({accounts?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="pages">
              Páginas/Contas ({pages?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Tab: Contas */}
          <TabsContent value="accounts" className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : accounts && accounts.length > 0 ? (
              accounts.map((account) => {
                const expiringSoon = isTokenExpiringSoon(account);
                const daysLeft = daysUntilExpiry(account);

                return (
                  <Card key={account.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          {/* Ícone */}
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            {account.platform === 'facebook' ? (
                              <Facebook className="h-6 w-6 text-primary" />
                            ) : (
                              <Instagram className="h-6 w-6 text-primary" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{account.user_name}</h3>
                              <Badge variant={account.is_active ? 'default' : 'secondary'}>
                                {account.is_active ? 'Ativa' : 'Inativa'}
                              </Badge>
                              <Badge variant="outline" className="capitalize">
                                {account.platform}
                              </Badge>
                            </div>

                            {account.user_email && (
                              <p className="text-sm text-muted-foreground">{account.user_email}</p>
                            )}

                            {/* Token Expiration */}
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-3 w-3" />
                              <span className={expiringSoon ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                                Token expira em {daysLeft} dias
                                {expiringSoon && ' ⚠️'}
                              </span>
                            </div>

                            {account.last_sync_at && (
                              <p className="text-xs text-muted-foreground">
                                Última sincronização: {formatDistanceToNow(new Date(account.last_sync_at), {
                                  addSuffix: true,
                                  locale: ptBR
                                })}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {expiringSoon && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRefreshToken(account.id)}
                              disabled={refreshToken.isPending}
                            >
                              {refreshToken.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                              Renovar Token
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteAccountId(account.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Facebook className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma conta conectada ainda.</p>
                  <p className="text-sm">Clique nos botões acima para conectar.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab: Páginas */}
          <TabsContent value="pages" className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : pages && pages.length > 0 ? (
              pages.map((page) => (
                <Card key={page.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        {/* Ícone */}
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          {page.platform === 'facebook' ? (
                            <Facebook className="h-6 w-6 text-primary" />
                          ) : (
                            <Instagram className="h-6 w-6 text-primary" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{page.page_name}</h3>
                            <Badge variant={page.is_active ? 'default' : 'secondary'}>
                              {page.is_active ? 'Ativa' : 'Inativa'}
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                              {page.platform}
                            </Badge>
                            {page.webhook_subscribed && (
                              <Badge variant="default" className="gap-1">
                                <Zap className="h-3 w-3" />
                                Webhook Ativo
                              </Badge>
                            )}
                          </div>

                          {page.page_username && (
                            <p className="text-sm text-muted-foreground">@{page.page_username}</p>
                          )}

                          {page.page_category && (
                            <p className="text-xs text-muted-foreground">{page.page_category}</p>
                          )}

                          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                            {page.last_sync_at && (
                              <span>
                                Sincronizado: {formatDistanceToNow(new Date(page.last_sync_at), {
                                  addSuffix: true,
                                  locale: ptBR
                                })}
                              </span>
                            )}
                            {page.last_webhook_at && (
                              <span>
                                Último webhook: {formatDistanceToNow(new Date(page.last_webhook_at), {
                                  addSuffix: true,
                                  locale: ptBR
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTogglePage(page.id, page.is_active)}
                          disabled={togglePageActive.isPending}
                        >
                          {page.is_active ? (
                            <>
                              <Power className="h-4 w-4 mr-1" />
                              Desativar
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Ativar
                            </>
                          )}
                        </Button>

                        {page.is_active && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSyncPage(page.id)}
                              disabled={syncPage.isPending}
                            >
                              {syncPage.isPending ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4 mr-1" />
                              )}
                              Sincronizar
                            </Button>

                            {!page.webhook_subscribed && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleSubscribeWebhook(page.id)}
                                disabled={subscribeWebhook.isPending}
                              >
                                {subscribeWebhook.isPending ? (
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                ) : (
                                  <LinkIcon className="h-4 w-4 mr-1" />
                                )}
                                Ativar Webhook
                              </Button>
                            )}
                          </>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletePageId(page.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Instagram className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma página conectada ainda.</p>
                  <p className="text-sm">Conecte uma conta acima para ver suas páginas.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Alert Dialog: Desconectar Conta */}
        <AlertDialog open={!!deleteAccountId} onOpenChange={() => setDeleteAccountId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Desconectar Conta</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja desconectar esta conta? Todas as páginas vinculadas serão desativadas
                e você não receberá mais mensagens.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDisconnectAccount}>
                Desconectar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Alert Dialog: Remover Página */}
        <AlertDialog open={!!deletePageId} onOpenChange={() => setDeletePageId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover Página</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover esta página? Você não receberá mais mensagens dela.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleRemovePage}>
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
