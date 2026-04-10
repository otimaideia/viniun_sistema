import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTenantContext } from "@/contexts/TenantContext";
import { useRedeTabelasMT, useRedeTabelaMT } from "@/hooks/multitenant/useRedeTabelasMT";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Network } from "lucide-react";

const schema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  descricao: z.string().optional(),
  tipo: z.enum(["venda", "locacao", "temporada", "lancamento", "misto"]),
  visibilidade: z.enum(["publica", "parceiros", "privada"]),
  comissao_tipo: z.enum(["percentual", "fixo"]),
  comissao_percentual: z.coerce.number().min(0).max(100).optional(),
  comissao_valor_fixo: z.coerce.number().min(0).optional(),
  validade_inicio: z.string().optional(),
  validade_fim: z.string().optional(),
  is_active: z.boolean(),
  status: z.enum(["rascunho", "ativa", "pausada", "encerrada"]),
});

type FormData = z.infer<typeof schema>;

export default function RedeTabelaEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const { tenant } = useTenantContext();

  const { create, update } = useRedeTabelasMT();
  const { data: tabela, isLoading } = useRedeTabelaMT(id);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: "",
      descricao: "",
      tipo: "venda",
      visibilidade: "publica",
      comissao_tipo: "percentual",
      comissao_percentual: 6,
      comissao_valor_fixo: 0,
      validade_inicio: "",
      validade_fim: "",
      is_active: true,
      status: "ativa",
    },
  });

  useEffect(() => {
    if (tabela && isEditing) {
      form.reset({
        nome: tabela.nome,
        descricao: tabela.descricao || "",
        tipo: tabela.tipo as any,
        visibilidade: tabela.visibilidade as any,
        comissao_tipo: tabela.comissao_tipo as any,
        comissao_percentual: tabela.comissao_percentual || 0,
        comissao_valor_fixo: tabela.comissao_valor_fixo || 0,
        validade_inicio: tabela.validade_inicio || "",
        validade_fim: tabela.validade_fim || "",
        is_active: tabela.is_active,
        status: tabela.status as any,
      });
    }
  }, [tabela, isEditing, form]);

  const comissaoTipo = form.watch("comissao_tipo");

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing && id) {
        await update.mutateAsync({ id, ...data });
      } else {
        await create.mutateAsync(data);
      }
      navigate("/imoveis/rede");
    } catch {
      // toast handled in hook
    }
  };

  if (isEditing && isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/imoveis/rede")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Network className="h-6 w-6" />
            {isEditing ? "Editar Tabela" : "Nova Tabela Colaborativa"}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? "Atualize os dados da tabela" : "Crie uma tabela de imóveis para compartilhar na rede"}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Dados Básicos */}
          <Card>
            <CardHeader><CardTitle>Informações da Tabela</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="nome" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Tabela *</FormLabel>
                  <FormControl><Input placeholder="Ex: Apartamentos Centro - Venda" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="descricao" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl><Textarea placeholder="Descreva os imóveis desta tabela..." rows={3} {...field} /></FormControl>
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="tipo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="venda">Venda</SelectItem>
                        <SelectItem value="locacao">Locação</SelectItem>
                        <SelectItem value="temporada">Temporada</SelectItem>
                        <SelectItem value="lancamento">Lançamento</SelectItem>
                        <SelectItem value="misto">Misto</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />

                <FormField control={form.control} name="visibilidade" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visibilidade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="publica">Pública (toda a rede)</SelectItem>
                        <SelectItem value="parceiros">Apenas parceiros</SelectItem>
                        <SelectItem value="privada">Privada (só eu)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {field.value === "publica" && "Todos os parceiros da rede poderão ver esta tabela."}
                      {field.value === "parceiros" && "Apenas parceiros com parceria ativa verão esta tabela."}
                      {field.value === "privada" && "Somente você terá acesso a esta tabela."}
                    </FormDescription>
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="rascunho">Rascunho</SelectItem>
                        <SelectItem value="ativa">Ativa</SelectItem>
                        <SelectItem value="pausada">Pausada</SelectItem>
                        <SelectItem value="encerrada">Encerrada</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />

                <FormField control={form.control} name="is_active" render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3 mt-2">
                    <div>
                      <FormLabel>Ativa</FormLabel>
                      <FormDescription>Tabela visível na rede</FormDescription>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          {/* Comissão */}
          <Card>
            <CardHeader><CardTitle>Comissão para Parceiros</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="comissao_tipo" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Comissão</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="percentual">Percentual (%)</SelectItem>
                      <SelectItem value="fixo">Valor Fixo (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Comissão oferecida ao parceiro que trouxer o comprador/locatário.
                  </FormDescription>
                </FormItem>
              )} />

              {comissaoTipo === "percentual" ? (
                <FormField control={form.control} name="comissao_percentual" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Percentual de Comissão (%)</FormLabel>
                    <FormControl><Input type="number" step="0.5" min="0" max="100" {...field} /></FormControl>
                    <FormDescription>Ex: 3% para o corretor parceiro que fechar a venda</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              ) : (
                <FormField control={form.control} name="comissao_valor_fixo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Fixo (R$)</FormLabel>
                    <FormControl><Input type="number" step="100" min="0" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
            </CardContent>
          </Card>

          {/* Validade */}
          <Card>
            <CardHeader><CardTitle>Validade</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="validade_inicio" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="validade_fim" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fim</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          {/* Ações */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate("/imoveis/rede")}>Cancelar</Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {isEditing ? "Salvar Alterações" : "Criar Tabela"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
