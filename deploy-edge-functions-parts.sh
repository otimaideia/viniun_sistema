#!/bin/bash
# ==========================================================
# DEPLOY EDGE FUNCTIONS EM PARTES - Para terminal Coolify
# ==========================================================
# Gera comandos separados por function para colar no terminal
# Cada bloco pode ser colado independentemente
#
# USO:
#   ./deploy-edge-functions-parts.sh
#   Depois cole cada PARTE no terminal do Coolify
# ==========================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FUNCTIONS_SRC="$SCRIPT_DIR/supabase/functions"
DEST_DIR="/home/deno/functions"

echo "# =========================================="
echo "# DEPLOY EDGE FUNCTIONS - PARTE POR PARTE"
echo "# Cole cada bloco separadamente no terminal"
echo "# Container: supabase-edge-functions"
echo "# =========================================="
echo ""

# Function to generate base64 install block for a single function
generate_block() {
  local name="$1"
  local src_dir="$2"
  local dest_subdir="$3"

  if [ ! -f "$src_dir" ]; then
    echo "# SKIP: $name - arquivo nao encontrado" >&2
    return
  fi

  local b64
  b64=$(tar -czf - -C "$(dirname "$src_dir")" "$(basename "$src_dir")" | base64 -b 76)
  local size
  size=$(wc -c < "$src_dir" | tr -d ' ')

  echo "# ============================================"
  echo "# $name ($size bytes)"
  echo "# ============================================"
  echo "mkdir -p $DEST_DIR/$dest_subdir"
  echo "echo '$b64' | base64 -d | tar -xzf - -C $DEST_DIR/$dest_subdir/"
  echo "ls -l $DEST_DIR/$dest_subdir/$(basename "$src_dir") && echo 'OK: $name'"
  echo ""
}

# _shared/secrets.ts
echo "# ============================================"
echo "# PARTE 0a: _shared/secrets.ts"
echo "# ============================================"
echo "mkdir -p $DEST_DIR/_shared"
echo "cat > $DEST_DIR/_shared/secrets.ts << 'EOF'"
cat "$FUNCTIONS_SRC/_shared/secrets.ts"
echo ""
echo "EOF"
echo "echo 'OK: _shared/secrets.ts'"
echo ""

# _shared/unicodeSanitizer.ts
echo "# ============================================"
echo "# PARTE 0b: _shared/unicodeSanitizer.ts"
echo "# ============================================"
echo "cat > $DEST_DIR/_shared/unicodeSanitizer.ts << 'EOF'"
cat "$FUNCTIONS_SRC/_shared/unicodeSanitizer.ts"
echo ""
echo "EOF"
echo "echo 'OK: _shared/unicodeSanitizer.ts'"
echo ""

# Each function as a separate block using heredoc
COUNTER=1
for func in \
  cliente-enviar-codigo \
  cliente-verificar-codigo \
  franqueado-servicos \
  google-drive-sync \
  meta-oauth-callback \
  meta-send-message \
  meta-sync \
  meta-token-refresh \
  meta-webhook \
  social-media-proxy \
  totem-checkin \
  waha-proxy \
  waha-webhook \
  webhook-leads; do

  src_file="$FUNCTIONS_SRC/$func/index.ts"

  if [ ! -f "$src_file" ]; then
    echo "# SKIP PARTE $COUNTER: $func - arquivo nao encontrado" >&2
    COUNTER=$((COUNTER + 1))
    continue
  fi

  lines=$(wc -l < "$src_file" | tr -d ' ')

  echo "# ============================================"
  echo "# PARTE $COUNTER: $func ($lines linhas)"
  echo "# ============================================"
  echo "mkdir -p $DEST_DIR/$func"
  echo "cat > $DEST_DIR/$func/index.ts << 'EOFUNC'"
  cat "$src_file"
  echo ""
  echo "EOFUNC"
  echo "ls -l $DEST_DIR/$func/index.ts && echo 'OK: $func instalado'"
  echo ""
  echo ""

  COUNTER=$((COUNTER + 1))
done

# Final verification block
echo "# ============================================"
echo "# PARTE FINAL: VERIFICACAO"
echo "# ============================================"
echo "echo ''"
echo "echo '========================================'"
echo "echo '  VERIFICACAO FINAL'"
echo "echo '========================================'"
for func in \
  cliente-enviar-codigo \
  cliente-verificar-codigo \
  franqueado-servicos \
  google-drive-sync \
  meta-oauth-callback \
  meta-send-message \
  meta-sync \
  meta-token-refresh \
  meta-webhook \
  social-media-proxy \
  totem-checkin \
  waha-proxy \
  waha-webhook \
  webhook-leads; do
  echo "test -f $DEST_DIR/$func/index.ts && echo '  OK: $func' || echo '  FALHA: $func'"
done
echo "test -f $DEST_DIR/_shared/secrets.ts && echo '  OK: _shared/secrets.ts' || echo '  FALHA: _shared/secrets.ts'"
echo "test -f $DEST_DIR/_shared/unicodeSanitizer.ts && echo '  OK: _shared/unicodeSanitizer.ts' || echo '  FALHA: _shared/unicodeSanitizer.ts'"
echo "echo '========================================'"
echo "echo 'Reinicie o container para aplicar!'"
echo "echo '========================================'"
