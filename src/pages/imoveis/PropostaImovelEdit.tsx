import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTenantContext } from "@/contexts/TenantContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, Trash2, Loader2, Save, Send } from "lucide-react";
import { toast } from "sonner";

const itemPagamentoSchema = z.object({
  tipo: z.string().min(1, "Selecione o tipo"),
  valor: z.coerce.number().min(0.01, "Valor obrigatorio"),
  data_vencimento: z.string().optional(),
  descricao: z.string().optional(),
});

const formSchema = z.object({
  property_id: z.string().min(1, "Selecione o imovel"),
  lead_id: z.string().optional(),
  corretor_id: z.string().optional(),
  valor_proposta: z.coerce.number().min(0.01, "Informe o valor da proposta"),
  valor_entrada: z.coerce.number().optional(),
  valor_financiamento: z.coerce.number().optional(),
  numero_parcelas: z.coerce.number().optional(),
  valor_parcela: z.coerce.number().optional(),
  forma_pagamento: z.string().optional(),
  condicoes_pagamento: z.string().optional(),
  prazo_validade_dias: z.coerce.number().min(1).default(15),
  observacoes: z.string().optional(),
  condicoes_especiais: z.string().optional(),
  itens: z.array(itemPagamentoSchema).optional(),
});

type FormData = z.infer<typeof formSchema>;

const FORMAS_PAGAMENTO = [
  { value: "a_vista", label: "A vista" },
  { value: "financiamento", label: "Financiamento" },
  { value: "parcelado", label: "Parcelado" },
  { value: "permuta", label: "Permuta" },
  { value: "misto", label: "Misto" },
];

const TIPOS_ITEM = [
  { value: "entrada", label: "Entrada" },
  { value: "parcela", label: "Parcela" },
  { value: "financiamento", label: "Financiamento" },
  { value: "sinal", label: "Sinal" },
  { value: "intermediaria", label: "Intermediaria" },
  { value: "chaves", label: "Entrega das Chaves" },
  { value: "permuta", label: "Permuta" },
  { value: "outro", label: "Outro" },
];

export default function PropostaImovelEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { tenant, franchise, accessLevel } = useTenantContext();
  const isEditing = !!id;
  const [propertySearch, setPropertySearch] = useState("");
  const [leadSearch, setLeadSearch] = useState("");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      property_id: "",
      lead_id: "",
      corretor_id: "",
      valor_proposta: 0,
      valor_entrada: 0,
      valor_financiamento: 0,
      numero_parcelas: 0,
      valor_parcela: 0,
      forma_pagamento: "a_vista",
      prazo_validade_dias: 15,
      observacoes: "",
      condicoes_especiais: "",
      itens: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "itens" });

  // Fetch existing proposal
  const { data: proposta, isLoading: loadingProposta } = useQuery({
    queryKey: ["mt-proposta-imovel", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mt_property_proposals" as any)
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: isEditing,
  });

  // Fetch proposal items
  const { data: existingItems = [] } = useQuery({
    queryKey: ["mt-proposta-items", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("mt_property_proposal_items" as any)
        .select("*")
        .eq("proposal_id", id!)
        .order("ordem");
      return data || [];
    },
    enabled: isEditing,
  });

  // Properties search
  const { data: properties = [] } = useQuery({
    queryKey: ["mt-properties-search", tenant?.id, propertySearch],
    queryFn: async () => {
      let q = supabase
        .from("mt_properties" as any)
        .select("id, titulo, ref_code, valor_venda, valor_locacao, foto_destaque_url")
        .is("deleted_at", null)
        .order("titulo")
        .limit(20);
      if (tenant) q = q.eq("tenant_id", tenant.id);
      if (propertySearch) q = q.or(`titulo.ilike.%${propertySearch}%,ref_code.ilike.%${propertySearch}%`);
      const { data } = await q;
      return data || [];
    },
    enabled: !!tenant || accessLevel === "platform",
  });

  // Leads search
  const { data: leads = [] } = useQuery({
    queryKey: ["mt-leads-search", tenant?.id, leadSearch],
    queryFn: async () => {
      let q = supabase
        .from("mt_leads" as any)
        .select("id, nome, email, telefone")
        .is("deleted_at", null)
        .order("nome")
        .limit(20);
      if (tenant) q = q.eq("tenant_id", tenant.id);
      if (leadSearch) q = q.or(`nome.ilike.%${leadSearch}%,email.ilike.%${leadSearch}%`);
      const { data } = await q;
      return data || [];
    },
    enabled: !!tenant || accessLevel === "platform",
  });

  // Corretores
  const { data: corretores = [] } = useQuery({
    queryKey: ["mt-corretores-select", tenant?.id],
    queryFn: async () => {
      let q = supabase
        .from("mt_corretores" as any)
        .select("id, nome")
        .is("deleted_at", null)
        .eq("is_active", true)
        .order("nome");
      if (tenant) q = q.eq("tenant_id", tenant.id);
      const { data } = await q;
      return data || [];
    },
    enabled: !!tenant || accessLevel === "platform",
  });

  // Populate form on edit
  useEffect(() => {
    if (proposta) {
      form.reset({
        property_id: proposta.property_id || "",
        lead_id: proposta.lead_id || "",
        corretor_id: proposta.corretor_id || "",
        valor_proposta: proposta.valor_proposta || 0,
        valor_entrada: proposta.valor_entrada || 0,
        valor_financiamento: proposta.valor_financiamento || 0,
        numero_parcelas: proposta.numero_parcelas || 0,
        valor_parcela: proposta.valor_parcela || 0,
        forma_pagamento: proposta.forma_pagamento || "a_vista",
        prazo_validade_dias: proposta.prazo_validade_dias || 15,
        observacoes: proposta.observacoes || "",
        condicoes_especiais: proposta.condicoes_especiais || "",
        itens: [],
      });
    }
  }, [proposta]);

  useEffect(() => {
    if (existingItems.length > 0) {
      form.setValue("itens", existingItems.map((i: any) => ({
        tipo: i.descricao?.includes("Entrada") ? "entrada" : i.descricao?.includes("Parcela") ? "parcela" : "outro",
        valor: i.valor_total || i.valor_unitario || 0,
        data_vencimento: "",
        descricao: i.descricao || "",
      })));
    }
  }, [existingItems]);

  // Auto-fill valor when property selected
  const selectedPropertyId = form.watch("property_id");
  useEffect(() => {
    if (!isEditing && selectedPropertyId) {
      const prop = properties.find((p: any) => p.id === selectedPropertyId);
      if (prop?.valor_venda && !form.getValues("valor_proposta")) {
        form.setValue("valor_proposta", prop.valor_venda);
      }
    }
  }, [selectedPropertyId, properties]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async ({ data, sendAfterSave }: { data: FormData; sendAfterSave: boolean }) => {
      const payload: any = {
        property_id: data.property_id || null,
        lead_id: data.lead_id || null,
        corretor_id: data.corretor_id || null,
        valor_proposta: data.valor_proposta,
        valor_entrada: data.valor_entrada || null,
        valor_financiamento: data.valor_financiamento || null,
        numero_parcelas: data.numero_parcelas || null,
        valor_parcela: data.valor_parcela || null,
        forma_pagamento: data.forma_pagamento || null,
        condicoes_pagamento: data.condicoes_pagamento || null,
        prazo_validade_dias: data.prazo_validade_dias,
        observacoes: data.observacoes || null,
        condicoes_especiais: data.condicoes_especiais || null,
        status: sendAfterSave ? "enviada" : "rascunho",
        updated_at: new Date().toISOString(),
      };

      if (sendAfterSave) {
        payload.enviada_em = new Date().toISOString();
        const validade = new Date();
        validade.setDate(validade.getDate() + (data.prazo_validade_dias || 15));
        payload.validade_ate = validade.toISOString();
      }

      let proposalId = id;

      if (isEditing) {
        const { error } = await supabase
          .from("mt_property_proposals" as any)
          .update(payload)
          .eq("id", id!);
        if (error) throw error;
      } else {
        payload.tenant_id = tenant?.id;
        payload.franchise_id = franchise?.id || null;
        if (!sendAfterSave) {
          payload.status = "rascunho";
        }
        const { data: newRow, error } = await supabase
          .from("mt_property_proposals" as any)
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        proposalId = newRow.id;
      }

      // Save items
      if (data.itens && data.itens.length > 0 && proposalId) {
        // Delete existing
        await supabase.from("mt_property_proposal_items" as any).delete().eq("proposal_id", proposalId);
        // Insert new
        const itemsPayload = data.itens.map((item, idx) => ({
          tenant_id: tenant?.id,
          proposal_id: proposalId,
          descricao: item.descricao || TIPOS_ITEM.find(t => t.value === item.tipo)?.label || item.tipo,
          quantidade: 1,
          valor_unitario: item.valor,
          valor_total: item.valor,
          ordem: idx + 1,
        }));
        const { error: itemsError } = await supabase
          .from("mt_property_proposal_items" as any)
          .insert(itemsPayload);
        if (itemsError) throw itemsError;
      }

      return proposalId;
    },
    onSuccess: (proposalId, { sendAfterSave }) => {
      queryClient.invalidateQueries({ queryKey: ["mt-propostas-imoveis"] });
      queryClient.invalidateQueries({ queryKey: ["mt-proposta-imovel", id] });
      toast.success(sendAfterSave ? "Proposta enviada com sucesso" : "Proposta salva como rascunho");
      navigate(`/imoveis/propostas/${proposalId}`);
    },
    onError: (err: any) => {
      toast.error(`Erro ao salvar: ${err.message}`);
    },
  });

  const onSubmit = (data: FormData, sendAfterSave = false) => {
    saveMutation.mutate({ data, sendAfterSave });
  };

  if (isEditing && loadingProposta) {
    return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/imoveis/propostas")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{isEditing ? "Editar Proposta" : "Nova Proposta"}</h1>
          <p className="text-muted-foreground">
            {isEditing ? `Editando proposta ${proposta?.numero || ""}` : "Crie uma nova proposta para um imovel"}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((d) => onSubmit(d, false))} className="space-y-6">
          {/* Imovel e Cliente */}
          <Card>
            <CardHeader><CardTitle>Imovel e Cliente</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="property_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Imovel *</FormLabel>
                    <div className="space-y-2">
                      <Input placeholder="Buscar imovel..." value={propertySearch} onChange={(e) => setPropertySearch(e.target.value)} />
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione o imovel" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {properties.map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.titulo} {p.ref_code ? `(${p.ref_code})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="lead_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente / Lead</FormLabel>
                    <div className="space-y-2">
                      <Input placeholder="Buscar lead..." value={leadSearch} onChange={(e) => setLeadSearch(e.target.value)} />
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {leads.map((l: any) => (
                            <SelectItem key={l.id} value={l.id}>
                              {l.nome} {l.email ? `(${l.email})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="corretor_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Corretor</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione o corretor" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {corretores.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="forma_pagamento" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Forma de Pagamento</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {FORMAS_PAGAMENTO.map((f) => (
                          <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          {/* Valores */}
          <Card>
            <CardHeader><CardTitle>Valores</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="valor_proposta" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor da Proposta *</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="valor_entrada" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Entrada</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="valor_financiamento" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Financiamento</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="numero_parcelas" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parcelas</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="valor_parcela" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Parcela</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="prazo_validade_dias" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Validade (dias)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          {/* Itens de Pagamento */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Itens de Pagamento</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ tipo: "parcela", valor: 0, data_vencimento: "", descricao: "" })}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {fields.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum item adicionado.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Descricao</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell>
                          <Select value={form.watch(`itens.${index}.tipo`)} onValueChange={(v) => form.setValue(`itens.${index}.tipo`, v)}>
                            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {TIPOS_ITEM.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input type="number" step="0.01" className="w-[120px]" {...form.register(`itens.${index}.valor`, { valueAsNumber: true })} />
                        </TableCell>
                        <TableCell>
                          <Input type="date" className="w-[150px]" {...form.register(`itens.${index}.data_vencimento`)} />
                        </TableCell>
                        <TableCell>
                          <Input placeholder="Descricao..." {...form.register(`itens.${index}.descricao`)} />
                        </TableCell>
                        <TableCell>
                          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Observacoes */}
          <Card>
            <CardHeader><CardTitle>Observacoes</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="observacoes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Observacoes</FormLabel>
                  <FormControl><Textarea rows={4} placeholder="Observacoes gerais sobre a proposta..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="condicoes_especiais" render={({ field }) => (
                <FormItem>
                  <FormLabel>Condicoes Especiais</FormLabel>
                  <FormControl><Textarea rows={3} placeholder="Condicoes especiais da proposta..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Buttons */}
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => navigate("/imoveis/propostas")}>Cancelar</Button>
            <Button type="submit" variant="secondary" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Rascunho
            </Button>
            <Button
              type="button"
              disabled={saveMutation.isPending}
              onClick={form.handleSubmit((d) => onSubmit(d, true))}
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Salvar e Enviar
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
