import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTenantContext } from "@/contexts/TenantContext";
import { useFAQsMT, useFAQMT } from "@/hooks/multitenant/useFAQsMT";
import { useFAQCategoriesMT } from "@/hooks/multitenant/useFAQCategoriesMT";
import { useDepartments } from "@/hooks/multitenant/useDepartments";
import { useSOPsMT } from "@/hooks/multitenant/useSOPsMT";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, HelpCircle } from "lucide-react";

const faqSchema = z.object({
  pergunta: z
    .string()
    .min(5, "A pergunta deve ter pelo menos 5 caracteres")
    .max(500, "Maximo 500 caracteres"),
  resposta: z
    .string()
    .min(10, "A resposta deve ter pelo menos 10 caracteres")
    .max(5000, "Maximo 5000 caracteres"),
  category_id: z.string().optional(),
  department_id: z.string().optional(),
  sop_id: z.string().optional(),
  tags_input: z.string().optional(),
  is_pinned: z.boolean(),
  is_published: z.boolean(),
});

type FAQFormValues = z.infer<typeof faqSchema>;

export default function FAQEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = !!id;
  const { tenant, accessLevel } = useTenantContext();
  const { create, update } = useFAQsMT();
  const { data: existingFAQ, isLoading } = useFAQMT(isEditing ? id : undefined);
  const { categories } = useFAQCategoriesMT();
  const { departments } = useDepartments();
  const { data: sops } = useSOPsMT();

  const form = useForm<FAQFormValues>({
    resolver: zodResolver(faqSchema),
    defaultValues: {
      pergunta: "",
      resposta: "",
      category_id: "",
      department_id: "",
      sop_id: "",
      tags_input: "",
      is_pinned: false,
      is_published: true,
    },
  });

  useEffect(() => {
    if (existingFAQ && isEditing) {
      form.reset({
        pergunta: existingFAQ.pergunta,
        resposta: existingFAQ.resposta,
        category_id: existingFAQ.category_id || "",
        department_id: existingFAQ.department_id || "",
        sop_id: existingFAQ.sop_id || "",
        tags_input: existingFAQ.tags?.join(", ") || "",
        is_pinned: existingFAQ.is_pinned,
        is_published: existingFAQ.is_published,
      });
    }
  }, [existingFAQ, isEditing, form]);

  const onSubmit = async (values: FAQFormValues) => {
    setIsSaving(true);
    try {
      const tags = values.tags_input
        ? values.tags_input
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : null;

      const faqData = {
        pergunta: values.pergunta,
        resposta: values.resposta,
        category_id: values.category_id || null,
        department_id: values.department_id || null,
        sop_id: values.sop_id || null,
        tags,
        is_pinned: values.is_pinned,
        is_published: values.is_published,
      };

      if (isEditing) {
        await update.mutateAsync({ id, ...faqData });
      } else {
        await create.mutateAsync(faqData);
      }

      navigate("/processos/faq");
    } catch (err: any) {
      console.error("Erro ao salvar FAQ:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && isEditing) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <HelpCircle className="h-6 w-6" />
            {isEditing ? "Editar FAQ" : "Nova FAQ"}
          </h1>
          <p className="text-muted-foreground">
            {isEditing
              ? "Atualize a pergunta e resposta"
              : "Cadastre uma nova pergunta frequente"}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Conteudo */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Conteudo</CardTitle>
                <CardDescription>
                  Pergunta e resposta da FAQ
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="pergunta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pergunta *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ex: Como agendar uma sessao?"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="resposta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Resposta *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Escreva a resposta detalhada aqui..."
                          rows={8}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Escreva uma resposta clara e objetiva
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Classificacao */}
            <Card>
              <CardHeader>
                <CardTitle>Classificacao</CardTitle>
                <CardDescription>
                  Categoria, departamento e tags
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select
                        onValueChange={(v) =>
                          field.onChange(v === "__none__" ? "" : v)
                        }
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">
                            Sem categoria
                          </SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="department_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departamento</FormLabel>
                      <Select
                        onValueChange={(v) =>
                          field.onChange(v === "__none__" ? "" : v)
                        }
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um departamento" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">
                            Sem departamento
                          </SelectItem>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tags_input"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: agendamento, horario, sessao"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Separe as tags por virgula
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Configuracoes */}
            <Card>
              <CardHeader>
                <CardTitle>Configuracoes</CardTitle>
                <CardDescription>
                  Vinculacao e visibilidade
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="sop_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>POP Vinculado</FormLabel>
                      <Select
                        onValueChange={(v) =>
                          field.onChange(v === "__none__" ? "" : v)
                        }
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Vincular a um POP (opcional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">Nenhum</SelectItem>
                          {sops?.map((sop) => (
                            <SelectItem key={sop.id} value={sop.id}>
                              {sop.codigo} - {sop.titulo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Vincule a um Procedimento Operacional Padrao
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_published"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3 space-y-0 rounded-lg border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-0.5">
                        <FormLabel className="cursor-pointer">
                          Publicada
                        </FormLabel>
                        <FormDescription>
                          FAQs publicadas ficam visiveis para todos os usuarios
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_pinned"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3 space-y-0 rounded-lg border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-0.5">
                        <FormLabel className="cursor-pointer">
                          Fixada no topo
                        </FormLabel>
                        <FormDescription>
                          FAQs fixadas aparecem primeiro na listagem
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          {/* Botoes */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? "Salvar Alteracoes" : "Criar FAQ"}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
