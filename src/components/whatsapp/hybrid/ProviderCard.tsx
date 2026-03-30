import { Phone, Settings, Power, PowerOff, Star, Link2, ExternalLink, MoreVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ProviderStatusBadge } from './ProviderStatusBadge';
import type { WhatsAppProvider } from '@/types/whatsapp-hybrid';
import { PROVIDER_TYPE_LABELS } from '@/types/whatsapp-hybrid';

interface ProviderCardProps {
  provider: WhatsAppProvider;
  onEdit?: (provider: WhatsAppProvider) => void;
  onToggleActive?: (id: string, isActive: boolean) => void;
  onSetDefault?: (id: string) => void;
  onDelete?: (id: string) => void;
  onViewDetails?: (provider: WhatsAppProvider) => void;
  isAdmin?: boolean;
}

export function ProviderCard({
  provider,
  onEdit,
  onToggleActive,
  onSetDefault,
  onDelete,
  onViewDetails,
  isAdmin = false,
}: ProviderCardProps) {
  const isWaha = provider.provider_type === 'waha';
  const borderColor = isWaha ? 'border-l-green-500' : 'border-l-blue-500';
  const iconBg = isWaha ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700';

  return (
    <Card className={`border-l-4 ${borderColor} ${!provider.is_active ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${iconBg}`}>
              {isWaha ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2.546 20.2A1 1 0 003.8 21.454l3.032-.892A9.96 9.96 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
                </svg>
              )}
            </div>
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                {provider.nome}
                {provider.is_default && (
                  <Badge variant="outline" className="text-[10px] px-1.5 bg-yellow-50 border-yellow-300 text-yellow-700">
                    <Star className="h-2.5 w-2.5 mr-0.5" />
                    Padrão
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{PROVIDER_TYPE_LABELS[provider.provider_type]}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ProviderStatusBadge status={provider.status} size="sm" />

            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit?.(provider)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Configurar
                  </DropdownMenuItem>
                  {!provider.is_default && (
                    <DropdownMenuItem onClick={() => onSetDefault?.(provider.id)}>
                      <Star className="h-4 w-4 mr-2" />
                      Definir como padrão
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onToggleActive?.(provider.id, !provider.is_active)}>
                    {provider.is_active ? (
                      <><PowerOff className="h-4 w-4 mr-2" /> Desativar</>
                    ) : (
                      <><Power className="h-4 w-4 mr-2" /> Ativar</>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onDelete?.(provider.id)}
                  >
                    Remover
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Phone */}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Phone className="h-3 w-3" />
            <span>{provider.phone_number || '-'}</span>
          </div>

          {/* Franchise */}
          {provider.franchise && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="truncate">{provider.franchise.nome}</span>
            </div>
          )}

          {/* Coexistence */}
          {provider.coexistence_enabled && (
            <div className="col-span-2">
              <Badge variant="outline" className="text-[10px] bg-purple-50 border-purple-200 text-purple-600">
                <Link2 className="h-2.5 w-2.5 mr-0.5" />
                Coexistência ativa
                {provider.partner && ` - ${provider.partner.nome}`}
              </Badge>
            </div>
          )}

          {/* Error info */}
          {provider.status === 'error' && provider.last_error_message && (
            <div className="col-span-2 mt-1 p-1.5 rounded bg-red-50 text-red-600 text-[10px]">
              {provider.last_error_message}
            </div>
          )}
        </div>

        {/* Action row */}
        <div className="mt-3 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7 flex-1"
            onClick={() => onViewDetails?.(provider)}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Detalhes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
