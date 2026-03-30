import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserCircle, Phone, Building2 } from "lucide-react";
import { toast } from "sonner";

interface ContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (contact: ContactData) => Promise<{ success: boolean; error?: string }>;
  isSending?: boolean;
}

export interface ContactData {
  name: string;
  phone: string;
  organization?: string;
}

export function ContactDialog({
  open,
  onOpenChange,
  onSend,
  isSending = false,
}: ContactDialogProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [organization, setOrganization] = useState("");

  const resetForm = () => {
    setName("");
    setPhone("");
    setOrganization("");
  };

  const formatPhone = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, "");

    // Formata o telefone brasileiro
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 7) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else if (numbers.length <= 11) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    } else {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("O nome é obrigatório");
      return;
    }

    if (!phone.trim()) {
      toast.error("O telefone é obrigatório");
      return;
    }

    // Extrair apenas números do telefone
    const phoneNumbers = phone.replace(/\D/g, "");
    if (phoneNumbers.length < 10) {
      toast.error("Telefone inválido. Informe DDD + número");
      return;
    }

    const contactData: ContactData = {
      name: name.trim(),
      phone: phoneNumbers,
      organization: organization.trim() || undefined,
    };

    try {
      const result = await onSend(contactData);
      if (result.success) {
        toast.success("Contato enviado com sucesso!");
        resetForm();
        onOpenChange(false);
      } else {
        toast.error(result.error || "Erro ao enviar contato");
      }
    } catch (error) {
      toast.error("Erro ao enviar contato");
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5" />
            Compartilhar Contato
          </DialogTitle>
          <DialogDescription>
            Envie um contato para a conversa
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <UserCircle className="h-4 w-4" />
              Nome *
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do contato"
              maxLength={100}
              required
            />
          </div>

          {/* Telefone */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Telefone *
            </Label>
            <Input
              id="phone"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="(00) 00000-0000"
              maxLength={16}
              required
            />
            <p className="text-xs text-muted-foreground">
              Informe o DDD + número
            </p>
          </div>

          {/* Organização (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="organization" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Empresa (opcional)
            </Label>
            <Input
              id="organization"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="Nome da empresa"
              maxLength={100}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSending}>
              {isSending ? "Enviando..." : "Enviar Contato"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ContactDialog;
