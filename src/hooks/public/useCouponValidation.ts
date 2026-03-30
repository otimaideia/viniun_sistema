import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CartCoupon } from '@/contexts/CartContext';

const TENANT_ID = 'ebf87fe2-093a-4fba-bb56-c6835cbc1465';

interface ValidationResult {
  valid: boolean;
  coupon?: CartCoupon;
  error?: string;
}

export function useCouponValidation() {
  const [isValidating, setIsValidating] = useState(false);

  async function validateCoupon(code: string): Promise<ValidationResult> {
    const trimmed = code.trim().toUpperCase();

    if (!trimmed) {
      return { valid: false, error: 'Informe o codigo do cupom.' };
    }

    setIsValidating(true);

    try {
      const { data, error } = await supabase
        .from('mt_promotions')
        .select('id, codigo, desconto_tipo, desconto_valor, status, is_public, data_inicio, data_fim, max_usos, usos_count')
        .eq('tenant_id', TENANT_ID)
        .ilike('codigo', trimmed)
        .is('deleted_at', null)
        .single();

      if (error || !data) {
        return { valid: false, error: 'Cupom nao encontrado.' };
      }

      // Check status
      if (data.status !== 'ativa') {
        return { valid: false, error: 'Este cupom nao esta ativo.' };
      }

      // Check public
      if (!data.is_public) {
        return { valid: false, error: 'Este cupom nao esta disponivel.' };
      }

      // Check dates
      const now = new Date();

      if (data.data_inicio) {
        const start = new Date(data.data_inicio);
        if (now < start) {
          return { valid: false, error: 'Este cupom ainda nao esta valido.' };
        }
      }

      if (data.data_fim) {
        const end = new Date(data.data_fim);
        if (now > end) {
          return { valid: false, error: 'Este cupom ja expirou.' };
        }
      }

      // Check usage limit
      if (data.max_usos != null && data.usos_count >= data.max_usos) {
        return { valid: false, error: 'Este cupom atingiu o limite de usos.' };
      }

      // Check discount fields
      if (!data.desconto_tipo || !data.desconto_valor || data.desconto_valor <= 0) {
        return { valid: false, error: 'Este cupom nao possui desconto configurado.' };
      }

      const coupon: CartCoupon = {
        codigo: data.codigo,
        desconto_tipo: data.desconto_tipo as 'percentual' | 'valor_fixo',
        desconto_valor: data.desconto_valor,
        promotion_id: data.id,
      };

      return { valid: true, coupon };
    } catch {
      return { valid: false, error: 'Erro ao validar cupom. Tente novamente.' };
    } finally {
      setIsValidating(false);
    }
  }

  return { validateCoupon, isValidating };
}
