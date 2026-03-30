#!/bin/bash
# Script para gerar comandos de deploy das Meta Edge Functions
# Para executar NO TERMINAL DO COOLIFY (Edge Functions container)
# Data: 06/02/2026

FUNCTIONS_DIR="/home/deno/functions"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================"
echo "  DEPLOY META EDGE FUNCTIONS"
echo "========================================${NC}"
echo ""
echo -e "${YELLOW}INSTRUÇÕES:${NC}"
echo "1. Acesse: Coolify > Automacao Yeslaser > supabase-yeslaser"
echo "2. Vá em: Terminal"
echo "3. Selecione: supabase-edge-functions-*"
echo "4. Copie e cole cada bloco de comandos abaixo"
echo ""
echo "========================================"
echo ""

# Lista de functions
FUNCTIONS=(
  "meta-oauth-callback"
  "meta-webhook"
  "meta-send-message"
  "meta-sync"
  "meta-token-refresh"
)

for func in "${FUNCTIONS[@]}"; do
  echo ""
  echo -e "${GREEN}# ============================================"
  echo "# FUNCTION: $func"
  echo "# ============================================${NC}"
  echo ""

  # Verificar se arquivo existe
  if [ ! -f "supabase/functions/$func/index.ts" ]; then
    echo -e "${RED}❌ Arquivo não encontrado: supabase/functions/$func/index.ts${NC}"
    continue
  fi

  # Contar linhas
  lines=$(wc -l < "supabase/functions/$func/index.ts")
  echo -e "${YELLOW}# Arquivo: $lines linhas${NC}"
  echo ""

  # Criar diretório
  echo "# Passo 1: Criar diretório"
  echo "mkdir -p $FUNCTIONS_DIR/$func"
  echo ""

  # Criar arquivo usando heredoc
  echo "# Passo 2: Criar arquivo index.ts"
  echo "cat > $FUNCTIONS_DIR/$func/index.ts << 'EOFFUNCTION'"
  cat "supabase/functions/$func/index.ts"
  echo "EOFFUNCTION"
  echo ""

  # Verificar
  echo "# Passo 3: Verificar criação"
  echo "ls -lh $FUNCTIONS_DIR/$func/index.ts && echo '✅ $func criado com sucesso'"
  echo ""

  echo -e "${GREEN}# ============================================${NC}"
  echo ""
done

echo ""
echo -e "${GREEN}========================================"
echo "  ✅ COMANDOS GERADOS"
echo "========================================${NC}"
echo ""
echo -e "${YELLOW}ATENÇÃO:${NC}"
echo "- Copie CADA bloco completo (incluindo o EOFFUNCTION)"
echo "- Cole no terminal do Coolify"
echo "- Aguarde a confirmação '✅' antes de prosseguir"
echo ""
echo -e "${YELLOW}APÓS DEPLOYMENT:${NC}"
echo "- Reinicie o container Edge Functions no Coolify"
echo "- Teste os endpoints:"
echo "  https://supabase.yeslaser.com.br/functions/v1/meta-webhook"
echo "  https://supabase.yeslaser.com.br/functions/v1/meta-oauth-callback"
echo ""
