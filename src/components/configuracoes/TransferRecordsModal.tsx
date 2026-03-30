import React, { useState, useEffect } from 'react';
import {
  ArrowRightLeft,
  Users,
  MessageSquare,
  Calendar,
  Target,
  GitBranch,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useTransferUserRecords,
  type RecordCounts,
} from '@/hooks/useTransferUserRecords';

interface TargetUser {
  id: string;
  nome: string;
  email: string;
  access_level: string;
  franchise_id: string | null;
  franchise: { nome: string } | null;
}

interface TransferRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    nome: string;
    email: string;
    tenant_id: string;
  };
  onTransferComplete: () => void;
}

const CATEGORY_CONFIG = [
  {
    key: 'leads' as const,
    label: 'Leads atribuídos',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    transferKey: 'transferLeads' as const,
  },
  {
    key: 'conversations' as const,
    label: 'Conversas WhatsApp',
    icon: MessageSquare,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    transferKey: 'transferConversations' as const,
  },
  {
    key: 'appointments' as const,
    label: 'Agendamentos futuros',
    icon: Calendar,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    transferKey: 'transferAppointments' as const,
  },
  {
    key: 'funnel_leads' as const,
    label: 'Leads no funil',
    icon: GitBranch,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    transferKey: 'transferFunnel' as const,
  },
  {
    key: 'goals' as const,
    label: 'Metas ativas',
    icon: Target,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    transferKey: 'transferGoals' as const,
  },
];

export function TransferRecordsModal({
  isOpen,
  onClose,
  user,
  onTransferComplete,
}: TransferRecordsModalProps) {
  const { getRecordCounts, getActiveUsers, transfer, isTransferring, isLoadingCounts } =
    useTransferUserRecords();

  const [counts, setCounts] = useState<RecordCounts | null>(null);
  const [activeUsers, setActiveUsers] = useState<TargetUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Checkboxes de categorias
  const [transferOptions, setTransferOptions] = useState({
    transferLeads: true,
    transferConversations: true,
    transferAppointments: true,
    transferFunnel: true,
    transferGoals: true,
  });

  // Carregar contagens e usuários quando abrir
  useEffect(() => {
    if (isOpen && user?.id) {
      loadData();
    }
    // Reset ao fechar
    if (!isOpen) {
      setCounts(null);
      setActiveUsers([]);
      setSelectedUserId('');
      setTransferOptions({
        transferLeads: true,
        transferConversations: true,
        transferAppointments: true,
        transferFunnel: true,
        transferGoals: true,
      });
    }
  }, [isOpen, user?.id]);

  const loadData = async () => {
    setIsLoadingUsers(true);
    try {
      const [recordCounts, users] = await Promise.all([
        getRecordCounts(user.id),
        getActiveUsers(user.id),
      ]);
      setCounts(recordCounts);
      setActiveUsers(users as TargetUser[]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedUserId) return;

    try {
      await transfer({
        fromUserId: user.id,
        toUserId: selectedUserId,
        ...transferOptions,
      });
      onTransferComplete();
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const toggleCategory = (key: keyof typeof transferOptions) => {
    setTransferOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const hasAnyRecords = counts && counts.total > 0;
  const selectedTransferCount = counts
    ? CATEGORY_CONFIG.reduce((sum, cat) => {
        if (transferOptions[cat.transferKey] && counts[cat.key] > 0) {
          return sum + counts[cat.key];
        }
        return sum;
      }, 0)
    : 0;

  const isLoading = isLoadingCounts || isLoadingUsers;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Transferir registros
          </DialogTitle>
          <DialogDescription>
            Antes de desativar <strong>{user.nome}</strong>, transfira os registros
            vinculados para outro usuário.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Carregando registros...</span>
          </div>
        ) : !hasAnyRecords ? (
          <div className="text-center py-6">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground">
              Este usuário não possui registros ativos vinculados.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Pode desativar diretamente sem necessidade de transferência.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Contagens por categoria */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Registros vinculados</Label>
              <div className="space-y-2">
                {CATEGORY_CONFIG.map((cat) => {
                  const count = counts?.[cat.key] || 0;
                  if (count === 0) return null;
                  const Icon = cat.icon;

                  return (
                    <div
                      key={cat.key}
                      className={`flex items-center justify-between p-3 rounded-lg border ${cat.bgColor}`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={transferOptions[cat.transferKey]}
                          onCheckedChange={() => toggleCategory(cat.transferKey)}
                          id={cat.key}
                        />
                        <label
                          htmlFor={cat.key}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Icon className={`h-4 w-4 ${cat.color}`} />
                          <span className="text-sm font-medium">{cat.label}</span>
                        </label>
                      </div>
                      <Badge variant="secondary" className="font-mono">
                        {count}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Seletor de destino */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Transferir para</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o usuário destino..." />
                </SelectTrigger>
                <SelectContent>
                  {activeUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      <div className="flex flex-col">
                        <span>{u.nome}</span>
                        <span className="text-xs text-muted-foreground">
                          {u.email}
                          {u.franchise?.nome && ` · ${u.franchise.nome}`}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeUsers.length === 0 && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Não há outros usuários ativos neste tenant.
                </p>
              )}
            </div>

            {/* Resumo */}
            {selectedUserId && selectedTransferCount > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>
                    <strong>{selectedTransferCount}</strong> registro(s) serão transferidos
                    para{' '}
                    <strong>
                      {activeUsers.find((u) => u.id === selectedUserId)?.nome}
                    </strong>{' '}
                    e o usuário será desativado.
                  </span>
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isTransferring}>
            Cancelar
          </Button>

          {!hasAnyRecords ? (
            // Sem registros: desativar direto
            <Button
              variant="destructive"
              onClick={onTransferComplete}
              disabled={isLoading}
            >
              Desativar usuário
            </Button>
          ) : (
            // Com registros: transferir e desativar
            <Button
              variant="destructive"
              onClick={handleTransfer}
              disabled={
                !selectedUserId || isTransferring || selectedTransferCount === 0
              }
            >
              {isTransferring ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Transferindo...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Transferir e desativar
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
