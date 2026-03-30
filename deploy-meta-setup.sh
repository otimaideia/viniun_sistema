#!/bin/bash
# Script para configurar secrets e fazer deploy das Edge Functions Meta
# Data: 05/02/2026

echo "======================================"
echo "  DEPLOY META MESSENGER FUNCTIONS"
echo "======================================"
echo ""

# Verificar se está no diretório correto
if [ ! -d "supabase/functions" ]; then
  echo "❌ Erro: Execute este script na raiz do projeto!"
  exit 1
fi

# Verificar se Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
  echo "❌ Supabase CLI não encontrado!"
  echo "Instale com: brew install supabase/tap/supabase"
  exit 1
fi

echo "✅ Supabase CLI encontrado"
echo ""

# Solicitar credenciais
echo "📋 PASSO 1: Configurar Credenciais"
echo "-----------------------------------"
echo ""
read -p "Digite o META_APP_ID (obtido no Meta for Developers): " META_APP_ID
read -p "Digite o META_APP_SECRET (obtido no Meta for Developers): " META_APP_SECRET
echo ""

# Confirmar
echo "Credenciais informadas:"
echo "  META_APP_ID: $META_APP_ID"
echo "  META_APP_SECRET: ${META_APP_SECRET:0:10}..."
echo ""
read -p "Confirma? (s/n): " confirm

if [ "$confirm" != "s" ]; then
  echo "Cancelado pelo usuário."
  exit 1
fi

echo ""
echo "🔐 Configurando secrets no Supabase..."

# Configurar secrets
supabase secrets set META_APP_ID="$META_APP_ID"
supabase secrets set META_APP_SECRET="$META_APP_SECRET"
supabase secrets set META_WEBHOOK_VERIFY_TOKEN="yeslaser_meta_webhook_2025"
supabase secrets set META_REDIRECT_URI="https://supabase.yeslaser.com.br/functions/v1/meta-oauth-callback"

echo "✅ Secrets configurados!"
echo ""

# Deploy das functions
echo "🚀 PASSO 2: Deploy das Edge Functions"
echo "--------------------------------------"
echo ""

functions=(
  "meta-oauth-callback"
  "meta-webhook"
  "meta-send-message"
  "meta-sync"
  "meta-token-refresh"
)

for func in "${functions[@]}"; do
  echo "📦 Deploying $func..."
  supabase functions deploy "$func"

  if [ $? -eq 0 ]; then
    echo "   ✅ $func deployado com sucesso!"
  else
    echo "   ❌ Erro ao deployar $func"
    exit 1
  fi
  echo ""
done

echo ""
echo "======================================"
echo "  ✅ DEPLOY CONCLUÍDO COM SUCESSO!"
echo "======================================"
echo ""
echo "URLs das Functions:"
echo "  - OAuth: https://supabase.yeslaser.com.br/functions/v1/meta-oauth-callback"
echo "  - Webhook: https://supabase.yeslaser.com.br/functions/v1/meta-webhook"
echo "  - Send: https://supabase.yeslaser.com.br/functions/v1/meta-send-message"
echo "  - Sync: https://supabase.yeslaser.com.br/functions/v1/meta-sync"
echo "  - Refresh: https://supabase.yeslaser.com.br/functions/v1/meta-token-refresh"
echo ""
echo "🎯 PRÓXIMOS PASSOS:"
echo "  1. Configure o Redirect URI no Meta App:"
echo "     https://supabase.yeslaser.com.br/functions/v1/meta-oauth-callback"
echo ""
echo "  2. Configure o Webhook URL no Meta App:"
echo "     https://supabase.yeslaser.com.br/functions/v1/meta-webhook"
echo "     Verify Token: yeslaser_meta_webhook_2025"
echo ""
echo "  3. Teste o OAuth no frontend: /meta-messenger/config"
echo ""
