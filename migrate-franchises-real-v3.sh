#!/bin/bash

# ==============================================================================
# MIGRAÇÃO REAL V3: CORRIGIDO - Limpar dependências antes de deletar
# ==============================================================================

SERVICE_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MzA2MTM2MCwiZXhwIjo0OTE4NzM0OTYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.xKjCIHG1qqMkTOgjI_rl9UuAmoCoq-cOAErjcEgRp9s"

# ID da franquia Praia Grande (MANTER)
PRAIA_GRANDE_ID="529bac26-008c-473b-ad30-305e17e95e53"

echo "======================================================================"
echo "MIGRAÇÃO REAL DE FRANQUIAS YESLASER - V3 (CORRIGIDO)"
echo "======================================================================"
echo ""
echo "⚠️  ATENÇÃO: Este script vai:"
echo "  1. DELETAR dependências (mt_franchise_services, etc.)"
echo "  2. MANTER YESlaser Praia Grande"
echo "  3. DELETAR as outras 39 franquias YESlaser MT"
echo "  4. MIGRAR as 34 unidades REAIS do legacy com valores padrão"
echo ""
read -p "Deseja continuar? (s/N): " CONFIRM

if [ "$CONFIRM" != "s" ] && [ "$CONFIRM" != "S" ]; then
  echo "❌ Operação cancelada."
  exit 0
fi

# Obter tenant_id
TENANT_YESLASER_ID=$(curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"query": "SELECT id FROM mt_tenants WHERE slug = '\''yeslaser'\''"}' | jq -r '.[].id')

echo ""
echo "======================================================================"
echo "ETAPA 1: Deletar dependências das franquias YESlaser"
echo "======================================================================"

echo "🗑️  Deletando mt_franchise_services..."
curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d "{\"query\": \"DELETE FROM mt_franchise_services WHERE franchise_id IN (SELECT id FROM mt_franchises WHERE tenant_id = '$TENANT_YESLASER_ID' AND id != '$PRAIA_GRANDE_ID')\"}"

echo "🗑️  Deletando mt_franchise_modules..."
curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d "{\"query\": \"DELETE FROM mt_franchise_modules WHERE franchise_id IN (SELECT id FROM mt_franchises WHERE tenant_id = '$TENANT_YESLASER_ID' AND id != '$PRAIA_GRANDE_ID')\"}"

echo "🗑️  Deletando mt_franchise_settings..."
curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d "{\"query\": \"DELETE FROM mt_franchise_settings WHERE franchise_id IN (SELECT id FROM mt_franchises WHERE tenant_id = '$TENANT_YESLASER_ID' AND id != '$PRAIA_GRANDE_ID')\"}" 2>/dev/null

echo "🗑️  Deletando mt_franchise_integrations..."
curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d "{\"query\": \"DELETE FROM mt_franchise_integrations WHERE franchise_id IN (SELECT id FROM mt_franchises WHERE tenant_id = '$TENANT_YESLASER_ID' AND id != '$PRAIA_GRANDE_ID')\"}" 2>/dev/null

echo "✅ Dependências deletadas"

echo ""
echo "======================================================================"
echo "ETAPA 2: Deletar franquias YESlaser MT (exceto Praia Grande)"
echo "======================================================================"

TOTAL_ANTES=$(curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d "{\"query\": \"SELECT COUNT(*) as total FROM mt_franchises WHERE tenant_id = '$TENANT_YESLASER_ID'\"}" | jq -r '.[].total')

echo "📊 Franquias antes: $TOTAL_ANTES"
echo "🗑️  Deletando..."

curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d "{\"query\": \"DELETE FROM mt_franchises WHERE tenant_id = '$TENANT_YESLASER_ID' AND id != '$PRAIA_GRANDE_ID'\"}"

TOTAL_DEPOIS=$(curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d "{\"query\": \"SELECT COUNT(*) as total FROM mt_franchises WHERE tenant_id = '$TENANT_YESLASER_ID'\"}" | jq -r '.[].total')

echo "✅ Deletadas: $((TOTAL_ANTES - TOTAL_DEPOIS))"
echo "✅ Mantidas: $TOTAL_DEPOIS (Praia Grande)"

echo ""
echo "======================================================================"
echo "ETAPA 3: Migrar 34 unidades com valores padrão"
echo "======================================================================"

echo "📥 Migrando com COALESCE para campos obrigatórios..."

curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d "{\"query\": \"INSERT INTO mt_franchises (id, tenant_id, codigo, nome, cidade, estado, cep, endereco, responsavel_nome, cnpj, email, telefone, whatsapp, status, is_active, created_at, updated_at) SELECT f.id, '$TENANT_YESLASER_ID' as tenant_id, COALESCE(f.slug, LOWER(REGEXP_REPLACE(f.nome_fantasia, '[^a-zA-Z0-9]+', '-', 'g'))) as codigo, f.nome_fantasia as nome, COALESCE(f.cidade, 'Não informado') as cidade, COALESCE(f.estado, 'N/A') as estado, f.cep, f.endereco, f.responsavel as responsavel_nome, f.cnpj, f.email, NULL as telefone, f.whatsapp_business as whatsapp, CASE WHEN f.status IN ('Concluído', 'ativo') THEN 'ativo' WHEN f.status IN ('Não inaugurada', 'A iniciar') THEN 'planejamento' ELSE 'setup' END as status, CASE WHEN f.status IN ('Concluído', 'ativo') THEN true ELSE false END as is_active, f.created_at, COALESCE(f.updated_at, NOW()) as updated_at FROM yeslaser_franqueados f ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, codigo = EXCLUDED.codigo, cidade = EXCLUDED.cidade, estado = EXCLUDED.estado, cep = EXCLUDED.cep, endereco = EXCLUDED.endereco, responsavel_nome = EXCLUDED.responsavel_nome, cnpj = EXCLUDED.cnpj, email = EXCLUDED.email, whatsapp = EXCLUDED.whatsapp, status = EXCLUDED.status, is_active = EXCLUDED.is_active, updated_at = NOW()\"}"

echo ""
echo "✅ Migração concluída"

echo ""
echo "======================================================================"
echo "ETAPA 4: Verificação final"
echo "======================================================================"

TOTAL_FINAL=$(curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d "{\"query\": \"SELECT COUNT(*) as total FROM mt_franchises WHERE tenant_id = '$TENANT_YESLASER_ID'\"}" | jq -r '.[].total')

ATIVAS=$(curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d "{\"query\": \"SELECT COUNT(*) as total FROM mt_franchises WHERE tenant_id = '$TENANT_YESLASER_ID' AND is_active = true\"}" | jq -r '.[].total')

echo "📊 Total de franquias: $TOTAL_FINAL"
echo "📊 Franquias ativas: $ATIVAS"

echo ""
echo "✅ Franquias YESlaser com dados:"
curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d "{\"query\": \"SELECT f.nome, f.cidade, f.estado, (SELECT COUNT(*) FROM mt_leads l WHERE l.franchise_id = f.id) as leads FROM mt_franchises f WHERE f.tenant_id = '$TENANT_YESLASER_ID' AND EXISTS (SELECT 1 FROM mt_leads l WHERE l.franchise_id = f.id) ORDER BY leads DESC\"}" | python3 -c "import sys, json; data = json.load(sys.stdin); [print(f'  - {row[\"nome\"]} ({row[\"cidade\"]}/{row[\"estado\"]}): {row[\"leads\"]} leads') for row in data]"

echo ""
echo "======================================================================"
echo "✅ MIGRAÇÃO CONCLUÍDA!"
echo "======================================================================"
echo ""
echo "🔄 Próximos passos:"
echo "  1. Faça LOGOUT do sistema"
echo "  2. Faça LOGIN novamente"
echo "  3. Dashboard mostrará apenas YESlaser Praia Grande"
echo ""
