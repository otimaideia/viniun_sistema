import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTenantContext } from "@/contexts/TenantContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Pencil, Trash2, Send, Check, X, Copy, MessageCircle,
  FileSignature, Building2, User, DollarSign, Calendar, Clock, Eye,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  rascunho: "bg-gray-100 text-gray-800",
  enviada: "bg-blue-100 text-blue-800",
  visualizada: "bg-cyan-100 text-cyan-800",
  aceita: "bg-green-100 text-green-800",
  rejeitada: "bg-red-100 text-red-800",
  contraproposta: "bg-amber-100 text-amber-800",
  contrapropostada: "bg-amber-100 text-amber-800",
  expirada: "bg-orange-100 text-orange-800",
  cancelada: "bg-gray-100 text-gray-600",
};

const STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  visualizada: "Visualizada",
  aceita: "Aceita",
  rejeitada: "Rejeitada",
  contraproposta: "Contraproposta",
  contrapropostada: "Contraproposta",
  expirada: "Expirada",
  cancelada: "Cancelada",
};

function formatCurrency(value: number | null | undefined): string {
  if (!value) return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(date: string | null | undefined): string {
  if (!date) return "-";
  return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

export default function PropostaImovelDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { tenant } = useTenantContext();
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const { data: proposta, isLoading } = useQuery({
    queryKey: ["mt-proposta-imovel", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mt_property_proposals" as any)
        .select(`
          *,
          property:mt_properties!property_id(id, titulo, ref_code, foto_destaque_url, valor_venda, valor_locacao),
          lead:mt_leads!lead_id(id, nome, email, telefone),
          corretor:mt_corretores!corretor_id(id, nome)
        `)
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  const { data: items = [] } = useQuery({
    queryKey: ["mt-proposta-items", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("mt_property_proposal_items" as any)
        .select("*")
        .eq("proposal_id", id!)
        .order("ordem");
      return data || [];
    },
    enabled: !!id,
  });

  const { data: historico = [] } = useQuery({
    queryKey: ["mt-proposta-historico", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("mt_property_proposal_history" as any)
        .select("*")
        .eq("proposal_id", id!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, extra }: { status: string; extra?: Record<string, any> }) => {
      const payload: any = { status, updated_at: new Date().toISOString(), ...extra };
      if (status === "enviada") {
        payload.enviada_em = new Date().toISOString();
        const validade = new Date();
        validade.setDate(validade.getDate() + (proposta?.prazo_validade_dias || 15));
        payload.validade_ate = validade.toISOString();
      }
      if (status === "aceita" || status === "rejeitada") {
        payload.respondida_em = new Date().toISOString();
      }
      const { error } = await supabase
        .from("mt_property_proposals" as any)
        .update(payload)
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-proposta-imovel", id] });
      queryClient.invalidateQueries({ queryKey: ["mt-propostas-imoveis"] });
      toast.success("Status atualizado");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("mt_property_proposals" as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Proposta removida");
      navigate("/imoveis/propostas");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleCopyLink = () => {
    if (proposta?.metadata?.token_acesso) {
      navigator.clipboard.writeText(`${window.location.origin}/proposta/${proposta.metadata.token_acesso}`);
      toast.success("Link copiado!");
    } else {
      toast.error("Token de acesso nao disponivel");
    }
  };

  const handleShareWhatsApp = () => {
    if (!proposta?.lead?.telefone) {
      toast.error("Lead nao possui telefone cadastrado");
      return;
    }
    const phone = proposta.lead.telefone.replace(/\D/g, "");
    const link = proposta?.metadata?.token_acesso
      ? `${window.location.origin}/proposta/${proposta.metadata.token_acesso}`
      : "";
    const message = `Ola ${proposta.lead.nome}, segue a proposta para o imovel ${proposta.property?.titulo || ""}: ${link}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!proposta) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Proposta nao encontrada.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/imoveis/propostas")}>Voltar</Button>
      </div>
    );
  }

  const status = proposta.status as string;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/imoveis/propostas")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Proposta {proposta.numero || ""}</h1>
              <Badge className={STATUS_COLORS[status]}>{STATUS_LABELS[status] || status}</Badge>
            </div>
            <p className="text-muted-foreground">
              Criada em {formatDate(proposta.created_at)}
              {proposta.enviada_em && ` | Enviada em ${formatDate(proposta.enviada_em)}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {status === "rascunho" && (
            <>
              <Button variant="outline" asChild>
                <Link to={`/imoveis/propostas/${id}/editar`}><Pencil className="h-4 w-4 mr-2" /> Editar</Link>
              </Button>
              <Button onClick={() => updateStatusMutation.mutate({ status: "enviada" })}>
                <Send className="h-4 w-4 mr-2" /> Enviar
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir proposta?</AlertDialogTitle>
                    <AlertDialogDescription>Esta acao pode ser desfeita.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteMutation.mutate()}>Confirmar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          {(status === "enviada" || status === "visualizada") && (
            <>
              <Button variant="outline" onClick={handleCopyLink}><Copy className="h-4 w-4 mr-2" /> Copiar Link</Button>
              <Button variant="outline" onClick={handleShareWhatsApp}><MessageCircle className="h-4 w-4 mr-2" /> WhatsApp</Button>
              <Button variant="default" onClick={() => updateStatusMutation.mutate({ status: "aceita" })}>
                <Check className="h-4 w-4 mr-2" /> Aceitar
              </Button>
              <Button variant="destructive" onClick={() => setShowRejectDialog(true)}>
                <X className="h-4 w-4 mr-2" /> Rejeitar
              </Button>
            </>
          )}
          {status === "aceita" && (
            <Button onClick={() => navigate(`/imoveis/contratos/novo?proposal_id=${id}`)}>
              <FileSignature className="h-4 w-4 mr-2" /> Gerar Contrato
            </Button>
          )}
        </div>
      </div>

      {/* Reject dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rejeitar Proposta</DialogTitle></DialogHeader>
          <Textarea placeholder="Motivo da rejeicao (opcional)..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => {
              updateStatusMutation.mutate({ status: "rejeitada", extra: { motivo_rejeicao: rejectReason || null } });
              setShowRejectDialog(false);
            }}>Rejeitar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="detalhes">
        <TabsList>
          <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
          <TabsTrigger value="pagamento">Pagamento ({items.length})</TabsTrigger>
          <TabsTrigger value="historico">Historico</TabsTrigger>
        </TabsList>

        <TabsContent value="detalhes" className="space-y-4">
          {/* Property card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Imovel</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  {proposta.property?.foto_destaque_url && (
                    <img src={proposta.property.foto_destaque_url} alt="" className="w-32 h-24 object-cover rounded" />
                  )}
                  <div className="space-y-1">
                    <p className="font-medium text-lg">{proposta.property?.titulo || "-"}</p>
                    {proposta.property?.ref_code && <p className="text-sm text-muted-foreground">Ref: {proposta.property.ref_code}</p>}
                    <p className="text-sm">Valor anunciado: {formatCurrency(proposta.property?.valor_venda)}</p>
                    <Link to={`/imoveis/${proposta.property_id}`} className="text-sm text-primary hover:underline">Ver imovel</Link>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-4 w-4" /> Cliente / Lead</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                <p className="font-medium">{proposta.lead?.nome || "-"}</p>
                <p className="text-sm text-muted-foreground">{proposta.lead?.email || "-"}</p>
                <p className="text-sm text-muted-foreground">{proposta.lead?.telefone || "-"}</p>
                {proposta.lead_id && (
                  <Link to={`/leads/${proposta.lead_id}`} className="text-sm text-primary hover:underline">Ver lead</Link>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Values */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> Valores</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                <InfoBox label="Valor da Proposta" value={formatCurrency(proposta.valor_proposta)} highlight />
                <InfoBox label="Entrada" value={formatCurrency(proposta.valor_entrada)} />
                <InfoBox label="Financiamento" value={formatCurrency(proposta.valor_financiamento)} />
                <InfoBox label="Parcelas" value={proposta.numero_parcelas ? `${proposta.numero_parcelas}x` : "-"} />
                <InfoBox label="Valor Parcela" value={formatCurrency(proposta.valor_parcela)} />
                <InfoBox label="Forma Pagamento" value={proposta.forma_pagamento?.replace(/_/g, " ") || "-"} />
                <InfoBox label="Validade" value={proposta.validade_ate ? format(new Date(proposta.validade_ate), "dd/MM/yyyy") : "-"} />
                <InfoBox label="Corretor" value={proposta.corretor?.nome || "-"} />
              </div>
              {proposta.observacoes && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Observacoes</p>
                    <p className="text-sm whitespace-pre-wrap">{proposta.observacoes}</p>
                  </div>
                </>
              )}
              {proposta.condicoes_especiais && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Condicoes Especiais</p>
                  <p className="text-sm whitespace-pre-wrap">{proposta.condicoes_especiais}</p>
                </div>
              )}
              {proposta.motivo_rejeicao && (
                <div className="mt-4 p-3 bg-red-50 rounded border border-red-200">
                  <p className="text-xs text-red-600 mb-1">Motivo da Rejeicao</p>
                  <p className="text-sm">{proposta.motivo_rejeicao}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Timeline */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4" /> Timeline</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                <TimelineItem date={proposta.created_at} label="Proposta criada" />
                {proposta.enviada_em && <TimelineItem date={proposta.enviada_em} label="Enviada ao cliente" />}
                {proposta.visualizada_em && <TimelineItem date={proposta.visualizada_em} label="Visualizada pelo cliente" icon={<Eye className="h-3 w-3" />} />}
                {proposta.respondida_em && (
                  <TimelineItem
                    date={proposta.respondida_em}
                    label={status === "aceita" ? "Proposta aceita" : status === "rejeitada" ? "Proposta rejeitada" : "Respondida"}
                    icon={status === "aceita" ? <Check className="h-3 w-3 text-green-600" /> : <X className="h-3 w-3 text-red-600" />}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pagamento">
          <Card>
            <CardContent className="pt-6">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum item de pagamento cadastrado.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Descricao</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item: any, idx: number) => (
                      <TableRow key={item.id}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{item.descricao || "-"}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.valor_total || item.valor_unitario)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={2} className="text-right font-bold">Total</TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(items.reduce((acc: number, i: any) => acc + (i.valor_total || i.valor_unitario || 0), 0))}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico">
          <Card>
            <CardContent className="pt-6">
              {historico.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum registro de historico.</p>
              ) : (
                <div className="space-y-3">
                  {historico.map((h: any) => (
                    <div key={h.id} className="flex gap-3 items-start border-b pb-3 last:border-0">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{h.descricao || h.tipo}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(h.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-medium ${highlight ? "text-lg text-primary" : ""}`}>{value}</p>
    </div>
  );
}

function TimelineItem({ date, label, icon }: { date: string; label: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        {icon || <Calendar className="h-3 w-3 text-primary" />}
      </div>
      <div>
        <p className="text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">{formatDate(date)}</p>
      </div>
    </div>
  );
}
