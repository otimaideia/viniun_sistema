import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Send, Loader2 } from 'lucide-react';
import type { WhatsAppConversa } from '@/types/whatsapp-chat';

interface ForwardDialogProps {
  open: boolean;
  onClose: () => void;
  onForward: (targetChatId: string) => Promise<void>;
  conversations: WhatsAppConversa[];
  currentChatId?: string | null;
}

export function ForwardDialog({
  open,
  onClose,
  onForward,
  conversations,
  currentChatId,
}: ForwardDialogProps) {
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const others = conversations.filter(c => c.chat_id !== currentChatId && !c.is_group);
    if (!search.trim()) return others.slice(0, 30);
    const term = search.toLowerCase().trim();
    return others
      .filter(c =>
        c.nome_contato?.toLowerCase().includes(term) ||
        c.numero_telefone?.includes(term)
      )
      .slice(0, 30);
  }, [conversations, currentChatId, search]);

  const handleForward = async (chatId: string) => {
    setSending(chatId);
    try {
      await onForward(chatId);
      onClose();
    } catch {
      // error handled by caller
    } finally {
      setSending(null);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSearch('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Encaminhar mensagem</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="max-h-[300px] overflow-y-auto space-y-1">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma conversa encontrada
            </p>
          )}
          {filtered.map((conv) => (
            <button
              key={conv.id}
              onClick={() => handleForward(conv.chat_id)}
              disabled={!!sending}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left disabled:opacity-50"
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-[#dfe5e7] flex items-center justify-center text-sm font-medium text-[#54656f] shrink-0 overflow-hidden">
                {conv.foto_url ? (
                  <img src={conv.foto_url} alt="" className="w-full h-full object-cover rounded-full" />
                ) : (
                  (conv.nome_contato || conv.numero_telefone || '?').charAt(0).toUpperCase()
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {conv.nome_contato || conv.numero_telefone || 'Sem nome'}
                </p>
                {conv.numero_telefone && conv.nome_contato && (
                  <p className="text-xs text-muted-foreground truncate">
                    {conv.numero_telefone}
                  </p>
                )}
              </div>

              {/* Send indicator */}
              {sending === conv.chat_id ? (
                <Loader2 className="h-4 w-4 animate-spin text-green-600 shrink-0" />
              ) : (
                <Send className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100" />
              )}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
