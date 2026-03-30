// Página: Detalhes da Lista de Destinatários (Broadcast List Detail)

import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Users,
  CheckCircle2,
  XCircle,
  Ban,
  Search,
  ChevronLeft,
  ChevronRight,
  UserMinus,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
} from '@/components/ui/alert-dialog';
import { useBroadcastListsMT, useRecipientsByList } from '@/hooks/multitenant/useBroadcastListsMT';
import { useTenantContext } from '@/contexts/TenantContext';
import type { BroadcastListSourceType } from '@/hooks/multitenant/useBroadcastListsMT';

const SOURCE_TYPE_LABELS: Record<BroadcastListSourceType, string> = {
  manual: 'Manual',
  form: 'Formulário',
  lead_filter: 'Filtro de Leads',
  csv_import: 'CSV',
  whatsapp_contacts: 'Contatos WhatsApp',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 13) {
    // +55 11 99999-9999
    return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
  }
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

export default function WhatsAppListaDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accessLevel } = useTenantContext();

  const { lists, deleteList, removeRecipient } = useBroadcastListsMT();
  const list = lists.find((l) => l.id === id);

  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [deleteListOpen, setDeleteListOpen] = useState(false);
  const [removeRecipientId, setRemoveRecipientId] = useState<string | null>(null);

  const { recipients, total, totalPages, isLoading: isLoadingRecipients } = useRecipientsByList(id, {
    page,
    pageSize: 50,
  });

  // Filter recipients locally by search
  const filteredRecipients = search
    ? recipients.filter(
        (r) =>
          r.phone.includes(search.replace(/\D/g, '')) ||
          r.nome?.toLowerCase().includes(search.toLowerCase())
      )
    : recipients;

  const handleDeleteList = () => {
    if (id) {
      deleteList.mutate(id, {
        onSuccess: () => navigate('/whatsapp/listas'),
      });
    }
    setDeleteListOpen(false);
  };

  const handleRemoveRecipient = () => {
    if (removeRecipientId && id) {
      removeRecipient.mutate({ recipientId: removeRecipientId, listId: id });
      setRemoveRecipientId(null);
    }
  };

  // Loading state
  if (!list && lists.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando lista...</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (!list) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/whatsapp/listas')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="text-center py-16">
          <Users className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Lista não encontrada</h3>
          <p className="text-muted-foreground mt-1">A lista solicitada não existe ou foi removida.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/whatsapp/listas')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{list.nome}</h1>
              <Badge variant="secondary">
                {SOURCE_TYPE_LABELS[list.source_type] || list.source_type}
              </Badge>
              {!list.is_active && <Badge variant="destructive">Inativa</Badge>}
            </div>
            {list.descricao && (
              <p className="text-muted-foreground mt-1">{list.descricao}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to={`/whatsapp/listas/${list.id}/editar`}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Link>
          </Button>
          {(accessLevel === 'platform' || accessLevel === 'tenant') && (
            <Button
              variant="destructive"
              onClick={() => setDeleteListOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Deletar
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{list.total_recipients}</div>
            <p className="text-xs text-muted-foreground">destinatários</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Válidos</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{list.valid_numbers}</div>
            <p className="text-xs text-muted-foreground">
              {list.total_recipients > 0
                ? `${Math.round((list.valid_numbers / list.total_recipients) * 100)}%`
                : '0%'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inválidos</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{list.invalid_numbers}</div>
            <p className="text-xs text-muted-foreground">
              {list.total_recipients > 0
                ? `${Math.round((list.invalid_numbers / list.total_recipients) * 100)}%`
                : '0%'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opt-out</CardTitle>
            <Ban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">descadastrados</p>
          </CardContent>
        </Card>
      </div>

      {/* Recipients Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Destinatários ({total})</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por telefone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingRecipients ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredRecipients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">
                {search ? 'Nenhum destinatário encontrado para esta busca.' : 'Nenhum destinatário nesta lista.'}
              </p>
              {!search && (
                <Button variant="link" asChild className="mt-2">
                  <Link to={`/whatsapp/listas/${list.id}/editar`}>Adicionar destinatários</Link>
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Lead vinculado</TableHead>
                    <TableHead className="text-center">Válido</TableHead>
                    <TableHead>Adicionado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecipients.map((recipient) => (
                    <TableRow key={recipient.id}>
                      <TableCell className="font-mono text-sm">
                        {formatPhone(recipient.phone)}
                      </TableCell>
                      <TableCell>{recipient.nome || '-'}</TableCell>
                      <TableCell>
                        {recipient.lead_id ? (
                          <Button variant="link" size="sm" asChild className="p-0 h-auto">
                            <Link to={`/leads/${recipient.lead_id}`}>
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Ver lead
                            </Link>
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {recipient.is_valid ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(recipient.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setRemoveRecipientId(recipient.id)}
                          title="Remover destinatário"
                          className="text-destructive hover:text-destructive"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Página {page + 1} de {totalPages} ({total} destinatários)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      Próxima
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete List Confirmation */}
      <AlertDialog open={deleteListOpen} onOpenChange={setDeleteListOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover lista "{list.nome}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá remover a lista e todos os seus {list.total_recipients} destinatários.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteList}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Recipient Confirmation */}
      <AlertDialog open={!!removeRecipientId} onOpenChange={() => setRemoveRecipientId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover destinatário?</AlertDialogTitle>
            <AlertDialogDescription>
              O destinatário será removido desta lista. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveRecipient}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
