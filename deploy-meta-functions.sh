#!/bin/bash
# Script para deploy das Meta Edge Functions no Supabase Self-Hosted via Coolify
# Data: 06/02/2026

set -e

echo "========================================"
echo "  DEPLOY META EDGE FUNCTIONS"
echo "========================================"
echo ""

# Diretório base das functions no container
FUNCTIONS_DIR="/home/deno/functions"

# Lista de functions para deploy
FUNCTIONS=(
  "meta-oauth-callback"
  "meta-webhook"
  "meta-send-message"
  "meta-sync"
  "meta-token-refresh"
)

# Função para criar diretório e arquivo
create_function() {
  local func_name=$1
  local func_dir="$FUNCTIONS_DIR/$func_name"

  echo "📦 Criando function: $func_name"

  # Criar diretório
  mkdir -p "$func_dir"

  # Criar arquivo index.ts a partir do base64
  echo "$func_code" | base64 -d > "$func_dir/index.ts"

  # Verificar se foi criado
  if [ -f "$func_dir/index.ts" ]; then
    local lines=$(wc -l < "$func_dir/index.ts")
    echo "   ✅ Criado: $lines linhas"
  else
    echo "   ❌ Erro ao criar"
    return 1
  fi
}

echo "Este script precisa ser executado DENTRO do container Edge Functions"
echo "Acesse: Coolify > Automacao Yeslaser > supabase-yeslaser > Terminal"
echo "Selecione: supabase-edge-functions-*"
echo ""
echo "Depois execute os comandos base64 fornecidos..."
echo ""
echo "Deseja ver os comandos? (pressione Enter)"
read

# Gerar comandos para cada function
for func in "${FUNCTIONS[@]}"; do
  echo ""
  echo "# ============================================"
  echo "# Function: $func"
  echo "# ============================================"
  echo ""
  echo "mkdir -p /home/deno/functions/$func"
  echo "cat > /home/deno/functions/$func/index.ts << 'EOFFUNCTION'"
  cat "supabase/functions/$func/index.ts"
  echo "EOFFUNCTION"
  echo ""
done

echo "========================================"
echo "  ✅ COMANDOS GERADOS"
echo "========================================"
echo ""
echo "Copie e cole cada bloco de comandos no terminal do Coolify"
echo ""
