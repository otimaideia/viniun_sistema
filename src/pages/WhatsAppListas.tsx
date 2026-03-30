// Página: Listagem de Listas de Destinatários (Broadcast Lists)

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, List, Users, Search, Trash2, Edit, FileSpreadsheet, UserPlus, Upload } from 'lucide-react';
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
import { useBroadcastListsMT } from '@/hooks/multitenant/useBroadcastListsMT';
import { useTenantContext } from '@/contexts/TenantContext';
import type { BroadcastListSourceType } from '@/hooks/multitenant/useBroadcastListsMT';

const SOURCE_TYPE_LABELS: Record<BroadcastListSourceType, string> = {
  manual: 'Manual',
  form: 'Formulário',
  lead_filter: 'Filtro de Leads',
  csv_import: 'CSV',
  whatsapp_contacts: 'Contatos WhatsApp',
};

const SOURCE_TYPE_VARIANTS: Record<BroadcastListSourceType, 'default' | 'secondary' | 'outline'> = {
  manual: 'default',
  form: 'secondary',
  lead_filter: 'outline',
  csv_import: 'secondary',
  whatsapp_contacts: 'outline',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function WhatsAppListas() {
  const navigate = useNavigate();
  const { accessLevel } = useTenantContext();
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { lists, isLoading, deleteList } = useBroadcastListsMT({
    search: search || undefined,
  });

  const totalDestinatarios = lists.reduce((sum, l) => sum + (l.total_recipients || 0), 0);
  const totalValidos = lists.reduce((sum, l) => sum + (l.valid_numbers || 0), 0);

  const handleDelete = () => {
    if (deleteId) {
      deleteList.mutate(deleteId);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando listas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Listas de Destinatários</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie listas de números para campanhas de broadcast
          </p>
        </div>
        <Button asChild>
          <Link to="/whatsapp/listas/novo">
            <Plus className="h-4 w-4 mr-2" />
            Nova Lista
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Listas</CardTitle>
            <List className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lists.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Destinatários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDestinatarios.toLocaleString('pt-BR')}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Telefones Válidos</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalValidos.toLocaleString('pt-BR')}</div>
            <p className="text-xs text-muted-foreground">
              {totalDestinatarios > 0
                ? `${Math.round((totalValidos / totalDestinatarios) * 100)}% do total`
                : '0% do total'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      {lists.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <List className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma lista encontrada</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              {search
                ? 'Nenhuma lista corresponde à busca. Tente outro termo.'
                : 'Crie sua primeira lista de destinatários para começar a enviar campanhas de broadcast.'}
            </p>
            {!search && (
              <Button asChild>
                <Link to="/whatsapp/listas/novo">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Lista
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-center">Destinatários</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lists.map((list) => (
                <TableRow
                  key={list.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/whatsapp/listas/${list.id}`)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{list.nome}</p>
                      {list.descricao && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{list.descricao}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={SOURCE_TYPE_VARIANTS[list.source_type] || 'default'}>
                      {SOURCE_TYPE_LABELS[list.source_type] || list.source_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-medium text-green-600">{list.valid_numbers}</span>
                    <span className="text-muted-foreground">/{list.total_recipients}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(list.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/whatsapp/listas/${list.id}/editar`)}
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(list.id)}
                        title="Deletar"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover lista?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá remover a lista e todos os seus destinatários. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
