#!/bin/bash
# Script para executar migration Meta Messenger no Supabase Self-Hosted
# Data: 05/02/2026

set -e

SERVICE_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MzA2MTM2MCwiZXhwIjo0OTE4NzM0OTYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.xKjCIHG1qqMkTOgjI_rl9UuAmoCoq-cOAErjcEgRp9s"
SUPABASE_URL="https://supabase.yeslaser.com.br"

echo "=============================================="
echo "  MIGRATION META MESSENGER & INSTAGRAM"
echo "=============================================="
echo ""
echo "Executando migration..."

# Ler arquivo SQL
SQL_CONTENT=$(cat supabase/migrations/20260205_meta_messenger_integration.sql)

# Executar via /pg/query
RESPONSE=$(curl -s -X POST "$SUPABASE_URL/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  --data-binary @- <<EOF
{
  "query": $(echo "$SQL_CONTENT" | jq -Rs .)
}
EOF
)

echo "Resposta da API:"
echo "$RESPONSE" | jq '.' || echo "$RESPONSE"
echo ""

# Verificar se deu erro
if echo "$RESPONSE" | grep -q '"error"'; then
  echo "❌ Erro ao executar migration!"
  exit 1
fi

echo "✅ Migration executada!"
echo ""

# Verificar se tabelas foram criadas
echo "Verificando tabelas criadas..."
curl -s -X POST "$SUPABASE_URL/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"query": "SELECT table_name FROM information_schema.tables WHERE table_schema = '\''public'\'' AND table_name LIKE '\''mt_meta_%'\'' ORDER BY table_name"}' | jq '.rows[]'

echo ""
echo "✅ Deploy concluído!"
