import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
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
import { ArrowLeft, Plus, Trash2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

const signatarioSchema = z.object({
  tipo: z.string().min(1),
  nome: z.string().min(1, "Nome obrigatorio"),
  cpf_cnpj: z.string().optional(),
  email: z.string().optional(),
  telefone: z.string().optional(),
});

const clausulaSchema = z.object({
  texto: z.string().min(1, "Texto da clausula obrigatorio"),
});

const formSchema = z.object({
  property_id: z.string().min(1, "Selecione o imovel"),
  lead_id: z.string().optional(),
  owner_id: z.string().optional(),
  corretor_id: z.string().optional(),
  tipo: z.string().min(1, "Selecione o tipo"),
  valor_contrato: z.coerce.number().min(0.01, "Informe o valor"),
  valor_entrada: z.coerce.number().optional(),
  valor_financiamento: z.coerce.number().optional(),
  valor_aluguel: z.coerce.number().optional(),
  dia_vencimento: z.coerce.number().optional(),
  valor_comissao: z.coerce.number().optional(),
  percentual_comissao: z.coerce.number().optional(),
  data_inicio: z.string().min(1, "Data de inicio obrigatoria"),
  data_fim: z.string().optional(),
  indice_reajuste: z.string().optional(),
  forma_pagamento: z.string().optional(),
  observacoes: z.string().optional(),
  signatarios: z.array(signatarioSchema).optional(),
  clausulas: z.array(clausulaSchema).optional(),
});

type FormData = z.infer<typeof formSchema>;

const TIPOS_CONTRATO = [
  { value: "venda", label: "Venda" },
  { value: "locacao", label: "Locacao Definitiva" },
  { value: "permuta", label: "Permuta" },
  { value: "cessao", label: "Cessao" },
  { value: "compromisso", label: "Compromisso" },
  { value: "outro", label: "Outro" },
];

const INDICES_REAJUSTE = [
  { value: "igpm", label: "IGPM" },
  { value: "ipca", label: "IPCA" },
  { value: "inpc", label: "INPC" },
  { value: "fixo", label: "Fixo" },
  { value: "nenhum", label: "Nenhum" },
];

const TIPOS_SIGNATARIO = [
  { value: "comprador", label: "Comprador" },
  { value: "vendedor", label: "Vendedor" },
  { value: "locador", label: "Locador" },
  { value: "locatario", label: "Locatario" },
  { value: "fiador", label: "Fiador" },
  { value: "testemunha", label: "Testemunha" },
  { value: "corretor", label: "Corretor" },
  { value: "representante", label: "Representante" },
];

export default function ContratoImovelEdit() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const proposalId = searchParams.get("proposal_id");
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
      owner_id: "",
      corretor_id: "",
      tipo: "venda",
      valor_contrato: 0,
      valor_entrada: 0,
      valor_financiamento: 0,
      valor_aluguel: 0,
      dia_vencimento: 10,
      valor_comissao: 0,
      percentual_comissao: 0,
      data_inicio: new Date().toISOString().split("T")[0],
      data_fim: "",
      indice_reajuste: "nenhum",
      forma_pagamento: "",
      observacoes: "",
      signatarios: [],
      clausulas: [],
    },
  });

  const signatarioFields = useFieldArray({ control: form.control, name: "signatarios" });
  const clausulaFields = useFieldArray({ control: form.control, name: "clausulas" });

  const tipo = form.watch("tipo");
  const isLocacao = tipo === "locacao";

  // Fetch existing contract
  const { data: contrato, isLoading: loadingContrato } = useQuery({
    queryKey: ["mt-contrato-imovel", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mt_property_contracts" as any)
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: isEditing,
  });

  // Fetch existing signatories
  const { data: existingSignatarios = [] } = useQuery({
    queryKey: ["mt-contrato-signatarios", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("mt_property_contract_signatories" as any)
        .select("*")
        .eq("contract_id", id!)
        .order("ordem");
      return data || [];
    },
    enabled: isEditing,
  });

  // Pre-fill from proposal
  const { data: proposal } = useQuery({
    queryKey: ["mt-proposta-imovel-for-contract", proposalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mt_property_proposals" as any)
        .select("*, lead:mt_leads!lead_id(id, nome, email, telefone), corretor:mt_corretores!corretor_id(id, nome)")
        .eq("id", proposalId!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!proposalId && !isEditing,
  });

  // Properties search
  const { data: properties = [] } = useQuery({
    queryKey: ["mt-properties-search", tenant?.id, propertySearch],
    queryFn: async () => {
      let q = supabase.from("mt_properties" as any).select("id, titulo, ref_code, valor_venda").is("deleted_at", null).order("titulo").limit(20);
      if (tenant) q = q.eq("tenant_id", tenant.id);
      if (propertySearch) q = q.or(`titulo.ilike.%${propertySearch}%,ref_code.ilike.%${propertySearch}%`);
      const { data } = await q;
      return data || [];
    },
    enabled: !!tenant || accessLevel === "platform",
  });

  // Leads & Owners & Corretores
  const { data: leads = [] } = useQuery({
    queryKey: ["mt-leads-search-c", tenant?.id, leadSearch],
    queryFn: async () => {
      let q = supabase.from("mt_leads" as any).select("id, nome, email").is("deleted_at", null).order("nome").limit(20);
      if (tenant) q = q.eq("tenant_id", tenant.id);
      if (leadSearch) q = q.or(`nome.ilike.%${leadSearch}%,email.ilike.%${leadSearch}%`);
      const { data } = await q;
      return data || [];
    },
    enabled: !!tenant || accessLevel === "platform",
  });

  const { data: owners = [] } = useQuery({
    queryKey: ["mt-owners-select", tenant?.id],
    queryFn: async () => {
      let q = supabase.from("mt_property_owners" as any).select("id, nome").is("deleted_at", null).order("nome");
      if (tenant) q = q.eq("tenant_id", tenant.id);
      const { data } = await q;
      return data || [];
    },
    enabled: !!tenant || accessLevel === "platform",
  });

  const { data: corretores = [] } = useQuery({
    queryKey: ["mt-corretores-select-c", tenant?.id],
    queryFn: async () => {
      let q = supabase.from("mt_corretores" as any).select("id, nome").is("deleted_at", null).eq("is_active", true).order("nome");
      if (tenant) q = q.eq("tenant_id", tenant.id);
      const { data } = await q;
      return data || [];
    },
    enabled: !!tenant || accessLevel === "platform",
  });

  // Populate from existing contract
  useEffect(() => {
    if (contrato) {
      form.reset({
        property_id: contrato.property_id || "",
        lead_id: contrato.lead_id || "",
        owner_id: contrato.owner_id || "",
        corretor_id: contrato.corretor_id || "",
        tipo: contrato.tipo || "venda",
        valor_contrato: contrato.valor_contrato || 0,
        valor_entrada: contrato.valor_entrada || 0,
        valor_financiamento: contrato.valor_financiamento || 0,
        valor_aluguel: contrato.valor_aluguel || 0,
        dia_vencimento: contrato.dia_vencimento || 10,
        valor_comissao: contrato.valor_comissao || 0,
        percentual_comissao: contrato.percentual_comissao || 0,
        data_inicio: contrato.data_inicio?.split("T")[0] || "",
        data_fim: contrato.data_fim?.split("T")[0] || "",
        indice_reajuste: contrato.indice_reajuste || "nenhum",
        forma_pagamento: contrato.forma_pagamento || "",
        observacoes: contrato.observacoes || "",
        clausulas: contrato.clausulas ? (typeof contrato.clausulas === "string" ? contrato.clausulas.split("\n").filter(Boolean).map((t: string) => ({ texto: t })) : []) : [],
        signatarios: [],
      });
    }
  }, [contrato]);

  useEffect(() => {
    if (existingSignatarios.length > 0) {
      form.setValue("signatarios", existingSignatarios.map((s: any) => ({
        tipo: s.tipo,
        nome: s.nome,
        cpf_cnpj: s.cpf_cnpj || "",
        email: s.email || "",
        telefone: s.telefone || "",
      })));
    }
  }, [existingSignatarios]);

  // Pre-fill from proposal
  useEffect(() => {
    if (proposal && !isEditing) {
      form.setValue("property_id", proposal.property_id || "");
      form.setValue("lead_id", proposal.lead_id || "");
      form.setValue("corretor_id", proposal.corretor_id || "");
      form.setValue("valor_contrato", proposal.valor_proposta || 0);
      form.setValue("valor_entrada", proposal.valor_entrada || 0);
      form.setValue("valor_financiamento", proposal.valor_financiamento || 0);
      form.setValue("forma_pagamento", proposal.forma_pagamento || "");
    }
  }, [proposal]);

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const clausulasText = data.clausulas?.map(c => c.texto).join("\n") || null;

      const payload: any = {
        property_id: data.property_id || null,
        proposal_id: proposalId || contrato?.proposal_id || null,
        lead_id: data.lead_id || null,
        owner_id: data.owner_id || null,
        corretor_id: data.corretor_id || null,
        tipo: data.tipo,
        valor_contrato: data.valor_contrato,
        valor_entrada: data.valor_entrada || null,
        valor_financiamento: data.valor_financiamento || null,
        valor_aluguel: data.valor_aluguel || null,
        dia_vencimento: data.dia_vencimento || null,
        valor_comissao: data.valor_comissao || null,
        percentual_comissao: data.percentual_comissao || null,
        data_inicio: data.data_inicio || null,
        data_fim: data.data_fim || null,
        indice_reajuste: data.indice_reajuste || null,
        forma_pagamento: data.forma_pagamento || null,
        observacoes: data.observacoes || null,
        clausulas: clausulasText,
        status: "rascunho",
        updated_at: new Date().toISOString(),
      };

      let contractId = id;

      if (isEditing) {
        const { error } = await supabase.from("mt_property_contracts" as any).update(payload).eq("id", id!);
        if (error) throw error;
      } else {
        payload.tenant_id = tenant?.id;
        payload.franchise_id = franchise?.id || null;
        const { data: newRow, error } = await supabase.from("mt_property_contracts" as any).insert(payload).select("id").single();
        if (error) throw error;
        contractId = newRow.id;
      }

      // Save signatories
      if (data.signatarios && data.signatarios.length > 0 && contractId) {
        await supabase.from("mt_property_contract_signatories" as any).delete().eq("contract_id", contractId);
        const sigPayload = data.signatarios.map((s, idx) => ({
          tenant_id: tenant?.id,
          contract_id: contractId,
          tipo: s.tipo,
          nome: s.nome,
          cpf_cnpj: s.cpf_cnpj || null,
          email: s.email || null,
          telefone: s.telefone || null,
          ordem: idx + 1,
          assinado: false,
        }));
        const { error: sigError } = await supabase.from("mt_property_contract_signatories" as any).insert(sigPayload);
        if (sigError) throw sigError;
      }

      return contractId;
    },
    onSuccess: (contractId) => {
      queryClient.invalidateQueries({ queryKey: ["mt-contratos-imoveis"] });
      toast.success("Contrato salvo com sucesso");
      navigate(`/imoveis/contratos/${contractId}`);
    },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  });

  if (isEditing && loadingContrato) {
    return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/imoveis/contratos")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{isEditing ? "Editar Contrato" : "Novo Contrato"}</h1>
          <p className="text-muted-foreground">
            {proposalId ? "Gerando contrato a partir de proposta aceita" : isEditing ? `Editando contrato ${contrato?.numero || ""}` : "Crie um novo contrato"}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((d) => saveMutation.mutate(d))} className="space-y-6">
          {/* Tipo e Partes */}
          <Card>
            <CardHeader><CardTitle>Tipo e Partes</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="tipo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Contrato *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{TIPOS_CONTRATO.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="property_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Imovel *</FormLabel>
                    <div className="space-y-2">
                      <Input placeholder="Buscar imovel..." value={propertySearch} onChange={(e) => setPropertySearch(e.target.value)} />
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                        <SelectContent>{properties.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.titulo} {p.ref_code ? `(${p.ref_code})` : ""}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="lead_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente / Lead</FormLabel>
                    <div className="space-y-2">
                      <Input placeholder="Buscar..." value={leadSearch} onChange={(e) => setLeadSearch(e.target.value)} />
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                        <SelectContent>{leads.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="owner_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proprietario</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                      <SelectContent>{owners.map((o: any) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="corretor_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Corretor</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                      <SelectContent>{corretores.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
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
                <FormField control={form.control} name="valor_contrato" render={({ field }) => (
                  <FormItem><FormLabel>Valor do Contrato *</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="valor_entrada" render={({ field }) => (
                  <FormItem><FormLabel>Entrada</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="valor_financiamento" render={({ field }) => (
                  <FormItem><FormLabel>Financiamento</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                {isLocacao && (
                  <>
                    <FormField control={form.control} name="valor_aluguel" render={({ field }) => (
                      <FormItem><FormLabel>Valor Mensal</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="dia_vencimento" render={({ field }) => (
                      <FormItem><FormLabel>Dia Vencimento</FormLabel><FormControl><Input type="number" min={1} max={31} {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </>
                )}
                <FormField control={form.control} name="valor_comissao" render={({ field }) => (
                  <FormItem><FormLabel>Comissao Corretor (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="percentual_comissao" render={({ field }) => (
                  <FormItem><FormLabel>Comissao (%)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="forma_pagamento" render={({ field }) => (
                  <FormItem><FormLabel>Forma de Pagamento</FormLabel><FormControl><Input placeholder="Ex: financiamento bancario..." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          {/* Datas e Reajuste */}
          <Card>
            <CardHeader><CardTitle>Datas e Reajuste</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField control={form.control} name="data_inicio" render={({ field }) => (
                  <FormItem><FormLabel>Data Inicio *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="data_fim" render={({ field }) => (
                  <FormItem><FormLabel>Data Vencimento</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="indice_reajuste" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Indice de Reajuste</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{INDICES_REAJUSTE.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          {/* Clausulas */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Clausulas</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={() => clausulaFields.append({ texto: "" })}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {clausulaFields.fields.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma clausula adicionada.</p>
              ) : (
                clausulaFields.fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2">
                    <span className="text-sm font-medium mt-2 shrink-0">{index + 1}.</span>
                    <Textarea rows={2} {...form.register(`clausulas.${index}.texto`)} placeholder="Texto da clausula..." className="flex-1" />
                    <Button type="button" variant="ghost" size="icon" onClick={() => clausulaFields.remove(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Signatarios */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Signatarios</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={() => signatarioFields.append({ tipo: "comprador", nome: "", cpf_cnpj: "", email: "", telefone: "" })}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {signatarioFields.fields.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum signatario adicionado.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>CPF/CNPJ</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {signatarioFields.fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell>
                          <Select value={form.watch(`signatarios.${index}.tipo`)} onValueChange={(v) => form.setValue(`signatarios.${index}.tipo`, v)}>
                            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                            <SelectContent>{TIPOS_SIGNATARIO.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell><Input {...form.register(`signatarios.${index}.nome`)} placeholder="Nome..." /></TableCell>
                        <TableCell><Input {...form.register(`signatarios.${index}.cpf_cnpj`)} placeholder="CPF/CNPJ" className="w-[140px]" /></TableCell>
                        <TableCell><Input {...form.register(`signatarios.${index}.email`)} placeholder="Email" /></TableCell>
                        <TableCell><Input {...form.register(`signatarios.${index}.telefone`)} placeholder="Telefone" className="w-[130px]" /></TableCell>
                        <TableCell>
                          <Button type="button" variant="ghost" size="icon" onClick={() => signatarioFields.remove(index)}>
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
            <CardContent>
              <FormField control={form.control} name="observacoes" render={({ field }) => (
                <FormItem><FormControl><Textarea rows={4} placeholder="Observacoes gerais..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Buttons */}
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => navigate("/imoveis/contratos")}>Cancelar</Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Contrato
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
