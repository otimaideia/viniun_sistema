import { Link, useParams, useNavigate } from "react-router-dom";
import {
  useInventoryProductMT,
  useInventoryStockMT,
  useInventoryMovementsMT,
  useServiceProductsMT,
} from "@/hooks/multitenant/useEstoqueMT";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Pencil,
  Package,
  Boxes,
  ArrowUpDown,
  LinkIcon,
  Loader2,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import {
  PRODUCT_CATEGORY_LABELS,
  UNIT_TYPE_LABELS,
  MOVEMENT_TYPE_LABELS,
} from "@/types/estoque";

const formatCurrency = (value: number | null) =>
  value != null
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
    : "-";

const formatDate = (date: string | null) =>
  date
    ? new Date(date).toLocaleDateString("pt-BR")
    : "-";

const formatDateTime = (date: string) =>
  new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const movementColor: Record<string, string> = {
  entrada: "bg-green-100 text-green-800",
  saida: "bg-red-100 text-red-800",
  ajuste: "bg-blue-100 text-blue-800",
  perda: "bg-orange-100 text-orange-800",
  transferencia: "bg-purple-100 text-purple-800",
};

export default function EstoqueInsumoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { product, isLoading } = useInventoryProductMT(id);
  const { stock, isLoading: stockLoading } = useInventoryStockMT(undefined, id);
  const { movements, isLoading: movLoading } = useInventoryMovementsMT({ product_id: id });
  const { serviceProducts, isLoading: spLoading } = useServiceProductsMT();

  // Filter service products for this product
  const linkedServices = serviceProducts.filter((sp) => sp.product_id === id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Insumo nao encontrado</p>
        <Button className="mt-4" variant="outline" asChild>
          <Link to="/estoque/insumos">Voltar</Link>
        </Button>
      </div>
    );
  }

  const totalStock = stock.reduce((sum, s) => sum + s.quantidade_atual, 0);
  const isLowStock = totalStock <= product.estoque_minimo;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
            <span>{product.nome}</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/estoque/insumos">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">{product.nome}</h1>
            <Badge variant={product.is_active ? "default" : "secondary"}>
              {product.is_active ? "Ativo" : "Inativo"}
            </Badge>
          </div>
        </div>
        <Button asChild>
          <Link to={`/estoque/insumos/${id}/editar`}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Link>
        </Button>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Categoria</p>
            <p className="font-medium">{PRODUCT_CATEGORY_LABELS[product.categoria]}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Unidade</p>
            <p className="font-medium">{UNIT_TYPE_LABELS[product.unidade_medida]}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Custo (PIX)</p>
            <p className="font-medium">{formatCurrency(product.custo_pix)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Estoque Total</p>
              {isLowStock && <AlertTriangle className="h-4 w-4 text-destructive" />}
            </div>
            <p className={`font-medium text-lg ${isLowStock ? "text-destructive" : ""}`}>
              {totalStock}{" "}
              <span className="text-sm text-muted-foreground">
                (min: {product.estoque_minimo})
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Fracionamento Info */}
      {product.is_fracionado && (
        <Card>
          <CardHeader>
            <CardTitle>Fracionamento</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Qtd total/unidade</p>
              <p className="font-medium">{product.quantidade_total_unidade || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Doses/unidade</p>
              <p className="font-medium">{product.doses_por_unidade || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Dose padrao</p>
              <p className="font-medium">{product.dose_padrao || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Custo/dose</p>
              <p className="font-medium">
                {formatCurrency(product.custo_unitario_fracionado)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lotes em Estoque */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Boxes className="h-5 w-5" />
            Lotes em Estoque
          </CardTitle>
          <CardDescription>
            {stock.length} lote{stock.length !== 1 ? "s" : ""} registrado{stock.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stockLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : stock.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum lote em estoque
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lote</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead className="text-right">Qtd Atual</TableHead>
                  <TableHead className="text-right">Custo Unit.</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Nota Fiscal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stock.map((s) => {
                  const isExpiring =
                    s.data_validade &&
                    new Date(s.data_validade) <
                      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                  const isExpired =
                    s.data_validade && new Date(s.data_validade) < new Date();

                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono">{s.lote || "-"}</TableCell>
                      <TableCell>{s.supplier?.nome_fantasia || "-"}</TableCell>
                      <TableCell className="text-right font-medium">
                        {s.quantidade_atual}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(s.custo_unitario)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            isExpired
                              ? "text-destructive font-medium"
                              : isExpiring
                              ? "text-yellow-600"
                              : ""
                          }
                        >
                          {formatDate(s.data_validade)}
                          {isExpired && " (vencido)"}
                        </span>
                      </TableCell>
                      <TableCell>{s.nota_fiscal || "-"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Movimentacoes Recentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5" />
            Movimentacoes Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {movLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : movements.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma movimentacao registrada
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead className="text-right">Custo Total</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.slice(0, 10).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm">
                      {formatDateTime(m.created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={movementColor[m.tipo] || ""}
                      >
                        {MOVEMENT_TYPE_LABELS[m.tipo]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {m.tipo === "entrada" ? "+" : "-"}
                      {m.quantidade}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(m.custo_total)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {m.motivo || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Servicos Vinculados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Servicos Vinculados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {spLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : linkedServices.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum servico vinculado a este insumo
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Servico</TableHead>
                  <TableHead className="text-right">Qtd Padrao</TableHead>
                  <TableHead>Obrigatorio</TableHead>
                  <TableHead>Observacoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linkedServices.map((sp) => (
                  <TableRow key={sp.id}>
                    <TableCell className="font-medium">
                      {sp.service?.nome || "-"}
                    </TableCell>
                    <TableCell className="text-right">{sp.quantidade}</TableCell>
                    <TableCell>
                      <Badge variant={sp.is_obrigatorio ? "default" : "secondary"}>
                        {sp.is_obrigatorio ? "Sim" : "Nao"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {sp.observacoes || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
