import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  useInventoryProductsMT,
  useInventoryStockMT,
  useInventoryMovementsMT,
  useInventorySuppliersMT,
} from "@/hooks/multitenant/useEstoqueMT";
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
import { ArrowLeft, ArrowDownToLine, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function EstoqueEntrada() {
  const navigate = useNavigate();
  const { franchise } = useTenantContext();
  const { products } = useInventoryProductsMT({ is_active: true });
  const { createStock } = useInventoryStockMT();
  const { createMovement } = useInventoryMovementsMT();
  const { suppliers } = useInventorySuppliersMT();

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    product_id: "",
    lote: "",
    quantidade: "",
    custo_unitario: "",
    fornecedor_id: "",
    nota_fiscal: "",
    data_validade: "",
    data_entrada: new Date().toISOString().split("T")[0],
    observacoes: "",
  });

  const selectedProduct = products.find((p) => p.id === form.product_id);
  const custoTotal =
    form.quantidade && form.custo_unitario
      ? Number(form.quantidade) * Number(form.custo_unitario)
      : 0;

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.product_id) {
      toast.error("Selecione um produto");
      return;
    }
    if (!form.quantidade || Number(form.quantidade) <= 0) {
      toast.error("Quantidade deve ser maior que zero");
      return;
    }
    if (!form.custo_unitario || Number(form.custo_unitario) <= 0) {
      toast.error("Custo unitario deve ser maior que zero");
      return;
    }

    const franchiseId = franchise?.id;
    if (!franchiseId) {
      toast.error("Selecione uma franquia para registrar a entrada");
      return;
    }

    setSaving(true);
    try {
      // Create stock record
      const stockRecord = await createStock({
        franchise_id: franchiseId,
        product_id: form.product_id,
        lote: form.lote || undefined,
        data_validade: form.data_validade || undefined,
        quantidade_inicial: Number(form.quantidade),
        custo_unitario: Number(form.custo_unitario),
        fornecedor_id: (form.fornecedor_id && form.fornecedor_id !== "none") ? form.fornecedor_id : undefined,
        nota_fiscal: form.nota_fiscal || undefined,
        data_entrada: form.data_entrada || undefined,
        observacoes: form.observacoes || undefined,
      });

      // Create movement record
      await createMovement({
        franchise_id: franchiseId,
        stock_id: stockRecord.id,
        product_id: form.product_id,
        tipo: "entrada",
        quantidade: Number(form.quantidade),
        custo_unitario: Number(form.custo_unitario),
        custo_total: custoTotal,
        motivo: `Entrada - Lote: ${form.lote || "S/L"} - NF: ${form.nota_fiscal || "S/NF"}`,
      });

      navigate("/estoque/movimentacoes");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar entrada");
    } finally {
      setSaving(false);
    }
  };

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
          <span>Nova Entrada</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/estoque/movimentacoes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Registrar Entrada</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Produto */}
        <Card>
          <CardHeader>
            <CardTitle>Produto</CardTitle>
            <CardDescription>Selecione o produto e informe o lote</CardDescription>
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
                      {p.codigo ? `${p.codigo} - ` : ""}{p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lote">Lote</Label>
              <Input
                id="lote"
                value={form.lote}
                onChange={(e) => handleChange("lote", e.target.value)}
                placeholder="Numero do lote"
              />
            </div>
          </CardContent>
        </Card>

        {/* Quantidade e Custo */}
        <Card>
          <CardHeader>
            <CardTitle>Quantidade e Custo</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="quantidade">Quantidade *</Label>
              <Input
                id="quantidade"
                type="number"
                min={1}
                value={form.quantidade}
                onChange={(e) => handleChange("quantidade", e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custo_unitario">Custo Unitario (R$) *</Label>
              <Input
                id="custo_unitario"
                type="number"
                min={0}
                step="0.01"
                value={form.custo_unitario}
                onChange={(e) => handleChange("custo_unitario", e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label>Custo Total</Label>
              <div className="h-10 px-3 py-2 rounded-md border bg-muted flex items-center font-medium">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(custoTotal)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fornecedor e NF */}
        <Card>
          <CardHeader>
            <CardTitle>Fornecedor e Nota Fiscal</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Select
                value={form.fornecedor_id}
                onValueChange={(v) => handleChange("fornecedor_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome_fantasia}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nota_fiscal">Nota Fiscal</Label>
              <Input
                id="nota_fiscal"
                value={form.nota_fiscal}
                onChange={(e) => handleChange("nota_fiscal", e.target.value)}
                placeholder="Numero da NF"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_validade">Data de Validade</Label>
              <Input
                id="data_validade"
                type="date"
                value={form.data_validade}
                onChange={(e) => handleChange("data_validade", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_entrada">Data de Entrada</Label>
              <Input
                id="data_entrada"
                type="date"
                value={form.data_entrada}
                onChange={(e) => handleChange("data_entrada", e.target.value)}
              />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="observacoes">Observacoes</Label>
              <Textarea
                id="observacoes"
                value={form.observacoes}
                onChange={(e) => handleChange("observacoes", e.target.value)}
                rows={3}
                placeholder="Observacoes sobre esta entrada"
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link to="/estoque/movimentacoes">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Registrar Entrada
          </Button>
        </div>
      </form>
    </div>
  );
}
