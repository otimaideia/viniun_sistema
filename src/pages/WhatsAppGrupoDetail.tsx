// Pagina: Detalhes de Grupo WhatsApp Multi-Tenant

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Shield,
  ShieldCheck,
  Trash2,
  UserPlus,
  RefreshCw,
  AlertCircle,
  Copy,
  LinkIcon,
  Calendar,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useGroupsMT, useGroupInfoMT } from '@/hooks/multitenant/useGroupsMT';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function WhatsAppGrupoDetail() {
  const navigate = useNavigate();
  const { groupId: encodedGroupId } = useParams<{ groupId: string }>();
  const [searchParams] = useSearchParams();
  const sessionName = searchParams.get('session') || undefined;
  const sessionId = searchParams.get('sessionId') || undefined;

  const groupId = encodedGroupId ? decodeURIComponent(encodedGroupId) : undefined;

  const { tenant, franchise, accessLevel } = useTenantContext();

  // Usar hook de info individual com cache
  const {
    group,
    participants,
    isLoading,
    error,
    refetch,
  } = useGroupInfoMT(sessionName, groupId, sessionId);

  // Hook para mutations (removeParticipants, getInviteLink)
  const {
    removeParticipants,
    getInviteLink,
    isRemovingParticipants,
  } = useGroupsMT(sessionName, sessionId);

  const [participantToRemove, setParticipantToRemove] = useState<string | null>(null);

  // Extrair telefone real do participante (preferir phoneNumber sobre id @lid)
  const getPhoneFromParticipant = (p: { id: string; phoneNumber?: string }) => {
    const pid = typeof p.id === 'string' ? p.id : String(p.id || '');
    const pPhone = typeof p.phoneNumber === 'string' ? p.phoneNumber : '';
    // phoneNumber vem como "5511999999999@s.whatsapp.net"
    const source = pPhone || (pid.includes('@lid') ? '' : pid);
    const raw = source.replace(/@.*$/, '').replace(/\D/g, '');
    return raw.length > 10 ? raw.slice(-11) : raw.slice(-10);
  };

  // Buscar leads correspondentes aos participantes pelo telefone
  const participantPhones = participants.map(getPhoneFromParticipant).filter(Boolean);

  const { data: matchedLeads } = useQuery({
    queryKey: ['group-participants-leads', groupId, participantPhones.length, tenant?.id],
    queryFn: async () => {
      if (participantPhones.length === 0) return {};
      // Buscar leads por telefone (ultimos 10-11 digitos)
      let query = supabase
        .from('mt_leads')
        .select('id, nome, sobrenome, telefone, whatsapp, email, temperatura, status')
        .or(participantPhones.map(p => `telefone.ilike.%${p},whatsapp.ilike.%${p}`).join(','));

      if (accessLevel === 'tenant' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        query = query.eq('franchise_id', franchise.id);
      }

      const { data } = await query.limit(500);

      // Mapear por ultimos 10 digitos do telefone
      const map: Record<string, any> = {};
      for (const lead of data || []) {
        const phone = (lead.whatsapp || lead.telefone || '').replace(/\D/g, '');
        const key = phone.length > 10 ? phone.slice(-11) : phone.slice(-10);
        if (key) map[key] = lead;
      }
      return map;
    },
    enabled: participants.length > 0,
    staleTime: 60_000,
  });

  // Helper: buscar lead de um participante
  const getLeadForParticipant = (participant: { id: string; phoneNumber?: string }) => {
    if (!matchedLeads) return null;
    const key = getPhoneFromParticipant(participant);
    return key ? matchedLeads[key] || null : null;
  };

  // Remover participante
  const handleRemoveParticipant = async () => {
    if (!participantToRemove || !groupId) return;

    try {
      await removeParticipants.mutateAsync({
        groupId,
        participants: [participantToRemove],
      });
      setParticipantToRemove(null);
      refetch();
    } catch {
      // toast de erro ja exibido pelo hook
    }
  };

  // Copiar ID do grupo
  const handleCopyId = () => {
    if (groupId) {
      navigator.clipboard.writeText(groupId).then(
        () => toast.success('ID copiado para a area de transferencia'),
        () => toast.error('Nao foi possivel copiar')
      );
    }
  };

  // Gerar link de convite
  const handleGetInviteLink = async () => {
    if (!groupId) return;
    try {
      const link = await getInviteLink.mutateAsync(groupId);
      toast.success('Link de convite copiado!');
    } catch {
      // erro tratado pelo hook
    }
  };

  // Formatar data de criacao
  const formatDate = (timestamp: number | undefined) => {
    if (!timestamp) return '-';
    try {
      return new Date(timestamp * 1000).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  // Extrair telefone do JID ou phoneNumber
  const formatPhone = (participant: { id: string; phoneNumber?: string }) => {
    const pid = typeof participant.id === 'string' ? participant.id : String(participant.id || '');
    const pPhone = typeof participant.phoneNumber === 'string' ? participant.phoneNumber : '';
    const source = pPhone || pid;
    const phone = source.replace(/@.*$/, '').replace(/\D/g, '');
    if (phone.length >= 12) {
      // Formato BR: +55 (11) 99999-9999
      return `+${phone.slice(0, 2)} (${phone.slice(2, 4)}) ${phone.slice(4, 9)}-${phone.slice(9)}`;
    }
    if (phone.length >= 10) {
      return phone;
    }
    // LID sem phoneNumber - mostrar id original
    return pid.replace(/@.*$/, '');
  };

  // Loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando dados do grupo...</p>
        </div>
      </div>
    );
  }

  // Erro
  if (error && !group) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/whatsapp/grupos')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertCircle className="h-12 w-12 text-destructive/50 mb-4" />
          <h3 className="text-lg font-medium">Erro ao carregar grupo</h3>
          <p className="text-muted-foreground mt-1 max-w-md">
            {(error as Error).message || 'Nao foi possivel carregar os dados do grupo.'}
          </p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  // Grupo nao encontrado
  if (!group && !isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/whatsapp/grupos')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">Grupo nao encontrado</h3>
          <p className="text-muted-foreground mt-1">
            O grupo solicitado nao existe ou voce nao tem acesso.
          </p>
        </div>
      </div>
    );
  }

  const adminCount = participants.filter((p) => p.isAdmin || p.isSuperAdmin).length;

  return (
    <div className="space-y-6">
      {/* Header com botao voltar */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/whatsapp/grupos')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{group?.subject || 'Grupo sem nome'}</h1>
            <Badge variant="secondary">
              <Users className="h-3 w-3 mr-1" />
              {participants.length} membros
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 font-mono text-sm">{groupId}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button
            asChild
          >
            <Link
              to={`/whatsapp/grupos/adicionar?group=${encodeURIComponent(groupId || '')}&session=${sessionName || ''}`}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Adicionar Membros
            </Link>
          </Button>
        </div>
      </div>

      {/* Card de informacoes do grupo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-5 w-5" />
            Informacoes do Grupo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">ID do Grupo</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <code className="text-sm bg-muted px-2 py-1 rounded">{groupId}</code>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyId}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Nome (Subject)</p>
                <p className="text-sm mt-0.5">{group?.subject || '-'}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Criado em</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-sm">{formatDate(group?.creation)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Descricao</p>
                <p className="text-sm mt-0.5 whitespace-pre-wrap">
                  {group?.description || 'Sem descricao'}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Dono (Owner)</p>
                <p className="text-sm mt-0.5 font-mono">
                  {group?.owner ? formatPhone({ id: group.owner }) : '-'}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Estatisticas</p>
                <div className="flex gap-2 mt-0.5">
                  <Badge variant="outline">{participants.length} membros</Badge>
                  <Badge variant="outline">{adminCount} admin{adminCount !== 1 ? 's' : ''}</Badge>
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleGetInviteLink}>
              <LinkIcon className="h-4 w-4 mr-2" />
              Link de Convite
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de participantes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Participantes</CardTitle>
              <CardDescription>
                {participants.length} membro{participants.length !== 1 ? 's' : ''} no grupo
              </CardDescription>
            </div>
            <Button
              asChild
              size="sm"
            >
              <Link
                to={`/whatsapp/grupos/adicionar?group=${encodeURIComponent(groupId || '')}&session=${sessionName || ''}`}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Adicionar
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {participants.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-muted-foreground">Nenhum participante encontrado</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contato</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Funcao</TableHead>
                    <TableHead className="w-[80px] text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participants.map((participant, idx) => {
                    const lead = getLeadForParticipant(participant);
                    const initials = lead?.nome ? lead.nome.substring(0, 2).toUpperCase() : '?';
                    const safeId = typeof participant.id === 'string' ? participant.id : String(participant.id || idx);
                    return (
                    <TableRow key={safeId}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className={lead ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-medium">
                              {lead ? `${lead.nome}${lead.sobrenome ? ' ' + lead.sobrenome : ''}` : 'Nao cadastrado'}
                            </span>
                            {lead?.email && (
                              <p className="text-xs text-muted-foreground">{lead.email}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{formatPhone(participant)}</span>
                      </TableCell>
                      <TableCell>
                        {lead ? (
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Lead</Badge>
                            {lead.temperatura && (
                              <Badge variant="outline" className={
                                lead.temperatura === 'quente' ? 'bg-red-50 text-red-600 border-red-200' :
                                lead.temperatura === 'morno' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                                'bg-blue-50 text-blue-600 border-blue-200'
                              }>
                                {lead.temperatura}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">Sem cadastro</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {participant.isSuperAdmin ? (
                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            Super Admin
                          </Badge>
                        ) : participant.isAdmin ? (
                          <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">
                            <Shield className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="outline">Membro</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!participant.isSuperAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setParticipantToRemove(safeId)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover participante?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Voce tem certeza que deseja remover{' '}
                                  <strong>{formatPhone(participant)}</strong> do grupo{' '}
                                  <strong>{group?.subject}</strong>?
                                  <br />
                                  Esta acao nao pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setParticipantToRemove(null)}>
                                  Cancelar
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={handleRemoveParticipant}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  disabled={isRemovingParticipants}
                                >
                                  {isRemovingParticipants ? 'Removendo...' : 'Remover'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ); })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
