import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useInventorySuppliersMT, useInventoryProductsMT } from "@/hooks/multitenant/useEstoqueMT";
import { usePriceComparisonMT } from "@/hooks/multitenant/useSupplierPricesMT";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Scale, Search, Loader2, TrendingDown, TrendingUp, Package, Truck,
  X,
} from "lucide-react";
import type { ProductCategory } from "@/types/estoque";
import { PRODUCT_CATEGORY_LABELS } from "@/types/estoque";

const formatCurrency = (value: number | null) =>
  value != null
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
    : "-";

const formatDate = (date: string | null) =>
  date ? new Date(date + "T12:00:00").toLocaleDateString("pt-BR") : "";

export default function EstoqueCotacao() {
  const { suppliers, isLoading: suppLoading } = useInventorySuppliersMT();
  const { products } = useInventoryProductsMT();
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const { rows, isLoading: compLoading } = usePriceComparisonMT(
    selectedSupplierIds,
    categoryFilter || undefined,
  );

  const selectedSuppliers = useMemo(
    () => suppliers.filter(s => selectedSupplierIds.includes(s.id)),
    [suppliers, selectedSupplierIds],
  );

  const toggleSupplier = (supplierId: string) => {
    setSelectedSupplierIds(prev =>
      prev.includes(supplierId)
        ? prev.filter(id => id !== supplierId)
        : prev.length < 10 ? [...prev, supplierId] : prev
    );
  };

  const removeSupplier = (supplierId: string) => {
    setSelectedSupplierIds(prev => prev.filter(id => id !== supplierId));
  };

  // Summary metrics
  const totalProducts = rows.length;
  const avgSavings = useMemo(() => {
    if (rows.length === 0) return 0;
    let totalDiff = 0;
    let count = 0;
    rows.forEach(r => {
      if (r.best_price !== null && r.worst_price !== null) {
        totalDiff += r.worst_price - r.best_price;
        count++;
      }
    });
    return count > 0 ? totalDiff / count : 0;
  }, [rows]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Link to="/estoque" className="hover:text-foreground">Estoque</Link>
          <span>/</span>
          <span>Cotacao</span>
        </div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Scale className="h-6 w-6" />
          Cotacao - Comparativo de Precos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Compare precos entre fornecedores para encontrar as melhores ofertas
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Selecione os Fornecedores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Adicionar Fornecedor</label>
              <Select
                value=""
                onValueChange={v => { if (v) toggleSupplier(v); }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar fornecedor..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers
                    .filter(s => !selectedSupplierIds.includes(s.id))
                    .map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nome_fantasia}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Filtrar por Categoria</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {(Object.entries(PRODUCT_CATEGORY_LABELS) as [ProductCategory, string][]).map(
                    ([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Selected suppliers tags */}
          {selectedSupplierIds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedSuppliers.map(s => (
                <Badge key={s.id} variant="secondary" className="gap-1 pr-1">
                  <Truck className="h-3 w-3" />
                  {s.nome_fantasia}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-1 hover:bg-destructive/20"
                    onClick={() => removeSupplier(s.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {rows.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Package className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{totalProducts}</p>
                  <p className="text-sm text-muted-foreground">Produtos comparados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Truck className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{selectedSupplierIds.length}</p>
                  <p className="text-sm text-muted-foreground">Fornecedores selecionados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <TrendingDown className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(avgSavings)}</p>
                  <p className="text-sm text-muted-foreground">Economia media potencial</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Comparison Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Matriz Comparativa
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedSupplierIds.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Selecione fornecedores para comparar</p>
              <p className="text-sm mt-1">
                Escolha pelo menos 2 fornecedores que tenham tabelas de preco cadastradas
              </p>
            </div>
          ) : compLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Nenhum produto com preco encontrado</p>
              <p className="text-sm mt-1">
                Cadastre tabelas de preco para os fornecedores selecionados em{" "}
                <Link to="/estoque/fornecedores" className="text-primary hover:underline">
                  Fornecedores
                </Link>
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <TooltipProvider>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px] sticky left-0 bg-background z-10">
                        Produto / Insumo
                      </TableHead>
                      {selectedSuppliers.map(s => (
                        <TableHead key={s.id} className="min-w-[150px] text-center">
                          <div>
                            <p className="font-medium">{s.nome_fantasia}</p>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map(row => (
                      <TableRow key={row.product.id}>
                        <TableCell className="sticky left-0 bg-background z-10">
                          <div>
                            <p className="font-medium text-sm">{row.product.nome}</p>
                            <p className="text-xs text-muted-foreground">
                              {row.product.unidade_medida}
                              {row.product.categoria && ` | ${PRODUCT_CATEGORY_LABELS[row.product.categoria]}`}
                            </p>
                          </div>
                        </TableCell>
                        {selectedSupplierIds.map(suppId => {
                          const priceEntry = row.prices.find(p => p.supplier_id === suppId);
                          if (!priceEntry) {
                            return (
                              <TableCell key={suppId} className="text-center bg-muted/30">
                                <span className="text-muted-foreground text-sm">-</span>
                              </TableCell>
                            );
                          }

                          const isBest = row.best_price !== null && priceEntry.preco_unitario === row.best_price;
                          const isWorst = row.worst_price !== null && priceEntry.preco_unitario === row.worst_price;

                          return (
                            <TableCell
                              key={suppId}
                              className={`text-center ${
                                isBest
                                  ? "bg-green-50 dark:bg-green-950/30"
                                  : isWorst
                                    ? "bg-red-50 dark:bg-red-950/30"
                                    : ""
                              }`}
                            >
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="cursor-default">
                                    <p className={`font-medium text-sm ${isBest ? "text-green-700 dark:text-green-400" : isWorst ? "text-red-700 dark:text-red-400" : ""}`}>
                                      {formatCurrency(priceEntry.preco_unitario)}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {formatDate(priceEntry.data_vigencia)}
                                    </p>
                                    {isBest && (
                                      <Badge variant="default" className="mt-0.5 text-[10px] px-1 py-0 bg-green-600">
                                        <TrendingDown className="h-2.5 w-2.5 mr-0.5" />
                                        Menor
                                      </Badge>
                                    )}
                                    {isWorst && (
                                      <Badge variant="destructive" className="mt-0.5 text-[10px] px-1 py-0">
                                        <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                                        Maior
                                      </Badge>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Fornecedor: {priceEntry.supplier_name}</p>
                                  <p>Vigencia: {formatDate(priceEntry.data_vigencia)}</p>
                                  <p>Preco: {formatCurrency(priceEntry.preco_unitario)}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TooltipProvider>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      {rows.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-100 border border-green-300" />
            Menor preco
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-100 border border-red-300" />
            Maior preco
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-muted border" />
            Sem preco cadastrado
          </span>
        </div>
      )}
    </div>
  );
}
