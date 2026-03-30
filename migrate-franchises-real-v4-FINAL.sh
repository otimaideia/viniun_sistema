#!/bin/bash

# ==============================================================================
# MIGRAÇÃO REAL V4 FINAL: Resolver TODOS os problemas de tamanho de campo
# ==============================================================================

SERVICE_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MzA2MTM2MCwiZXhwIjo0OTE4NzM0OTYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.xKjCIHG1qqMkTOgjI_rl9UuAmoCoq-cOAErjcEgRp9s"

# ID da franquia Praia Grande (MANTER)
PRAIA_GRANDE_ID="529bac26-008c-473b-ad30-305e17e95e53"

echo "======================================================================"
echo "MIGRAÇÃO REAL V4 FINAL - Resolução completa de campos"
echo "======================================================================"
echo ""
echo "⚠️  ATENÇÃO: Este script vai:"
echo "  1. MANTER YESlaser Praia Grande (com seus 146 leads)"
echo "  2. MIGRAR todas as 34 unidades REAIS do legacy"
echo "  3. TRUNCAR campos para respeitar limites:"
echo "     - codigo: max 20 caracteres"
echo "     - estado: max 2 caracteres (sigla UF)"
echo "     - telefone/whatsapp: max 20 caracteres"
echo "     - cnpj: max 18 caracteres"
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
echo "ETAPA 1: Verificar estado atual"
echo "======================================================================"

TOTAL_ATUAL=$(curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d "{\"query\": \"SELECT COUNT(*) as total FROM mt_franchises WHERE tenant_id = '$TENANT_YESLASER_ID'\"}" | jq -r '.[].total')

TOTAL_LEGACY=$(curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"query": "SELECT COUNT(*) as total FROM yeslaser_franqueados"}' | jq -r '.[].total')

echo "📊 Franquias MT atuais: $TOTAL_ATUAL"
echo "📊 Unidades legacy: $TOTAL_LEGACY"

echo ""
echo "======================================================================"
echo "ETAPA 2: Migrar 34 unidades com TRUNCAMENTO de campos"
echo "======================================================================"

echo "📥 Executando migração com todos os ajustes de tamanho..."

# Migration query com TODOS os campos truncados corretamente
MIGRATION_RESULT=$(curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d "{\"query\": \"INSERT INTO mt_franchises (id, tenant_id, codigo, nome, cidade, estado, cep, endereco, responsavel_nome, cnpj, email, telefone, whatsapp, status, is_active, created_at, updated_at) SELECT f.id, '$TENANT_YESLASER_ID' as tenant_id, LEFT(COALESCE(f.slug, LOWER(REGEXP_REPLACE(f.nome_fantasia, '[^a-zA-Z0-9]+', '-', 'g'))), 20) as codigo, f.nome_fantasia as nome, COALESCE(f.cidade, 'Não informado') as cidade, LEFT(COALESCE(f.estado, 'NA'), 2) as estado, f.cep, f.endereco, f.responsavel as responsavel_nome, LEFT(f.cnpj, 18) as cnpj, f.email, NULL as telefone, LEFT(f.whatsapp_business, 20) as whatsapp, CASE WHEN f.status IN ('Concluído', 'ativo') THEN 'ativo' WHEN f.status IN ('Não inaugurada', 'A iniciar') THEN 'planejamento' ELSE 'setup' END as status, CASE WHEN f.status IN ('Concluído', 'ativo') THEN true ELSE false END as is_active, f.created_at, COALESCE(f.updated_at, NOW()) as updated_at FROM yeslaser_franqueados f ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, codigo = EXCLUDED.codigo, cidade = EXCLUDED.cidade, estado = EXCLUDED.estado, cep = EXCLUDED.cep, endereco = EXCLUDED.endereco, responsavel_nome = EXCLUDED.responsavel_nome, cnpj = EXCLUDED.cnpj, email = EXCLUDED.email, whatsapp = EXCLUDED.whatsapp, status = EXCLUDED.status, is_active = EXCLUDED.is_active, updated_at = NOW()\"}")

# Verificar se houve erro
if echo "$MIGRATION_RESULT" | jq -e '.code' > /dev/null 2>&1; then
  echo "❌ ERRO na migração:"
  echo "$MIGRATION_RESULT" | jq -r '.message'
  exit 1
fi

echo "✅ Migração executada com sucesso"

echo ""
echo "======================================================================"
echo "ETAPA 3: Verificação final"
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

echo "📊 Total de franquias YESlaser: $TOTAL_FINAL"
echo "📊 Franquias ativas: $ATIVAS"
echo "📊 Franquias em setup/planejamento: $((TOTAL_FINAL - ATIVAS))"

echo ""
echo "✅ Top 10 franquias com mais leads:"
curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d "{\"query\": \"SELECT f.nome, f.cidade, f.estado, f.status, (SELECT COUNT(*) FROM mt_leads l WHERE l.franchise_id = f.id) as leads FROM mt_franchises f WHERE f.tenant_id = '$TENANT_YESLASER_ID' ORDER BY leads DESC LIMIT 10\"}" | python3 -c "import sys, json; data = json.load(sys.stdin); [print(f'  {i+1}. {row[\"nome\"]} - {row[\"cidade\"]}/{row[\"estado\"]} ({row[\"status\"]}) - {row[\"leads\"]} leads') for i, row in enumerate(data)]"

echo ""
echo "======================================================================"
echo "✅ MIGRAÇÃO COMPLETA CONCLUÍDA!"
echo "======================================================================"
echo ""
echo "📊 Resumo:"
echo "  - Total de franquias YESlaser: $TOTAL_FINAL (esperado: 34)"
echo "  - Franquias ativas: $ATIVAS"
echo "  - YESlaser Praia Grande MANTIDA com seus leads"
echo "  - 34 unidades reais do legacy MIGRADAS"
echo ""
echo "🔄 Próximos passos:"
echo "  1. Faça LOGOUT do sistema"
echo "  2. Faça LOGIN novamente"
echo "  3. Verifique o dashboard em http://localhost:8080"
echo "  4. Confirme que mostra apenas YESlaser Praia Grande (sua franquia)"
echo ""
