#!/bin/bash
# Script AUTOMATIZADO para deploy Meta Messenger Functions
# Usa credenciais do arquivo .env.meta
# Data: 05/02/2026

set -e  # Sair se houver erro

echo "======================================"
echo "  DEPLOY AUTOMÁTICO - META MESSENGER"
echo "======================================"
echo ""

# Verificar se está no diretório correto
if [ ! -d "supabase/functions" ]; then
  echo "❌ Erro: Execute este script na raiz do projeto!"
  exit 1
fi

# Verificar se .env.meta existe
if [ ! -f ".env.meta" ]; then
  echo "❌ Arquivo .env.meta não encontrado!"
  echo "   Crie o arquivo com as credenciais META_APP_ID e META_APP_SECRET"
  exit 1
fi

# Carregar variáveis do .env.meta
source .env.meta

# Verificar se credenciais foram carregadas
if [ -z "$META_APP_ID" ] || [ -z "$META_APP_SECRET" ]; then
  echo "❌ Credenciais não encontradas no .env.meta!"
  echo "   Verifique se META_APP_ID e META_APP_SECRET estão definidos."
  exit 1
fi

echo "✅ Credenciais carregadas:"
echo "   META_APP_ID: $META_APP_ID"
echo "   META_APP_SECRET: ${META_APP_SECRET:0:10}..."
echo ""

# Verificar Supabase CLI
if ! command -v supabase &> /dev/null; then
  echo "❌ Supabase CLI não encontrado!"
  echo "   Instale com: brew install supabase/tap/supabase"
  exit 1
fi

echo "✅ Supabase CLI encontrado"
echo ""

# Configurar secrets
echo "🔐 PASSO 1: Configurando Secrets no Supabase"
echo "---------------------------------------------"
echo ""

echo "Configurando META_APP_ID..."
supabase secrets set META_APP_ID="$META_APP_ID" --project-ref escolaotimaideia

echo "Configurando META_APP_SECRET..."
supabase secrets set META_APP_SECRET="$META_APP_SECRET" --project-ref escolaotimaideia

echo "Configurando META_WEBHOOK_VERIFY_TOKEN..."
supabase secrets set META_WEBHOOK_VERIFY_TOKEN="$META_WEBHOOK_VERIFY_TOKEN" --project-ref escolaotimaideia

echo "Configurando META_REDIRECT_URI..."
supabase secrets set META_REDIRECT_URI="$META_REDIRECT_URI" --project-ref escolaotimaideia

echo ""
echo "✅ Todos os secrets configurados!"
echo ""

# Deploy das Edge Functions
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

success_count=0
total=${#functions[@]}

for func in "${functions[@]}"; do
  echo "📦 Deploying $func..."

  if supabase functions deploy "$func" --project-ref escolaotimaideia; then
    echo "   ✅ $func deployado com sucesso!"
    ((success_count++))
  else
    echo "   ❌ Erro ao deployar $func"
    echo "   Continuando com as próximas funções..."
  fi
  echo ""
done

echo ""
echo "======================================"
echo "  📊 RESULTADO DO DEPLOY"
echo "======================================"
echo ""
echo "Funções deployadas: $success_count/$total"
echo ""

if [ $success_count -eq $total ]; then
  echo "✅ TODAS AS FUNÇÕES FORAM DEPLOYADAS COM SUCESSO!"
else
  echo "⚠️  Algumas funções falharam. Verifique os erros acima."
fi

echo ""
echo "🔗 URLs das Edge Functions:"
echo "  OAuth:   $META_OAUTH_URL"
echo "  Webhook: $META_WEBHOOK_URL"
echo "  Send:    $META_SEND_URL"
echo "  Sync:    $META_SYNC_URL"
echo "  Refresh: $META_REFRESH_URL"
echo ""
echo "🎯 PRÓXIMOS PASSOS:"
echo ""
echo "1. Configure no Meta for Developers:"
echo "   https://developers.facebook.com/apps/1310930263039278/settings/basic/"
echo ""
echo "   a) Adicionar Redirect URI do OAuth:"
echo "      $META_REDIRECT_URI"
echo ""
echo "   b) Configurar Webhook (em Messenger/Instagram):"
echo "      URL: $META_WEBHOOK_URL"
echo "      Verify Token: yeslaser_meta_webhook_2025"
echo ""
echo "2. Teste no frontend:"
echo "   http://localhost:8080/meta-messenger/config"
echo ""
echo "3. Clique em 'Conectar Facebook' ou 'Conectar Instagram'"
echo ""
