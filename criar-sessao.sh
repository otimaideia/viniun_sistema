#!/bin/bash

# Script simples para criar sessão WAHA
# Uso: ./criar-sessao.sh nome_da_sessao

WAHA_URL="https://waha.yeslaser.com.br"
API_KEY="GY9SDuKPFnJ4_dr"
SESSION_NAME="${1:-teste_script}"

echo "========================================"
echo "  CRIAR SESSÃO WAHA: $SESSION_NAME"
echo "========================================"
echo ""

# 1. Criar sessão
echo "1. Criando sessão com NOWEB store..."
curl -s -X POST "$WAHA_URL/api/sessions" \
  -H "X-Api-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "'$SESSION_NAME'",
    "config": {
      "noweb": {
        "store": {
          "enabled": true,
          "fullSync": true
        }
      }
    }
  }' | jq '{name: .name, status: .status, store: .config.noweb.store}'

echo ""

# 2. Iniciar sessão
echo "2. Iniciando sessão..."
sleep 1
curl -s -X POST "$WAHA_URL/api/sessions/$SESSION_NAME/start" \
  -H "X-Api-Key: $API_KEY" | jq '{status: .status}'

echo ""

# 3. Mostrar status
echo "3. Status final:"
sleep 2
curl -s "$WAHA_URL/api/sessions/$SESSION_NAME" \
  -H "X-Api-Key: $API_KEY" | jq '{name: .name, status: .status, store_enabled: .config.noweb.store.enabled}'

echo ""
echo "========================================"
echo "  QR CODE: $WAHA_URL/api/$SESSION_NAME/auth/qr"
echo "========================================"
