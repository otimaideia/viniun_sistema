import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  useInventoryProductMT,
  useInventoryProductsMT,
} from "@/hooks/multitenant/useEstoqueMT";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  PRODUCT_CATEGORY_LABELS,
  UNIT_TYPE_LABELS,
  type ProductCategory,
  type UnitType,
  type InventoryProductCreate,
} from "@/types/estoque";

export default function EstoqueInsumoEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { product, isLoading: loadingProduct } = useInventoryProductMT(id);
  const { createProduct, updateProduct } = useInventoryProductsMT();

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<InventoryProductCreate>({
    nome: "",
    categoria: "injetavel",
    unidade_medida: "unidade",
    is_fracionado: false,
    estoque_minimo: 1,
  });

  // Populate form when editing
  useEffect(() => {
    if (product && isEditing) {
      setForm({
        codigo: product.codigo || undefined,
        nome: product.nome,
        descricao: product.descricao || undefined,
        categoria: product.categoria,
        unidade_medida: product.unidade_medida,
        is_fracionado: product.is_fracionado,
        quantidade_total_unidade: product.quantidade_total_unidade || undefined,
        doses_por_unidade: product.doses_por_unidade || undefined,
        dose_padrao: product.dose_padrao || undefined,
        custo_pix: product.custo_pix || undefined,
        custo_cartao: product.custo_cartao || undefined,
        estoque_minimo: product.estoque_minimo,
        marca: product.marca || undefined,
        fabricante: product.fabricante || undefined,
        registro_anvisa: product.registro_anvisa || undefined,
      });
    }
  }, [product, isEditing]);

  const custoFracionado =
    form.is_fracionado && form.custo_pix && form.doses_por_unidade
      ? Number((form.custo_pix / form.doses_por_unidade).toFixed(2))
      : null;

  const handleChange = (field: keyof InventoryProductCreate, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast.error("Nome do insumo e obrigatorio");
      return;
    }

    setSaving(true);
    try {
      if (isEditing && id) {
        await updateProduct({ id, ...form });
      } else {
        await createProduct(form);
      }
      navigate("/estoque/insumos");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar insumo");
    } finally {
      setSaving(false);
    }
  };

  if (isEditing && loadingProduct) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Link to="/estoque" className="hover:text-foreground">
            Estoque
          </Link>
          <span>/</span>
          <Link to="/estoque/insumos" className="hover:text-foreground">
            Insumos
          </Link>
          <span>/</span>
          <span>{isEditing ? "Editar" : "Novo"}</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/estoque/insumos">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">
            {isEditing ? "Editar Insumo" : "Novo Insumo"}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados Basicos */}
        <Card>
          <CardHeader>
            <CardTitle>Dados Basicos</CardTitle>
            <CardDescription>Informacoes do insumo</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="codigo">Codigo</Label>
              <Input
                id="codigo"
                placeholder="Ex: INJ-001"
                value={form.codigo || ""}
                onChange={(e) => handleChange("codigo", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                placeholder="Nome do insumo"
                value={form.nome}
                onChange={(e) => handleChange("nome", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select
                value={form.categoria}
                onValueChange={(v) => handleChange("categoria", v as ProductCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRODUCT_CATEGORY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unidade de Medida *</Label>
              <Select
                value={form.unidade_medida}
                onValueChange={(v) => handleChange("unidade_medida", v as UnitType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(UNIT_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="descricao">Descricao</Label>
              <Textarea
                id="descricao"
                placeholder="Descricao do insumo"
                value={form.descricao || ""}
                onChange={(e) => handleChange("descricao", e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Fracionamento */}
        <Card>
          <CardHeader>
            <CardTitle>Fracionamento</CardTitle>
            <CardDescription>
              Para insumos que sao divididos em doses (ex: toxina botulinica)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch
                id="is_fracionado"
                checked={form.is_fracionado || false}
                onCheckedChange={(v) => handleChange("is_fracionado", v)}
              />
              <Label htmlFor="is_fracionado">Insumo fracionado</Label>
            </div>

            {form.is_fracionado && (
              <div className="grid gap-4 sm:grid-cols-3 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="quantidade_total_unidade">
                    Qtd total por unidade
                  </Label>
                  <Input
                    id="quantidade_total_unidade"
                    type="number"
                    min={0}
                    step="any"
                    value={form.quantidade_total_unidade || ""}
                    onChange={(e) =>
                      handleChange(
                        "quantidade_total_unidade",
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    placeholder="Ex: 100 (UI)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doses_por_unidade">Doses por unidade</Label>
                  <Input
                    id="doses_por_unidade"
                    type="number"
                    min={1}
                    value={form.doses_por_unidade || ""}
                    onChange={(e) =>
                      handleChange(
                        "doses_por_unidade",
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    placeholder="Ex: 5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dose_padrao">Dose padrao</Label>
                  <Input
                    id="dose_padrao"
                    type="number"
                    min={0}
                    step="any"
                    value={form.dose_padrao || ""}
                    onChange={(e) =>
                      handleChange(
                        "dose_padrao",
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    placeholder="Ex: 20 (UI)"
                  />
                </div>
                {custoFracionado != null && (
                  <div className="sm:col-span-3 p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Custo unitario fracionado:{" "}
                      <span className="font-bold text-foreground">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(custoFracionado)}
                      </span>{" "}
                      por dose
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Custos e Estoque */}
        <Card>
          <CardHeader>
            <CardTitle>Custos e Estoque</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="custo_pix">Custo (PIX)</Label>
              <Input
                id="custo_pix"
                type="number"
                min={0}
                step="0.01"
                value={form.custo_pix || ""}
                onChange={(e) =>
                  handleChange(
                    "custo_pix",
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custo_cartao">Custo (Cartao)</Label>
              <Input
                id="custo_cartao"
                type="number"
                min={0}
                step="0.01"
                value={form.custo_cartao || ""}
                onChange={(e) =>
                  handleChange(
                    "custo_cartao",
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estoque_minimo">Estoque Minimo *</Label>
              <Input
                id="estoque_minimo"
                type="number"
                min={0}
                value={form.estoque_minimo || 1}
                onChange={(e) =>
                  handleChange("estoque_minimo", Number(e.target.value))
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Informacoes Adicionais */}
        <Card>
          <CardHeader>
            <CardTitle>Informacoes Adicionais</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="marca">Marca</Label>
              <Input
                id="marca"
                value={form.marca || ""}
                onChange={(e) => handleChange("marca", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fabricante">Fabricante</Label>
              <Input
                id="fabricante"
                value={form.fabricante || ""}
                onChange={(e) => handleChange("fabricante", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registro_anvisa">Registro ANVISA</Label>
              <Input
                id="registro_anvisa"
                value={form.registro_anvisa || ""}
                onChange={(e) => handleChange("registro_anvisa", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link to="/estoque/insumos">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isEditing ? "Salvar Alteracoes" : "Criar Insumo"}
          </Button>
        </div>
      </form>
    </div>
  );
}
