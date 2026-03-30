import { useState } from "react";
import { Link } from "react-router-dom";
import { useVendasMT } from "@/hooks/multitenant/useVendasMT";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  ShoppingCart,
  Loader2,
} from "lucide-react";
import {
  SALE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PRICE_TIER_LABELS,
  type SaleStatus,
  type PaymentMethod,
} from "@/types/vendas";

const formatCurrency = (value: number | null) =>
  value != null
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
    : "-";

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("pt-BR");

const statusColor: Record<SaleStatus, string> = {
  orcamento: "bg-yellow-100 text-yellow-700",
  aprovado: "bg-blue-100 text-blue-700",
  concluido: "bg-green-100 text-green-700",
  cancelado: "bg-red-100 text-red-700",
};

export default function Vendas() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [formaPagamento, setFormaPagamento] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { sales, isLoading } = useVendasMT({
    search: search || undefined,
    status: (status && status !== "all" ? status : undefined) as SaleStatus | undefined,
    forma_pagamento: (formaPagamento && formaPagamento !== "all" ? formaPagamento : undefined) as PaymentMethod | undefined,
    date_from: startDate || undefined,
    date_to: endDate || undefined,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link to="/vendas" className="hover:text-foreground">
              Vendas
            </Link>
            <span>/</span>
            <span>Todas as Vendas</span>
          </div>
          <h1 className="text-2xl font-bold">Todas as Vendas</h1>
        </div>
        <Button asChild>
          <Link to="/vendas/novo">
            <Plus className="mr-2 h-4 w-4" />
            Nova Venda
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome do cliente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {Object.entries(SALE_STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Forma de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as formas</SelectItem>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">De:</span>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full sm:w-[170px]"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Ate:</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full sm:w-[170px]"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {sales.length} venda{sales.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Nenhuma venda encontrada</p>
              <p className="text-sm mt-1">Registre a primeira venda</p>
              <Button className="mt-4" asChild>
                <Link to="/vendas/novo">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Venda
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Numero</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Forma Pgto</TableHead>
                    <TableHead>Tabela</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-mono text-xs">
                        {sale.numero_venda || sale.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(sale.created_at)}
                      </TableCell>
                      <TableCell>
                        <Link
                          to={`/vendas/${sale.id}`}
                          className="font-medium hover:underline"
                        >
                          {sale.cliente_nome}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {sale.profissional?.nome || "-"}
                      </TableCell>
                      <TableCell>
                        {sale.forma_pagamento
                          ? PAYMENT_METHOD_LABELS[sale.forma_pagamento]
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {PRICE_TIER_LABELS[sale.tabela_preco]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold whitespace-nowrap">
                        {formatCurrency(sale.valor_total)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusColor[sale.status]}>
                          {SALE_STATUS_LABELS[sale.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`/vendas/${sale.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver detalhes
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={`/vendas/${sale.id}/editar`}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
