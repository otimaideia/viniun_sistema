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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Pencil, Send, FileCheck, Building2, User, DollarSign,
  Calendar, Clock, CheckCircle, XCircle, Download, Users, Mail,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  rascunho: "bg-gray-100 text-gray-800",
  pendente_assinatura: "bg-yellow-100 text-yellow-800",
  assinado: "bg-blue-100 text-blue-800",
  em_execucao: "bg-green-100 text-green-800",
  finalizado: "bg-emerald-100 text-emerald-800",
  cancelado: "bg-red-100 text-red-800",
  suspenso: "bg-orange-100 text-orange-800",
};

const STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  pendente_assinatura: "Pendente Assinatura",
  assinado: "Assinado",
  em_execucao: "Em Execucao",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
  suspenso: "Suspenso",
};

const TIPO_LABELS: Record<string, string> = {
  venda: "Venda", locacao: "Locacao", permuta: "Permuta",
  cessao: "Cessao", compromisso: "Compromisso", outro: "Outro",
};

const SIGNATARIO_LABELS: Record<string, string> = {
  comprador: "Comprador", vendedor: "Vendedor", locador: "Locador",
  locatario: "Locatario", fiador: "Fiador", testemunha: "Testemunha",
  corretor: "Corretor", representante: "Representante",
};

function formatCurrency(value: number | null | undefined): string {
  if (!value) return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(date: string | null | undefined): string {
  if (!date) return "-";
  return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
}

function formatDateTime(date: string | null | undefined): string {
  if (!date) return "-";
  return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

export default function ContratoImovelDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { tenant } = useTenantContext();

  const { data: contrato, isLoading } = useQuery({
    queryKey: ["mt-contrato-imovel", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mt_property_contracts" as any)
        .select(`
          *,
          property:mt_properties!property_id(id, titulo, ref_code, foto_destaque_url, valor_venda),
          lead:mt_leads!lead_id(id, nome, email, telefone),
          corretor:mt_corretores!corretor_id(id, nome),
          owner:mt_property_owners!owner_id(id, nome, telefone, email),
          proposal:mt_property_proposals!proposal_id(id, numero, valor_proposta)
        `)
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  const { data: signatarios = [] } = useQuery({
    queryKey: ["mt-contrato-signatarios", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("mt_property_contract_signatories" as any)
        .select("*")
        .eq("contract_id", id!)
        .order("ordem");
      return data || [];
    },
    enabled: !!id,
  });

  const { data: historico = [] } = useQuery({
    queryKey: ["mt-contrato-historico", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("mt_property_contract_history" as any)
        .select("*")
        .eq("contract_id", id!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, extra }: { status: string; extra?: Record<string, any> }) => {
      const payload: any = { status, updated_at: new Date().toISOString(), ...extra };
      if (status === "assinado") payload.data_assinatura = new Date().toISOString();
      if (status === "cancelado") payload.data_cancelamento = new Date().toISOString();
      const { error } = await supabase.from("mt_property_contracts" as any).update(payload).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-contrato-imovel", id] });
      queryClient.invalidateQueries({ queryKey: ["mt-contratos-imoveis"] });
      toast.success("Status atualizado");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const sendSignatureLink = (signatario: any) => {
    if (!signatario.email && !signatario.telefone) {
      toast.error("Signatario nao possui email ou telefone");
      return;
    }
    const token = signatario.token_assinatura;
    if (!token) {
      toast.error("Token de assinatura nao disponivel");
      return;
    }
    const link = `${window.location.origin}/contrato-imovel/${token}/assinar`;
    if (signatario.email) {
      window.open(`mailto:${signatario.email}?subject=Assinatura de Contrato&body=Acesse o link para assinar: ${link}`);
    } else if (signatario.telefone) {
      const phone = signatario.telefone.replace(/\D/g, "");
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Acesse o link para assinar o contrato: ${link}`)}`, "_blank");
    }
    toast.success("Link de assinatura enviado");
  };

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!contrato) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Contrato nao encontrado.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/imoveis/contratos")}>Voltar</Button>
      </div>
    );
  }

  const status = contrato.status as string;
  const clausulas = contrato.clausulas ? contrato.clausulas.split("\n").filter(Boolean) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/imoveis/contratos")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Contrato {contrato.numero || ""}</h1>
              <Badge className={STATUS_COLORS[status]}>{STATUS_LABELS[status] || status}</Badge>
              <Badge variant="outline">{TIPO_LABELS[contrato.tipo] || contrato.tipo}</Badge>
            </div>
            <p className="text-muted-foreground">Criado em {formatDateTime(contrato.created_at)}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {status === "rascunho" && (
            <>
              <Button variant="outline" asChild>
                <Link to={`/imoveis/contratos/${id}/editar`}><Pencil className="h-4 w-4 mr-2" /> Editar</Link>
              </Button>
              <Button onClick={() => updateStatusMutation.mutate({ status: "pendente_assinatura" })}>
                <Send className="h-4 w-4 mr-2" /> Enviar para Assinatura
              </Button>
            </>
          )}
          {status === "pendente_assinatura" && (
            <Button variant="outline" onClick={() => updateStatusMutation.mutate({ status: "assinado" })}>
              <CheckCircle className="h-4 w-4 mr-2" /> Marcar como Assinado
            </Button>
          )}
          {status === "assinado" && (
            <Button onClick={() => updateStatusMutation.mutate({ status: "em_execucao" })}>
              <FileCheck className="h-4 w-4 mr-2" /> Iniciar Execucao
            </Button>
          )}
          {status === "em_execucao" && (
            <Button onClick={() => updateStatusMutation.mutate({ status: "finalizado" })}>
              <CheckCircle className="h-4 w-4 mr-2" /> Finalizar
            </Button>
          )}
          {!["cancelado", "finalizado"].includes(status) && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm"><XCircle className="h-4 w-4 mr-1" /> Cancelar</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancelar contrato?</AlertDialogTitle>
                  <AlertDialogDescription>O contrato sera marcado como cancelado.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Voltar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => updateStatusMutation.mutate({ status: "cancelado" })}>Confirmar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <Tabs defaultValue="contrato">
        <TabsList>
          <TabsTrigger value="contrato">Contrato</TabsTrigger>
          <TabsTrigger value="assinantes">Assinantes ({signatarios.length})</TabsTrigger>
          <TabsTrigger value="historico">Historico</TabsTrigger>
        </TabsList>

        <TabsContent value="contrato" className="space-y-4">
          {/* Property + Parties */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4" /> Imovel</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {contrato.property?.foto_destaque_url && (
                  <img src={contrato.property.foto_destaque_url} alt="" className="w-full h-24 object-cover rounded mb-2" />
                )}
                <p className="font-medium">{contrato.property?.titulo || "-"}</p>
                {contrato.property?.ref_code && <p className="text-xs text-muted-foreground">Ref: {contrato.property.ref_code}</p>}
                <Link to={`/imoveis/${contrato.property_id}`} className="text-xs text-primary hover:underline">Ver imovel</Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><User className="h-4 w-4" /> Cliente</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                <p className="font-medium">{contrato.lead?.nome || "-"}</p>
                <p className="text-xs text-muted-foreground">{contrato.lead?.email}</p>
                <p className="text-xs text-muted-foreground">{contrato.lead?.telefone}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Users className="h-4 w-4" /> Proprietario / Corretor</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                <p className="text-xs text-muted-foreground">Proprietario</p>
                <p className="text-sm font-medium">{contrato.owner?.nome || "-"}</p>
                <p className="text-xs text-muted-foreground mt-2">Corretor</p>
                <p className="text-sm font-medium">{contrato.corretor?.nome || "-"}</p>
              </CardContent>
            </Card>
          </div>

          {/* Values */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> Valores</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                <InfoBox label="Valor do Contrato" value={formatCurrency(contrato.valor_contrato)} highlight />
                <InfoBox label="Entrada" value={formatCurrency(contrato.valor_entrada)} />
                <InfoBox label="Financiamento" value={formatCurrency(contrato.valor_financiamento)} />
                {contrato.valor_aluguel && <InfoBox label="Aluguel Mensal" value={formatCurrency(contrato.valor_aluguel)} />}
                {contrato.dia_vencimento && <InfoBox label="Dia Vencimento" value={`${contrato.dia_vencimento}`} />}
                <InfoBox label="Comissao Corretor" value={contrato.percentual_comissao ? `${contrato.percentual_comissao}%` : formatCurrency(contrato.valor_comissao)} />
                <InfoBox label="Forma Pagamento" value={contrato.forma_pagamento || "-"} />
                <InfoBox label="Indice Reajuste" value={(contrato.indice_reajuste || "-").toUpperCase()} />
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Datas</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <InfoBox label="Inicio" value={formatDate(contrato.data_inicio)} />
                <InfoBox label="Vencimento" value={formatDate(contrato.data_fim)} />
                <InfoBox label="Assinatura" value={formatDate(contrato.data_assinatura)} />
                <InfoBox label="Cancelamento" value={formatDate(contrato.data_cancelamento)} />
              </div>
            </CardContent>
          </Card>

          {/* Clausulas */}
          {clausulas.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Clausulas</CardTitle></CardHeader>
              <CardContent>
                <ol className="list-decimal list-inside space-y-2">
                  {clausulas.map((c: string, idx: number) => (
                    <li key={idx} className="text-sm">{c}</li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {contrato.observacoes && (
            <Card>
              <CardHeader><CardTitle>Observacoes</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{contrato.observacoes}</p>
              </CardContent>
            </Card>
          )}

          {contrato.proposal_id && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Originado da proposta:</p>
                <Link to={`/imoveis/propostas/${contrato.proposal_id}`} className="text-primary hover:underline font-medium">
                  Proposta {contrato.proposal?.numero || contrato.proposal_id}
                  {contrato.proposal?.valor_proposta && ` - ${formatCurrency(contrato.proposal.valor_proposta)}`}
                </Link>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="assinantes">
          <Card>
            <CardContent className="pt-6">
              {signatarios.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum signatario cadastrado.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>CPF/CNPJ</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {signatarios.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell><Badge variant="outline">{SIGNATARIO_LABELS[s.tipo] || s.tipo}</Badge></TableCell>
                        <TableCell className="font-medium">{s.nome}</TableCell>
                        <TableCell className="text-sm">{s.cpf_cnpj || "-"}</TableCell>
                        <TableCell className="text-sm">{s.email || "-"}</TableCell>
                        <TableCell>
                          {s.assinado ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" /> Assinado
                              {s.assinado_em && <span className="ml-1">({formatDate(s.assinado_em)})</span>}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Pendente</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!s.assinado && status === "pendente_assinatura" && (
                            <Button variant="outline" size="sm" onClick={() => sendSignatureLink(s)}>
                              <Mail className="h-3 w-3 mr-1" /> Enviar Link
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
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
                        <p className="text-xs text-muted-foreground">{formatDateTime(h.created_at)}</p>
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
