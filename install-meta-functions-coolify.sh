#!/bin/bash
# Instalador das Meta Edge Functions para Coolify
# Execute este script NO TERMINAL DO CONTAINER Edge Functions
# Data: 06/02/2026

set -e

echo "========================================"
echo "  INSTALADOR META EDGE FUNCTIONS"
echo "========================================"
echo ""

# Base64 do arquivo tar.gz comprimido
META_FUNCTIONS_B64="$(cat /tmp/meta-functions.b64)"

# Diretório de destino
DEST_DIR="/home/deno/functions"

# Criar diretório temporário
TMP_DIR=$(mktemp -d)
echo "📁 Diretório temporário: $TMP_DIR"

# Decodificar e extrair
echo "📦 Decodificando e extraindo functions..."
echo "$META_FUNCTIONS_B64" | base64 -d | tar -xzf - -C "$TMP_DIR"

# Mover para diretório final
echo "📋 Instalando functions..."
for func in meta-oauth-callback meta-webhook meta-send-message meta-sync meta-token-refresh; do
  if [ -d "$TMP_DIR/$func" ]; then
    echo "   ✅ Instalando: $func"
    rm -rf "$DEST_DIR/$func"
    mv "$TMP_DIR/$func" "$DEST_DIR/"
  else
    echo "   ❌ Não encontrado: $func"
  fi
done

# Limpar
rm -rf "$TMP_DIR"

# Listar functions instaladas
echo ""
echo "========================================"
echo "  ✅ INSTALAÇÃO CONCLUÍDA"
echo "========================================"
echo ""
echo "Functions instaladas:"
ls -lh "$DEST_DIR"/meta-* 2>/dev/null || echo "Nenhuma function encontrada"

echo ""
echo "🔄 Reinicie o container Edge Functions no Coolify para aplicar as mudanças"
echo ""
