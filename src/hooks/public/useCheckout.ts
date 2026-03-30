import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const TENANT_ID = 'ebf87fe2-093a-4fba-bb56-c6835cbc1465';

// Default franchise for Praia Grande (website sales)
const DEFAULT_FRANCHISE_ID = '0196105b-a729-7860-9e79-2c81e2e1773e';

interface CheckoutData {
  items: Array<{
    service_id: string;
    nome: string;
    quantidade: number;
    preco_unitario: number;
    preco_total: number;
  }>;
  customer: {
    nome: string;
    email: string;
    telefone: string;
    cpf?: string;
    data_nascimento?: string;
  };
  paymentMethod: 'pix' | 'cartao_credito' | 'recorrencia';
  totalAmount: number;
  discountAmount: number;
  couponCode?: string;
  promotionId?: string;
}

interface CheckoutResult {
  success: boolean;
  orderNumber?: string;
  error?: string;
}

function generateOrderNumber(): string {
  const now = new Date();
  const yyyymmdd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const random = String(Math.floor(1000 + Math.random() * 9000));
  return `WEB-${yyyymmdd}-${random}`;
}

export function useCheckout() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createOrder = useCallback(async (data: CheckoutData): Promise<CheckoutResult> => {
    setIsSubmitting(true);

    try {
      // 1. Upsert lead by email/telefone
      let leadId: string | null = null;

      // Check if lead exists by telefone or email
      const { data: existingLeads } = await (supabase as any)
        .from('mt_leads')
        .select('id')
        .eq('tenant_id', TENANT_ID)
        .or(`telefone.eq.${data.customer.telefone},email.eq.${data.customer.email}`)
        .is('deleted_at', null)
        .limit(1);

      if (existingLeads && existingLeads.length > 0) {
        leadId = existingLeads[0].id;
        // Update lead with latest info
        await (supabase as any)
          .from('mt_leads')
          .update({
            nome: data.customer.nome,
            email: data.customer.email,
            telefone: data.customer.telefone,
            cpf: data.customer.cpf || null,
            data_nascimento: data.customer.data_nascimento || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', leadId);
      } else {
        // Create new lead
        const { data: newLead, error: leadError } = await (supabase as any)
          .from('mt_leads')
          .insert({
            tenant_id: TENANT_ID,
            franchise_id: DEFAULT_FRANCHISE_ID,
            nome: data.customer.nome,
            email: data.customer.email,
            telefone: data.customer.telefone,
            cpf: data.customer.cpf || null,
            data_nascimento: data.customer.data_nascimento || null,
            origem: 'site',
            status: 'novo',
          })
          .select('id')
          .single();

        if (leadError) {
          console.error('Erro ao criar lead:', leadError);
        } else {
          leadId = newLead?.id || null;
        }
      }

      // 2. Create sale (mt_sales)
      const orderNumber = generateOrderNumber();

      const { data: sale, error: saleError } = await (supabase as any)
        .from('mt_sales')
        .insert({
          tenant_id: TENANT_ID,
          franchise_id: DEFAULT_FRANCHISE_ID,
          numero_venda: orderNumber,
          lead_id: leadId,
          cliente_nome: data.customer.nome,
          cliente_telefone: data.customer.telefone,
          cliente_email: data.customer.email,
          forma_pagamento: data.paymentMethod,
          tabela_preco: 'normal',
          parcelas: data.paymentMethod === 'pix' ? 1 : 12,
          valor_bruto: data.totalAmount + data.discountAmount,
          valor_desconto: data.discountAmount,
          valor_total: data.totalAmount,
          custo_total: 0,
          abaixo_piso: false,
          status: 'aprovado',
          canal_origem: 'formulario', // closest to 'site' in allowed values
          promotion_id: data.promotionId || null,
          observacoes: data.couponCode
            ? `Cupom aplicado: ${data.couponCode}`
            : 'Venda realizada pelo site',
        })
        .select('id')
        .single();

      if (saleError) {
        throw new Error(`Erro ao criar venda: ${saleError.message}`);
      }

      const saleId = sale.id;

      // 3. Create sale items (mt_sale_items)
      const saleItems = data.items.map((item) => ({
        tenant_id: TENANT_ID,
        sale_id: saleId,
        service_id: item.service_id,
        tipo_item: 'servico',
        descricao: item.nome,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        custo_unitario: 0,
        desconto_percentual: 0,
        desconto_valor: 0,
        valor_total: item.preco_total,
        sessoes_protocolo: 1,
      }));

      const { error: itemsError } = await (supabase as any)
        .from('mt_sale_items')
        .insert(saleItems);

      if (itemsError) {
        console.error('Erro ao criar itens da venda:', itemsError);
      }

      // 4. Register promotion use if coupon was applied
      if (data.promotionId && leadId) {
        await (supabase as any)
          .from('mt_promotion_uses')
          .insert({
            tenant_id: TENANT_ID,
            promotion_id: data.promotionId,
            lead_id: leadId,
            desconto_aplicado: data.discountAmount,
            valor_original: data.totalAmount + data.discountAmount,
            valor_final: data.totalAmount,
            source: 'site',
          });
      }

      return { success: true, orderNumber };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido ao processar pedido';
      console.error('Checkout error:', err);
      return { success: false, error: message };
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return {
    createOrder,
    isSubmitting,
  };
}
