import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ExternalLink, CheckCircle2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface YESiaAction {
  label: string;
  description?: string;
  route?: string;
  url?: string;
  requires_confirmation?: boolean;
  action_type?: string;
}

interface YESiaActionCardProps {
  action: YESiaAction;
  onExecute?: (action: YESiaAction) => void;
}

export function YESiaActionCard({ action, onExecute }: YESiaActionCardProps) {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executed, setExecuted] = useState(false);

  const handleExecute = async () => {
    setIsExecuting(true);
    try {
      if (action.route) {
        navigate(action.route);
      } else if (action.url) {
        window.open(action.url, '_blank');
      }
      if (onExecute) {
        await onExecute(action);
      }
      setExecuted(true);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClick = () => {
    if (action.requires_confirmation) {
      setShowConfirm(true);
    } else {
      handleExecute();
    }
  };

  return (
    <>
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-center justify-between gap-3 p-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{action.label}</p>
            {action.description && (
              <p className="text-xs text-muted-foreground truncate">{action.description}</p>
            )}
          </div>
          <Button
            size="sm"
            variant={executed ? 'ghost' : 'default'}
            className="shrink-0 h-7 text-xs"
            onClick={handleClick}
            disabled={isExecuting || executed}
          >
            {isExecuting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : executed ? (
              <><CheckCircle2 className="h-3 w-3 mr-1" /> Feito</>
            ) : (
              <><ExternalLink className="h-3 w-3 mr-1" /> Executar</>
            )}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar acao</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja executar: {action.label}?
              {action.description && <><br />{action.description}</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleExecute}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default YESiaActionCard;
