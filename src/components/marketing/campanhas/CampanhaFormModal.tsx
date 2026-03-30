import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMarketingCampanhasAdapter } from "@/hooks/useMarketingCampanhasAdapter";
import { useFranqueadosAdapter } from "@/hooks/useFranqueadosAdapter";
import type {
  MarketingCampanha,
  CampanhaTipo,
  CampanhaStatus,
  MarketingCampanhaFormData,
} from "@/types/marketing";
import {
  CANAIS_OPTIONS,
  CAMPANHA_STATUS_OPTIONS,
  CAMPANHA_TIPO_OPTIONS,
} from "@/types/marketing";

interface CampanhaFormModalProps {
  campanha?: MarketingCampanha;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CampanhaFormModal({
  campanha,
  open,
  onOpenChange,
  onSuccess,
}: CampanhaFormModalProps) {
  // Verifica se é edição (tem id) ou clone/novo (não tem id)
  const isEditing = !!(campanha && 'id' in campanha && campanha.id);
  const { createCampanha, updateCampanha, isCreating, isUpdating } = useMarketingCampanhasAdapter();
  const { franqueados } = useFranqueadosAdapter();

  const [formData, setFormData] = useState<MarketingCampanhaFormData>({
    nome: "",
    descricao: "",
    tipo: "geral",
    status: "ativa",
    unidade_id: null,
    data_inicio: "",
    data_fim: "",
    budget_estimado: undefined,
    budget_real: undefined,
    receita_gerada: undefined,
    objetivo: "",
    publico_alvo: "",
    canais: [],
    utm_source: "",
    utm_medium: "",
    utm_campaign: "",
    utm_term: "",
    utm_content: "",
  });

  useEffect(() => {
    if (campanha) {
      setFormData({
        nome: campanha.nome,
        descricao: campanha.descricao || "",
        tipo: campanha.tipo,
        status: campanha.status,
        unidade_id: campanha.unidade_id || null,
        data_inicio: campanha.data_inicio || "",
        data_fim: campanha.data_fim || "",
        budget_estimado: campanha.budget_estimado,
        budget_real: campanha.budget_real,
        receita_gerada: campanha.receita_gerada,
        objetivo: campanha.objetivo || "",
        publico_alvo: campanha.publico_alvo || "",
        canais: campanha.canais || [],
        utm_source: campanha.utm_source || "",
        utm_medium: campanha.utm_medium || "",
        utm_campaign: campanha.utm_campaign || "",
        utm_term: campanha.utm_term || "",
        utm_content: campanha.utm_content || "",
      });
    } else {
      setFormData({
        nome: "",
        descricao: "",
        tipo: "geral",
        status: "ativa",
        unidade_id: null,
        data_inicio: "",
        data_fim: "",
        budget_estimado: undefined,
        budget_real: undefined,
        receita_gerada: undefined,
        objetivo: "",
        publico_alvo: "",
        canais: [],
        utm_source: "",
        utm_medium: "",
        utm_campaign: "",
        utm_term: "",
        utm_content: "",
      });
    }
  }, [campanha, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && campanha) {
        await updateCampanha(campanha.id, formData);
      } else {
        await createCampanha(formData);
      }
      onSuccess();
    } catch (error) {
      console.error("Erro ao salvar campanha:", error);
    }
  };

  const handleCanaisChange = (canal: string, checked: boolean) => {
    if (checked) {
      setFormData({ ...formData, canais: [...(formData.canais || []), canal] });
    } else {
      setFormData({
        ...formData,
        canais: (formData.canais || []).filter((c) => c !== canal),
      });
    }
  };

  const isLoading = isCreating || isUpdating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Campanha" : "Nova Campanha"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Edite as informacoes da campanha de marketing"
              : "Crie uma nova campanha de marketing"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informacoes Basicas */}
          <div className="space-y-4">
            <h3 className="font-medium">Informacoes Basicas</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Campanha *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Black Friday 2025"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value: CampanhaTipo) =>
                    setFormData({ ...formData, tipo: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPANHA_TIPO_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: CampanhaStatus) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPANHA_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unidade_id">Unidade</Label>
                <Select
                  value={formData.unidade_id || "geral"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      unidade_id: value === "geral" ? null : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="geral">Geral (todas as unidades)</SelectItem>
                    {franqueados.map((franqueado) => (
                      <SelectItem key={franqueado.id} value={franqueado.id}>
                        {franqueado.nome_fantasia}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descricao</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descreva o objetivo da campanha..."
                rows={3}
              />
            </div>
          </div>

          {/* Datas e Orcamento */}
          <div className="space-y-4">
            <h3 className="font-medium">Datas e Orcamento</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_inicio">Data de Inicio</Label>
                <Input
                  id="data_inicio"
                  type="date"
                  value={formData.data_inicio}
                  onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_fim">Data de Fim</Label>
                <Input
                  id="data_fim"
                  type="date"
                  value={formData.data_fim}
                  onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budget_estimado">Budget Estimado (R$)</Label>
                <Input
                  id="budget_estimado"
                  type="number"
                  step="0.01"
                  value={formData.budget_estimado || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      budget_estimado: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget_real">Budget Real (R$)</Label>
                <Input
                  id="budget_real"
                  type="number"
                  step="0.01"
                  value={formData.budget_real || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      budget_real: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receita_gerada">Receita Gerada (R$)</Label>
                <Input
                  id="receita_gerada"
                  type="number"
                  step="0.01"
                  value={formData.receita_gerada || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      receita_gerada: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Budget Real e Receita podem ser atualizados durante a execucao da campanha
            </p>
          </div>

          {/* Canais */}
          <div className="space-y-4">
            <h3 className="font-medium">Canais de Divulgacao</h3>
            <div className="grid grid-cols-3 gap-4">
              {CANAIS_OPTIONS.map((canal) => (
                <div key={canal.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={canal.value}
                    checked={formData.canais?.includes(canal.value) || false}
                    onCheckedChange={(checked) =>
                      handleCanaisChange(canal.value, checked as boolean)
                    }
                  />
                  <Label htmlFor={canal.value} className="font-normal">
                    {canal.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* UTM Parameters */}
          <div className="space-y-4">
            <h3 className="font-medium">Parametros UTM</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="utm_source">UTM Source</Label>
                <Input
                  id="utm_source"
                  value={formData.utm_source}
                  onChange={(e) => setFormData({ ...formData, utm_source: e.target.value })}
                  placeholder="Ex: facebook"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="utm_medium">UTM Medium</Label>
                <Input
                  id="utm_medium"
                  value={formData.utm_medium}
                  onChange={(e) => setFormData({ ...formData, utm_medium: e.target.value })}
                  placeholder="Ex: cpc"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="utm_campaign">UTM Campaign</Label>
                <Input
                  id="utm_campaign"
                  value={formData.utm_campaign}
                  onChange={(e) => setFormData({ ...formData, utm_campaign: e.target.value })}
                  placeholder="Ex: black_friday_2025"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="utm_term">UTM Term</Label>
                <Input
                  id="utm_term"
                  value={formData.utm_term}
                  onChange={(e) => setFormData({ ...formData, utm_term: e.target.value })}
                  placeholder="Ex: depilacao_laser"
                />
              </div>
            </div>
          </div>

          {/* Objetivo e Publico */}
          <div className="space-y-4">
            <h3 className="font-medium">Estrategia</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="objetivo">Objetivo</Label>
                <Textarea
                  id="objetivo"
                  value={formData.objetivo}
                  onChange={(e) => setFormData({ ...formData, objetivo: e.target.value })}
                  placeholder="Qual o objetivo principal da campanha?"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="publico_alvo">Publico Alvo</Label>
                <Textarea
                  id="publico_alvo"
                  value={formData.publico_alvo}
                  onChange={(e) => setFormData({ ...formData, publico_alvo: e.target.value })}
                  placeholder="Descreva o publico alvo da campanha..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : isEditing ? "Salvar Alteracoes" : "Criar Campanha"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
