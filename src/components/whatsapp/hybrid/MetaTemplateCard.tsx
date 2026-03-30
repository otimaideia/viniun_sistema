import { FileText, Check, Clock, X, Pause, MessageSquare, MoreVertical, Eye, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { WhatsAppMetaTemplate, TemplateApprovalStatus, TemplateCategory } from '@/types/whatsapp-hybrid';
import { TEMPLATE_CATEGORY_LABELS, TEMPLATE_STATUS_LABELS, formatCostBRL, META_COST_TABLE_BRL } from '@/types/whatsapp-hybrid';

interface MetaTemplateCardProps {
  template: WhatsAppMetaTemplate;
  onView?: (template: WhatsAppMetaTemplate) => void;
  onEdit?: (template: WhatsAppMetaTemplate) => void;
  onDelete?: (id: string) => void;
  onUse?: (template: WhatsAppMetaTemplate) => void;
}

const STATUS_ICON: Record<TemplateApprovalStatus, typeof Check> = {
  APPROVED: Check,
  PENDING: Clock,
  REJECTED: X,
  PAUSED: Pause,
  DISABLED: X,
};

const STATUS_COLORS: Record<TemplateApprovalStatus, string> = {
  APPROVED: 'bg-green-100 text-green-700 border-green-200',
  PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  REJECTED: 'bg-red-100 text-red-700 border-red-200',
  PAUSED: 'bg-gray-100 text-gray-600 border-gray-200',
  DISABLED: 'bg-gray-100 text-gray-500 border-gray-200',
};

const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  UTILITY: 'border-cyan-300 text-cyan-700',
  AUTHENTICATION: 'border-indigo-300 text-indigo-700',
  MARKETING: 'border-pink-300 text-pink-700',
  SERVICE: 'border-green-300 text-green-700',
};

export function MetaTemplateCard({
  template,
  onView,
  onEdit,
  onDelete,
  onUse,
}: MetaTemplateCardProps) {
  const StatusIcon = STATUS_ICON[template.approval_status];
  const cost = META_COST_TABLE_BRL[template.category];
  const isFree = cost === 0;
  const isApproved = template.approval_status === 'APPROVED';
  const isUsable = isApproved && template.is_active;

  // Preview: truncar body_text
  const bodyPreview = template.body_text.length > 120
    ? template.body_text.substring(0, 120) + '...'
    : template.body_text;

  return (
    <Card className={`${!template.is_active ? 'opacity-50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <div className="p-1.5 rounded bg-purple-100 shrink-0 mt-0.5">
              <FileText className="h-3.5 w-3.5 text-purple-600" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold truncate">{template.meta_template_name}</h4>
              <p className="text-xs text-muted-foreground">
                {template.language || 'pt_BR'}
                {template.provider && ` • ${template.provider.nome}`}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView?.(template)}>
                <Eye className="h-4 w-4 mr-2" />
                Visualizar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit?.(template)}>
                Editar
              </DropdownMenuItem>
              {isUsable && (
                <DropdownMenuItem onClick={() => onUse?.(template)}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Usar template
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete?.(template.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remover
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[template.approval_status]}`}>
            <StatusIcon className="h-2.5 w-2.5 mr-0.5" />
            {TEMPLATE_STATUS_LABELS[template.approval_status]}
          </Badge>
          <Badge variant="outline" className={`text-[10px] ${CATEGORY_COLORS[template.category]}`}>
            {TEMPLATE_CATEGORY_LABELS[template.category]}
          </Badge>
          {isFree ? (
            <Badge variant="outline" className="text-[10px] border-green-300 text-green-600">
              Grátis
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-600">
              {formatCostBRL(cost)}/msg
            </Badge>
          )}
        </div>

        {/* Body preview */}
        <div className="bg-muted/50 rounded p-2 mb-3">
          <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
            {bodyPreview}
          </p>
          {template.body_variables && template.body_variables.length > 0 && (
            <div className="flex gap-1 mt-1.5">
              {template.body_variables.map((v, i) => (
                <Badge key={i} variant="secondary" className="text-[10px] px-1">
                  {`{{${i + 1}}}`} = {v}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Usado {template.usage_count}x</span>
          {template.quality_score && (
            <span>Qualidade: {template.quality_score}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
