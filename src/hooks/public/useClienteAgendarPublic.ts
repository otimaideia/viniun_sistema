import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TenantBranding {
  cor_primaria: string;
  cor_primaria_hover: string;
  cor_secundaria: string;
  logo_url: string | null;
  logo_branco_url: string | null;
  nome_fantasia: string;
}

interface Franchise {
  id: string;
  nome_fantasia: string;
  nome: string;
  cidade: string;
  estado?: string;
  whatsapp?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cep?: string;
  horario_funcionamento?: Record<string, { abre: string; fecha: string } | null> | null;
  tenant_id?: string;
}

const DEFAULT_COLOR = '#662E8E';
const DEFAULT_HOVER = '#5a2680';
const DEFAULT_SECONDARY = '#5DC4DA';

export function useClienteAgendarPublic() {
  /**
   * Fetch tenant branding data (public, no auth required).
   */
  const fetchBranding = async (tenantId: string): Promise<TenantBranding> => {
    const [tenantRes, brandingRes] = await Promise.all([
      supabase.from('mt_tenants').select('nome_fantasia').eq('id', tenantId).single(),
      supabase.from('mt_tenant_branding').select('cor_primaria, cor_primaria_hover, cor_secundaria, logo_url, logo_branco_url').eq('tenant_id', tenantId).maybeSingle(),
    ]);
    return {
      cor_primaria: brandingRes.data?.cor_primaria || DEFAULT_COLOR,
      cor_primaria_hover: brandingRes.data?.cor_primaria_hover || DEFAULT_HOVER,
      cor_secundaria: brandingRes.data?.cor_secundaria || DEFAULT_SECONDARY,
      logo_url: brandingRes.data?.logo_url || null,
      logo_branco_url: brandingRes.data?.logo_branco_url || null,
      nome_fantasia: tenantRes.data?.nome_fantasia || '',
    };
  };

  /**
   * Fetch franchise by slug (public).
   */
  const fetchFranchiseBySlug = async (slug: string): Promise<{ id: string; tenant_id: string } | null> => {
    const { data } = await supabase
      .from('mt_franchises')
      .select('id, tenant_id')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();
    return data;
  };

  /**
   * Fetch franchise with full details by slug (public).
   */
  const fetchFranchiseDetailBySlug = async (slug: string): Promise<Franchise | null> => {
    const { data } = await supabase
      .from('mt_franchises')
      .select('id, nome_fantasia, nome, cidade, estado, whatsapp, endereco, numero, complemento, bairro, cep, horario_funcionamento, tenant_id')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();
    return data;
  };

  /**
   * Fetch all franchises for a tenant (public).
   */
  const fetchFranchisesByTenant = async (tenantId: string): Promise<Franchise[]> => {
    const { data } = await supabase
      .from('mt_franchises')
      .select('id, nome_fantasia, nome, cidade, estado, whatsapp, endereco, numero, complemento, bairro, cep, horario_funcionamento')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('cidade');
    return data || [];
  };

  /**
   * Create a magic token for client or influencer access.
   */
  const createMagicToken = async (params: {
    tenant_id: string;
    lead_id?: string;
    influencer_id?: string;
    type: 'cliente' | 'influenciador';
    expires_days?: number;
  }): Promise<string> => {
    const token = crypto.randomUUID().replace(/-/g, '');
    await supabase.from('mt_cliente_magic_tokens' as never).insert({
      tenant_id: params.tenant_id,
      lead_id: params.lead_id || null,
      influencer_id: params.influencer_id || null,
      token,
      type: params.type,
      expires_at: new Date(Date.now() + (params.expires_days || 30) * 24 * 60 * 60 * 1000).toISOString(),
    });
    return token;
  };

  /**
   * Log appointment notifications (fire-and-forget).
   */
  const logAppointmentNotifications = (params: {
    tenant_id: string;
    franchise_id: string;
    appointment_id: string;
  }) => {
    supabase.from('mt_appointment_notifications' as never).insert([
      {
        tenant_id: params.tenant_id,
        franchise_id: params.franchise_id,
        appointment_id: params.appointment_id,
        notification_type: 'confirmacao',
        channel: 'whatsapp',
        status: 'sent',
        sent_at: new Date().toISOString(),
      },
      {
        tenant_id: params.tenant_id,
        franchise_id: params.franchise_id,
        appointment_id: params.appointment_id,
        notification_type: 'notificacao_franquia',
        channel: 'whatsapp',
        status: 'sent',
        sent_at: new Date().toISOString(),
      },
    ]).then(() => {}).catch(() => {});
  };

  return {
    fetchBranding,
    fetchFranchiseBySlug,
    fetchFranchiseDetailBySlug,
    fetchFranchisesByTenant,
    createMagicToken,
    logAppointmentNotifications,
  };
}
