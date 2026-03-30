import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CreditCard, RefreshCw, QrCode } from 'lucide-react';

interface PaymentMethodSelectorProps {
  selected: 'pix' | 'cartao_credito' | 'recorrencia';
  onSelect: (method: 'pix' | 'cartao_credito' | 'recorrencia') => void;
  totalPix: number;
  totalCartao: number;
  totalRecorrente: number;
  precoOriginal: number;
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

function calcDiscount(original: number, discounted: number): number {
  if (original <= 0 || discounted >= original) return 0;
  return Math.round(((original - discounted) / original) * 100);
}

export function PaymentMethodSelector({
  selected,
  onSelect,
  totalPix,
  totalCartao,
  totalRecorrente,
  precoOriginal,
}: PaymentMethodSelectorProps) {
  const methods = [
    {
      id: 'cartao_credito' as const,
      label: 'Credito',
      icon: CreditCard,
      description: 'O valor total da compra e descontado do limite do seu cartao de credito.',
      total: totalCartao,
      discount: calcDiscount(precoOriginal, totalCartao),
      accent: 'border-blue-500 bg-blue-50',
      badgeColor: 'bg-blue-100 text-blue-700',
      iconColor: 'text-blue-600',
      installments: totalCartao >= 50 ? Math.ceil((totalCartao / 12) * 100) / 100 : null,
    },
    {
      id: 'recorrencia' as const,
      label: 'Recorrente',
      icon: RefreshCw,
      description: 'So o valor da parcela e descontada do limite do seu cartao de credito.',
      total: totalRecorrente,
      discount: calcDiscount(precoOriginal, totalRecorrente),
      accent: 'border-purple-500 bg-purple-50',
      badgeColor: 'bg-purple-100 text-purple-700',
      iconColor: 'text-purple-600',
      installments: totalRecorrente >= 50 ? Math.ceil((totalRecorrente / 18) * 100) / 100 : null,
      installmentCount: 18,
    },
    {
      id: 'pix' as const,
      label: 'PIX',
      icon: QrCode,
      description: 'Uma transferencia a vista instantanea, sua compra e aprovada na hora!',
      total: totalPix,
      discount: calcDiscount(precoOriginal, totalPix),
      accent: 'border-emerald-500 bg-emerald-50',
      badgeColor: 'bg-emerald-100 text-emerald-700',
      iconColor: 'text-emerald-600',
      isBestDeal: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {methods.map((method) => {
        const isSelected = selected === method.id;
        const Icon = method.icon;

        return (
          <Card
            key={method.id}
            onClick={() => onSelect(method.id)}
            className={cn(
              'relative cursor-pointer p-5 transition-all duration-200 border-2',
              isSelected
                ? cn(method.accent, 'ring-2 ring-offset-2', `ring-${method.id === 'pix' ? 'emerald' : method.id === 'recorrencia' ? 'purple' : 'blue'}-500`)
                : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
            )}
          >
            {/* Discount badge */}
            {method.discount > 0 && (
              <Badge
                className={cn(
                  'absolute -top-2.5 right-3 text-xs font-bold',
                  method.isBestDeal
                    ? 'bg-emerald-600 hover:bg-emerald-600 text-white'
                    : method.badgeColor
                )}
              >
                {method.discount}% OFF
              </Badge>
            )}

            {/* Best deal tag */}
            {method.isBestDeal && (
              <Badge className="absolute -top-2.5 left-3 bg-emerald-600 hover:bg-emerald-600 text-white text-[10px]">
                Melhor preco
              </Badge>
            )}

            <div className="flex flex-col items-center text-center space-y-3">
              <div
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center',
                  isSelected ? method.accent : 'bg-gray-100'
                )}
              >
                <Icon className={cn('w-6 h-6', isSelected ? method.iconColor : 'text-gray-500')} />
              </div>

              <div>
                <h3 className="font-semibold text-base">{method.label}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {method.description}
                </p>
              </div>

              <div className="pt-1">
                <span
                  className={cn(
                    'text-2xl font-bold',
                    method.isBestDeal && isSelected ? 'text-emerald-700' : 'text-foreground'
                  )}
                >
                  {formatCurrency(method.total)}
                </span>

                {'installments' in method && method.installments && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    em ate {method.installmentCount || 12}x de{' '}
                    <span className="font-medium">{formatCurrency(method.installments)}</span>
                  </p>
                )}

                {method.id === 'pix' && (
                  <p className="text-xs text-emerald-600 font-medium mt-0.5">a vista</p>
                )}
              </div>
            </div>

            {/* Selection indicator */}
            <div
              className={cn(
                'absolute top-3 left-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                isSelected ? 'border-current bg-current' : 'border-gray-300'
              )}
              style={
                isSelected
                  ? {
                      borderColor:
                        method.id === 'pix' ? '#059669' : method.id === 'recorrencia' ? '#9333ea' : '#2563eb',
                      backgroundColor:
                        method.id === 'pix' ? '#059669' : method.id === 'recorrencia' ? '#9333ea' : '#2563eb',
                    }
                  : undefined
              }
            >
              {isSelected && (
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
