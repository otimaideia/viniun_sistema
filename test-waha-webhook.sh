#!/bin/bash

# Testa a Edge Function waha-webhook via cURL puro
# Não faz deploy, apenas testa se está funcionando

echo "🧪 Testando Edge Function waha-webhook"
echo "======================================="
echo ""

# Configurações
SUPABASE_URL="https://supabase.yeslaser.com.br"
SERVICE_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MzA2MTM2MCwiZXhwIjo0OTE4NzM0OTYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.xKjCIHG1qqMkTOgjI_rl9UuAmoCoq-cOAErjcEgRp9s"
ANON_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MzA2MTM2MCwiZXhwIjo0OTE4NzM0OTYwLCJyb2xlIjoiYW5vbiJ9.eAu3Cj-u3A2xc0ICI19DpDdZEOufr9R0O4BFl2-coV8"

WEBHOOK_URL="$SUPABASE_URL/functions/v1/waha-webhook"

echo "📍 URL: $WEBHOOK_URL"
echo ""

# Teste 1: OPTIONS (CORS preflight)
echo "Teste 1: OPTIONS (CORS preflight)"
echo "--------------------------------"
curl -i -X OPTIONS "$WEBHOOK_URL" \
  -H "Origin: http://localhost:8080" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,authorization"

echo ""
echo ""

# Teste 2: POST sem autenticação (deve falhar)
echo "Teste 2: POST sem autenticação"
echo "------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "message",
    "session": "test",
    "payload": {}
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "Status: $HTTP_CODE"
echo "Body: $BODY"
echo ""

if [ "$HTTP_CODE" = "401" ]; then
    echo "✅ Correto! Rejeitou sem autenticação"
else
    echo "⚠️  Esperado 401, recebeu $HTTP_CODE"
fi

echo ""
echo ""

# Teste 3: POST com Service Key (simulando WAHA)
echo "Teste 3: POST com Service Key"
echo "-----------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "apikey: $SERVICE_KEY" \
  -d '{
    "event": "message",
    "session": "test_session",
    "payload": {
      "id": "test_msg_123",
      "from": "5511999999999@c.us",
      "body": "Test message",
      "timestamp": 1234567890
    }
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "Status: $HTTP_CODE"
echo "Body: $BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Webhook respondeu com sucesso!"
elif [ "$HTTP_CODE" = "400" ]; then
    echo "⚠️  Webhook rejeitou o payload (esperado se sessão não existe)"
elif [ "$HTTP_CODE" = "404" ]; then
    echo "❌ Edge Function não encontrada!"
    echo ""
    echo "A função precisa ser deployada. Execute:"
    echo "  ./deploy-waha-webhook-simple.sh"
else
    echo "⚠️  Status inesperado: $HTTP_CODE"
fi

echo ""
echo ""

# Teste 4: POST com evento message.any
echo "Teste 4: POST com evento message.any"
echo "------------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "apikey: $SERVICE_KEY" \
  -d '{
    "event": "message.any",
    "session": "test_session",
    "payload": {
      "id": "test_msg_456",
      "from": "5511988888888@c.us",
      "to": "5511977777777@c.us",
      "body": "Another test",
      "fromMe": false,
      "timestamp": 1234567890,
      "type": "chat"
    }
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "Status: $HTTP_CODE"
echo "Body: $BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Webhook processou message.any!"
else
    echo "⚠️  Status: $HTTP_CODE"
fi

echo ""
echo "======================================="
echo "✅ Testes concluídos!"
echo ""
echo "📊 Resumo:"
echo "- URL: $WEBHOOK_URL"
echo "- CORS: Configurado"
echo "- Autenticação: Requerida"
echo ""
echo "🔧 Para configurar no WAHA:"
echo "1. Acesse https://waha.yeslaser.com.br"
echo "2. Configure webhook URL: $WEBHOOK_URL"
echo "3. Eventos: message, message.any, message.ack, session.status"
