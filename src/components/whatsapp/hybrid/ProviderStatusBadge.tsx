import { Wifi, WifiOff, AlertTriangle, Pause, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ProviderStatus, ProviderType } from '@/types/whatsapp-hybrid';

interface ProviderStatusBadgeProps {
  status: ProviderStatus;
  providerType?: ProviderType;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<ProviderStatus, {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
  icon: typeof Wifi;
}> = {
  connected: {
    label: 'Conectado',
    variant: 'default',
    className: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100',
    icon: Wifi,
  },
  disconnected: {
    label: 'Desconectado',
    variant: 'secondary',
    className: 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100',
    icon: WifiOff,
  },
  error: {
    label: 'Erro',
    variant: 'destructive',
    className: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-100',
    icon: AlertTriangle,
  },
  suspended: {
    label: 'Suspenso',
    variant: 'outline',
    className: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-50',
    icon: Pause,
  },
  configuring: {
    label: 'Configurando',
    variant: 'outline',
    className: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-50',
    icon: Settings,
  },
};

export function ProviderStatusBadge({ status, providerType, size = 'md' }: ProviderStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.disconnected;
  const Icon = config.icon;
  const iconSize = size === 'sm' ? 10 : 12;

  return (
    <Badge variant={config.variant} className={`${config.className} gap-1 font-medium ${size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5'}`}>
      <Icon className={`h-${iconSize === 10 ? '2.5' : '3'} w-${iconSize === 10 ? '2.5' : '3'}`} />
      {config.label}
      {providerType && (
        <span className="opacity-60 ml-0.5">
          ({providerType === 'waha' ? 'WAHA' : 'Meta'})
        </span>
      )}
    </Badge>
  );
}
