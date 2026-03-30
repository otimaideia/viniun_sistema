import { useState } from 'react';
import {
  ArrowRight, Send, CheckCircle2, Archive, RotateCcw, FileEdit,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { SOPStatus, SOP_STATUS_CONFIG } from '@/types/sop';

interface StatusTransitionProps {
  currentStatus: SOPStatus;
  onTransition: (newStatus: SOPStatus, extra?: Record<string, any>) => void;
  isLoading?: boolean;
}

const TRANSITIONS: Record<SOPStatus, { status: SOPStatus; label: string; icon: typeof ArrowRight; variant?: 'default' | 'destructive' | 'outline' }[]> = {
  rascunho: [
    { status: 'em_revisao', label: 'Enviar para Revisão', icon: Send },
  ],
  em_revisao: [
    { status: 'aprovado', label: 'Aprovar', icon: CheckCircle2 },
    { status: 'rascunho', label: 'Devolver para Rascunho', icon: RotateCcw, variant: 'outline' },
  ],
  aprovado: [
    { status: 'publicado', label: 'Publicar', icon: Send },
    { status: 'em_revisao', label: 'Devolver para Revisão', icon: RotateCcw, variant: 'outline' },
  ],
  publicado: [
    { status: 'arquivado', label: 'Arquivar', icon: Archive, variant: 'destructive' },
  ],
  arquivado: [
    { status: 'rascunho', label: 'Reativar como Rascunho', icon: FileEdit },
  ],
};

export default function StatusTransition({ currentStatus, onTransition, isLoading }: StatusTransitionProps) {
  const [confirmAction, setConfirmAction] = useState<{ status: SOPStatus; label: string } | null>(null);

  const transitions = TRANSITIONS[currentStatus] || [];

  if (transitions.length === 0) return null;

  const handleTransition = (status: SOPStatus) => {
    // Destructive transitions need confirmation
    if (status === 'arquivado') {
      setConfirmAction({ status, label: 'Arquivar' });
      return;
    }

    const extra: Record<string, any> = {};
    if (status === 'aprovado') extra.aprovado_em = new Date().toISOString();
    if (status === 'publicado') extra.publicado_em = new Date().toISOString();

    onTransition(status, extra);
  };

  const handleConfirm = () => {
    if (!confirmAction) return;
    onTransition(confirmAction.status);
    setConfirmAction(null);
  };

  // Single transition: show as button directly
  if (transitions.length === 1) {
    const t = transitions[0];
    const Icon = t.icon;
    return (
      <>
        <Button
          variant={t.variant || 'default'}
          size="sm"
          onClick={() => handleTransition(t.status)}
          disabled={isLoading}
        >
          <Icon className="h-4 w-4 mr-1.5" />
          {t.label}
        </Button>
        <ConfirmDialog
          open={!!confirmAction}
          onOpenChange={(open) => !open && setConfirmAction(null)}
          label={confirmAction?.label || ''}
          onConfirm={handleConfirm}
        />
      </>
    );
  }

  // Multiple transitions: dropdown
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={isLoading}>
            <ArrowRight className="h-4 w-4 mr-1.5" />
            Alterar Status
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {transitions.map((t) => {
            const Icon = t.icon;
            return (
              <DropdownMenuItem
                key={t.status}
                onClick={() => handleTransition(t.status)}
                className={t.variant === 'destructive' ? 'text-red-600' : ''}
              >
                <Icon className="h-4 w-4 mr-2" />
                {t.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        label={confirmAction?.label || ''}
        onConfirm={handleConfirm}
      />
    </>
  );
}

function ConfirmDialog({
  open, onOpenChange, label, onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar: {label}</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja {label.toLowerCase()} este POP? Esta ação pode ser revertida posteriormente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Confirmar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
