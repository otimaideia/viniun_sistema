-- Script para criar leads das conversas WhatsApp sem lead_id
-- Execução: Via /pg/query do Supabase

-- PASSO 1: Criar leads para conversas sem lead_id (somente conversas individuais, não grupos)
INSERT INTO mt_leads (
  tenant_id,
  franchise_id,
  nome,
  telefone,
  whatsapp,
  origem,
  status,
  responsible_user_id,
  observacoes,
  created_at,
  updated_at
)
SELECT DISTINCT ON (c.contact_phone, s.franchise_id)
  s.tenant_id,
  s.franchise_id,
  COALESCE(c.contact_name, c.contact_phone) as nome,
  c.contact_phone as telefone,
  c.contact_phone as whatsapp,
  'whatsapp_inbound' as origem,
  'novo' as status,
  s.responsible_user_id,
  'Lead criado via migração WhatsApp' as observacoes,
  c.created_at,
  NOW() as updated_at
FROM mt_whatsapp_conversations c
INNER JOIN mt_whatsapp_sessions s ON c.session_id = s.id
LEFT JOIN mt_leads l ON l.franchise_id = s.franchise_id
  AND (l.telefone = c.contact_phone OR l.whatsapp = c.contact_phone)
WHERE c.lead_id IS NULL                    -- Conversa sem lead
  AND c.chat_id NOT LIKE '%@g.us'          -- Não é grupo
  AND s.franchise_id IS NOT NULL           -- Sessão tem franquia
  AND c.contact_phone IS NOT NULL          -- Tem telefone
  AND l.id IS NULL                         -- Lead ainda não existe
ORDER BY c.contact_phone, s.franchise_id, c.created_at DESC
ON CONFLICT (franchise_id, telefone) DO NOTHING;

-- PASSO 2: Vincular conversas aos leads criados/existentes
UPDATE mt_whatsapp_conversations c
SET lead_id = l.id,
    updated_at = NOW()
FROM mt_whatsapp_sessions s
INNER JOIN mt_leads l ON l.franchise_id = s.franchise_id
  AND (l.telefone = c.contact_phone OR l.whatsapp = c.contact_phone)
WHERE c.session_id = s.id
  AND c.lead_id IS NULL
  AND c.chat_id NOT LIKE '%@g.us'
  AND s.franchise_id IS NOT NULL
  AND c.contact_phone IS NOT NULL;

-- PASSO 3: Verificar resultado
SELECT
  COUNT(*) as conversas_total,
  COUNT(lead_id) as conversas_com_lead,
  COUNT(*) - COUNT(lead_id) as conversas_sem_lead
FROM mt_whatsapp_conversations;
