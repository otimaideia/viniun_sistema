import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  MoreVertical,
  Eye,
  MessageCircle,
  Phone,
  Mail,
  DollarSign,
  User,
  ArrowRight,
  Trash2,
  ExternalLink,
  Copy,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import { cleanPhoneNumber } from '@/utils/phone';
import type { FunilLeadExpanded, FunilEtapa } from '@/types/funil';

interface LeadQuickActionsProps {
  lead: FunilLeadExpanded;
  etapas?: FunilEtapa[];
  onOpenDetail?: () => void;
  onOpenChat?: (conversaId: string) => void;
  onEditValor?: () => void;
  onAssignResponsavel?: () => void;
  onMoveToEtapa?: (etapaId: string) => void;
  onRemove?: () => void;
  onAddTag?: () => void;
}

export function LeadQuickActions({
  lead,
  etapas = [],
  onOpenDetail,
  onOpenChat,
  onEditValor,
  onAssignResponsavel,
  onMoveToEtapa,
  onRemove,
  onAddTag,
}: LeadQuickActionsProps) {
  const leadData = lead.lead;
  const whatsappCache = lead.whatsapp_cache;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const openWhatsAppWeb = () => {
    if (leadData?.telefone) {
      const phone = cleanPhoneNumber(leadData.telefone);
      const codigoPais = (leadData as any).telefone_codigo_pais || '55';
      window.open(`https://wa.me/${codigoPais}${phone}`, '_blank');
    }
  };

  const callPhone = () => {
    if (leadData?.telefone) {
      window.location.href = `tel:${leadData.telefone}`;
    }
  };

  const sendEmail = () => {
    if (leadData?.email) {
      window.location.href = `mailto:${leadData.email}`;
    }
  };

  const availableEtapas = etapas.filter((e) => e.id !== lead.etapa_id);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuLabel>Ações</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Ver detalhes */}
        <DropdownMenuItem onClick={onOpenDetail}>
          <Eye className="h-4 w-4 mr-2" />
          Ver detalhes
        </DropdownMenuItem>

        {/* Ficha do lead */}
        {leadData?.id && (
          <DropdownMenuItem asChild>
            <a href={`/leads/${leadData.id}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir ficha do lead
            </a>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* Contato */}
        {leadData?.telefone && (
          <>
            <DropdownMenuItem onClick={openWhatsAppWeb}>
              <MessageCircle className="h-4 w-4 mr-2 text-green-600" />
              WhatsApp Web
            </DropdownMenuItem>

            {whatsappCache?.conversa_id && (
              <DropdownMenuItem onClick={() => onOpenChat?.(whatsappCache.conversa_id!)}>
                <MessageCircle className="h-4 w-4 mr-2" />
                Abrir chat interno
              </DropdownMenuItem>
            )}

            <DropdownMenuItem onClick={callPhone}>
              <Phone className="h-4 w-4 mr-2" />
              Ligar
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => copyToClipboard(leadData.telefone!, 'Telefone')}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar telefone
            </DropdownMenuItem>
          </>
        )}

        {leadData?.email && (
          <>
            <DropdownMenuItem onClick={sendEmail}>
              <Mail className="h-4 w-4 mr-2" />
              Enviar e-mail
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => copyToClipboard(leadData.email!, 'E-mail')}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar e-mail
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />

        {/* Gestão */}
        <DropdownMenuItem onClick={onEditValor}>
          <DollarSign className="h-4 w-4 mr-2" />
          Editar valor estimado
        </DropdownMenuItem>

        <DropdownMenuItem onClick={onAssignResponsavel}>
          <User className="h-4 w-4 mr-2" />
          Atribuir responsável
        </DropdownMenuItem>

        {onAddTag && (
          <DropdownMenuItem onClick={onAddTag}>
            <Tag className="h-4 w-4 mr-2" />
            Adicionar tag
          </DropdownMenuItem>
        )}

        {/* Mover para etapa */}
        {availableEtapas.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ArrowRight className="h-4 w-4 mr-2" />
                Mover para etapa
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {availableEtapas.map((etapa) => (
                  <DropdownMenuItem
                    key={etapa.id}
                    onClick={() => onMoveToEtapa?.(etapa.id)}
                  >
                    <div
                      className="w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: etapa.cor }}
                    />
                    {etapa.nome}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </>
        )}

        <DropdownMenuSeparator />

        {/* Remover */}
        <DropdownMenuItem
          onClick={onRemove}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Remover do funil
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
