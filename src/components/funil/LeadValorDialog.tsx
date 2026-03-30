import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DollarSign, Loader2 } from 'lucide-react';
import type { FunilLeadExpanded } from '@/types/funil';

interface LeadValorDialogProps {
  lead: FunilLeadExpanded | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (valor: number | null) => Promise<void>;
}

export function LeadValorDialog({
  lead,
  open,
  onOpenChange,
  onSave,
}: LeadValorDialogProps) {
  const [valor, setValor] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Definir valor inicial quando abrir o dialog
  useEffect(() => {
    if (open && lead) {
      setValor(lead.valor_estimado?.toString() || '');
    }
  }, [open, lead]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const valorNumerico = valor ? parseFloat(valor.replace(',', '.')) : null;
      await onSave(valorNumerico);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrencyInput = (value: string) => {
    // Remove tudo exceto números e vírgula/ponto
    const cleaned = value.replace(/[^\d.,]/g, '');
    // Converte vírgula para ponto
    return cleaned.replace(',', '.');
  };

  if (!lead) return null;

  const leadData = lead.lead;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Valor Estimado</DialogTitle>
          <DialogDescription>
            Defina o valor estimado para o lead{' '}
            <strong>{leadData?.nome || 'Lead'}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="valor">Valor em R$</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="valor"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(formatCurrencyInput(e.target.value))}
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Este valor é usado para cálculos de pipeline e previsão de receita
            </p>
          </div>

          {/* Sugestões rápidas */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Valores rápidos</Label>
            <div className="flex flex-wrap gap-2">
              {[500, 1000, 2500, 5000, 10000].map((v) => (
                <Button
                  key={v}
                  type="button"
                  variant={parseFloat(valor) === v ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setValor(v.toString())}
                >
                  R$ {v.toLocaleString('pt-BR')}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
