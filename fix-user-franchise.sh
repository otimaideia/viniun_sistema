#!/bin/bash

# ==============================================================================
# FIX USER FRANCHISE - Configurar franquia do usuário
# ==============================================================================

SERVICE_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MzA2MTM2MCwiZXhwIjo0OTE4NzM0OTYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.xKjCIHG1qqMkTOgjI_rl9UuAmoCoq-cOAErjcEgRp9s"

echo "=== VERIFICANDO USUÁRIO ATUAL ==="

# 1. Buscar usuário atual pelo email
USER_EMAIL="marketing@franquiayeslaser.com.br"

# Buscar dados do usuário
curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d "{\"query\": \"SELECT id, nome, email, tenant_id, franchise_id, access_level FROM mt_users WHERE email = '$USER_EMAIL'\"}" | jq '.'

echo ""
echo "=== LISTANDO FRANQUIAS DISPONÍVEIS ==="

# 2. Listar franquias do tenant YESlaser
curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"query": "SELECT f.id, f.codigo, f.nome, f.cidade, f.estado, t.slug as tenant_slug FROM mt_franchises f JOIN mt_tenants t ON f.tenant_id = t.id WHERE t.slug = '\''yeslaser'\'' AND f.is_active = true ORDER BY f.nome LIMIT 20"}' | jq '.'

echo ""
echo "=== QUAL FRANQUIA VOCÊ ADMINISTRA? ==="
echo ""
echo "Copie o ID da sua franquia da lista acima e cole aqui:"
read FRANCHISE_ID

echo ""
echo "=== ATUALIZANDO USUÁRIO ==="

# 3. Atualizar franchise_id e access_level do usuário
curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d "{\"query\": \"UPDATE mt_users SET franchise_id = '$FRANCHISE_ID', access_level = 'franchise', updated_at = NOW() WHERE email = '$USER_EMAIL' RETURNING id, nome, franchise_id, access_level\"}" | jq '.'

echo ""
echo "=== VERIFICANDO ROLE DO USUÁRIO ==="

# 4. Verificar/criar role de franchise admin
curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"query": "SELECT ur.id, ur.user_id, r.codigo, r.nivel FROM mt_user_roles ur JOIN mt_roles r ON ur.role_id = r.id JOIN mt_users u ON ur.user_id = u.id WHERE u.email = '\''marketing@franquiayeslaser.com.br'\'' AND ur.is_active = true"}' | jq '.'

echo ""
echo "✅ CONFIGURAÇÃO CONCLUÍDA!"
echo ""
echo "Agora faça logout e login novamente no sistema para aplicar as mudanças."
echo "Após o login, o dashboard mostrará apenas os dados da SUA franquia."
