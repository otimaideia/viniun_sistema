#!/bin/bash
# Deploy da Edge Function meta-oauth-callback com bug fix do state parameter
# Data: 06/02/2026 - 05:00

set -e

echo "================================================"
echo "  DEPLOY META-OAUTH-CALLBACK (BUG FIX)"
echo "================================================"
echo ""
echo "Bug corrigido: State parameter agora usa JSON em vez de pipe-separated"
echo ""

# Verificar se o arquivo existe
LOCAL_FILE="supabase/functions/meta-oauth-callback/index.ts"

if [ ! -f "$LOCAL_FILE" ]; then
  echo "❌ Arquivo não encontrado: $LOCAL_FILE"
  exit 1
fi

echo "✅ Arquivo encontrado: $LOCAL_FILE"
echo ""

# Criar pacote
echo "📦 Criando pacote da function..."
cd supabase/functions
tar -czf /tmp/meta-oauth-callback-fixed.tar.gz meta-oauth-callback/
cd ../..

echo "✅ Pacote criado: /tmp/meta-oauth-callback-fixed.tar.gz"
echo ""

echo "================================================"
echo "  OPÇÕES DE DEPLOY"
echo "================================================"
echo ""
echo "Opção 1: Deploy via Docker (Recomendado)"
echo "----------------------------------------"
echo "1. Encontrar ID do container Edge Functions:"
echo "   docker ps | grep edge"
echo ""
echo "2. Copiar arquivos para o container:"
echo "   docker cp supabase/functions/meta-oauth-callback <container-id>:/home/deno/functions/"
echo ""
echo "3. Reiniciar container:"
echo "   docker restart <container-id>"
echo ""
echo ""
echo "Opção 2: Deploy via SSH (se tiver acesso)"
echo "----------------------------------------"
echo "1. Copiar para servidor:"
echo "   scp -r supabase/functions/meta-oauth-callback user@servidor:/caminho/supabase/functions/"
echo ""
echo "2. Reiniciar serviço Edge Functions"
echo ""
echo ""
echo "================================================"
echo "  APÓS O DEPLOY"
echo "================================================"
echo ""
echo "1. Deletar a conta 'Danilo Luiz' conectada no painel"
echo "2. Clicar em 'Conectar Facebook' novamente"
echo "3. Autorizar as permissões"
echo "4. Agora deve listar suas páginas! 🎉"
echo ""
echo "================================================"
