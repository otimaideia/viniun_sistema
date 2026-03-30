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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useMarketingTemplatesAdapter } from "@/hooks/useMarketingTemplatesAdapter";
import { useFranqueadosAdapter } from "@/hooks/useFranqueadosAdapter";
import type { MarketingTemplate, TemplateType, MarketingTemplateFormData } from "@/types/marketing";
import { TEMPLATE_TYPE_OPTIONS, DEFAULT_TEMPLATE_VARIABLES } from "@/types/marketing";

interface TemplateFormModalProps {
  template?: MarketingTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function TemplateFormModal({
  template,
  open,
  onOpenChange,
  onSuccess,
}: TemplateFormModalProps) {
  const isEditing = !!template;
  const { createTemplate, updateTemplate, isCreating, isUpdating } = useMarketingTemplatesAdapter();
  const { franqueados } = useFranqueadosAdapter();

  const [formData, setFormData] = useState<MarketingTemplateFormData>({
    nome_template: "",
    template_content: "",
    tipo: "whatsapp",
    variaveis_disponiveis: [],
    is_default: false,
    ativo: true,
    unidade_id: null,
  });

  const [newVariable, setNewVariable] = useState("");

  useEffect(() => {
    if (template) {
      setFormData({
        nome_template: template.nome_template,
        template_content: template.template_content,
        tipo: template.tipo,
        variaveis_disponiveis: template.variaveis_disponiveis || [],
        is_default: template.is_default || false,
        ativo: template.ativo,
        unidade_id: template.unidade_id || null,
      });
    } else {
      setFormData({
        nome_template: "",
        template_content: "",
        tipo: "whatsapp",
        variaveis_disponiveis: [],
        is_default: false,
        ativo: true,
        unidade_id: null,
      });
    }
  }, [template, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && template) {
        await updateTemplate(template.id, formData);
      } else {
        await createTemplate(formData);
      }
      onSuccess();
    } catch (error) {
      console.error("Erro ao salvar template:", error);
    }
  };

  const addVariable = () => {
    if (newVariable && !formData.variaveis_disponiveis?.includes(newVariable)) {
      setFormData({
        ...formData,
        variaveis_disponiveis: [...(formData.variaveis_disponiveis || []), newVariable],
      });
      setNewVariable("");
    }
  };

  const removeVariable = (variable: string) => {
    setFormData({
      ...formData,
      variaveis_disponiveis: formData.variaveis_disponiveis?.filter((v) => v !== variable) || [],
    });
  };

  const insertVariable = (variable: string) => {
    setFormData({
      ...formData,
      template_content: formData.template_content + variable,
    });
  };

  const isLoading = isCreating || isUpdating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Template" : "Novo Template"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Edite as informacoes do template de marketing"
              : "Crie um novo template de marketing para suas campanhas"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome_template">Nome do Template *</Label>
              <Input
                id="nome_template"
                value={formData.nome_template}
                onChange={(e) =>
                  setFormData({ ...formData, nome_template: e.target.value })
                }
                placeholder="Ex: Boas-vindas WhatsApp"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo *</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value: TemplateType) =>
                  setFormData({ ...formData, tipo: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="unidade_id">Unidade (opcional)</Label>
            <Select
              value={formData.unidade_id || "geral"}
              onValueChange={(value) =>
                setFormData({ ...formData, unidade_id: value === "geral" ? null : value })
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

          <div className="space-y-2">
            <Label>Variaveis Disponiveis</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {DEFAULT_TEMPLATE_VARIABLES.map((variable) => (
                <Badge
                  key={variable}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                  onClick={() => insertVariable(variable)}
                >
                  {variable}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newVariable}
                onChange={(e) => setNewVariable(e.target.value)}
                placeholder="Nova variavel (ex: {custom})"
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addVariable())}
              />
              <Button type="button" variant="outline" onClick={addVariable}>
                Adicionar
              </Button>
            </div>
            {formData.variaveis_disponiveis && formData.variaveis_disponiveis.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.variaveis_disponiveis.map((variable) => (
                  <Badge key={variable} variant="secondary" className="gap-1">
                    {variable}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeVariable(variable)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="template_content">Conteudo do Template *</Label>
            <Textarea
              id="template_content"
              value={formData.template_content}
              onChange={(e) =>
                setFormData({ ...formData, template_content: e.target.value })
              }
              placeholder="Digite o conteudo do template. Use as variaveis acima para personalizar."
              rows={8}
              required
            />
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="ativo"
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
              />
              <Label htmlFor="ativo">Template ativo</Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_default"
                checked={formData.is_default}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_default: checked })
                }
              />
              <Label htmlFor="is_default">Template padrao</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : isEditing ? "Salvar Alteracoes" : "Criar Template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
