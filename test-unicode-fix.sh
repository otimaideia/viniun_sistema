#!/bin/bash

# Script para testar a correção de Unicode no WhatsApp

SERVICE_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MzA2MTM2MCwiZXhwIjo0OTE4NzM0OTYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.xKjCIHG1qqMkTOgjI_rl9UuAmoCoq-cOAErjcEgRp9s"

echo "=== TESTANDO SANITIZAÇÃO DE UNICODE ==="
echo ""

echo "1. Buscando conversas com possíveis caracteres inválidos..."
curl -s -X POST "https://supabase.yeslaser.com.br/rest/v1/rpc/exec" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"query": "SELECT id, contact_name, last_message_preview FROM mt_whatsapp_conversations WHERE last_message_preview IS NOT NULL LIMIT 5"}' \
  | jq -r '.[] | "\(.contact_name): \(.last_message_preview[:50])..."' 2>/dev/null || echo "Erro ao buscar conversas"

echo ""
echo "2. Buscando mensagens com emojis..."
curl -s -X POST "https://supabase.yeslaser.com.br/rest/v1/rpc/exec" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"query": "SELECT id, conteudo FROM mt_whatsapp_messages WHERE conteudo LIKE '\''%🤔%'\'' OR conteudo LIKE '\''%😊%'\'' LIMIT 3"}' \
  | jq -r '.[] | "\(.id): \(.conteudo[:80])..."' 2>/dev/null || echo "Erro ao buscar mensagens"

echo ""
echo "✅ Teste concluído!"
echo ""
echo "NOTA: Se você viu dados acima sem erros de JSON, a sanitização está funcionando!"
