-- =============================================================================
-- Migration: mt_influencer_notif_config
-- Configuração de notificações do módulo de influenciadoras
-- Padrão: igual mt_task_config (Tarefas)
-- =============================================================================

CREATE TABLE IF NOT EXISTS mt_influencer_notif_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  franchise_id UUID REFERENCES mt_franchises(id),

  -- Canais
  notif_whatsapp_enabled BOOLEAN DEFAULT true,
  notif_email_enabled BOOLEAN DEFAULT true,

  -- CC Recipients (arrays de telefones e emails extras)
  notif_whatsapp_cc TEXT[] DEFAULT '{}',
  notif_email_cc TEXT[] DEFAULT '{}',

  -- Eventos (toggles)
  notif_on_contrato_criado BOOLEAN DEFAULT true,
  notif_on_aditivo_gerado BOOLEAN DEFAULT true,
  notif_on_assinatura_confirmada BOOLEAN DEFAULT true,
  notif_on_contrato_encerrado BOOLEAN DEFAULT true,
  notif_on_aprovacao BOOLEAN DEFAULT true,
  notif_on_pagamento BOOLEAN DEFAULT false,
  notif_on_post_aprovado BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique por tenant+franchise
  UNIQUE(tenant_id, franchise_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_influencer_notif_config_tenant ON mt_influencer_notif_config(tenant_id);

-- RLS
ALTER TABLE mt_influencer_notif_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_influencer_notif_config_select" ON mt_influencer_notif_config FOR SELECT
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id()) OR
  (tenant_id = current_tenant_id())
);

CREATE POLICY "mt_influencer_notif_config_insert" ON mt_influencer_notif_config FOR INSERT
WITH CHECK (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

CREATE POLICY "mt_influencer_notif_config_update" ON mt_influencer_notif_config FOR UPDATE
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);

CREATE POLICY "mt_influencer_notif_config_delete" ON mt_influencer_notif_config FOR DELETE
USING (
  is_platform_admin() OR
  (is_tenant_admin() AND tenant_id = current_tenant_id())
);
