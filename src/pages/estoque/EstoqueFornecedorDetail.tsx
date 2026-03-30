import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useInventorySuppliersMT } from "@/hooks/multitenant/useEstoqueMT";
import { useSupplierPriceListsMT, usePriceHistoryMT } from "@/hooks/multitenant/useSupplierPricesMT";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Plus, Truck, Phone, Mail, MapPin, FileText,
  Calendar, Loader2, Trash2, ExternalLink, TrendingUp,
} from "lucide-react";
import { useInventoryProductsMT } from "@/hooks/multitenant/useEstoqueMT";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const formatCurrency = (value: number | null) =>
  value != null
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
    : "-";

const formatDate = (date: string | null) =>
  date ? new Date(date + "T12:00:00").toLocaleDateString("pt-BR") : "-";

const CHART_COLORS = [
  "#E91E63", "#2196F3", "#4CAF50", "#FF9800", "#9C27B0",
  "#00BCD4", "#F44336", "#3F51B5", "#8BC34A", "#FF5722",
];

export default function EstoqueFornecedorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { suppliers, isLoading: suppLoading } = useInventorySuppliersMT();
  const { priceLists, isLoading: plLoading, deletePriceList } = useSupplierPriceListsMT(id);
  const { products } = useInventoryProductsMT();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [historyProductId, setHistoryProductId] = useState<string>("");
  const { history, isLoading: histLoading } = usePriceHistoryMT(historyProductId || undefined);

  const supplier = suppliers.find(s => s.id === id);
  const isLoading = suppLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="text-center py-20">
        <Truck className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-muted-foreground">Fornecedor nao encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/estoque/fornecedores")}>
          Voltar
        </Button>
      </div>
    );
  }

  // Build chart data from history
  const chartData = (() => {
    if (history.length === 0) return [];
    const dateMap = new Map<string, Record<string, number>>();
    const supplierNames = new Set<string>();
    history.forEach(h => {
      supplierNames.add(h.supplier_name);
      const entry = dateMap.get(h.data_vigencia) || {};
      entry[h.supplier_name] = h.preco_unitario;
      dateMap.set(h.data_vigencia, entry);
    });
    return [...dateMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, values]) => ({ data: formatDate(date), ...values }));
  })();

  const supplierNamesInHistory = [...new Set(history.map(h => h.supplier_name))];

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deletePriceList(deleteId); } catch { /* handled */ }
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb + Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link to="/estoque" className="hover:text-foreground">Estoque</Link>
            <span>/</span>
            <Link to="/estoque/fornecedores" className="hover:text-foreground">Fornecedores</Link>
            <span>/</span>
            <span>{supplier.nome_fantasia}</span>
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6" />
            {supplier.nome_fantasia}
          </h1>
        </div>
        <Button variant="outline" onClick={() => navigate("/estoque/fornecedores")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>

      <Tabs defaultValue="dados" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="tabelas">
            Tabelas de Preco ({priceLists.length})
          </TabsTrigger>
          <TabsTrigger value="historico">Historico de Precos</TabsTrigger>
        </TabsList>

        {/* TAB: Dados */}
        <TabsContent value="dados">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informacoes Gerais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <InfoRow label="Nome Fantasia" value={supplier.nome_fantasia} />
                <InfoRow label="Razao Social" value={supplier.razao_social} />
                <InfoRow label="CNPJ" value={supplier.cnpj} />
                <InfoRow label="Condicoes de Pagamento" value={supplier.condicoes_pagamento} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <InfoRow label="Nome do Contato" value={supplier.contato_nome} icon={<Truck className="h-4 w-4" />} />
                <InfoRow label="Telefone" value={supplier.telefone} icon={<Phone className="h-4 w-4" />} />
                <InfoRow label="Email" value={supplier.email} icon={<Mail className="h-4 w-4" />} />
                <InfoRow label="Endereco" value={supplier.endereco} icon={<MapPin className="h-4 w-4" />} />
              </CardContent>
            </Card>
            {supplier.observacoes && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Observacoes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{supplier.observacoes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* TAB: Tabelas de Preco */}
        <TabsContent value="tabelas">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Tabelas de Preco
              </CardTitle>
              <Button size="sm" onClick={() => navigate(`/estoque/fornecedores/${id}/tabela-precos/nova`)}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Tabela
              </Button>
            </CardHeader>
            <CardContent>
              {plLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : priceLists.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma tabela de preco cadastrada</p>
                  <Button
                    variant="outline"
                    className="mt-3"
                    onClick={() => navigate(`/estoque/fornecedores/${id}/tabela-precos/nova`)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Cadastrar Primeira Tabela
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descricao</TableHead>
                      <TableHead>Data Vigencia</TableHead>
                      <TableHead>Validade</TableHead>
                      <TableHead>Itens</TableHead>
                      <TableHead>Arquivo</TableHead>
                      <TableHead className="w-[80px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {priceLists.map(pl => (
                      <TableRow
                        key={pl.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/estoque/fornecedores/${id}/tabela-precos/${pl.id}`)}
                      >
                        <TableCell className="font-medium">
                          {pl.descricao || "Sem descricao"}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(pl.data_vigencia)}
                          </span>
                        </TableCell>
                        <TableCell>{pl.data_validade ? formatDate(pl.data_validade) : "-"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{pl._count || 0} itens</Badge>
                        </TableCell>
                        <TableCell>
                          {pl.arquivo_url ? (
                            <a
                              href={pl.arquivo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1"
                              onClick={e => e.stopPropagation()}
                            >
                              <ExternalLink className="h-3 w-3" />
                              {pl.arquivo_tipo === "pdf" ? "PDF" : "Imagem"}
                            </a>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={e => { e.stopPropagation(); setDeleteId(pl.id); }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Historico de Precos */}
        <TabsContent value="historico">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Historico de Precos por Produto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-sm">
                <Select value={historyProductId} onValueChange={setHistoryProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!historyProductId ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Selecione um produto para ver o historico de precos
                </p>
              ) : histLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : history.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Nenhum historico de preco encontrado para este produto
                </p>
              ) : (
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="data" fontSize={12} />
                      <YAxis
                        fontSize={12}
                        tickFormatter={(v: number) =>
                          new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact" }).format(v)
                        }
                      />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        labelFormatter={(label: string) => `Data: ${label}`}
                      />
                      <Legend />
                      {supplierNamesInHistory.map((name, i) => (
                        <Line
                          key={name}
                          type="monotone"
                          dataKey={name}
                          stroke={CHART_COLORS[i % CHART_COLORS.length]}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusao</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta tabela de precos? Os precos associados tambem serao removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string | null; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      {icon && <span className="text-muted-foreground mt-0.5">{icon}</span>}
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{value || "Nao informado"}</p>
      </div>
    </div>
  );
}
