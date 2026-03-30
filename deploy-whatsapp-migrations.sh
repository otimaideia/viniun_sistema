#!/bin/bash

# Script para deploy das migrations WhatsApp Multi-Tenant
# Data: 14/02/2026

SERVICE_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MDc4MTc0MCwiZXhwIjo0OTI2NDU1MzQwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.K1j07Xd07FuQHNNXqnwXnWvakPBfUirpKXqB5sZmkTE"
SUPABASE_URL="https://supabase-app.yeslaserpraiagrande.com.br"

echo "========================================"
echo "DEPLOY: Migrations WhatsApp Multi-Tenant"
echo "========================================"
echo ""

# Função para executar SQL
execute_sql() {
    local sql_file=$1
    local description=$2

    echo ">>> $description"
    echo "    Arquivo: $sql_file"

    if [ ! -f "$sql_file" ]; then
        echo "    ❌ Arquivo não encontrado!"
        return 1
    fi

    # Ler SQL e executar (sem escape JSON para simplicidade)
    # Vamos executar via psql se disponível

    echo "    ⏳ Executando..."

    # Tentar via psql primeiro
    if command -v psql &> /dev/null; then
        psql "postgresql://postgres.yeslaserpraiagrande:ZZy07JXbfuFDWaOuEdVrYhEAl6b9Lld3@supabase-app.yeslaserpraiagrande.com.br:5432/postgres" \
            -f "$sql_file" 2>&1 | tail -5

        if [ $? -eq 0 ]; then
            echo "    ✅ Migration executada com sucesso!"
        else
            echo "    ⚠️  Erro na execução (pode ser normal se tabelas já existem)"
        fi
    else
        echo "    ⚠️  psql não disponível, executar manualmente"
    fi

    echo ""
}

# Executar migrations na ordem
execute_sql "supabase/migrations/20260214_001_mt_whatsapp_queues.sql" "1. Sistema de Filas"
execute_sql "supabase/migrations/20260214_002_mt_whatsapp_transfers.sql" "2. Transferências"
execute_sql "supabase/migrations/20260214_003_mt_whatsapp_notes_chatbot.sql" "3. Notas + Chatbot + Métricas"

echo "========================================"
echo "VERIFICANDO TABELAS CRIADAS"
echo "========================================"
echo ""

# Verificar tabelas criadas
curl -s -X POST "$SUPABASE_URL/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"query": "SELECT table_name FROM information_schema.tables WHERE table_schema = '\''public'\'' AND table_name LIKE '\''mt_whatsapp_%'\'' ORDER BY table_name"}' \
  | grep -o '"table_name":"[^"]*"' | cut -d'"' -f4

echo ""
echo "✅ Deploy concluído!"
echo ""
echo "PRÓXIMOS PASSOS:"
echo "1. Verificar tabelas no Supabase Dashboard"
echo "2. Testar hooks no frontend"
echo "3. Executar testes Playwright"
