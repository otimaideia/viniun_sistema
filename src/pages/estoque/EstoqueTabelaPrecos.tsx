import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useInventorySuppliersMT, useInventoryProductsMT } from "@/hooks/multitenant/useEstoqueMT";
import {
  useSupplierPriceListsMT,
  useSupplierPricesMT,
} from "@/hooks/multitenant/useSupplierPricesMT";
import { useTenantContext } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  ArrowLeft, Plus, Save, Loader2, Trash2, Upload, FileText,
  Wand2, Check, X, Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { SupplierPriceCreate } from "@/types/estoque";

interface PriceRow {
  id?: string;
  nome_produto_fornecedor: string;
  product_id: string | null;
  preco_unitario: string;
  unidade_medida: string;
  is_mapped: boolean;
  isNew?: boolean;
}

const EMPTY_ROW: PriceRow = {
  nome_produto_fornecedor: "",
  product_id: null,
  preco_unitario: "",
  unidade_medida: "",
  is_mapped: false,
  isNew: true,
};

export default function EstoqueTabelaPrecos() {
  const { supplierId, id: priceListId } = useParams<{ supplierId: string; id: string }>();
  const navigate = useNavigate();
  const isEditing = !!priceListId;
  const { tenant } = useTenantContext();

  const { suppliers } = useInventorySuppliersMT();
  const { products } = useInventoryProductsMT();
  const { createPriceList, updatePriceList } = useSupplierPriceListsMT(supplierId);
  const {
    prices, isLoading: pricesLoading,
    createPricesBatch, updatePrice, deletePrice, autoMapProducts,
  } = useSupplierPricesMT(priceListId);

  const supplier = suppliers.find(s => s.id === supplierId);

  // Form state
  const [descricao, setDescricao] = useState("");
  const [dataVigencia, setDataVigencia] = useState(new Date().toISOString().split("T")[0]);
  const [dataValidade, setDataValidade] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [arquivoUrl, setArquivoUrl] = useState<string | null>(null);
  const [arquivoTipo, setArquivoTipo] = useState<string | null>(null);
  const [arquivoPath, setArquivoPath] = useState<string | null>(null);

  // Price rows
  const [rows, setRows] = useState<PriceRow[]>([{ ...EMPTY_ROW }]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [autoMapping, setAutoMapping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing data when editing
  useEffect(() => {
    if (isEditing && prices.length > 0) {
      setRows(
        prices.map(p => ({
          id: p.id,
          nome_produto_fornecedor: p.nome_produto_fornecedor,
          product_id: p.product_id,
          preco_unitario: String(p.preco_unitario),
          unidade_medida: p.unidade_medida || "",
          is_mapped: p.is_mapped,
          isNew: false,
        }))
      );
    }
  }, [isEditing, prices]);

  // Load price list metadata when editing
  useEffect(() => {
    if (isEditing && priceListId) {
      supabase
        .from("mt_supplier_price_lists")
        .select("*")
        .eq("id", priceListId)
        .single()
        .then(({ data }) => {
          if (data) {
            setDescricao(data.descricao || "");
            setDataVigencia(data.data_vigencia || "");
            setDataValidade(data.data_validade || "");
            setObservacoes(data.observacoes || "");
            setArquivoUrl(data.arquivo_url);
            setArquivoTipo(data.arquivo_tipo);
            setArquivoPath(data.arquivo_path);
          }
        });
    }
  }, [isEditing, priceListId]);

  const addRow = () => setRows(prev => [...prev, { ...EMPTY_ROW }]);

  const removeRow = (index: number) => {
    setRows(prev => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const updateRow = (index: number, field: keyof PriceRow, value: string | null) => {
    setRows(prev => prev.map((row, i) => {
      if (i !== index) return row;
      const updated = { ...row, [field]: value };
      if (field === "product_id") {
        updated.is_mapped = !!value;
        if (value) {
          const product = products.find(p => p.id === value);
          if (product && !updated.nome_produto_fornecedor) {
            updated.nome_produto_fornecedor = product.nome;
          }
        }
      }
      return updated;
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error("Arquivo muito grande. Maximo 10MB.");
      return;
    }

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Tipo de arquivo nao suportado. Use PDF, JPEG, PNG ou WEBP.");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "pdf";
      const filePath = `${tenant?.id || "unknown"}/${supplierId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("supplier-price-lists")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        // Bucket may not exist, try creating it
        if (uploadError.message?.includes("not found") || uploadError.message?.includes("Bucket")) {
          // Upload directly anyway - bucket might need to be created in dashboard
          toast.error("Bucket 'supplier-price-lists' nao encontrado. Crie no Supabase Storage.");
          return;
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("supplier-price-lists")
        .getPublicUrl(filePath);

      setArquivoUrl(publicUrl);
      setArquivoPath(filePath);
      setArquivoTipo(file.type === "application/pdf" ? "pdf" : "image");
      toast.success("Arquivo enviado com sucesso");
    } catch (err: any) {
      console.error("Erro no upload:", err);
      toast.error(err.message || "Erro ao enviar arquivo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAutoMap = async () => {
    if (!isEditing) {
      toast.info("Salve a tabela primeiro para usar o auto-mapeamento");
      return;
    }
    setAutoMapping(true);
    try {
      await autoMapProducts();
    } catch {
      // handled
    }
    setAutoMapping(false);
  };

  const handleSave = async () => {
    if (!dataVigencia) {
      toast.error("Data de vigencia e obrigatoria");
      return;
    }

    const validRows = rows.filter(r => r.nome_produto_fornecedor.trim() && r.preco_unitario);
    if (validRows.length === 0) {
      toast.error("Adicione pelo menos um produto com preco");
      return;
    }

    setSaving(true);
    try {
      let listId = priceListId;

      if (isEditing) {
        // Update metadata
        await updatePriceList(priceListId!, {
          descricao: descricao || undefined,
          data_vigencia: dataVigencia,
          data_validade: dataValidade || undefined,
          observacoes: observacoes || undefined,
          arquivo_url: arquivoUrl || undefined,
          arquivo_path: arquivoPath || undefined,
          arquivo_tipo: arquivoTipo || undefined,
        });

        // Update existing rows, create new ones, delete removed ones
        const existingIds = new Set(rows.filter(r => r.id).map(r => r.id!));
        const toDelete = prices.filter(p => !existingIds.has(p.id));

        for (const del of toDelete) {
          await deletePrice(del.id);
        }

        for (const row of validRows) {
          if (row.id) {
            await updatePrice(row.id, {
              nome_produto_fornecedor: row.nome_produto_fornecedor,
              product_id: row.product_id || undefined,
              preco_unitario: parseFloat(row.preco_unitario),
              unidade_medida: row.unidade_medida || undefined,
              is_mapped: row.is_mapped,
            });
          }
        }

        // Create new rows
        const newRows = validRows.filter(r => !r.id);
        if (newRows.length > 0) {
          const batch: SupplierPriceCreate[] = newRows.map(r => ({
            price_list_id: listId!,
            supplier_id: supplierId!,
            nome_produto_fornecedor: r.nome_produto_fornecedor,
            product_id: r.product_id || undefined,
            preco_unitario: parseFloat(r.preco_unitario),
            unidade_medida: r.unidade_medida || undefined,
            is_mapped: r.is_mapped,
          }));
          await createPricesBatch(batch);
        }

        toast.success("Tabela de precos atualizada");
      } else {
        // Create new price list
        const created = await createPriceList({
          supplier_id: supplierId!,
          descricao: descricao || undefined,
          data_vigencia: dataVigencia,
          data_validade: dataValidade || undefined,
          observacoes: observacoes || undefined,
          arquivo_url: arquivoUrl || undefined,
          arquivo_path: arquivoPath || undefined,
          arquivo_tipo: arquivoTipo || undefined,
        });
        listId = created.id;

        // Create prices
        const batch: SupplierPriceCreate[] = validRows.map(r => ({
          price_list_id: listId!,
          supplier_id: supplierId!,
          nome_produto_fornecedor: r.nome_produto_fornecedor,
          product_id: r.product_id || undefined,
          preco_unitario: parseFloat(r.preco_unitario),
          unidade_medida: r.unidade_medida || undefined,
          is_mapped: r.is_mapped,
        }));
        await createPricesBatch(batch);
        toast.success("Tabela de precos criada com sucesso");
      }

      navigate(`/estoque/fornecedores/${supplierId}`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link to="/estoque" className="hover:text-foreground">Estoque</Link>
            <span>/</span>
            <Link to="/estoque/fornecedores" className="hover:text-foreground">Fornecedores</Link>
            <span>/</span>
            <Link to={`/estoque/fornecedores/${supplierId}`} className="hover:text-foreground">
              {supplier?.nome_fantasia || "..."}
            </Link>
            <span>/</span>
            <span>{isEditing ? "Editar Tabela" : "Nova Tabela"}</span>
          </div>
          <h1 className="text-2xl font-bold">
            {isEditing ? "Editar Tabela de Precos" : "Nova Tabela de Precos"}
          </h1>
        </div>
        <Button variant="outline" onClick={() => navigate(`/estoque/fornecedores/${supplierId}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da Tabela</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Descricao</Label>
              <Input
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                placeholder="Ex: Tabela Janeiro 2026"
              />
            </div>
            <div className="space-y-2">
              <Label>Data de Vigencia *</Label>
              <Input
                type="date"
                value={dataVigencia}
                onChange={e => setDataVigencia(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data de Validade</Label>
              <Input
                type="date"
                value={dataValidade}
                onChange={e => setDataValidade(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observacoes</Label>
            <Textarea
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              rows={2}
              placeholder="Observacoes sobre esta tabela de precos..."
            />
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>Arquivo (PDF ou Imagem)</Label>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {uploading ? "Enviando..." : "Enviar Arquivo"}
              </Button>
              {arquivoUrl && (
                <a
                  href={arquivoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  {arquivoTipo === "pdf" ? (
                    <FileText className="h-4 w-4" />
                  ) : (
                    <ImageIcon className="h-4 w-4" />
                  )}
                  Ver arquivo enviado
                </a>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Suba o PDF ou imagem da tabela de precos do fornecedor como referencia. Max 10MB.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Price Rows */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Precos dos Produtos</CardTitle>
          <div className="flex gap-2">
            {isEditing && (
              <Button variant="outline" size="sm" onClick={handleAutoMap} disabled={autoMapping}>
                {autoMapping ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                Auto-Mapear
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={addRow}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Linha
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Nome Produto (Fornecedor)</TableHead>
                  <TableHead className="min-w-[200px]">Produto Mapeado</TableHead>
                  <TableHead className="w-[140px]">Preco Unitario (R$)</TableHead>
                  <TableHead className="w-[120px]">Unidade</TableHead>
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={row.id || `new-${index}`}>
                    <TableCell>
                      <Input
                        value={row.nome_produto_fornecedor}
                        onChange={e => updateRow(index, "nome_produto_fornecedor", e.target.value)}
                        placeholder="Nome do produto na tabela do fornecedor"
                        className="h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={row.product_id || "none"}
                        onValueChange={v => updateRow(index, "product_id", v === "none" ? null : v)}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Selecionar produto..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- Nao mapeado --</SelectItem>
                          {products.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.preco_unitario}
                        onChange={e => updateRow(index, "preco_unitario", e.target.value)}
                        placeholder="0.00"
                        className="h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.unidade_medida}
                        onChange={e => updateRow(index, "unidade_medida", e.target.value)}
                        placeholder="UI, ml, cx..."
                        className="h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      {row.is_mapped ? (
                        <Badge variant="default" className="gap-1 bg-green-600">
                          <Check className="h-3 w-3" />
                          Mapeado
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <X className="h-3 w-3" />
                          Pendente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(index)}
                        disabled={rows.length <= 1}
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {rows.filter(r => r.nome_produto_fornecedor.trim() && r.preco_unitario).length} produto(s) com preco
              {" | "}
              {rows.filter(r => r.is_mapped).length} mapeado(s)
            </p>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isEditing ? "Salvar Alteracoes" : "Criar Tabela de Precos"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
