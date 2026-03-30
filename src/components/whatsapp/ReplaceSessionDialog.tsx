// Dialog para substituir sessão WhatsApp
// Permite migrar todos os dados de uma sessão falhada/desconectada para outra

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRightLeft,
  AlertTriangle,
  MessageSquare,
  Users,
  Loader2,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import {
  useWhatsAppSessionReplace,
  getSessionDataCounts,
  type SessionDataCounts,
} from '@/hooks/multitenant/useWhatsAppSessionReplace';
import { useTenantContext } from '@/contexts/TenantContext';
/** Tipo mínimo necessário para o dialog funcionar */
interface SessionInfo {
  id: string;
  nome?: string | null;
  session_name: string;
  status: string | null;
}

interface ReplaceSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Sessão que será substituída (antiga/falhada) */
  oldSession: SessionInfo | null;
  /** Lista de sessões disponíveis como destino */
  availableSessions: SessionInfo[];
  /** Callback após substituição bem-sucedida */
  onSuccess?: () => void;
}

export function ReplaceSessionDialog({
  open,
  onOpenChange,
  oldSession,
  availableSessions,
  onSuccess,
}: ReplaceSessionDialogProps) {
  const [selectedNewSessionId, setSelectedNewSessionId] = useState<string>('');
  const [dataCounts, setDataCounts] = useState<SessionDataCounts | null>(null);
  const [isLoadingCounts, setIsLoadingCounts] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const { replaceSession, isReplacing } = useWhatsAppSessionReplace();
  const { tenant } = useTenantContext();

  // Sessões que podem ser destino (excluir a própria sessão antiga)
  const targetSessions = availableSessions.filter(
    (s) => s.id !== oldSession?.id
  );

  // Carregar contagem de dados quando dialog abre
  useEffect(() => {
    if (open && oldSession) {
      setIsLoadingCounts(true);
      setIsComplete(false);
      setSelectedNewSessionId('');
      getSessionDataCounts(oldSession.id, tenant?.id)
        .then(setDataCounts)
        .catch(console.error)
        .finally(() => setIsLoadingCounts(false));
    }
  }, [open, oldSession?.id]);

  const handleReplace = async () => {
    if (!oldSession || !selectedNewSessionId) return;

    try {
      await replaceSession.mutateAsync({
        oldSessionId: oldSession.id,
        newSessionId: selectedNewSessionId,
      });
      setIsComplete(true);
      onSuccess?.();
      // Fechar após 2 segundos
      setTimeout(() => {
        onOpenChange(false);
        setIsComplete(false);
      }, 2000);
    } catch {
      // Erro já tratado no hook
    }
  };

  const selectedNewSession = targetSessions.find(
    (s) => s.id === selectedNewSessionId
  );

  const hasData = dataCounts && (dataCounts.conversations > 0 || dataCounts.messages > 0 || dataCounts.leads > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Substituir Sessão
          </DialogTitle>
          <DialogDescription>
            Migre todas as conversas, mensagens e leads de uma sessão para outra.
            A sessão antiga será removida após a migração.
          </DialogDescription>
        </DialogHeader>

        {isComplete ? (
          <div className="flex flex-col items-center py-8 gap-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-green-600">Substituição concluída!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Todos os dados foram migrados com sucesso.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Info da sessão antiga */}
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  SESSÃO ANTIGA (será removida)
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {oldSession?.nome || oldSession?.session_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {oldSession?.session_name}
                    </p>
                  </div>
                  <Badge variant="destructive">
                    {oldSession?.status === 'failed' ? 'Falha' : 'Desconectado'}
                  </Badge>
                </div>

                {/* Contagem de dados */}
                {isLoadingCounts ? (
                  <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Contando dados vinculados...
                  </div>
                ) : dataCounts ? (
                  <div className="flex gap-4 mt-3">
                    <div className="flex items-center gap-1.5 text-sm">
                      <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                      <span className="font-medium">{dataCounts.conversations.toLocaleString()}</span>
                      <span className="text-muted-foreground">conversas</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm">
                      <MessageSquare className="h-3.5 w-3.5 text-green-500" />
                      <span className="font-medium">{dataCounts.messages.toLocaleString()}</span>
                      <span className="text-muted-foreground">msgs</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm">
                      <Users className="h-3.5 w-3.5 text-purple-500" />
                      <span className="font-medium">{dataCounts.leads.toLocaleString()}</span>
                      <span className="text-muted-foreground">leads</span>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Seta */}
              <div className="flex justify-center">
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>

              {/* Seletor de nova sessão */}
              <div className="rounded-lg border p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  NOVA SESSÃO (receberá os dados)
                </p>
                {targetSessions.length === 0 ? (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Nenhuma outra sessão disponível. Crie uma nova sessão primeiro
                      e depois volte aqui para fazer a substituição.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Select
                    value={selectedNewSessionId}
                    onValueChange={setSelectedNewSessionId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a sessão destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {targetSessions.map((session) => (
                        <SelectItem key={session.id} value={session.id}>
                          <div className="flex items-center gap-2">
                            <span>{session.nome || session.session_name}</span>
                            <Badge
                              variant="outline"
                              className={
                                session.status === 'working'
                                  ? 'text-green-600 border-green-600'
                                  : 'text-gray-500'
                              }
                            >
                              {session.status === 'working' ? 'Conectado' : session.status}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {selectedNewSession && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Session name: {selectedNewSession.session_name}
                  </p>
                )}
              </div>

              {/* Warning */}
              {hasData && selectedNewSessionId && (
                <Alert variant="destructive" className="border-amber-500 bg-amber-50 text-amber-900">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    <strong>Atenção:</strong> Esta ação é irreversível. Todas as{' '}
                    {dataCounts!.conversations.toLocaleString()} conversas,{' '}
                    {dataCounts!.messages.toLocaleString()} mensagens e{' '}
                    {dataCounts!.leads.toLocaleString()} leads serão migrados para a nova
                    sessão. A sessão antiga será deletada.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isReplacing}>
                Cancelar
              </Button>
              <Button
                onClick={handleReplace}
                disabled={!selectedNewSessionId || isReplacing || targetSessions.length === 0}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {isReplacing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Migrando dados...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                    Substituir Sessão
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
