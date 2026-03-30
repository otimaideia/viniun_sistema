import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useCampanhasAdapter } from "@/hooks/useCampanhasAdapter";
import { useFranqueadosAdapter } from "@/hooks/useFranqueadosAdapter";
import { useUserProfileAdapter } from "@/hooks/useUserProfileAdapter";
import { CampanhaFormData, CAMPANHA_TIPOS, CAMPANHA_STATUS, CampanhaTipo, CampanhaStatus } from "@/types/campanha";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Save,
  Megaphone
} from "lucide-react";
import { format } from "date-fns";

const CampanhaEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const { franqueados } = useFranqueadosAdapter();
  const { isAdmin, profile } = useUserProfileAdapter();
  const {
    campanhas,
    isLoading,
    createCampanha,
    updateCampanha,
    isCreating,
    isUpdating
  } = useCampanhasAdapter({});

  const campanha = id ? campanhas.find((c) => c.id === id) : null;

  const [formData, setFormData] = useState<CampanhaFormData>({
    nome: "",
    tipo: "meta_ads",
    status: "ativa",
    orcamento_mensal: undefined,
    franqueado_id: isAdmin ? undefined : profile?.franqueado_id || undefined,
    data_inicio: format(new Date(), "yyyy-MM-dd"),
    data_fim: undefined,
    descricao: "",
  });

  useEffect(() => {
    if (campanha && isEditing) {
      setFormData({
        nome: campanha.nome,
        tipo: campanha.tipo,
        status: campanha.status,
        orcamento_mensal: campanha.orcamento_mensal || undefined,
        franqueado_id: campanha.franqueado_id || undefined,
        data_inicio: campanha.data_inicio || undefined,
        data_fim: campanha.data_fim || undefined,
        descricao: campanha.descricao || "",
      });
    }
  }, [campanha, isEditing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) return;

    if (isEditing && id) {
      updateCampanha({ id, ...formData });
    } else {
      createCampanha(formData);
    }
    navigate("/campanhas");
  };

  if (isLoading && isEditing) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  if (isEditing && !campanha && !isLoading) {
    return (
      <div className="text-center py-12">
        <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-muted-foreground">Campanha não encontrada</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/campanhas">Voltar às Campanhas</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/campanhas">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">
            {isEditing ? "Editar Campanha" : "Nova Campanha"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEditing
              ? "Altere os dados da campanha de marketing"
              : "Cadastre uma nova campanha de marketing"}
          </p>
        </div>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Dados da Campanha</CardTitle>
            <CardDescription>
              Preencha as informações da campanha
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Campanha *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Meta Ads - Janeiro 2025"
                required
              />
            </div>

            {/* Tipo e Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value: CampanhaTipo) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPANHA_TIPOS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: CampanhaStatus) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPANHA_STATUS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Orçamento e Franquia */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="orcamento">Orçamento Mensal (R$)</Label>
                <Input
                  id="orcamento"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.orcamento_mensal || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      orcamento_mensal: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="0,00"
                />
              </div>
              {isAdmin && (
                <div className="space-y-2">
                  <Label htmlFor="franqueado">Franquia (opcional)</Label>
                  <Select
                    value={formData.franqueado_id || "none"}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        franqueado_id: value === "none" ? undefined : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma franquia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma (Campanha Global)</SelectItem>
                      {franqueados.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nome_fantasia}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Datas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_inicio">Data de Início</Label>
                <Input
                  id="data_inicio"
                  type="date"
                  value={formData.data_inicio || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      data_inicio: e.target.value || undefined,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_fim">Data de Término</Label>
                <Input
                  id="data_fim"
                  type="date"
                  value={formData.data_fim || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      data_fim: e.target.value || undefined,
                    })
                  }
                />
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descreva os objetivos e detalhes da campanha..."
                rows={4}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" asChild>
                <Link to="/campanhas">Cancelar</Link>
              </Button>
              <Button
                type="submit"
                disabled={!formData.nome.trim() || isCreating || isUpdating}
              >
                <Save className="h-4 w-4 mr-1" />
                {isCreating || isUpdating ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default CampanhaEdit;
