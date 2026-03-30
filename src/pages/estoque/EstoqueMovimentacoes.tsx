import { useState } from "react";
import { Link } from "react-router-dom";
import {
  useInventoryMovementsMT,
  useInventoryProductsMT,
} from "@/hooks/multitenant/useEstoqueMT";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowUpDown,
  ArrowDownToLine,
  ArrowUpFromLine,
  Loader2,
} from "lucide-react";
import {
  MOVEMENT_TYPE_LABELS,
  type MovementType,
} from "@/types/estoque";

const formatCurrency = (value: number | null) =>
  value != null
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
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

export default function EstoqueMovimentacoes() {
  const [tipo, setTipo] = useState<string>("");
  const [productId, setProductId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { movements, isLoading } = useInventoryMovementsMT({
    tipo: (tipo && tipo !== "all" ? tipo : undefined) as any,
    product_id: (productId && productId !== "all" ? productId : undefined),
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  });
  const { products } = useInventoryProductsMT({ is_active: true });

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
            <span>Movimentacoes</span>
          </div>
          <h1 className="text-2xl font-bold">Movimentacoes</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/estoque/movimentacoes/saida">
              <ArrowUpFromLine className="mr-2 h-4 w-4" />
              Nova Movimentacao
            </Link>
          </Button>
          <Button asChild>
            <Link to="/estoque/movimentacoes/entrada">
              <ArrowDownToLine className="mr-2 h-4 w-4" />
              Nova Entrada
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {Object.entries(MOVEMENT_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os produtos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os produtos</SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="Data inicio"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="Data fim"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5" />
            {movements.length} movimentacao{movements.length !== 1 ? "es" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ArrowUpDown className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Nenhuma movimentacao encontrada</p>
              <p className="text-sm mt-1">Ajuste os filtros ou registre uma nova entrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead className="text-right">Custo Unit.</TableHead>
                  <TableHead className="text-right">Custo Total</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm whitespace-nowrap">
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
                    <TableCell>
                      {m.product ? (
                        <Link
                          to={`/estoque/insumos/${m.product.id}`}
                          className="hover:underline font-medium"
                        >
                          {m.product.nome}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {m.tipo === "entrada" ? "+" : "-"}
                      {m.quantidade}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(m.custo_unitario)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(m.custo_total)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {m.motivo || "-"}
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
