import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenantContext } from '@/contexts/TenantContext';
import { usePatrimonioMT } from '@/hooks/multitenant/usePatrimonioMT';
import { useAssetCategoriesMT } from '@/hooks/multitenant/useAssetCategoriesMT';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { Plus, Search, Eye, Pencil, Trash2 } from 'lucide-react';
import { ASSET_STATUS_LABELS, ASSET_STATUS_COLORS, AssetStatus, MTAssetFilters } from '@/types/patrimonio';
import { formatBRL } from '@/lib/depreciation';

export default function PatrimonioIndex() {
  const navigate = useNavigate();
  const { tenant } = useTenantContext();
  const [filters, setFilters] = useState<MTAssetFilters>({});
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { ativos, isLoading, deleteAsset } = usePatrimonioMT({
    ...filters,
    search: search || undefined,
  });
  const { categories } = useAssetCategoriesMT();

  const handleDelete = () => {
    if (deleteId) {
      deleteAsset.mutate(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ativos</h1>
          <p className="text-muted-foreground">
            {ativos.length} ativo{ativos.length !== 1 ? 's' : ''} cadastrado{ativos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => navigate('/patrimonio/novo')}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Ativo
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, código, marca..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={filters.status || 'all'}
              onValueChange={(v) => setFilters(f => ({ ...f, status: v === 'all' ? undefined : v as AssetStatus }))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                {Object.entries(ASSET_STATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.category_id || 'all'}
              onValueChange={(v) => setFilters(f => ({ ...f, category_id: v === 'all' ? undefined : v }))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Franquia</TableHead>
                <TableHead className="text-right">Valor Aquisição</TableHead>
                <TableHead className="text-right">Valor Contábil</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
                </TableRow>
              ) : ativos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhum ativo encontrado
                  </TableCell>
                </TableRow>
              ) : (
                ativos.map(asset => (
                  <TableRow key={asset.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/patrimonio/${asset.id}`)}>
                    <TableCell className="font-mono text-sm">{asset.codigo}</TableCell>
                    <TableCell className="font-medium">{asset.nome}</TableCell>
                    <TableCell>
                      {asset.category && (
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: asset.category.cor || '#999' }} />
                          {asset.category.nome}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {asset.franchise?.nome_fantasia || '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatBRL(asset.valor_aquisicao)}</TableCell>
                    <TableCell className="text-right font-mono">{formatBRL(asset.valor_contabil)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={ASSET_STATUS_COLORS[asset.status]}>
                        {ASSET_STATUS_LABELS[asset.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/patrimonio/${asset.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/patrimonio/${asset.id}/editar`)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(asset.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover ativo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá desativar o ativo. Ele poderá ser restaurado posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
