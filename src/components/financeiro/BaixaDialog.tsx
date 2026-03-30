import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, FileText, ImageIcon, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { FinancialTransaction, FinancialAccount } from "@/types/financeiro";

// === Types ===

export interface BaixaOptions {
  data_pagamento: string;
  valor_recebido: number;
  account_id?: string;
  forma_pagamento?: string;
  comprovante_url?: string;
  observacoes?: string;
}

interface BaixaDialogProps {
  transaction: FinancialTransaction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (options: BaixaOptions) => Promise<void>;
  accounts: FinancialAccount[];
}

// === Constants ===

const FORMAS_PAGAMENTO = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "cartao_credito", label: "Cartao Credito" },
  { value: "cartao_debito", label: "Cartao Debito" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferencia" },
];

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const BUCKET_NAME = "comprovantes";

// === Helpers ===

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

// === Component ===

export function BaixaDialog({
  transaction,
  open,
  onOpenChange,
  onConfirm,
  accounts,
}: BaixaDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [dataPagamento, setDataPagamento] = useState(todayISO());
  const [valorRecebido, setValorRecebido] = useState(transaction.valor);
  const [accountId, setAccountId] = useState(transaction.account_id || "");
  const [formaPagamento, setFormaPagamento] = useState(transaction.forma_pagamento || "");
  const [observacoes, setObservacoes] = useState("");

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when transaction changes or dialog opens
  useEffect(() => {
    if (open) {
      setDataPagamento(todayISO());
      setValorRecebido(transaction.valor);
      setAccountId(transaction.account_id || "");
      setFormaPagamento(transaction.forma_pagamento || "");
      setObservacoes("");
      setSelectedFile(null);
      setFilePreviewUrl(null);
    }
  }, [open, transaction]);

  // Clean up preview URL on unmount or file change
  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    };
  }, [filePreviewUrl]);

  const isReceita = transaction.tipo === "receita";
  const valorDiferente = Math.abs(valorRecebido - transaction.valor) > 0.01;

  // --- File handling ---

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Tipo de arquivo invalido. Aceitos: JPEG, PNG, PDF");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Arquivo muito grande. Maximo: 5MB");
      return;
    }

    setSelectedFile(file);

    // Generate preview for images
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl(url);
    } else {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl(null);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setFilePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- Upload to Supabase Storage ---

  const uploadComprovante = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `financeiro/${transaction.tenant_id}/${transaction.id}_${Date.now()}.${ext}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (error) {
      console.error("Upload comprovante error:", error);
      toast.error(`Erro no upload: ${error.message}`);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  };

  // --- Submit ---

  const handleSubmit = async () => {
    if (!dataPagamento) {
      toast.error("Informe a data do pagamento");
      return;
    }

    if (valorRecebido <= 0) {
      toast.error("Valor deve ser maior que zero");
      return;
    }

    setIsSubmitting(true);

    try {
      let comprovanteUrl: string | undefined;

      if (selectedFile) {
        const url = await uploadComprovante(selectedFile);
        if (url) comprovanteUrl = url;
        // If upload fails we still proceed without comprovante
      }

      const options: BaixaOptions = {
        data_pagamento: dataPagamento,
        valor_recebido: valorRecebido,
        ...(accountId && { account_id: accountId }),
        ...(formaPagamento && { forma_pagamento: formaPagamento }),
        ...(comprovanteUrl && { comprovante_url: comprovanteUrl }),
        ...(observacoes.trim() && { observacoes: observacoes.trim() }),
      };

      await onConfirm(options);
      onOpenChange(false);
    } catch (err: any) {
      console.error("Erro ao dar baixa:", err);
      toast.error(err?.message || "Erro ao confirmar pagamento");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Dar Baixa
            <Badge variant={isReceita ? "default" : "destructive"} className={isReceita ? "bg-green-600 hover:bg-green-700" : ""}>
              {isReceita ? "Receita" : "Despesa"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Transaction Summary */}
        <div className="rounded-md border p-3 bg-muted/50 space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Descricao:</span>{" "}
            <span className="font-medium">{transaction.descricao}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Valor original:</span>{" "}
            <span className="font-medium">{formatCurrency(transaction.valor)}</span>
          </p>
          {transaction.data_vencimento && (
            <p>
              <span className="text-muted-foreground">Vencimento:</span>{" "}
              <span className="font-medium">{formatDate(transaction.data_vencimento)}</span>
            </p>
          )}
          {transaction.parcela_atual && transaction.parcela_total && (
            <p>
              <span className="text-muted-foreground">Parcela:</span>{" "}
              <span className="font-medium">
                {transaction.parcela_atual}/{transaction.parcela_total}
              </span>
            </p>
          )}
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Data do Pagamento */}
          <div className="space-y-2">
            <Label htmlFor="data_pagamento">Data do Pagamento *</Label>
            <Input
              id="data_pagamento"
              type="date"
              value={dataPagamento}
              onChange={(e) => setDataPagamento(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Valor Recebido/Pago */}
          <div className="space-y-2">
            <Label htmlFor="valor_recebido">
              {isReceita ? "Valor Recebido" : "Valor Pago"} *
            </Label>
            <Input
              id="valor_recebido"
              type="number"
              step="0.01"
              min="0.01"
              value={valorRecebido}
              onChange={(e) => setValorRecebido(parseFloat(e.target.value) || 0)}
              disabled={isSubmitting}
            />
            {valorDiferente && (
              <div className="flex items-center gap-1.5 text-amber-600 text-xs">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                <span>
                  Valor diferente do original ({formatCurrency(transaction.valor)}).
                  Diferenca: {formatCurrency(Math.abs(valorRecebido - transaction.valor))}
                </span>
              </div>
            )}
          </div>

          {/* Conta */}
          <div className="space-y-2">
            <Label>Conta</Label>
            <Select value={accountId} onValueChange={setAccountId} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma conta" />
              </SelectTrigger>
              <SelectContent>
                {accounts
                  .filter((a) => a.is_active)
                  .map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.nome}
                      {account.banco ? ` (${account.banco})` : ""}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Forma de Pagamento */}
          <div className="space-y-2">
            <Label>Forma de Pagamento</Label>
            <Select value={formaPagamento} onValueChange={setFormaPagamento} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a forma" />
              </SelectTrigger>
              <SelectContent>
                {FORMAS_PAGAMENTO.map((fp) => (
                  <SelectItem key={fp.value} value={fp.value}>
                    {fp.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Upload Comprovante */}
          <div className="space-y-2">
            <Label>Comprovante</Label>
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isSubmitting}
              />

              {!selectedFile ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-center gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                >
                  <Upload className="h-4 w-4" />
                  Anexar Comprovante
                </Button>
              ) : (
                <div className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {selectedFile.type === "application/pdf" ? (
                        <FileText className="h-4 w-4 text-red-500 flex-shrink-0" />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      )}
                      <span className="text-sm truncate">{selectedFile.name}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        ({(selectedFile.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeFile}
                      disabled={isSubmitting}
                      className="text-destructive hover:text-destructive h-7 px-2"
                    >
                      Remover
                    </Button>
                  </div>

                  {/* Image Preview */}
                  {filePreviewUrl && (
                    <div className="rounded overflow-hidden border">
                      <img
                        src={filePreviewUrl}
                        alt="Preview do comprovante"
                        className="max-h-40 w-full object-contain bg-muted"
                      />
                    </div>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                JPEG, PNG ou PDF. Maximo 5MB.
              </p>
            </div>
          </div>

          {/* Observacoes */}
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observacoes</Label>
            <Textarea
              id="observacoes"
              placeholder="Observacoes sobre o pagamento..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              "Confirmar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
