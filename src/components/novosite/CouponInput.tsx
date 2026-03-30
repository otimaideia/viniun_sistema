import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { useCouponValidation } from '@/hooks/public/useCouponValidation';
import { Tag, X, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export function CouponInput() {
  const { coupon, applyCoupon, removeCoupon } = useCart();
  const { validateCoupon, isValidating } = useCouponValidation();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  async function handleApply() {
    setError('');

    const result = await validateCoupon(code);

    if (result.valid && result.coupon) {
      applyCoupon(result.coupon);
      setCode('');
      toast.success('Cupom aplicado com sucesso!');
    } else {
      setError(result.error || 'Cupom invalido.');
    }
  }

  function handleRemove() {
    removeCoupon();
    setCode('');
    setError('');
    toast.info('Cupom removido.');
  }

  // Show applied coupon
  if (coupon) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <div className="min-w-0">
            <span className="text-sm font-medium text-emerald-700 block truncate">
              {coupon.codigo}
            </span>
            <span className="text-xs text-emerald-600">
              {coupon.desconto_tipo === 'percentual'
                ? `${coupon.desconto_valor}% de desconto`
                : `R$ ${coupon.desconto_valor.toFixed(2)} de desconto`}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-emerald-600 hover:text-red-600 hover:bg-red-50 shrink-0"
          onClick={handleRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Codigo do cupom"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleApply();
              }
            }}
            className="pl-9 uppercase"
            disabled={isValidating}
          />
        </div>
        <Button
          variant="outline"
          onClick={handleApply}
          disabled={isValidating || !code.trim()}
          className="shrink-0 border-[#6B2D8B] text-[#6B2D8B] hover:bg-[#6B2D8B] hover:text-white"
        >
          {isValidating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Aplicar'
          )}
        </Button>
      </div>
      {error && (
        <p className="text-xs text-red-500 pl-1">{error}</p>
      )}
    </div>
  );
}
