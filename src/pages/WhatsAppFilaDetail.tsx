// Página: Detalhes da Fila WhatsApp

import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Users, TrendingUp, Clock, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useWhatsAppQueueMT } from '@/hooks/multitenant/useWhatsAppQueuesMT';
import { useWhatsAppQueueUsersMT } from '@/hooks/multitenant/useWhatsAppQueueUsersMT';
import { formatWaitTime, getStatusColor, getStatusLabel, getDistributionTypeLabel } from '@/types/whatsapp-queue';

export default function WhatsAppFilaDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { queue, isLoading } = useWhatsAppQueueMT(id);
  const { queueUsers } = useWhatsAppQueueUsersMT({ queue_id: id, is_active: true });

  if (isLoading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  if (!queue) {
    return <div className="text-center p-8"><p>Fila não encontrada</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/whatsapp/filas')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: queue.cor }} />
              <h1 className="text-3xl font-bold">{queue.nome}</h1>
              {queue.is_default && <Badge variant="secondary">Padrão</Badge>}
              {!queue.is_active && <Badge variant="destructive">Inativa</Badge>}
            </div>
            <p className="text-muted-foreground mt-1">{queue.descricao}</p>
          </div>
        </div>
        <Button asChild>
          <Link to={`/whatsapp/filas/${queue.id}/editar`}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Link>
        </Button>
      </div>

      {/* Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversas Totais</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{queue.total_conversations}</div>
            <p className="text-xs text-muted-foreground">Desde criação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolvidas</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{queue.total_resolved}</div>
            <p className="text-xs text-muted-foreground">
              {queue.total_conversations > 0 ? Math.round((queue.total_resolved / queue.total_conversations) * 100) : 0}% taxa resolução
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio Espera</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatWaitTime(queue.avg_wait_time_seconds)}</div>
            <p className="text-xs text-muted-foreground">SLA: {queue.first_response_sla_minutes}min</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atendentes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{queueUsers?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Ativos na fila</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="config" className="w-full">
        <TabsList>
          <TabsTrigger value="config">Configuração</TabsTrigger>
          <TabsTrigger value="agents">Atendentes ({queueUsers?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Configurações Gerais</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-muted-foreground">Código:</span> <span className="font-medium">{queue.codigo}</span></div>
                <div><span className="text-muted-foreground">Distribuição:</span> <span className="font-medium">{getDistributionTypeLabel(queue.distribution_type)}</span></div>
                <div><span className="text-muted-foreground">Max Simultâneas/Atendente:</span> <span className="font-medium">{queue.max_concurrent_per_user}</span></div>
                <div><span className="text-muted-foreground">Atribuição Automática:</span> <Badge variant={queue.auto_assign ? 'default' : 'secondary'}>{queue.auto_assign ? 'Sim' : 'Não'}</Badge></div>
                <div><span className="text-muted-foreground">SLA 1ª Resposta:</span> <span className="font-medium">{queue.first_response_sla_minutes} min</span></div>
                <div><span className="text-muted-foreground">SLA Resolução:</span> <span className="font-medium">{queue.resolution_sla_minutes} min</span></div>
              </div>
            </CardContent>
          </Card>

          {queue.welcome_message && (
            <Card>
              <CardHeader><CardTitle>Mensagem de Boas-Vindas</CardTitle></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap">{queue.welcome_message}</p></CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          {queueUsers && queueUsers.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {queueUsers.map(qu => (
                <Card key={qu.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={qu.user?.avatar_url || undefined} />
                        <AvatarFallback>{qu.user?.nome?.[0] || '?'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-medium">{qu.user?.nome}</div>
                        <div className="text-sm text-muted-foreground">{qu.user?.email}</div>
                      </div>
                      <Badge className={getStatusColor(qu.status)}>{getStatusLabel(qu.status)}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-4 text-center text-sm">
                      <div><div className="font-bold">{qu.current_conversations}</div><div className="text-muted-foreground">Atual</div></div>
                      <div><div className="font-bold">{qu.max_concurrent}</div><div className="text-muted-foreground">Máx</div></div>
                      <div><div className="font-bold">{qu.total_resolved}</div><div className="text-muted-foreground">Resolv</div></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card><CardContent className="text-center py-12 text-muted-foreground">Nenhum atendente nesta fila</CardContent></Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
