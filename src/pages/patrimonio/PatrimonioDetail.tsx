import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTenantContext } from '@/contexts/TenantContext';
import { useAssetMT, useAssetStatusHistory, usePatrimonioMT } from '@/hooks/multitenant/usePatrimonioMT';
import { useAssetMaintenanceMT } from '@/hooks/multitenant/useAssetMaintenanceMT';
import { generateDepreciationSchedule, formatBRL, isFullyDepreciated, remainingUsefulLife } from '@/lib/depreciation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import {
  ArrowLeft, Pencil, Trash2, ArrowRightLeft, AlertTriangle,
  Wrench, Clock, Plus, Save,
} from 'lucide-react';
import {
  ASSET_STATUS_LABELS, ASSET_STATUS_COLORS,
  DEPRECIATION_METHOD_LABELS,
  MAINTENANCE_TYPE_LABELS, MAINTENANCE_STATUS_LABELS, MAINTENANCE_STATUS_COLORS,
  AssetStatus, MaintenanceType, MaintenanceStatus,
  MTAssetMaintenanceCreate,
} from '@/types/patrimonio';

export default function PatrimonioDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tenant } = useTenantContext();

  const { data: asset, isLoading } = useAssetMT(id);
  const { data: history } = useAssetStatusHistory(id);
  const { updateStatus, deleteAsset } = usePatrimonioMT();
  const { maintenances, createMaintenance, updateMaintenance, deleteMaintenance } = useAssetMaintenanceMT(id);

  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<AssetStatus>('in_operation');
  const [statusMotivo, setStatusMotivo] = useState('');

  const [maintenanceForm, setMaintenanceForm] = useState<MTAssetMaintenanceCreate>({
    asset_id: id || '',
    tipo: 'preventive',
    descricao: '',
    custo: 0,
  });

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Carregando...</div>;
  }

  if (!asset) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Ativo não encontrado.</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/patrimonio/ativos')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
      </div>
    );
  }

  const schedule = generateDepreciationSchedule(asset);
  const fullyDep = isFullyDepreciated(asset);
  const remainingLife = remainingUsefulLife(asset);

  const handleStatusChange = async () => {
    if (!id) return;
    await updateStatus.mutateAsync({ id, novoStatus: newStatus, motivo: statusMotivo || undefined });
    setShowStatusDialog(false);
    setStatusMotivo('');
  };

  const handleDelete = async () => {
    if (!id) return;
    await deleteAsset.mutateAsync(id);
    navigate('/patrimonio/ativos');
  };

  const handleCreateMaintenance = async () => {
    await createMaintenance.mutateAsync({ ...maintenanceForm, asset_id: id! });
    setShowMaintenanceDialog(false);
    setMaintenanceForm({ asset_id: id || '', tipo: 'preventive', descricao: '', custo: 0 });
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{asset.nome}</h1>
              <Badge variant="secondary" className={ASSET_STATUS_COLORS[asset.status]}>
                {ASSET_STATUS_LABELS[asset.status]}
              </Badge>
              {fullyDep && (
                <Badge variant="outline" className="text-orange-600 border-orange-300">
                  <AlertTriangle className="h-3 w-3 mr-1" /> Totalmente Depreciado
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground font-mono">{asset.codigo}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowStatusDialog(true)}>
            <ArrowRightLeft className="h-4 w-4 mr-1" /> Status
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/patrimonio/${id}/editar`)}>
            <Pencil className="h-4 w-4 mr-1" /> Editar
          </Button>
          <Button variant="outline" size="sm" className="text-destructive" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="h-4 w-4 mr-1" /> Remover
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dados">
        <TabsList>
          <TabsTrigger value="dados">Dados Gerais</TabsTrigger>
          <TabsTrigger value="depreciacao">Depreciação</TabsTrigger>
          <TabsTrigger value="manutencoes">Manutenções ({maintenances.length})</TabsTrigger>
          <TabsTrigger value="historico">Histórico ({history?.length || 0})</TabsTrigger>
        </TabsList>

        {/* Tab: Dados Gerais */}
        <TabsContent value="dados" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Identificação</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row label="Código" value={asset.codigo} />
                <Row label="Nome" value={asset.nome} />
                <Row label="Categoria" value={asset.category?.nome || '-'} />
                <Row label="Franquia" value={asset.franchise?.nome_fantasia || '-'} />
                <Row label="Número de Série" value={asset.numero_serie} />
                <Row label="Marca" value={asset.marca} />
                <Row label="Modelo" value={asset.modelo} />
                <Row label="Fornecedor" value={asset.fornecedor} />
                <Row label="Nota Fiscal" value={asset.nota_fiscal} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Dados Financeiros</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row label="Valor de Aquisição" value={formatBRL(asset.valor_aquisicao)} />
                <Row label="Valor Residual" value={formatBRL(asset.valor_residual)} />
                <Row label="Depreciação Acumulada" value={formatBRL(asset.depreciacao_acumulada)} />
                <Row label="Valor Contábil" value={formatBRL(asset.valor_contabil)} highlight />
                <Row label="Data de Aquisição" value={asset.data_aquisicao ? new Date(asset.data_aquisicao).toLocaleDateString('pt-BR') : '-'} />
                <Row label="Data Início de Uso" value={asset.data_inicio_uso ? new Date(asset.data_inicio_uso).toLocaleDateString('pt-BR') : '-'} />
                <Row label="Método Depreciação" value={DEPRECIATION_METHOD_LABELS[asset.metodo_depreciacao]} />
                <Row label="Vida Útil" value={`${asset.vida_util_anos} anos`} />
                <Row label="Vida Útil Restante" value={`${remainingLife} anos`} />
              </CardContent>
            </Card>
          </div>

          {asset.descricao && (
            <Card>
              <CardHeader><CardTitle className="text-base">Descrição</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{asset.descricao}</p></CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Localização</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Localização" value={asset.localizacao} />
              {asset.responsavel_user ? (
                <>
                  <Row label="Responsável" value={asset.responsavel_user.nome} />
                  {asset.responsavel_user.cargo && (
                    <Row label="Cargo" value={asset.responsavel_user.cargo} />
                  )}
                  {asset.responsavel_user.departamento && (
                    <Row label="Departamento" value={asset.responsavel_user.departamento} />
                  )}
                  <Row label="Email" value={asset.responsavel_user.email} />
                </>
              ) : (
                <Row label="Responsável" value={asset.responsavel} />
              )}
              {asset.observacoes && <Row label="Observações" value={asset.observacoes} />}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Depreciação */}
        <TabsContent value="depreciacao" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Tabela de Depreciação — {DEPRECIATION_METHOD_LABELS[asset.metodo_depreciacao]}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {schedule.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Sem dados de depreciação (ativo sem valor depreciável).</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ano</TableHead>
                      <TableHead className="text-right">Depreciação do Período</TableHead>
                      <TableHead className="text-right">Depreciação Acumulada</TableHead>
                      <TableHead className="text-right">Valor Contábil</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedule.map((entry) => (
                      <TableRow key={entry.ano}>
                        <TableCell className="font-mono">{entry.ano}</TableCell>
                        <TableCell className="text-right font-mono">{formatBRL(entry.depreciacao_periodo)}</TableCell>
                        <TableCell className="text-right font-mono">{formatBRL(entry.depreciacao_acumulada)}</TableCell>
                        <TableCell className="text-right font-mono">{formatBRL(entry.valor_contabil)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Manutenções */}
        <TabsContent value="manutencoes" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowMaintenanceDialog(true)}>
              <Plus className="h-4 w-4 mr-1" /> Nova Manutenção
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Data Agendada</TableHead>
                    <TableHead>Data Realizada</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maintenances.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhuma manutenção registrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    maintenances.map(m => (
                      <TableRow key={m.id}>
                        <TableCell>{MAINTENANCE_TYPE_LABELS[m.tipo]}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{m.descricao}</TableCell>
                        <TableCell>{m.data_agendada ? new Date(m.data_agendada).toLocaleDateString('pt-BR') : '-'}</TableCell>
                        <TableCell>{m.data_realizada ? new Date(m.data_realizada).toLocaleDateString('pt-BR') : '-'}</TableCell>
                        <TableCell className="text-right font-mono">{formatBRL(m.custo)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={MAINTENANCE_STATUS_COLORS[m.status]}>
                            {MAINTENANCE_STATUS_LABELS[m.status]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Histórico */}
        <TabsContent value="historico" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>De</TableHead>
                    <TableHead>Para</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!history || history.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Nenhum histórico
                      </TableCell>
                    </TableRow>
                  ) : (
                    history.map(h => (
                      <TableRow key={h.id}>
                        <TableCell className="text-sm">{new Date(h.created_at).toLocaleString('pt-BR')}</TableCell>
                        <TableCell>
                          {h.status_anterior ? (
                            <Badge variant="outline" className="text-xs">{ASSET_STATUS_LABELS[h.status_anterior]}</Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`text-xs ${ASSET_STATUS_COLORS[h.status_novo]}`}>
                            {ASSET_STATUS_LABELS[h.status_novo]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{h.motivo || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog: Alterar Status */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Alterar Status</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Novo Status</Label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as AssetStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ASSET_STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Textarea
                placeholder="Motivo da alteração..."
                value={statusMotivo}
                onChange={(e) => setStatusMotivo(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>Cancelar</Button>
            <Button onClick={handleStatusChange} disabled={updateStatus.isPending}>
              {updateStatus.isPending ? 'Salvando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Nova Manutenção */}
      <Dialog open={showMaintenanceDialog} onOpenChange={setShowMaintenanceDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Manutenção</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={maintenanceForm.tipo} onValueChange={(v) => setMaintenanceForm(f => ({ ...f, tipo: v as MaintenanceType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(MAINTENANCE_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Textarea
                placeholder="Descrição da manutenção..."
                value={maintenanceForm.descricao}
                onChange={(e) => setMaintenanceForm(f => ({ ...f, descricao: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Agendada</Label>
                <Input
                  type="date"
                  value={maintenanceForm.data_agendada || ''}
                  onChange={(e) => setMaintenanceForm(f => ({ ...f, data_agendada: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Custo (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={maintenanceForm.custo || 0}
                  onChange={(e) => setMaintenanceForm(f => ({ ...f, custo: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Input
                placeholder="Nome do fornecedor..."
                value={maintenanceForm.fornecedor_servico || ''}
                onChange={(e) => setMaintenanceForm(f => ({ ...f, fornecedor_servico: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMaintenanceDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreateMaintenance} disabled={!maintenanceForm.descricao || createMaintenance.isPending}>
              <Save className="h-4 w-4 mr-1" />
              {createMaintenance.isPending ? 'Salvando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover ativo?</AlertDialogTitle>
            <AlertDialogDescription>
              O ativo "{asset.nome}" será desativado. Esta ação pode ser revertida.
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

function Row({ label, value, highlight }: { label: string; value: string | null | undefined; highlight?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={highlight ? 'font-semibold' : ''}>{value || '-'}</span>
    </div>
  );
}
