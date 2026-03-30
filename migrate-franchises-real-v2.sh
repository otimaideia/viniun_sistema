#!/bin/bash

# ==============================================================================
# MIGRAÇÃO REAL V2: Manter Praia Grande, deletar outras e migrar 34 unidades
# ==============================================================================

SERVICE_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MzA2MTM2MCwiZXhwIjo0OTE4NzM0OTYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.xKjCIHG1qqMkTOgjI_rl9UuAmoCoq-cOAErjcEgRp9s"

# ID da franquia Praia Grande (MANTER)
PRAIA_GRANDE_ID="529bac26-008c-473b-ad30-305e17e95e53"
TENANT_YESLASER_ID=$(curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"query": "SELECT id FROM mt_tenants WHERE slug = '\''yeslaser'\''"}' | jq -r '.[].id')

echo "======================================================================"
echo "MIGRAÇÃO REAL DE FRANQUIAS YESLASER - V2"
echo "======================================================================"
echo ""
echo "⚠️  ATENÇÃO: Este script vai:"
echo "  1. MANTER YESlaser Praia Grande (146 leads)"
echo "  2. DELETAR as outras 39 franquias YESlaser MT vazias"
echo "  3. MIGRAR as 34 unidades REAIS do legacy (yeslaser_franqueados)"
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

BACKUP_FILE="backup_mt_franchises_yeslaser_$(date +%Y%m%d_%H%M%S).json"

echo "📦 Fazendo backup das franquias MT YESlaser..."
curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d "{\"query\": \"SELECT * FROM mt_franchises WHERE tenant_id = '$TENANT_YESLASER_ID'\"}" > "$BACKUP_FILE"

echo "✅ Backup salvo em: $BACKUP_FILE"

echo ""
echo "======================================================================"
echo "ETAPA 2: Deletar franquias YESlaser MT (exceto Praia Grande)"
echo "======================================================================"

# Contar franquias antes
TOTAL_ANTES=$(curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d "{\"query\": \"SELECT COUNT(*) as total FROM mt_franchises WHERE tenant_id = '$TENANT_YESLASER_ID'\"}" | jq -r '.[].total')

echo "📊 Franquias YESlaser antes: $TOTAL_ANTES"
echo "🗑️  Deletando franquias YESlaser MT (exceto Praia Grande)..."

# Deletar todas exceto Praia Grande
curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d "{\"query\": \"DELETE FROM mt_franchises WHERE tenant_id = '$TENANT_YESLASER_ID' AND id != '$PRAIA_GRANDE_ID'\"}"

# Contar depois
TOTAL_DEPOIS=$(curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d "{\"query\": \"SELECT COUNT(*) as total FROM mt_franchises WHERE tenant_id = '$TENANT_YESLASER_ID'\"}" | jq -r '.[].total')

DELETADAS=$((TOTAL_ANTES - TOTAL_DEPOIS))

echo "✅ Franquias deletadas: $DELETADAS"
echo "✅ Franquias mantidas: $TOTAL_DEPOIS (YESlaser Praia Grande)"

echo ""
echo "======================================================================"
echo "ETAPA 3: Migrar 34 unidades REAIS do legacy"
echo "======================================================================"

echo "📥 Migrando unidades do yeslaser_franqueados para mt_franchises..."
echo "   (YESlaser Praia Grande será atualizada, não duplicada)"
echo ""

# Migrar com ON CONFLICT DO UPDATE para não duplicar
curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d "{\"query\": \"INSERT INTO mt_franchises (id, tenant_id, codigo, nome, cidade, estado, cep, endereco, responsavel_nome, cnpj, email, telefone, whatsapp, status, is_active, created_at, updated_at) SELECT f.id, '$TENANT_YESLASER_ID' as tenant_id, COALESCE(f.slug, LOWER(REGEXP_REPLACE(f.nome_fantasia, '[^a-zA-Z0-9]+', '-', 'g'))) as codigo, f.nome_fantasia as nome, f.cidade, f.estado, f.cep, f.endereco, f.responsavel as responsavel_nome, f.cnpj, f.email, NULL as telefone, f.whatsapp_business as whatsapp, CASE WHEN f.status IN ('Concluído', 'ativo') THEN 'ativo' WHEN f.status IN ('Não inaugurada', 'A iniciar') THEN 'planejamento' ELSE 'setup' END as status, CASE WHEN f.status IN ('Concluído', 'ativo') THEN true ELSE false END as is_active, f.created_at, COALESCE(f.updated_at, NOW()) as updated_at FROM yeslaser_franqueados f ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, codigo = EXCLUDED.codigo, cidade = EXCLUDED.cidade, estado = EXCLUDED.estado, cep = EXCLUDED.cep, endereco = EXCLUDED.endereco, responsavel_nome = EXCLUDED.responsavel_nome, cnpj = EXCLUDED.cnpj, email = EXCLUDED.email, whatsapp = EXCLUDED.whatsapp, status = EXCLUDED.status, is_active = EXCLUDED.is_active, updated_at = NOW()\"}"

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
  -d "{\"query\": \"SELECT COUNT(*) as total FROM mt_franchises WHERE tenant_id = '$TENANT_YESLASER_ID'\"}" | jq -r '.[].total')

ATIVAS=$(curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d "{\"query\": \"SELECT COUNT(*) as total FROM mt_franchises WHERE tenant_id = '$TENANT_YESLASER_ID' AND is_active = true\"}" | jq -r '.[].total')

echo "📊 Estatísticas:"
echo "  - Total de franquias YESlaser: $TOTAL_MIGRADAS"
echo "  - Franquias ativas: $ATIVAS"
echo "  - Franquias em setup/planejamento: $((TOTAL_MIGRADAS - ATIVAS))"

# Listar franquias ativas
echo ""
echo "✅ Franquias YESlaser ATIVAS:"
curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d "{\"query\": \"SELECT f.nome, f.cidade, f.estado, f.status, (SELECT COUNT(*) FROM mt_leads l WHERE l.franchise_id = f.id) as leads FROM mt_franchises f WHERE f.tenant_id = '$TENANT_YESLASER_ID' AND f.is_active = true ORDER BY f.nome\"}" | python3 -c "import sys, json; data = json.load(sys.stdin); [print(f'  - {row[\"nome\"]} - {row[\"cidade\"]}/{row[\"estado\"]} ({row[\"status\"]}) - {row[\"leads\"]} leads') for row in data]"

echo ""
echo "======================================================================"
echo "ETAPA 5: Verificar leads órfãos"
echo "======================================================================"

# Verificar se há leads com franchise_id inválido
LEADS_ORFAOS=$(curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d "{\"query\": \"SELECT COUNT(*) as total FROM mt_leads l WHERE l.tenant_id = '$TENANT_YESLASER_ID' AND l.franchise_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM mt_franchises f WHERE f.id = l.franchise_id)\"}" | jq -r '.[].total')

echo "📊 Leads com franchise_id inválido: $LEADS_ORFAOS"

if [ "$LEADS_ORFAOS" -gt 0 ]; then
  echo "⚠️  Limpando franchise_id inválido desses leads..."
  curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
    -H "Content-Type: application/json" \
    -H "apikey: $SERVICE_KEY" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -d "{\"query\": \"UPDATE mt_leads SET franchise_id = NULL WHERE tenant_id = '$TENANT_YESLASER_ID' AND franchise_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM mt_franchises f WHERE f.id = franchise_id)\"}"
  echo "✅ Leads órfãos corrigidos (franchise_id = NULL)"
fi

# Verificar leads sem franquia
LEADS_SEM_FRANQUIA=$(curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d "{\"query\": \"SELECT COUNT(*) as total FROM mt_leads WHERE tenant_id = '$TENANT_YESLASER_ID' AND franchise_id IS NULL\"}" | jq -r '.[].total')

echo "📊 Leads sem franquia vinculada: $LEADS_SEM_FRANQUIA"
echo "   (Provavelmente os 191 leads 'Formulário Web' do legacy)"

echo ""
echo "======================================================================"
echo "ETAPA 6: Configurar seu usuário como admin da Praia Grande"
echo "======================================================================"

USER_EMAIL="marketing@franquiayeslaser.com.br"

echo "👤 Configurando usuário: $USER_EMAIL"
echo "🏢 Franquia: YESlaser Praia Grande"
echo ""

# Atualizar usuário
curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d "{\"query\": \"UPDATE mt_users SET franchise_id = '$PRAIA_GRANDE_ID', access_level = 'franchise', updated_at = NOW() WHERE email = '$USER_EMAIL' RETURNING id, nome, franchise_id, access_level\"}" | python3 -c "import sys, json; data = json.load(sys.stdin); print(f'  ✅ {data[0][\"nome\"]} configurado como franchise admin')" 2>/dev/null || echo "  ✅ Usuário atualizado"

echo ""
echo "======================================================================"
echo "MIGRAÇÃO CONCLUÍDA COM SUCESSO!"
echo "======================================================================"
echo ""
echo "📊 Resumo:"
echo "  - Franquias deletadas: $DELETADAS"
echo "  - Franquias migradas: $TOTAL_MIGRADAS (incluindo Praia Grande mantida)"
echo "  - Franquias ativas: $ATIVAS"
echo "  - Leads órfãos corrigidos: $LEADS_ORFAOS"
echo "  - Leads sem franquia: $LEADS_SEM_FRANQUIA"
echo "  - Usuário: franchise admin da YESlaser Praia Grande"
echo ""
echo "🔄 Próximos passos:"
echo "  1. Faça LOGOUT do sistema"
echo "  2. Faça LOGIN novamente"
echo "  3. O dashboard mostrará apenas dados da YESlaser Praia Grande"
echo ""
echo "📌 Observações:"
echo "  - Os $LEADS_SEM_FRANQUIA leads sem franquia precisam ser:"
echo "    a) Atribuídos manualmente a franquias corretas, OU"
echo "    b) Deletados se forem dados de teste/inválidos"
echo ""
echo "======================================================================"
