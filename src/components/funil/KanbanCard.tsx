import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Phone,
  MessageCircle,
  MoreVertical,
  DollarSign,
  Clock,
  User,
  ExternalLink,
  Edit,
  Trash2,
  UserPlus,
  Tag,
  ArrowRightLeft,
} from 'lucide-react';
import { formatPhoneForTable } from '@/utils/phone';
import { safeGetInitials } from '@/utils/unicodeSanitizer';
import { cn } from '@/lib/utils';
import type { FunilLeadExpanded } from '@/types/funil';
import { Link } from 'react-router-dom';
import { useCadenciaLeadInfo } from '@/hooks/multitenant/useCadenciaMT';

interface KanbanCardProps {
  lead: FunilLeadExpanded;
  onOpenDetail?: (lead: FunilLeadExpanded) => void;
  onOpenChat?: (conversaId: string) => void;
  onAssignResponsavel?: (lead: FunilLeadExpanded) => void;
  onEditValor?: (lead: FunilLeadExpanded) => void;
  onRemove?: (lead: FunilLeadExpanded) => void;
  onTransferFunnel?: (lead: FunilLeadExpanded) => void;
  isDragging?: boolean;
}

export function KanbanCard({
  lead,
  onOpenDetail,
  onOpenChat,
  onAssignResponsavel,
  onEditValor,
  onRemove,
  onTransferFunnel,
  isDragging = false,
}: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: lead.id,
    data: {
      type: 'lead',
      etapaId: lead.etapa_id,
      lead,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Calcular dias na etapa (fallback para data_entrada ou created_at)
  const dataRef = lead.data_etapa || lead.data_entrada || lead.created_at;
  const diasNaEtapa = dataRef
    ? Math.floor((Date.now() - new Date(dataRef).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Verificar se está "esfriando"
  const metaDias = lead.etapa?.meta_dias;
  const esfriando = metaDias ? diasNaEtapa >= metaDias : false;
  const critico = metaDias ? diasNaEtapa >= metaDias * 1.5 : false;

  // Dados de cadência (desabilitado para performance - será carregado em batch no KanbanBoard)
  // const cadencia = useCadenciaLeadInfo(lead.lead_id);
  const cadencia = (lead as any)._cadencia as import('@/hooks/multitenant/useCadenciaMT').CadenciaLeadInfo | null | undefined;

  // Dados do WhatsApp cache
  const hasWhatsApp = !!lead.whatsapp_cache?.conversa_id;
  const unreadCount = lead.whatsapp_cache?.unread_count || 0;
  const avatarUrl = lead.whatsapp_cache?.avatar_url || lead.lead?.foto_url;
  const ultimaMensagem = lead.whatsapp_cache?.ultima_mensagem;

  // Formatar valor
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Iniciais do nome (usando safeGetInitials para evitar surrogates órfãos com emojis)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'bg-card rounded-lg p-3 shadow-sm border cursor-grab active:cursor-grabbing',
        'hover:shadow-md transition-shadow',
        (isDragging || isSortableDragging) && 'opacity-50 shadow-lg ring-2 ring-primary',
        esfriando && !critico && 'border-l-4 border-l-yellow-500',
        critico && 'border-l-4 border-l-red-500'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Avatar className="h-9 w-9">
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt={lead.lead?.nome} />
          ) : null}
          <AvatarFallback className="text-xs bg-muted">
            {lead.lead?.nome ? safeGetInitials(lead.lead.nome) : <User className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p
            className="font-medium text-sm truncate cursor-pointer hover:text-primary"
            onClick={() => onOpenDetail?.(lead)}
          >
            {lead.lead?.nome || 'Sem nome'}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {lead.lead?.unidade || 'Sem unidade'}
          </p>
        </div>

        {/* WhatsApp Badge */}
        {hasWhatsApp && (
          <Badge
            variant="outline"
            className={cn(
              'text-green-600 border-green-200 cursor-pointer',
              unreadCount > 0 && 'bg-green-50'
            )}
            onClick={() => lead.whatsapp_cache?.conversa_id && onOpenChat?.(lead.whatsapp_cache.conversa_id)}
          >
            <MessageCircle className="w-3 h-3 mr-1" />
            {unreadCount > 0 && <span>{unreadCount}</span>}
          </Badge>
        )}

        {/* Menu de ações */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onOpenDetail?.(lead)}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver detalhes
            </DropdownMenuItem>
            {hasWhatsApp && (
              <DropdownMenuItem
                onClick={() =>
                  lead.whatsapp_cache?.conversa_id && onOpenChat?.(lead.whatsapp_cache.conversa_id)
                }
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Abrir chat
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onAssignResponsavel?.(lead)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Atribuir responsável
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEditValor?.(lead)}>
              <DollarSign className="h-4 w-4 mr-2" />
              Editar valor
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onTransferFunnel?.(lead)}>
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Trocar de funil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onRemove?.(lead)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remover do funil
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Info */}
      <div className="space-y-1 text-sm">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Phone className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{formatPhoneForTable(lead.lead?.telefone || '')}</span>
        </div>

        {lead.valor_estimado && lead.valor_estimado > 0 && (
          <div className="flex items-center gap-1 text-green-600 font-medium">
            <DollarSign className="w-3 h-3 flex-shrink-0" />
            <span>{formatCurrency(lead.valor_estimado)}</span>
          </div>
        )}
      </div>

      {/* WhatsApp Preview */}
      {ultimaMensagem && (
        <div
          className="mt-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground truncate cursor-pointer hover:bg-muted"
          onClick={() =>
            lead.whatsapp_cache?.conversa_id && onOpenChat?.(lead.whatsapp_cache.conversa_id)
          }
        >
          💬 {ultimaMensagem}
        </div>
      )}

      {/* Indicador de Cadência */}
      {cadencia && cadencia.status === 'ativa' && (
        <div
          className={cn(
            'mt-2 flex items-center gap-2 text-xs px-2 py-1 rounded',
            cadencia.atrasado
              ? 'bg-red-50 text-red-700'
              : 'bg-orange-50 text-orange-700'
          )}
          title={cadencia.proxima_tentativa_em
            ? `Próximo contato: ${new Date(cadencia.proxima_tentativa_em).toLocaleDateString('pt-BR')}`
            : 'Cadência ativa'
          }
        >
          <Phone className="w-3 h-3" />
          <span className="font-medium">
            {cadencia.tentativa_atual}/{cadencia.max_tentativas}
          </span>
          {cadencia.atrasado && (
            <span className="text-[10px] font-semibold">ATRASADO</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex gap-1 flex-wrap">
          {(lead.tags || []).slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
              {tag}
            </Badge>
          ))}
          {(lead.tags || []).length > 2 && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              +{(lead.tags || []).length - 2}
            </Badge>
          )}
        </div>

        <div
          className={cn(
            'text-xs flex items-center gap-1 px-1.5 py-0.5 rounded',
            critico
              ? 'text-red-600 bg-red-50 font-semibold'
              : esfriando
              ? 'text-yellow-700 bg-yellow-50 font-medium'
              : 'text-muted-foreground'
          )}
          title={
            metaDias
              ? `${diasNaEtapa} dias nesta etapa (meta: ${metaDias} dias)${
                  critico ? ' - CRÍTICO' : esfriando ? ' - Esfriando' : ''
                }`
              : `${diasNaEtapa} dias nesta etapa`
          }
        >
          <Clock className="w-3 h-3" />
          <span>{diasNaEtapa}d</span>
          {metaDias && (
            <span className="text-[10px] opacity-70">/{metaDias}d</span>
          )}
        </div>
      </div>

      {/* Responsável */}
      {lead.responsavel && (
        <div className="mt-2 pt-2 border-t flex items-center gap-1 text-xs text-muted-foreground">
          <User className="w-3 h-3" />
          <span className="truncate">{lead.responsavel.full_name}</span>
        </div>
      )}
    </div>
  );
}

// Card simplificado para o drag overlay
export function KanbanCardOverlay({ lead }: { lead: FunilLeadExpanded }) {
  return (
    <div className="bg-card rounded-lg p-3 shadow-lg border-2 border-primary w-64 opacity-90">
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs bg-muted">
            {lead.lead?.nome ? safeGetInitials(lead.lead.nome) : <User className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{lead.lead?.nome || 'Sem nome'}</p>
          <p className="text-xs text-muted-foreground truncate">{lead.lead?.unidade}</p>
        </div>
      </div>
    </div>
  );
}
