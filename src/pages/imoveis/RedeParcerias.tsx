import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTenantContext } from "@/contexts/TenantContext";
import { useRedeParceriasMT } from "@/hooks/multitenant/useRedeParceriasMT";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Plus, Users, Building2, Check, X, Pause, Handshake,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pendente: { label: "Pendente", variant: "outline" },
  ativa: { label: "Ativa", variant: "default" },
  suspensa: { label: "Suspensa", variant: "secondary" },
  recusada: { label: "Recusada", variant: "destructive" },
  encerrada: { label: "Encerrada", variant: "destructive" },
};

export default function RedeParcerias() {
  const navigate = useNavigate();
  const { tenant } = useTenantContext();
  const { data: parcerias = [], tenantsDisponiveis = [], isLoading, solicitar, updateStatus, remove } = useRedeParceriasMT();

  const [showSolicitar, setShowSolicitar] = useState(false);
  const [partnerId, setPartnerId] = useState("");
  const [comissao, setComissao] = useState("3");
  const [termos, setTermos] = useState("");
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: string } | null>(null);

  const recebidas = parcerias.filter((p) => p.tenant_partner_id === tenant?.id && p.status === "pendente");
  const ativas = parcerias.filter((p) => p.status === "ativa");

  const handleSolicitar = async () => {
    if (!partnerId) return;
    try {
      await solicitar.mutateAsync({
        tenant_partner_id: partnerId,
        comissao_padrao: parseFloat(comissao) || 0,
        termos: termos || undefined,
      });
      setShowSolicitar(false);
      setPartnerId("");
      setTermos("");
    } catch {
      // handled in hook
    }
  };

  const handleAction = async () => {
    if (!confirmAction) return;
    const { id, action } = confirmAction;
    try {
      await updateStatus.mutateAsync({ id, status: action as any });
    } catch {
      // handled in hook
    }
    setConfirmAction(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/imoveis/rede")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Handshake className="h-6 w-6" /> Parcerias da Rede
            </h1>
            <p className="text-muted-foreground">Gerencie parcerias com outras imobiliárias e corretores</p>
          </div>
        </div>
        <Button onClick={() => setShowSolicitar(true)}>
          <Plus className="h-4 w-4 mr-2" /> Solicitar Parceria
        </Button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Parcerias Ativas</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{ativas.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Solicitações Recebidas</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-amber-600">{recebidas.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total de Parcerias</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{parcerias.length}</div></CardContent>
        </Card>
      </div>

      {/* Solicitações Pendentes */}
      {recebidas.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="text-amber-700">Solicitações Pendentes ({recebidas.length})</CardTitle>
            <CardDescription>Parceiros que desejam colaborar com você</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recebidas.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{p.tenant_origin?.nome_fantasia || "Empresa"}</div>
                    <div className="text-sm text-muted-foreground">
                      Comissão padrão: {p.comissao_padrao}% | Tipo: {p.tipo}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setConfirmAction({ id: p.id, action: "recusada" })}>
                    <X className="h-4 w-4 mr-1" /> Recusar
                  </Button>
                  <Button size="sm" onClick={() => setConfirmAction({ id: p.id, action: "ativa" })}>
                    <Check className="h-4 w-4 mr-1" /> Aceitar
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Todas as Parcerias */}
      <Card>
        <CardHeader>
          <CardTitle>Todas as Parcerias</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <Skeleton className="h-32 w-full m-6" />
          ) : parcerias.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Handshake className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Nenhuma parceria ainda.</p>
              <p className="text-sm mt-1">Solicite uma parceria para começar a colaborar.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parceiro</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Direção</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parcerias.map((p) => {
                  const isOrigin = p.tenant_origin_id === tenant?.id;
                  const partnerName = isOrigin ? p.tenant_partner?.nome_fantasia : p.tenant_origin?.nome_fantasia;

                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{partnerName || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{p.tipo}</Badge></TableCell>
                      <TableCell>{p.comissao_padrao}%</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_CONFIG[p.status]?.variant || "secondary"}>
                          {STATUS_CONFIG[p.status]?.label || p.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {isOrigin ? "Enviada" : "Recebida"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {p.status === "ativa" && (
                            <Button variant="ghost" size="icon" onClick={() => setConfirmAction({ id: p.id, action: "suspensa" })}>
                              <Pause className="h-4 w-4" />
                            </Button>
                          )}
                          {p.status === "suspensa" && (
                            <Button variant="ghost" size="icon" onClick={() => setConfirmAction({ id: p.id, action: "ativa" })}>
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal: Solicitar Parceria */}
      <Dialog open={showSolicitar} onOpenChange={setShowSolicitar}>
        <DialogContent>
          <DialogHeader><DialogTitle>Solicitar Parceria</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Empresa Parceira *</label>
              <Select value={partnerId} onValueChange={setPartnerId}>
                <SelectTrigger><SelectValue placeholder="Selecione uma empresa..." /></SelectTrigger>
                <SelectContent>
                  {(tenantsDisponiveis || []).map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.nome_fantasia} ({t.slug})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Comissão Padrão (%)</label>
              <Input type="number" step="0.5" min="0" max="100" value={comissao} onChange={(e) => setComissao(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Termos (opcional)</label>
              <Textarea placeholder="Condições especiais da parceria..." value={termos} onChange={(e) => setTermos(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSolicitar(false)}>Cancelar</Button>
            <Button onClick={handleSolicitar} disabled={!partnerId || solicitar.isPending}>Enviar Solicitação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Action */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Ação</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.action === "ativa" && "Aceitar esta parceria?"}
              {confirmAction?.action === "recusada" && "Recusar esta parceria?"}
              {confirmAction?.action === "suspensa" && "Suspender esta parceria?"}
              {confirmAction?.action === "encerrada" && "Encerrar esta parceria?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
