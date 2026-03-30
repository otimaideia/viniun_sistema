import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, UserPlus, Send } from 'lucide-react';
import { useWhatsAppTemplatesMT } from '@/hooks/multitenant/useWhatsAppTemplatesMT';

interface NewContactDialogProps {
  open: boolean;
  phone: string;
  onClose: () => void;
  onConfirm: (data: {
    nome: string;
    telefone: string;
    saveAsLead: boolean;
    message: string;
  }) => Promise<void>;
}

function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  let numero = digits;
  if (numero.length >= 12 && numero.startsWith('55')) {
    numero = numero.slice(2);
  }
  if (numero.length === 11) {
    return `(${numero.slice(0, 2)}) ${numero.slice(2, 7)}-${numero.slice(7)}`;
  }
  if (numero.length === 10) {
    return `(${numero.slice(0, 2)}) ${numero.slice(2, 6)}-${numero.slice(6)}`;
  }
  return phone;
}

export function NewContactDialog({ open, phone, onClose, onConfirm }: NewContactDialogProps) {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState(phone);
  const [saveAsLead, setSaveAsLead] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('none');
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const { templates } = useWhatsAppTemplatesMT();

  // Reset form when phone changes
  useEffect(() => {
    if (phone) {
      setTelefone(phone);
      setNome('');
      setCustomMessage('');
      setSelectedTemplateId('none');
      setSaveAsLead(true);
    }
  }, [phone]);

  const selectedTemplate = templates?.find(t => t.id === selectedTemplateId);
  const messageToSend = selectedTemplate ? selectedTemplate.conteudo : customMessage;

  const handleSubmit = async () => {
    if (!nome.trim()) return;
    setIsSending(true);
    try {
      await onConfirm({
        nome: nome.trim(),
        telefone: telefone.replace(/\D/g, ''),
        saveAsLead,
        message: messageToSend,
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-green-600" />
            Novo Contato
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="nc-nome">Nome *</Label>
            <Input
              id="nc-nome"
              placeholder="Nome do contato"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoFocus
            />
          </div>

          {/* Telefone */}
          <div className="space-y-2">
            <Label htmlFor="nc-phone">Telefone</Label>
            <Input
              id="nc-phone"
              value={formatPhoneDisplay(telefone)}
              onChange={(e) => setTelefone(e.target.value)}
              className="font-mono"
            />
          </div>

          {/* Salvar como lead */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="nc-lead"
              checked={saveAsLead}
              onCheckedChange={(checked) => setSaveAsLead(checked === true)}
            />
            <Label htmlFor="nc-lead" className="text-sm cursor-pointer">
              Salvar como lead
            </Label>
          </div>

          {/* Template */}
          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar template (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Mensagem personalizada</SelectItem>
                {templates?.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mensagem */}
          {selectedTemplateId === 'none' ? (
            <Textarea
              placeholder="Digite uma mensagem para enviar (opcional)"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={3}
            />
          ) : selectedTemplate ? (
            <div className="bg-muted rounded-md p-3 text-sm whitespace-pre-wrap">
              {selectedTemplate.conteudo}
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!nome.trim() || isSending}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {messageToSend ? 'Enviar mensagem' : 'Salvar contato'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
