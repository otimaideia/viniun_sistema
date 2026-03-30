import { CreditCard } from 'lucide-react';

interface InstallmentCalculatorProps {
  total: number;
  maxInstallments?: number;
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export function InstallmentCalculator({ total, maxInstallments = 12 }: InstallmentCalculatorProps) {
  if (total < 50) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CreditCard className="w-4 h-4" />
        <span>a vista {formatCurrency(total)}</span>
      </div>
    );
  }

  const installmentValue = Math.ceil((total / maxInstallments) * 100) / 100;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <CreditCard className="w-4 h-4 text-blue-500" />
      <span>
        em ate{' '}
        <span className="font-semibold text-foreground">
          {maxInstallments}x de {formatCurrency(installmentValue)}
        </span>
      </span>
    </div>
  );
}
