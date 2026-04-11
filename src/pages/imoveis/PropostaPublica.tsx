import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Building2, DollarSign, Check, X, MessageCircle, Calendar, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast, Toaster } from "sonner";

// Use anon client for public access
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const publicClient = createClient(supabaseUrl, supabaseAnonKey);

function formatCurrency(value: number | null | undefined): string {
  if (!value) return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function PropostaPublica() {
  const { token } = useParams<{ token: string }>();
  const [proposta, setProposta] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [fotos, setFotos] = useState<any[]>([]);
  const [branding, setBranding] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState(false);
  const [showContrapropostaDialog, setShowContrapropostaDialog] = useState(false);
  const [contrapropostaValor, setContrapropostaValor] = useState("");
  const [contrapropostaCondicoes, setContrapropostaCondicoes] = useState("");

  useEffect(() => {
    if (!token) return;
    loadProposta();
  }, [token]);

  const loadProposta = async () => {
    try {
      setLoading(true);
      // Fetch proposal by token (stored in metadata)
      const { data, error: fetchError } = await publicClient
        .from("mt_property_proposals")
        .select(`
          *,
          property:mt_properties!property_id(id, titulo, ref_code, foto_destaque_url, valor_venda, valor_locacao, endereco, dormitorios, area_total, banheiros, garagens),
          lead:mt_leads!lead_id(id, nome)
        `)
        .eq("metadata->>token_acesso", token!)
        .single();

      if (fetchError || !data) {
        setError("Proposta nao encontrada ou link invalido.");
        return;
      }

      setProposta(data);

      // Mark as viewed
      if (data.status === "enviada") {
        await publicClient
          .from("mt_property_proposals")
          .update({ status: "visualizada", visualizada_em: new Date().toISOString() })
          .eq("id", data.id);
      }

      // Fetch items
      const { data: itemsData } = await publicClient
        .from("mt_property_proposal_items")
        .select("*")
        .eq("proposal_id", data.id)
        .order("ordem");
      setItems(itemsData || []);

      // Fetch property photos
      if (data.property_id) {
        const { data: fotosData } = await publicClient
          .from("mt_property_photos")
          .select("url, descricao")
          .eq("property_id", data.property_id)
          .order("ordem")
          .limit(6);
        setFotos(fotosData || []);
      }

      // Fetch tenant branding
      if (data.tenant_id) {
        const { data: brandingData } = await publicClient
          .from("mt_tenant_branding")
          .select("cor_primaria, cor_secundaria, logo_url, nome_fantasia:mt_tenants!tenant_id(nome_fantasia)")
          .eq("tenant_id", data.tenant_id)
          .single();
        setBranding(brandingData);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (action: "aceita" | "rejeitada" | "contraproposta") => {
    if (!proposta) return;
    setResponding(true);
    try {
      const payload: any = {
        status: action === "contraproposta" ? "contrapropostada" : action,
        respondida_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (action === "contraproposta") {
        payload.contraproposta_valor = parseFloat(contrapropostaValor) || null;
        payload.contraproposta_condicoes = contrapropostaCondicoes || null;
      }
      const { error: updateError } = await publicClient
        .from("mt_property_proposals")
        .update(payload)
        .eq("id", proposta.id);
      if (updateError) throw updateError;

      setProposta({ ...proposta, ...payload });
      setShowContrapropostaDialog(false);
      toast.success(
        action === "aceita" ? "Proposta aceita com sucesso!" :
        action === "rejeitada" ? "Proposta rejeitada." :
        "Contraproposta enviada com sucesso!"
      );
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setResponding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-full max-w-3xl px-4 space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (error || !proposta) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Toaster richColors position="top-right" />
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6 text-center space-y-4">
            <X className="h-12 w-12 mx-auto text-red-500" />
            <h2 className="text-xl font-bold">Link Invalido</h2>
            <p className="text-muted-foreground">{error || "Proposta nao encontrada."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = proposta.validade_ate && new Date(proposta.validade_ate) < new Date();
  const canRespond = (proposta.status === "enviada" || proposta.status === "visualizada") && !isExpired;
  const alreadyResponded = ["aceita", "rejeitada", "contrapropostada", "contraproposta"].includes(proposta.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster richColors position="top-right" />

      {/* Header */}
      <div className="bg-white border-b" style={{ borderTopColor: branding?.cor_primaria || "#1E3A5F", borderTopWidth: 4 }}>
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              {branding?.logo_url && <img src={branding.logo_url} alt="" className="h-8 mb-2" />}
              <h1 className="text-2xl font-bold">Proposta Comercial</h1>
              <p className="text-muted-foreground">
                {proposta.numero ? `Proposta N. ${proposta.numero}` : ""}
                {proposta.validade_ate && ` | Valida ate ${format(new Date(proposta.validade_ate), "dd/MM/yyyy")}`}
              </p>
            </div>
            <Badge className={
              alreadyResponded
                ? proposta.status === "aceita" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                : isExpired ? "bg-orange-100 text-orange-800" : "bg-blue-100 text-blue-800"
            }>
              {alreadyResponded
                ? proposta.status === "aceita" ? "Aceita" : proposta.status === "rejeitada" ? "Rejeitada" : "Contraproposta Enviada"
                : isExpired ? "Expirada" : "Aberta"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Property photos */}
        {fotos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {fotos.map((f: any, i: number) => (
              <img key={i} src={f.url} alt={f.descricao || ""} className={`w-full object-cover rounded ${i === 0 ? "col-span-2 h-48" : "h-32"}`} />
            ))}
          </div>
        )}

        {/* Property info */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Imovel</CardTitle></CardHeader>
          <CardContent>
            <h3 className="text-lg font-semibold">{proposta.property?.titulo || "-"}</h3>
            {proposta.property?.ref_code && <p className="text-sm text-muted-foreground mb-2">Ref: {proposta.property.ref_code}</p>}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              {proposta.property?.dormitorios != null && <MiniStat label="Dormitorios" value={proposta.property.dormitorios} />}
              {proposta.property?.banheiros != null && <MiniStat label="Banheiros" value={proposta.property.banheiros} />}
              {proposta.property?.garagens != null && <MiniStat label="Vagas" value={proposta.property.garagens} />}
              {proposta.property?.area_total != null && <MiniStat label="Area" value={`${proposta.property.area_total}m2`} />}
            </div>
            {proposta.property?.endereco && <p className="text-sm mt-3 text-muted-foreground">{proposta.property.endereco}</p>}
          </CardContent>
        </Card>

        {/* Values */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> Valores da Proposta</CardTitle></CardHeader>
          <CardContent>
            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground">Valor da Proposta</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(proposta.valor_proposta)}</p>
            </div>
            <Separator className="my-4" />
            <div className="grid grid-cols-2 gap-4">
              <InfoPub label="Entrada" value={formatCurrency(proposta.valor_entrada)} />
              <InfoPub label="Financiamento" value={formatCurrency(proposta.valor_financiamento)} />
              <InfoPub label="Parcelas" value={proposta.numero_parcelas ? `${proposta.numero_parcelas}x de ${formatCurrency(proposta.valor_parcela)}` : "-"} />
              <InfoPub label="Forma de Pagamento" value={proposta.forma_pagamento?.replace(/_/g, " ") || "-"} />
            </div>
          </CardContent>
        </Card>

        {/* Payment items */}
        {items.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Detalhamento do Pagamento</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {items.map((item: any, idx: number) => (
                  <div key={item.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                    <span className="text-sm">{item.descricao || `Item ${idx + 1}`}</span>
                    <span className="font-medium">{formatCurrency(item.valor_total || item.valor_unitario)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Observations */}
        {(proposta.observacoes || proposta.condicoes_especiais) && (
          <Card>
            <CardHeader><CardTitle>Observacoes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {proposta.observacoes && <p className="text-sm whitespace-pre-wrap">{proposta.observacoes}</p>}
              {proposta.condicoes_especiais && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Condicoes Especiais</p>
                    <p className="text-sm whitespace-pre-wrap">{proposta.condicoes_especiais}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Contraproposta info if already responded */}
        {proposta.contraproposta_valor && (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader><CardTitle>Contraproposta Enviada</CardTitle></CardHeader>
            <CardContent>
              <p className="text-lg font-bold">{formatCurrency(proposta.contraproposta_valor)}</p>
              {proposta.contraproposta_condicoes && <p className="text-sm mt-1">{proposta.contraproposta_condicoes}</p>}
            </CardContent>
          </Card>
        )}

        {/* Action buttons */}
        {canRespond && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground mb-4">O que deseja fazer com esta proposta?</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button size="lg" className="bg-green-600 hover:bg-green-700" onClick={() => handleRespond("aceita")} disabled={responding}>
                  {responding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                  Aceitar Proposta
                </Button>
                <Button size="lg" variant="destructive" onClick={() => handleRespond("rejeitada")} disabled={responding}>
                  <X className="h-4 w-4 mr-2" /> Rejeitar
                </Button>
                <Button size="lg" variant="outline" onClick={() => setShowContrapropostaDialog(true)} disabled={responding}>
                  <MessageCircle className="h-4 w-4 mr-2" /> Fazer Contraproposta
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isExpired && !alreadyResponded && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-6 text-center">
              <Calendar className="h-8 w-8 mx-auto text-orange-500 mb-2" />
              <p className="font-medium">Esta proposta expirou</p>
              <p className="text-sm text-muted-foreground">O prazo de validade terminou em {format(new Date(proposta.validade_ate), "dd/MM/yyyy")}.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Contraproposta dialog */}
      <Dialog open={showContrapropostaDialog} onOpenChange={setShowContrapropostaDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Fazer Contraproposta</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Valor desejado</label>
              <input
                type="number"
                step="0.01"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={contrapropostaValor}
                onChange={(e) => setContrapropostaValor(e.target.value)}
                placeholder="Informe o valor..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Condicoes</label>
              <Textarea
                rows={3}
                value={contrapropostaCondicoes}
                onChange={(e) => setContrapropostaCondicoes(e.target.value)}
                placeholder="Descreva suas condicoes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowContrapropostaDialog(false)}>Cancelar</Button>
            <Button onClick={() => handleRespond("contraproposta")} disabled={responding}>
              {responding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Enviar Contraproposta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoPub({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center p-2 bg-gray-50 rounded">
      <p className="text-sm font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
