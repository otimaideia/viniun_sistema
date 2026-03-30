import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Plus, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useServiceProductsMT, useServiceCostMT, useInventoryProductsMT } from '@/hooks/multitenant/useEstoqueMT';
import { PRODUCT_CATEGORY_LABELS, type ProductCategory } from '@/types/estoque';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

interface FichaTecnicaCardProps {
  serviceId: string;
  onCustoChange?: (custo: number) => void;
}

export function FichaTecnicaCard({ serviceId, onCustoChange }: FichaTecnicaCardProps) {
  const { serviceProducts, createServiceProduct, updateServiceProduct, deleteServiceProduct } = useServiceProductsMT(serviceId);
  const { items: fichaTecnicaItems, custoTotal } = useServiceCostMT(serviceId, serviceProducts);
  const { products: allProducts } = useInventoryProductsMT();
  const [newProductId, setNewProductId] = useState('');
  const [newProductQty, setNewProductQty] = useState('1');

  // Get selected product info for dynamic label
  const selectedProduct = useMemo(
    () => allProducts.find(p => p.id === newProductId),
    [allProducts, newProductId],
  );

  // Group products by category for the select
  const groupedProducts = useMemo(() => {
    const available = allProducts.filter(
      p => p.is_active && !serviceProducts.some(sp => sp.product_id === p.id),
    );
    const groups = new Map<string, typeof available>();
    available.forEach(p => {
      const cat = p.categoria || 'outro';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(p);
    });
    return groups;
  }, [allProducts, serviceProducts]);

  const handleQtyBlur = async (itemId: string, newValue: string, oldValue: number) => {
    const val = parseFloat(newValue);
    if (!val || val <= 0 || val === oldValue) return;
    try {
      await updateServiceProduct(itemId, { quantidade: val });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar quantidade');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4 text-purple-600" />
          Ficha Técnica - Insumos por Sessão
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Materiais consumidos a cada atendimento (luvas, gel, papel, etc.)
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {fichaTecnicaItems.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto / Insumo</TableHead>
                  <TableHead className="text-center w-[120px]">Qtd por Sessão</TableHead>
                  <TableHead className="text-right">Custo Unit.</TableHead>
                  <TableHead className="text-right">Custo Linha</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fichaTecnicaItems.map(item => {
                  const p = item.product;
                  const isFrac = p?.is_fracionado && p?.quantidade_total_unidade;

                  return (
                    <TableRow key={item.id}>
                      {/* Produto com info de fracionamento */}
                      <TableCell>
                        <div>
                          <span className="font-medium text-sm">{p?.nome || 'Produto'}</span>
                          {isFrac ? (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Zap className="h-3 w-3 text-blue-500" />
                              <span className="text-[11px] text-blue-600">
                                {p!.quantidade_total_unidade} {p!.unidade_medida}/frasco
                                {' → '}
                                {formatCurrency(item.custo_unitario_calc)}/{p!.unidade_medida}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({p?.unidade_medida || '-'})
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Quantidade editavel inline + unidade */}
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            className="w-16 h-7 text-center text-sm"
                            defaultValue={item.quantidade}
                            key={`${item.id}-${item.quantidade}`}
                            onBlur={(e) => handleQtyBlur(item.id, e.target.value, item.quantidade)}
                          />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {p?.unidade_medida || ''}
                          </span>
                        </div>
                      </TableCell>

                      {/* Custo unitario */}
                      <TableCell className="text-right text-sm">
                        {formatCurrency(item.custo_unitario_calc)}
                        {isFrac && (
                          <div className="text-[10px] text-muted-foreground">
                            /{p!.unidade_medida}
                          </div>
                        )}
                      </TableCell>

                      {/* Custo linha */}
                      <TableCell className="text-right font-medium text-sm">
                        {formatCurrency(item.custo_total_linha)}
                      </TableCell>

                      {/* Delete */}
                      <TableCell>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                          onClick={() => deleteServiceProduct(item.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={3} className="text-right text-sm">Total Insumos/Sessão:</TableCell>
                  <TableCell className="text-right text-sm text-purple-700">{formatCurrency(custoTotal)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}

        {fichaTecnicaItems.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum insumo vinculado. Adicione os materiais consumidos por sessão.
          </p>
        )}

        {/* Formulario para adicionar produto */}
        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Produto / Insumo</Label>
            <Select value={newProductId} onValueChange={(v) => {
              setNewProductId(v);
              // Reset qty to 1 when changing product
              setNewProductQty('1');
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um produto..." />
              </SelectTrigger>
              <SelectContent>
                {[...groupedProducts.entries()].map(([cat, prods]) => (
                  <div key={cat}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {PRODUCT_CATEGORY_LABELS[cat as ProductCategory] || cat}
                    </div>
                    {prods.map(p => {
                      const custoUnit = p.is_fracionado && p.custo_unitario_fracionado
                        ? p.custo_unitario_fracionado
                        : (p.custo_pix || 0);
                      return (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome}
                          {p.is_fracionado && p.quantidade_total_unidade
                            ? ` (${formatCurrency(custoUnit)}/${p.unidade_medida})`
                            : ` (${formatCurrency(custoUnit)})`
                          }
                        </SelectItem>
                      );
                    })}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-24 space-y-1">
            <Label className="text-xs">
              {selectedProduct?.is_fracionado && selectedProduct?.unidade_medida
                ? `Qtd (${selectedProduct.unidade_medida})`
                : 'Qtd'
              }
            </Label>
            <Input type="number" min="0.01" step="0.01" value={newProductQty} onChange={(e) => setNewProductQty(e.target.value)} />
          </div>
          <Button type="button" size="sm" disabled={!newProductId || !newProductQty}
            onClick={async () => {
              try {
                await createServiceProduct({
                  service_id: serviceId,
                  product_id: newProductId,
                  quantidade: parseFloat(newProductQty) || 1,
                });
                setNewProductId('');
                setNewProductQty('1');
              } catch (err: any) {
                toast.error(err.message || 'Erro ao adicionar insumo');
              }
            }}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
