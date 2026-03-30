#!/bin/bash
# ==========================================================
# DEPLOY ALL EDGE FUNCTIONS - Supabase Self-Hosted (Coolify)
# ==========================================================
# Deploy TODAS as 14 Edge Functions + _shared para o novo Supabase
# Target: supabase-app.yeslaserpraiagrande.com.br
# Container: supabase-edge-functions
# Data: 11/02/2026
#
# USO:
#   ./deploy-all-edge-functions.sh > deploy-commands.txt
#   Depois cole os comandos no terminal do Coolify
#
# OU para gerar arquivo .sh que pode ser colado:
#   ./deploy-all-edge-functions.sh --output deploy-into-container.sh
# ==========================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FUNCTIONS_SRC="$SCRIPT_DIR/supabase/functions"
DEST_DIR="/home/deno/functions"

# Lista completa de functions
FUNCTIONS=(
  "cliente-enviar-codigo"
  "cliente-verificar-codigo"
  "franqueado-servicos"
  "google-drive-sync"
  "meta-oauth-callback"
  "meta-send-message"
  "meta-sync"
  "meta-token-refresh"
  "meta-webhook"
  "social-media-proxy"
  "totem-checkin"
  "waha-proxy"
  "waha-webhook"
  "webhook-leads"
)

# Shared modules
SHARED_FILES=(
  "secrets.ts"
  "unicodeSanitizer.ts"
)

echo "#!/bin/bash"
echo "# ========================================================"
echo "# INSTALL ALL EDGE FUNCTIONS - Auto-generated"
echo "# Execute este script NO TERMINAL DO CONTAINER Edge Functions"
echo "# Container: supabase-edge-functions"
echo "# ========================================================"
echo ""
echo "set -e"
echo ""
echo "DEST_DIR=\"$DEST_DIR\""
echo ""

# ==========================================
# _shared directory
# ==========================================
echo "echo '========================================'"
echo "echo '  INSTALANDO _shared modules...'"
echo "echo '========================================'"
echo ""
echo "mkdir -p \$DEST_DIR/_shared"
echo ""

for file in "${SHARED_FILES[@]}"; do
  src_file="$FUNCTIONS_SRC/_shared/$file"
  if [ ! -f "$src_file" ]; then
    echo "# WARN: File not found: _shared/$file" >&2
    continue
  fi

  echo "# --- _shared/$file ---"
  echo "cat > \$DEST_DIR/_shared/$file << 'EOFSHARED'"
  cat "$src_file"
  echo ""
  echo "EOFSHARED"
  echo "echo '  _shared/$file instalado'"
  echo ""
done

# ==========================================
# Each function
# ==========================================
echo ""
echo "echo ''"
echo "echo '========================================'"
echo "echo '  INSTALANDO 14 Edge Functions...'"
echo "echo '========================================'"
echo ""

for func in "${FUNCTIONS[@]}"; do
  src_file="$FUNCTIONS_SRC/$func/index.ts"

  if [ ! -f "$src_file" ]; then
    echo "# WARN: File not found: $func/index.ts" >&2
    continue
  fi

  lines=$(wc -l < "$src_file" | tr -d ' ')

  echo "# ============================================"
  echo "# FUNCTION: $func ($lines lines)"
  echo "# ============================================"
  echo "mkdir -p \$DEST_DIR/$func"
  echo "cat > \$DEST_DIR/$func/index.ts << 'EOFFUNCTION'"
  cat "$src_file"
  echo ""
  echo "EOFFUNCTION"
  echo "echo '  $func instalado ($lines linhas)'"
  echo ""
done

# ==========================================
# Verification
# ==========================================
echo ""
echo "echo ''"
echo "echo '========================================'"
echo "echo '  VERIFICACAO'"
echo "echo '========================================'"
echo "echo ''"
echo ""
echo "# Contar functions instaladas"
echo "INSTALLED=0"
echo "TOTAL=${#FUNCTIONS[@]}"
echo ""

for func in "${FUNCTIONS[@]}"; do
  echo "if [ -f \$DEST_DIR/$func/index.ts ]; then"
  echo "  echo '  OK: $func'"
  echo "  INSTALLED=\$((INSTALLED + 1))"
  echo "else"
  echo "  echo '  FALHA: $func'"
  echo "fi"
done

echo ""
echo "echo ''"
echo "echo \"Functions instaladas: \$INSTALLED/\$TOTAL\""
echo ""

# Shared check
for file in "${SHARED_FILES[@]}"; do
  echo "if [ -f \$DEST_DIR/_shared/$file ]; then"
  echo "  echo '  OK: _shared/$file'"
  echo "else"
  echo "  echo '  FALHA: _shared/$file'"
  echo "fi"
done

echo ""
echo "echo ''"
echo "echo '========================================'"
echo "echo '  DEPLOY COMPLETO!'"
echo "echo '========================================'"
echo "echo ''"
echo "echo 'Reinicie o container Edge Functions no Coolify para aplicar.'"
echo "echo ''"
