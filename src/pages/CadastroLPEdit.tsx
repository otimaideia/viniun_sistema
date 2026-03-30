import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePromocaoCadastrosAdapter } from "@/hooks/usePromocaoCadastrosAdapter";
import { useFranqueadosAdapter } from "@/hooks/useFranqueadosAdapter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PromocaoCadastro } from "@/types/promocao";
import { LeadStatus, STATUS_OPTIONS, STATUS_CONFIG } from "@/types/lead-mt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Save, User } from "lucide-react";
import { toast } from "sonner";

export default function CadastroLPEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { cadastros, isLoading, updateCadastro, isUpdating } = usePromocaoCadastrosAdapter();
  const { franqueados } = useFranqueadosAdapter();

  const [form, setForm] = useState<Partial<PromocaoCadastro>>({
    nome: "",
    email: "",
    telefone: "",
    genero: null,
    data_nascimento: null,
    cep: null,
    aceita_contato: true,
    unidade: null,
    status: "novo",
  });

  const cadastro = cadastros.find((c) => c.id === id);

  useEffect(() => {
    if (isEditing && cadastro) {
      setForm({
        nome: cadastro.nome,
        email: cadastro.email,
        telefone: cadastro.telefone,
        genero: cadastro.genero,
        data_nascimento: cadastro.data_nascimento,
        cep: cadastro.cep,
        aceita_contato: cadastro.aceita_contato ?? true,
        unidade: cadastro.unidade,
        status: cadastro.status || "novo",
      });
    }
  }, [cadastro, isEditing]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-[600px]" />
        </div>
      </DashboardLayout>
    );
  }

  if (isEditing && !cadastro) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-xl font-semibold text-foreground mb-2">Cadastro não encontrado</h2>
          <p className="text-muted-foreground mb-4">O cadastro solicitado não existe ou foi removido.</p>
          <Button onClick={() => navigate("/cadastros-lp")}>Voltar para Leads Franquia</Button>
        </div>
      </DashboardLayout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.nome?.trim() || !form.telefone?.trim()) {
      toast.error("Nome e telefone são obrigatórios");
      return;
    }

    if (isEditing && cadastro) {
      await updateCadastro({ id: cadastro.id, data: form });
      navigate(`/cadastros-lp/${cadastro.id}`);
    } else {
      navigate("/cadastros-lp");
    }
  };

  const isSaving = isUpdating;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/cadastros-lp")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {isEditing ? "Editar Cadastro" : "Novo Cadastro"}
              </h1>
              {isEditing && (
                <p className="text-sm text-muted-foreground">{cadastro?.nome}</p>
              )}
            </div>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Dados Pessoais */}
              <div className="space-y-4">
                <h3 className="font-medium">Dados Pessoais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome *</Label>
                    <Input
                      value={form.nome || ""}
                      onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Gênero</Label>
                    <Select
                      value={form.genero || "none"}
                      onValueChange={(v) => setForm((f) => ({ ...f, genero: v === "none" ? null : v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Não informado</SelectItem>
                        <SelectItem value="Feminino">Feminino</SelectItem>
                        <SelectItem value="Masculino">Masculino</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data de Nascimento</Label>
                    <Input
                      type="date"
                      value={form.data_nascimento || ""}
                      onChange={(e) => setForm((f) => ({ ...f, data_nascimento: e.target.value || null }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CEP</Label>
                    <Input
                      value={form.cep || ""}
                      onChange={(e) => setForm((f) => ({ ...f, cep: e.target.value || null }))}
                      placeholder="00000-000"
                    />
                  </div>
                </div>
              </div>

              {/* Contato */}
              <div className="space-y-4">
                <h3 className="font-medium">Contato</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Telefone *</Label>
                    <Input
                      value={form.telefone || ""}
                      onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                      placeholder="(00) 00000-0000"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={form.email || ""}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.aceita_contato ?? true}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, aceita_contato: v }))}
                  />
                  <Label>Aceita receber contato</Label>
                </div>
              </div>

              {/* Unidade e Status */}
              <div className="space-y-4">
                <h3 className="font-medium">Atribuição</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Unidade</Label>
                    <Select
                      value={form.unidade || "none"}
                      onValueChange={(v) => setForm((f) => ({ ...f, unidade: v === "none" ? null : v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a unidade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {franqueados.map((f) => (
                          <SelectItem key={f.id} value={f.nome_fantasia}>
                            {f.nome_fantasia}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={form.status || "novo"}
                      onValueChange={(v) => setForm((f) => ({ ...f, status: v as LeadStatus }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((status) => (
                          <SelectItem key={status} value={status}>
                            {STATUS_CONFIG[status]?.label || status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => navigate("/cadastros-lp")}>
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
                      Salvar
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
