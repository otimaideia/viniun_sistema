import { useState } from 'react';
import { Phone, PhoneCall, PhoneOff, Clock, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useCadenciaExecucao, useCadenciaMutations, type CadenciaConfig } from '@/hooks/multitenant/useCadenciaMT';
import { toast } from 'sonner';

interface CadenciaIndicatorProps {
  leadId: string;
  compact?: boolean;
}

export function CadenciaIndicator({ leadId, compact = false }: CadenciaIndicatorProps) {
  const { execucao, isLoading } = useCadenciaExecucao(leadId);
  const { registrarTentativa, marcarRespondeu } = useCadenciaMutations();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [canal, setCanal] = useState('whatsapp');
  const [resultado, setResultado] = useState('');
  const [notas, setNotas] = useState('');

  if (isLoading || !execucao) return null;

  const config = execucao.config as CadenciaConfig | null;
  const maxTentativas = config?.max_tentativas || 5;
  const tentativa = execucao.tentativa_atual || 0;
  const agora = new Date();
  const proximaTentativa = execucao.proxima_tentativa_em
    ? new Date(execucao.proxima_tentativa_em)
    : null;
  const atrasado = proximaTentativa ? agora > proximaTentativa : false;
  const progresso = Math.round((tentativa / maxTentativas) * 100);

  const handleRegistrar = async () => {
    try {
      await registrarTentativa.mutateAsync({
        execucaoId: execucao.id,
        canal,
        mensagem: notas || undefined,
        resultadoLigacao: canal === 'ligacao' ? resultado : undefined,
      });
      setIsDialogOpen(false);
      setNotas('');
      setResultado('');
    } catch {
      // Error handled by mutation
    }
  };

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-1.5 text-xs px-2 py-1 rounded cursor-pointer',
          atrasado
            ? 'bg-red-50 text-red-700 border border-red-200'
            : tentativa > 0
            ? 'bg-orange-50 text-orange-700 border border-orange-200'
            : 'bg-blue-50 text-blue-700 border border-blue-200'
        )}
        onClick={() => setIsDialogOpen(true)}
        title="Clique para registrar tentativa"
      >
        <Phone className="w-3 h-3" />
        <span className="font-semibold">{tentativa}/{maxTentativas}</span>
        {atrasado && <AlertTriangle className="w-3 h-3" />}

        <RegistrarTentativaDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          tentativa={tentativa}
          maxTentativas={maxTentativas}
          canal={canal}
          setCanal={setCanal}
          resultado={resultado}
          setResultado={setResultado}
          notas={notas}
          setNotas={setNotas}
          onRegistrar={handleRegistrar}
          isPending={registrarTentativa.isPending}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-orange-600" />
          <span className="font-medium text-sm">Cadência de Contato</span>
        </div>
        <Badge
          variant={atrasado ? 'destructive' : 'secondary'}
          className="text-xs"
        >
          {tentativa}/{maxTentativas} tentativas
        </Badge>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className={cn(
            'h-2 rounded-full transition-all',
            progresso >= 100 ? 'bg-red-500' : progresso >= 60 ? 'bg-orange-500' : 'bg-blue-500'
          )}
          style={{ width: `${Math.min(progresso, 100)}%` }}
        />
      </div>

      {/* Info */}
      <div className="text-xs text-muted-foreground space-y-1">
        {execucao.ultima_tentativa_em && (
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Último contato: {new Date(execucao.ultima_tentativa_em).toLocaleDateString('pt-BR')}
          </div>
        )}
        {proximaTentativa && (
          <div className={cn('flex items-center gap-1', atrasado && 'text-red-600 font-medium')}>
            {atrasado ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            Próximo: {proximaTentativa.toLocaleDateString('pt-BR')}
            {atrasado && ' (ATRASADO)'}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="default"
          className="flex-1"
          onClick={() => setIsDialogOpen(true)}
        >
          <PhoneCall className="w-3 h-3 mr-1" />
          Registrar Contato
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            marcarRespondeu.mutate({ execucaoId: execucao.id, canal: 'whatsapp' });
          }}
          disabled={marcarRespondeu.isPending}
        >
          <Check className="w-3 h-3 mr-1" />
          Respondeu
        </Button>
      </div>

      <RegistrarTentativaDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        tentativa={tentativa}
        maxTentativas={maxTentativas}
        canal={canal}
        setCanal={setCanal}
        resultado={resultado}
        setResultado={setResultado}
        notas={notas}
        setNotas={setNotas}
        onRegistrar={handleRegistrar}
        isPending={registrarTentativa.isPending}
      />
    </div>
  );
}

// Dialog reutilizável
function RegistrarTentativaDialog({
  open,
  onOpenChange,
  tentativa,
  maxTentativas,
  canal,
  setCanal,
  resultado,
  setResultado,
  notas,
  setNotas,
  onRegistrar,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tentativa: number;
  maxTentativas: number;
  canal: string;
  setCanal: (v: string) => void;
  resultado: string;
  setResultado: (v: string) => void;
  notas: string;
  setNotas: (v: string) => void;
  onRegistrar: () => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar Tentativa {tentativa + 1}/{maxTentativas}</DialogTitle>
          <DialogDescription>
            Registre o contato feito com o lead
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Canal</Label>
            <Select value={canal} onValueChange={setCanal}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-green-600" />
                    WhatsApp
                  </div>
                </SelectItem>
                <SelectItem value="ligacao">
                  <div className="flex items-center gap-2">
                    <PhoneCall className="h-4 w-4 text-blue-600" />
                    Ligação
                  </div>
                </SelectItem>
                <SelectItem value="email">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-600" />
                    Email
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {canal === 'ligacao' && (
            <div className="space-y-2">
              <Label>Resultado da ligação</Label>
              <Select value={resultado} onValueChange={setResultado}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="atendeu">Atendeu</SelectItem>
                  <SelectItem value="nao_atendeu">Não atendeu</SelectItem>
                  <SelectItem value="ocupado">Ocupado</SelectItem>
                  <SelectItem value="caixa_postal">Caixa postal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Observações (opcional)</Label>
            <Textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="O que foi conversado..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onRegistrar} disabled={isPending}>
            {isPending ? 'Registrando...' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
