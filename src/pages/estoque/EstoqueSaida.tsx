import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  useInventoryProductsMT,
  useInventoryStockMT,
  useInventoryMovementsMT,
} from "@/hooks/multitenant/useEstoqueMT";
import { useFranchisesMT } from "@/hooks/multitenant/useFranchisesMT";
import { useTenantContext } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Save,
  Loader2,
  PackageMinus,
  ArrowRightLeft,
  AlertTriangle,
  ClipboardEdit,
} from "lucide-react";
import { toast } from "sonner";

type MovementTipo = "saida" | "ajuste" | "perda" | "transferencia";

const TIPO_CONFIG: Record<
  MovementTipo,
  { label: string; icon: React.ReactNode; color: string; description: string }
> = {
  saida: {
    label: "Saida",
    icon: <PackageMinus className="h-4 w-4" />,
    color: "text-orange-600",
    description: "Retirada de produto do estoque (uso, venda, etc.)",
  },
  ajuste: {
    label: "Ajuste",
    icon: <ClipboardEdit className="h-4 w-4" />,
    color: "text-blue-600",
    description: "Correcao de quantidade apos contagem fisica",
  },
  perda: {
    label: "Perda",
    icon: <AlertTriangle className="h-4 w-4" />,
    color: "text-red-600",
    description: "Produto vencido, danificado ou extraviado",
  },
  transferencia: {
    label: "Transferencia",
    icon: <ArrowRightLeft className="h-4 w-4" />,
    color: "text-purple-600",
    description: "Transferir estoque para outra franquia",
  },
};

export default function EstoqueSaida() {
  const navigate = useNavigate();
  const { franchise, tenant } = useTenantContext();
  const { products } = useInventoryProductsMT({ is_active: true });
  const { createMovement } = useInventoryMovementsMT();
  const { franchises } = useFranchisesMT();

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    tipo: "" as MovementTipo | "",
    product_id: "",
    stock_id: "",
    quantidade: "",
    motivo: "",
    transfer_franchise_id: "",
  });

  // Fetch stock lots filtered by selected product
  const { stock: stockLots, isLoading: isLoadingStock } = useInventoryStockMT(
    franchise?.id,
    form.product_id || undefined
  );

  // Filter lots with available quantity
  const availableLots = useMemo(
    () => stockLots.filter((s) => s.quantidade_atual > 0),
    [stockLots]
  );

  const selectedLot = availableLots.find((s) => s.id === form.stock_id);
  const selectedProduct = products.find((p) => p.id === form.product_id);

  // Filter franchises for transfer (exclude current)
  const transferFranchises = useMemo(
    () => (franchises || []).filter((f) => f.id !== franchise?.id && f.status === "ativa"),
    [franchises, franchise?.id]
  );

  // Reset stock_id when product changes
  useEffect(() => {
    setForm((prev) => ({ ...prev, stock_id: "" }));
  }, [form.product_id]);

  // Reset transfer_franchise_id when tipo changes
  useEffect(() => {
    if (form.tipo !== "transferencia") {
      setForm((prev) => ({ ...prev, transfer_franchise_id: "" }));
    }
  }, [form.tipo]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!form.tipo) {
      toast.error("Selecione o tipo de movimentacao");
      return false;
    }
    if (!form.product_id) {
      toast.error("Selecione um produto");
      return false;
    }
    if (!form.stock_id) {
      toast.error("Selecione um lote de estoque");
      return false;
    }
    if (!form.quantidade || Number(form.quantidade) <= 0) {
      toast.error("Quantidade deve ser maior que zero");
      return false;
    }
    if (!form.motivo.trim()) {
      toast.error("Informe o motivo da movimentacao");
      return false;
    }

    const qty = Number(form.quantidade);

    // For saida, perda, transferencia: validate against available stock
    if (
      (form.tipo === "saida" || form.tipo === "perda" || form.tipo === "transferencia") &&
      selectedLot &&
      qty > selectedLot.quantidade_atual
    ) {
      toast.error(
        `Quantidade indisponivel. Estoque atual do lote: ${selectedLot.quantidade_atual}`
      );
      return false;
    }

    // For ajuste: allow any positive value (will be subtracted from current)
    if (form.tipo === "ajuste" && selectedLot && qty > selectedLot.quantidade_atual) {
      toast.error(
        `Ajuste nao pode exceder o estoque atual do lote: ${selectedLot.quantidade_atual}`
      );
      return false;
    }

    if (form.tipo === "transferencia" && !form.transfer_franchise_id) {
      toast.error("Selecione a franquia de destino para transferencia");
      return false;
    }

    const franchiseId = franchise?.id;
    if (!franchiseId) {
      toast.error("Selecione uma franquia para registrar a movimentacao");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const franchiseId = franchise!.id;
    const qty = Number(form.quantidade);
    const tipo = form.tipo as MovementTipo;
    const tipoLabel = TIPO_CONFIG[tipo].label;

    setSaving(true);
    try {
      await createMovement({
        franchise_id: franchiseId,
        stock_id: form.stock_id,
        product_id: form.product_id,
        tipo,
        quantidade: qty,
        motivo: `${tipoLabel} - ${form.motivo}`,
        transfer_franchise_id:
          tipo === "transferencia" ? form.transfer_franchise_id : undefined,
      });

      navigate("/estoque/movimentacoes");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar movimentacao");
    } finally {
      setSaving(false);
    }
  };

  const tipoConfig = form.tipo ? TIPO_CONFIG[form.tipo as MovementTipo] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Link to="/estoque" className="hover:text-foreground">
            Estoque
          </Link>
          <span>/</span>
          <Link to="/estoque/movimentacoes" className="hover:text-foreground">
            Movimentacoes
          </Link>
          <span>/</span>
          <span>Nova Movimentacao</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/estoque/movimentacoes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Registrar Movimentacao</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tipo de Movimentacao */}
        <Card>
          <CardHeader>
            <CardTitle>Tipo de Movimentacao</CardTitle>
            <CardDescription>
              Selecione o tipo de movimentacao que deseja registrar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(Object.entries(TIPO_CONFIG) as [MovementTipo, typeof TIPO_CONFIG[MovementTipo]][]).map(
                ([key, config]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleChange("tipo", key)}
                    className={`flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors hover:bg-accent ${
                      form.tipo === key
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border"
                    }`}
                  >
                    <div className={`flex items-center gap-2 font-medium ${config.color}`}>
                      {config.icon}
                      {config.label}
                    </div>
                    <p className="text-xs text-muted-foreground">{config.description}</p>
                  </button>
                )
              )}
            </div>
          </CardContent>
        </Card>

        {/* Produto e Lote */}
        {form.tipo && (
          <Card>
            <CardHeader>
              <CardTitle>Produto e Lote</CardTitle>
              <CardDescription>
                Selecione o produto e o lote de estoque
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Produto *</Label>
                <Select
                  value={form.product_id}
                  onValueChange={(v) => handleChange("product_id", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.codigo ? `${p.codigo} - ` : ""}
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Lote de Estoque *</Label>
                <Select
                  value={form.stock_id}
                  onValueChange={(v) => handleChange("stock_id", v)}
                  disabled={!form.product_id || isLoadingStock}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        !form.product_id
                          ? "Selecione um produto primeiro"
                          : isLoadingStock
                          ? "Carregando lotes..."
                          : availableLots.length === 0
                          ? "Nenhum lote com estoque"
                          : "Selecione o lote"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLots.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <span>
                            {s.lote || "S/Lote"} - Qtd: {s.quantidade_atual}
                          </span>
                          {s.data_validade && (
                            <Badge variant="outline" className="text-xs">
                              Val:{" "}
                              {new Date(s.data_validade).toLocaleDateString("pt-BR")}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Stock lot details */}
              {selectedLot && (
                <div className="sm:col-span-2">
                  <div className="rounded-md border bg-muted/50 p-3 flex flex-wrap gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Lote:</span>{" "}
                      <span className="font-medium">{selectedLot.lote || "S/Lote"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Estoque Atual:</span>{" "}
                      <span className="font-medium">
                        {selectedLot.quantidade_atual}{" "}
                        {selectedProduct?.unidade_medida || "un"}
                      </span>
                    </div>
                    {selectedLot.data_validade && (
                      <div>
                        <span className="text-muted-foreground">Validade:</span>{" "}
                        <span className="font-medium">
                          {new Date(selectedLot.data_validade).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    )}
                    {selectedLot.custo_unitario > 0 && (
                      <div>
                        <span className="text-muted-foreground">Custo Unit.:</span>{" "}
                        <span className="font-medium">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(selectedLot.custo_unitario)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quantidade e Motivo */}
        {form.tipo && form.product_id && (
          <Card>
            <CardHeader>
              <CardTitle>Quantidade e Motivo</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quantidade">Quantidade *</Label>
                <Input
                  id="quantidade"
                  type="number"
                  min={1}
                  max={selectedLot?.quantidade_atual || undefined}
                  value={form.quantidade}
                  onChange={(e) => handleChange("quantidade", e.target.value)}
                  placeholder="0"
                />
                {selectedLot && (
                  <p className="text-xs text-muted-foreground">
                    Disponivel: {selectedLot.quantidade_atual}{" "}
                    {selectedProduct?.unidade_medida || "un"}
                  </p>
                )}
              </div>

              {/* Transfer: target franchise */}
              {form.tipo === "transferencia" && (
                <div className="space-y-2">
                  <Label>Franquia de Destino *</Label>
                  <Select
                    value={form.transfer_franchise_id}
                    onValueChange={(v) => handleChange("transfer_franchise_id", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a franquia destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {transferFranchises.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nome_fantasia || f.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className={form.tipo === "transferencia" ? "sm:col-span-2" : ""}>
                <div className="space-y-2">
                  <Label htmlFor="motivo">Motivo *</Label>
                  <Textarea
                    id="motivo"
                    value={form.motivo}
                    onChange={(e) => handleChange("motivo", e.target.value)}
                    rows={3}
                    placeholder={
                      form.tipo === "saida"
                        ? "Ex: Uso em procedimento, venda, etc."
                        : form.tipo === "ajuste"
                        ? "Ex: Correcao apos inventario fisico"
                        : form.tipo === "perda"
                        ? "Ex: Produto vencido, frasco quebrado, etc."
                        : "Ex: Reposicao de estoque na unidade X"
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link to="/estoque/movimentacoes">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={saving || !form.tipo}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Registrar {tipoConfig?.label || "Movimentacao"}
          </Button>
        </div>
      </form>
    </div>
  );
}
