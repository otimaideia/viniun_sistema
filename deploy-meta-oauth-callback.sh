#!/bin/bash
# Deploy da Edge Function meta-oauth-callback modificada
# Data: 06/02/2026

set -e

echo "================================================"
echo "  DEPLOY META-OAUTH-CALLBACK"
echo "================================================"
echo ""

# Arquivo local
LOCAL_FILE="supabase/functions/meta-oauth-callback/index.ts"

if [ ! -f "$LOCAL_FILE" ]; then
  echo "❌ Arquivo não encontrado: $LOCAL_FILE"
  exit 1
fi

echo "✅ Arquivo encontrado: $LOCAL_FILE"
echo ""

# Fazer base64 do arquivo
echo "📦 Criando pacote da function..."
cd supabase/functions
tar -czf /tmp/meta-oauth-callback.tar.gz meta-oauth-callback/
BASE64_PACKAGE=$(base64 -i /tmp/meta-oauth-callback.tar.gz)
cd ../..

echo "✅ Pacote criado"
echo ""

# Criar script de instalação
cat > /tmp/install-meta-oauth.sh <<'EOFINSTALL'
#!/bin/bash
# Instalar meta-oauth-callback atualizada

set -e

DEST_DIR="/home/deno/functions"
TMP_DIR=$(mktemp -d)

echo "📁 Diretório temporário: $TMP_DIR"
echo "📦 Extraindo function..."

# Decodificar e extrair
echo "$1" | base64 -d | tar -xzf - -C "$TMP_DIR"

# Mover para diretório final
if [ -d "$TMP_DIR/meta-oauth-callback" ]; then
  echo "✅ Instalando meta-oauth-callback..."
  rm -rf "$DEST_DIR/meta-oauth-callback"
  mv "$TMP_DIR/meta-oauth-callback" "$DEST_DIR/"
  echo "✅ Instalado com sucesso!"
else
  echo "❌ Diretório meta-oauth-callback não encontrado"
  exit 1
fi

# Limpar
rm -rf "$TMP_DIR"

echo ""
echo "================================================"
echo "  ✅ INSTALAÇÃO CONCLUÍDA"
echo "================================================"
echo ""
echo "🔄 Reinicie o container Edge Functions no Coolify"
EOFINSTALL

chmod +x /tmp/install-meta-oauth.sh

echo "================================================"
echo "  PRÓXIMOS PASSOS"
echo "================================================"
echo ""
echo "Opção 1: Deploy via Docker (Recomendado)"
echo "----------------------------------------"
echo "1. Encontrar ID do container:"
echo "   docker ps | grep edge"
echo ""
echo "2. Copiar arquivos para o container:"
echo "   docker cp supabase/functions/meta-oauth-callback <container-id>:/home/deno/functions/"
echo ""
echo "3. Reiniciar container:"
echo "   docker restart <container-id>"
echo ""
echo ""
echo "Opção 2: Deploy via Script"
echo "----------------------------------------"
echo "Execute no servidor (via SSH):"
echo ""
echo "# Salvar o base64"
cat > /tmp/deploy-command.txt <<EOFCMD
echo "$BASE64_PACKAGE" | base64 -d | tar -xzf - -C /home/deno/functions/
docker restart <container-id-edge-functions>
EOFCMD

cat /tmp/deploy-command.txt
echo ""
echo ""
echo "Opção 3: Deploy via Supabase CLI"
echo "----------------------------------------"
echo "supabase functions deploy meta-oauth-callback --project-ref <seu-project-ref>"
echo ""
echo "================================================"
echo ""

# Limpar
rm -f /tmp/meta-oauth-callback.tar.gz
