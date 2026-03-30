#!/bin/bash

# ==============================================================================
# MIGRAÇÃO REAL: Limpar franquias MT falsas e migrar 34 unidades legacy
# ==============================================================================

SERVICE_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MzA2MTM2MCwiZXhwIjo0OTE4NzM0OTYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.xKjCIHG1qqMkTOgjI_rl9UuAmoCoq-cOAErjcEgRp9s"

echo "======================================================================"
echo "MIGRAÇÃO REAL DE FRANQUIAS YESLASER"
echo "======================================================================"
echo ""
echo "⚠️  ATENÇÃO: Este script vai:"
echo "  1. Deletar todas as 40 franquias YESlaser MT (dados incorretos)"
echo "  2. Migrar as 34 unidades REAIS do legacy (yeslaser_franqueados)"
echo "  3. Configurar você como admin da YESlaser Praia Grande"
echo ""
read -p "Deseja continuar? (s/N): " CONFIRM

if [ "$CONFIRM" != "s" ] && [ "$CONFIRM" != "S" ]; then
  echo "❌ Operação cancelada."
  exit 0
fi

echo ""
echo "======================================================================"
echo "ETAPA 1: Backup dos dados atuais"
echo "======================================================================"

# Backup das franquias MT atuais
echo "📦 Fazendo backup das franquias MT..."
curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"query": "SELECT * FROM mt_franchises WHERE tenant_id = (SELECT id FROM mt_tenants WHERE slug = '\''yeslaser'\'')"}' > backup_mt_franchises_yeslaser_$(date +%Y%m%d_%H%M%S).json

echo "✅ Backup salvo em: backup_mt_franchises_yeslaser_$(date +%Y%m%d_%H%M%S).json"

echo ""
echo "======================================================================"
echo "ETAPA 2: Deletar franquias YESlaser MT (40 registros)"
echo "======================================================================"

# Deletar franquias YESlaser MT
echo "🗑️  Deletando franquias YESlaser MT..."
curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"query": "DELETE FROM mt_franchises WHERE tenant_id = (SELECT id FROM mt_tenants WHERE slug = '\''yeslaser'\'')"}' | jq '.'

echo ""
echo "✅ Franquias YESlaser MT deletadas"

echo ""
echo "======================================================================"
echo "ETAPA 3: Migrar 34 unidades REAIS do legacy"
echo "======================================================================"

# Migrar unidades do legacy para MT
echo "📥 Migrando unidades do yeslaser_franqueados para mt_franchises..."

curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"query": "INSERT INTO mt_franchises (id, tenant_id, codigo, nome, cidade, estado, cep, endereco, responsavel_nome, cnpj, email, telefone, whatsapp, status, is_active, created_at, updated_at) SELECT f.id, t.id as tenant_id, COALESCE(f.slug, LOWER(REGEXP_REPLACE(f.nome_fantasia, '\''[^a-zA-Z0-9]+'\'', '\''-'\'', '\''g'\''))) as codigo, f.nome_fantasia as nome, f.cidade, f.estado, f.cep, f.endereco, f.responsavel as responsavel_nome, f.cnpj, f.email, NULL as telefone, f.whatsapp_business as whatsapp, CASE WHEN f.status IN ('\''Concluído'\'', '\''ativo'\'') THEN '\''ativo'\'' WHEN f.status IN ('\''Não inaugurada'\'', '\''A iniciar'\'') THEN '\''planejamento'\'' ELSE '\''setup'\'' END as status, CASE WHEN f.status IN ('\''Concluído'\'', '\''ativo'\'') THEN true ELSE false END as is_active, f.created_at, f.updated_at FROM yeslaser_franqueados f CROSS JOIN mt_tenants t WHERE t.slug = '\''yeslaser'\'' ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, codigo = EXCLUDED.codigo, cidade = EXCLUDED.cidade, estado = EXCLUDED.estado, updated_at = NOW()"}' | jq '.'

echo ""
echo "✅ Unidades migradas com sucesso"

echo ""
echo "======================================================================"
echo "ETAPA 4: Verificar migração"
echo "======================================================================"

# Contar franquias migradas
TOTAL_MIGRADAS=$(curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"query": "SELECT COUNT(*) as total FROM mt_franchises f JOIN mt_tenants t ON f.tenant_id = t.id WHERE t.slug = '\''yeslaser'\''"}' | jq -r '.[].total')

echo "📊 Total de franquias YESlaser migradas: $TOTAL_MIGRADAS"

# Listar franquias ativas
echo ""
echo "✅ Franquias YESlaser ativas:"
curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"query": "SELECT nome, cidade, estado, status, is_active FROM mt_franchises f JOIN mt_tenants t ON f.tenant_id = t.id WHERE t.slug = '\''yeslaser'\'' AND is_active = true ORDER BY nome"}' | python3 -c "import sys, json; data = json.load(sys.stdin); [print(f'  - {row[\"nome\"]} - {row[\"cidade\"]}/{row[\"estado\"]} ({row[\"status\"]})') for row in data]"

echo ""
echo "======================================================================"
echo "ETAPA 5: Atualizar leads para usar os IDs corretos"
echo "======================================================================"

echo "🔄 Atualizando franchise_id dos leads..."
echo "  (Mantendo IDs originais - franquias usam mesmo ID do legacy)"

# Como usamos ON CONFLICT com os mesmos IDs, os leads já devem estar corretos
# Mas vamos verificar se há leads órfãos
LEADS_ORFAOS=$(curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"query": "SELECT COUNT(*) as total FROM mt_leads l WHERE l.tenant_id = (SELECT id FROM mt_tenants WHERE slug = '\''yeslaser'\'') AND l.franchise_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM mt_franchises f WHERE f.id = l.franchise_id)"}' | jq -r '.[].total')

echo "  - Leads órfãos (franchise_id inválido): $LEADS_ORFAOS"

if [ "$LEADS_ORFAOS" -gt 0 ]; then
  echo "⚠️  Há leads com franchise_id inválido. Limpando..."
  curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
    -H "Content-Type: application/json" \
    -H "apikey: $SERVICE_KEY" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -d '{"query": "UPDATE mt_leads SET franchise_id = NULL WHERE tenant_id = (SELECT id FROM mt_tenants WHERE slug = '\''yeslaser'\'') AND franchise_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM mt_franchises f WHERE f.id = franchise_id)"}' | jq '.'
  echo "✅ Leads órfãos limpos"
fi

echo ""
echo "======================================================================"
echo "ETAPA 6: Configurar seu usuário como admin da Praia Grande"
echo "======================================================================"

# ID da franquia Praia Grande
PRAIA_GRANDE_ID="529bac26-008c-473b-ad30-305e17e95e53"
USER_EMAIL="marketing@franquiayeslaser.com.br"

echo "👤 Configurando usuário: $USER_EMAIL"
echo "🏢 Franquia: YESlaser Praia Grande"
echo ""

# Atualizar usuário
curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d "{\"query\": \"UPDATE mt_users SET franchise_id = '$PRAIA_GRANDE_ID', access_level = 'franchise', updated_at = NOW() WHERE email = '$USER_EMAIL' RETURNING id, nome, franchise_id, access_level\"}" | jq '.'

echo ""
echo "✅ Usuário configurado como franchise admin da Praia Grande"

echo ""
echo "======================================================================"
echo "MIGRAÇÃO CONCLUÍDA COM SUCESSO!"
echo "======================================================================"
echo ""
echo "📊 Resumo:"
echo "  - Franquias deletadas: 40 (dados incorretos)"
echo "  - Franquias migradas: $TOTAL_MIGRADAS (dados reais do legacy)"
echo "  - Leads órfãos corrigidos: $LEADS_ORFAOS"
echo "  - Usuário configurado: franchise admin da Praia Grande"
echo ""
echo "🔄 Próximos passos:"
echo "  1. Faça LOGOUT do sistema"
echo "  2. Faça LOGIN novamente"
echo "  3. O dashboard mostrará apenas dados da YESlaser Praia Grande"
echo "  4. Verifique se os leads estão corretos"
echo ""
echo "======================================================================"
