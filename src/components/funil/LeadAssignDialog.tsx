import { useState, useEffect } from 'react';
import { safeGetInitials } from '@/utils/unicodeSanitizer';
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
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import type { FunilLeadExpanded } from '@/types/funil';

interface LeadAssignDialogProps {
  lead: FunilLeadExpanded | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (responsavelId: string | null) => Promise<void>;
  franqueadoId?: string;
}

interface UserProfile {
  id: string;
  nome: string;
  avatar_url?: string;
  email?: string;
}

export function LeadAssignDialog({
  lead,
  open,
  onOpenChange,
  onAssign,
  franqueadoId,
}: LeadAssignDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);
  const { tenant, franchise, accessLevel } = useTenantContext();

  // Buscar usuários filtrados por tenant/franquia
  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuarios-franquia', tenant?.id, franchise?.id, franqueadoId],
    queryFn: async () => {
      let q = supabase
        .from('mt_users')
        .select('id, nome, avatar_url, email')
        .eq('status', 'ativo')
        .order('nome');

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('franchise_id', franchise.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as UserProfile[];
    },
    enabled: open,
  });

  // Definir valor inicial quando abrir o dialog
  useEffect(() => {
    if (open && lead) {
      setSelectedUserId(lead.responsavel_id || '');
    }
  }, [open, lead]);

  const handleAssign = async () => {
    setIsAssigning(true);
    try {
      await onAssign(selectedUserId || null);
      onOpenChange(false);
    } finally {
      setIsAssigning(false);
    }
  };

  // Usa safeGetInitials para evitar surrogates órfãos com emojis

  if (!lead) return null;

  const leadData = lead.lead;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atribuir Responsável</DialogTitle>
          <DialogDescription>
            Selecione o usuário responsável pelo lead{' '}
            <strong>{leadData?.nome || 'Lead'}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um responsável">
                {selectedUserId && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {usuarios.find((u) => u.id === selectedUserId)?.nome ||
                      'Responsável'}
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  Sem responsável
                </div>
              </SelectItem>
              {isLoading ? (
                <div className="p-2 text-center">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                </div>
              ) : (
                usuarios.map((usuario) => (
                  <SelectItem key={usuario.id} value={usuario.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={usuario.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {safeGetInitials(usuario.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{usuario.nome}</span>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleAssign} disabled={isAssigning}>
            {isAssigning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Atribuindo...
              </>
            ) : (
              'Atribuir'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
