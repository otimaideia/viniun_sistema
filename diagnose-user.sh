#!/bin/bash

# ==============================================================================
# DIAGNOSE USER - Verificar configuração do usuário atual
# ==============================================================================

SERVICE_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MzA2MTM2MCwiZXhwIjo0OTE4NzM0OTYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.xKjCIHG1qqMkTOgjI_rl9UuAmoCoq-cOAErjcEgRp9s"
USER_EMAIL="marketing@franquiayeslaser.com.br"

echo "=== DIAGNÓSTICO DO USUÁRIO ==="
echo ""
echo "📧 Email: $USER_EMAIL"
echo ""

# 1. Dados do usuário
echo "👤 Dados do Usuário:"
curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d "{\"query\": \"SELECT u.id, u.nome, u.email, u.tenant_id, u.franchise_id, u.access_level, t.slug as tenant_slug, f.nome as franquia_nome FROM mt_users u LEFT JOIN mt_tenants t ON u.tenant_id = t.id LEFT JOIN mt_franchises f ON u.franchise_id = f.id WHERE u.email = '$USER_EMAIL'\"}" | jq -r '.[] | "  - ID: \(.id)\n  - Nome: \(.nome)\n  - Tenant: \(.tenant_slug)\n  - Franquia ID: \(.franchise_id // "❌ NÃO CONFIGURADO")\n  - Franquia Nome: \(.franquia_nome // "❌ NÃO CONFIGURADO")\n  - Access Level: \(.access_level)"'

echo ""
echo "🔑 Roles do Usuário:"
curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d "{\"query\": \"SELECT r.codigo, r.nome, r.nivel FROM mt_user_roles ur JOIN mt_roles r ON ur.role_id = r.id JOIN mt_users u ON ur.user_id = u.id WHERE u.email = '$USER_EMAIL' AND ur.is_active = true\"}" | jq -r '.[] | "  - \(.nome) (\(.codigo)) - Nível \(.nivel)"'

echo ""
echo "🏢 Franquias Disponíveis (YESlaser):"
curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"query": "SELECT f.id, f.codigo, f.nome, f.cidade, f.estado FROM mt_franchises f JOIN mt_tenants t ON f.tenant_id = t.id WHERE t.slug = '\''yeslaser'\'' AND f.is_active = true ORDER BY f.nome LIMIT 10"}' | jq -r '.[] | "  - \(.nome) - \(.cidade)/\(.estado) (ID: \(.id))"'

echo ""
echo "=== PROBLEMA IDENTIFICADO ==="
echo ""

# Verificar se franchise_id está null
FRANCHISE_NULL=$(curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d "{\"query\": \"SELECT franchise_id IS NULL as is_null FROM mt_users WHERE email = '$USER_EMAIL'\"}" | jq -r '.[].is_null')

if [ "$FRANCHISE_NULL" = "true" ]; then
  echo "❌ PROBLEMA: O campo 'franchise_id' está NULL na tabela mt_users"
  echo ""
  echo "SOLUÇÃO:"
  echo "1. Execute: ./fix-user-franchise.sh"
  echo "2. Ou rode este comando manualmente (substitua FRANCHISE_ID pela sua franquia):"
  echo ""
  echo "   UPDATE mt_users SET"
  echo "     franchise_id = 'FRANCHISE_ID_AQUI',"
  echo "     access_level = 'franchise',"
  echo "     updated_at = NOW()"
  echo "   WHERE email = '$USER_EMAIL';"
  echo ""
else
  echo "✅ O usuário tem franquia configurada"
  echo ""
  echo "Verificando se access_level está correto..."

  ACCESS_LEVEL=$(curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
    -H "Content-Type: application/json" \
    -H "apikey: $SERVICE_KEY" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -d "{\"query\": \"SELECT access_level FROM mt_users WHERE email = '$USER_EMAIL'\"}" | jq -r '.[].access_level')

  if [ "$ACCESS_LEVEL" != "franchise" ]; then
    echo "⚠️  AVISO: access_level está como '$ACCESS_LEVEL' (deveria ser 'franchise')"
    echo ""
    echo "SOLUÇÃO: Execute este comando:"
    echo ""
    echo "   UPDATE mt_users SET"
    echo "     access_level = 'franchise',"
    echo "     updated_at = NOW()"
    echo "   WHERE email = '$USER_EMAIL';"
    echo ""
  else
    echo "✅ access_level está correto: '$ACCESS_LEVEL'"
    echo ""
    echo "Se o dashboard ainda mostra dados de todas as franquias:"
    echo "1. Faça logout e login novamente"
    echo "2. Limpe o cache do navegador (Ctrl+Shift+R)"
    echo "3. Verifique o console do navegador para erros"
  fi
fi

echo ""
echo "=== FIM DO DIAGNÓSTICO ==="
