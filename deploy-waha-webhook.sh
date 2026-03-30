#!/bin/bash

# Script para fazer deploy da Edge Function waha-webhook
# no Supabase self-hosted via API REST

set -e  # Parar em caso de erro

echo "🚀 Deploy da Edge Function waha-webhook"
echo "========================================="

# Configuração
SUPABASE_URL="https://supabase.yeslaser.com.br"
SERVICE_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MzA2MTM2MCwiZXhwIjo0OTE4NzM0OTYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.xKjCIHG1qqMkTOgjI_rl9UuAmoCoq-cOAErjcEgRp9s"
FUNCTION_NAME="waha-webhook"
FUNCTION_FILE="supabase/functions/waha-webhook/index.ts"

# Verificar se arquivo existe
if [ ! -f "$FUNCTION_FILE" ]; then
  echo "❌ Erro: Arquivo $FUNCTION_FILE não encontrado"
  exit 1
fi

echo "📁 Lendo arquivo: $FUNCTION_FILE"

# Ler conteúdo do arquivo
FUNCTION_CODE=$(cat "$FUNCTION_FILE")

# Escapar para JSON (substituir quebras de linha e aspas)
FUNCTION_CODE_ESCAPED=$(echo "$FUNCTION_CODE" | jq -Rs .)

echo "📦 Preparando payload..."

# Criar payload JSON
PAYLOAD=$(cat <<EOF
{
  "name": "$FUNCTION_NAME",
  "body": $FUNCTION_CODE_ESCAPED,
  "verify_jwt": false
}
EOF
)

echo "🌐 Enviando para $SUPABASE_URL..."

# Fazer POST para criar/atualizar a função
RESPONSE=$(curl -s -X POST \
  "$SUPABASE_URL/functions/v1/$FUNCTION_NAME" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "apikey: $SERVICE_KEY" \
  -d "$PAYLOAD")

echo ""
echo "📋 Resposta do servidor:"
echo "$RESPONSE" | jq .

# Verificar se houve sucesso
if echo "$RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
  echo ""
  echo "❌ Erro ao fazer deploy!"
  echo "$RESPONSE" | jq -r '.error.message'
  exit 1
else
  echo ""
  echo "✅ Deploy concluído com sucesso!"
  echo ""
  echo "📍 URL da função:"
  echo "$SUPABASE_URL/functions/v1/$FUNCTION_NAME"
  echo ""
  echo "🔗 Webhook URL (para configurar no WAHA):"
  echo "$SUPABASE_URL/functions/v1/$FUNCTION_NAME"
fi
