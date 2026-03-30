#!/bin/bash

# Deploy Edge Function waha-webhook via Supabase CLI
# Este é o método mais confiável para Supabase self-hosted

set -e

echo "🚀 Deploy da Edge Function waha-webhook"
echo "========================================"
echo ""

# Verificar se Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI não encontrado!"
    echo ""
    echo "Instale com:"
    echo "  brew install supabase/tap/supabase"
    echo "ou"
    echo "  npm install -g supabase"
    echo ""
    exit 1
fi

echo "✓ Supabase CLI encontrado"
echo ""

# Configurações
PROJECT_REF="yeslaserpainel"
SUPABASE_URL="https://supabase.yeslaser.com.br"
SERVICE_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MzA2MTM2MCwiZXhwIjo0OTE4NzM0OTYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.xKjCIHG1qqMkTOgjI_rl9UuAmoCoq-cOAErjcEgRp9s"

# Verificar se já está linkado
if [ -f ".git/config" ] && grep -q "supabase" ".git/config" 2>/dev/null; then
    echo "✓ Projeto já linkado ao Supabase"
else
    echo "🔗 Linkando projeto ao Supabase..."

    # Criar arquivo de config do Supabase
    mkdir -p .supabase
    cat > .supabase/config.toml <<EOF
[api]
enabled = true
port = 54321
schemas = ["public", "storage", "graphql_public"]
extra_search_path = ["public", "extensions"]
max_rows = 1000

[db]
port = 54322
major_version = 15

[functions]
enabled = true

[edge_functions]
enabled = true
EOF

    echo "✓ Config criado"
fi

echo ""
echo "📦 Fazendo deploy da função waha-webhook..."
echo ""

# Deploy da função
supabase functions deploy waha-webhook \
  --project-ref "$PROJECT_REF" \
  --no-verify-jwt

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deploy concluído com sucesso!"
    echo ""
    echo "📍 URL da função:"
    echo "$SUPABASE_URL/functions/v1/waha-webhook"
    echo ""
else
    echo ""
    echo "❌ Erro ao fazer deploy!"
    echo ""
    echo "Tente manualmente:"
    echo "  cd supabase/functions"
    echo "  supabase functions deploy waha-webhook"
    exit 1
fi

# Testar a função
echo "🧪 Testando a função..."
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$SUPABASE_URL/functions/v1/waha-webhook" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{
    "event": "test",
    "session": "test_session",
    "payload": {
      "message": "Test message"
    }
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "Status HTTP: $HTTP_CODE"
echo "Resposta: $BODY"
echo ""

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo "✅ Função está respondendo!"
else
    echo "⚠️  Função respondeu com status $HTTP_CODE"
    echo "Isso pode ser normal se a função rejeitar payloads de teste"
fi

echo ""
echo "🎯 Próximos passos:"
echo "1. Configure o webhook no WAHA para apontar para:"
echo "   $SUPABASE_URL/functions/v1/waha-webhook"
echo ""
echo "2. Teste enviando uma mensagem pelo WhatsApp"
echo ""
echo "3. Verifique os logs:"
echo "   supabase functions logs waha-webhook"
