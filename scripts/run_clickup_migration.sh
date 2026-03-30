#!/bin/bash
# ===========================================
# Script de Execução: ClickUp Migration
# Data: 03 de Fevereiro de 2026
# Descrição: Executa a migration do módulo ClickUp
# ===========================================

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "============================================"
echo "  ClickUp Migration - Módulo de Integração"
echo "============================================"
echo ""

# Service Key do Supabase
SERVICE_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MzA2MTM2MCwiZXhwIjo0OTE4NzM0OTYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.xKjCIHG1qqMkTOgjI_rl9UuAmoCoq-cOAErjcEgRp9s"
SUPABASE_URL="https://supabase.yeslaser.com.br"

# Função para executar SQL
execute_sql() {
    local sql="$1"
    local description="$2"

    echo -n "→ $description... "

    response=$(curl -s -X POST "$SUPABASE_URL/pg/query" \
        -H "Content-Type: application/json" \
        -H "apikey: $SERVICE_KEY" \
        -H "Authorization: Bearer $SERVICE_KEY" \
        -d "{\"query\": \"$sql\"}")

    if echo "$response" | grep -q '"error"'; then
        echo -e "${RED}ERRO${NC}"
        echo "  Detalhes: $response"
        return 1
    else
        echo -e "${GREEN}OK${NC}"
        return 0
    fi
}

# Função para verificar se tabela existe
table_exists() {
    local table="$1"
    response=$(curl -s -X POST "$SUPABASE_URL/pg/query" \
        -H "Content-Type: application/json" \
        -H "apikey: $SERVICE_KEY" \
        -H "Authorization: Bearer $SERVICE_KEY" \
        -d "{\"query\": \"SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '$table')\"}")

    echo "$response" | grep -q "true"
}

echo "=== PASSO 1: Verificando conexão ==="
execute_sql "SELECT 1 as test" "Testando conexão"
if [ $? -ne 0 ]; then
    echo -e "${RED}Falha na conexão. Abortando.${NC}"
    exit 1
fi
echo ""

echo "=== PASSO 2: Verificando tabelas existentes ==="
for table in mt_clickup_config mt_clickup_list_mapping mt_clickup_field_mapping mt_clickup_value_mapping mt_clickup_import_sessions mt_clickup_migration_log; do
    if table_exists "$table"; then
        echo -e "  ${YELLOW}⚠ Tabela $table já existe${NC}"
    else
        echo "  ○ Tabela $table será criada"
    fi
done
echo ""

echo "=== PASSO 3: Registrando módulo ==="
execute_sql "INSERT INTO mt_modules (codigo, nome, descricao, icone, categoria, ordem, is_core, is_active) VALUES ('clickup_migracao', 'ClickUp Migração CRM', 'Migração de leads do ClickUp para o sistema', 'ArrowRightLeft', 'sistema', 99, false, true) ON CONFLICT (codigo) DO UPDATE SET nome = EXCLUDED.nome, descricao = EXCLUDED.descricao, icone = EXCLUDED.icone" "Registrando módulo clickup_migracao"
echo ""

echo "=== PASSO 4: Habilitando módulo para YESlaser ==="
execute_sql "INSERT INTO mt_tenant_modules (tenant_id, module_id, is_active) SELECT t.id, m.id, true FROM mt_tenants t CROSS JOIN mt_modules m WHERE m.codigo = 'clickup_migracao' AND t.slug = 'yeslaser' AND NOT EXISTS (SELECT 1 FROM mt_tenant_modules tm WHERE tm.tenant_id = t.id AND tm.module_id = m.id)" "Habilitando para tenant yeslaser"
echo ""

echo "=== PASSO 5: Criando tabela mt_clickup_config ==="
execute_sql "CREATE TABLE IF NOT EXISTS mt_clickup_config (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES mt_tenants(id) ON DELETE CASCADE, api_key VARCHAR(255) NOT NULL, workspace_id VARCHAR(50), workspace_name VARCHAR(255), space_id VARCHAR(50), space_name VARCHAR(255), is_active BOOLEAN DEFAULT true, last_sync_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), created_by UUID REFERENCES auth.users(id), UNIQUE(tenant_id))" "Criando tabela"
execute_sql "CREATE INDEX IF NOT EXISTS idx_mt_clickup_config_tenant ON mt_clickup_config(tenant_id)" "Criando índice"
echo ""

echo "=== PASSO 6: Criando tabela mt_clickup_list_mapping ==="
execute_sql "CREATE TABLE IF NOT EXISTS mt_clickup_list_mapping (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), config_id UUID NOT NULL REFERENCES mt_clickup_config(id) ON DELETE CASCADE, clickup_list_id VARCHAR(50) NOT NULL, clickup_list_name VARCHAR(255), assigned_user_id UUID REFERENCES mt_users(id) ON DELETE SET NULL, is_active BOOLEAN DEFAULT true, last_sync_at TIMESTAMPTZ, total_tasks INTEGER DEFAULT 0, synced_tasks INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(config_id, clickup_list_id))" "Criando tabela"
execute_sql "CREATE INDEX IF NOT EXISTS idx_mt_clickup_list_config ON mt_clickup_list_mapping(config_id)" "Criando índice config"
execute_sql "CREATE INDEX IF NOT EXISTS idx_mt_clickup_list_active ON mt_clickup_list_mapping(is_active) WHERE is_active = true" "Criando índice active"
echo ""

echo "=== PASSO 7: Criando tabela mt_clickup_field_mapping ==="
execute_sql "CREATE TABLE IF NOT EXISTS mt_clickup_field_mapping (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), config_id UUID NOT NULL REFERENCES mt_clickup_config(id) ON DELETE CASCADE, clickup_field_id VARCHAR(100) NOT NULL, clickup_field_name VARCHAR(255), clickup_field_type VARCHAR(50), mt_leads_column VARCHAR(100) NOT NULL, transformation VARCHAR(50) DEFAULT 'direct', is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(config_id, clickup_field_id))" "Criando tabela"
execute_sql "CREATE INDEX IF NOT EXISTS idx_mt_clickup_field_config ON mt_clickup_field_mapping(config_id)" "Criando índice"
echo ""

echo "=== PASSO 8: Criando tabela mt_clickup_value_mapping ==="
execute_sql "CREATE TABLE IF NOT EXISTS mt_clickup_value_mapping (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), field_mapping_id UUID NOT NULL REFERENCES mt_clickup_field_mapping(id) ON DELETE CASCADE, clickup_value VARCHAR(255) NOT NULL, clickup_label VARCHAR(255), mt_value VARCHAR(255) NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(field_mapping_id, clickup_value))" "Criando tabela"
execute_sql "CREATE INDEX IF NOT EXISTS idx_mt_clickup_value_field ON mt_clickup_value_mapping(field_mapping_id)" "Criando índice"
echo ""

echo "=== PASSO 9: Criando tabela mt_clickup_import_sessions ==="
execute_sql "CREATE TABLE IF NOT EXISTS mt_clickup_import_sessions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), config_id UUID NOT NULL REFERENCES mt_clickup_config(id) ON DELETE CASCADE, status VARCHAR(20) NOT NULL DEFAULT 'pending', total_tasks INTEGER DEFAULT 0, processed_tasks INTEGER DEFAULT 0, created_leads INTEGER DEFAULT 0, updated_leads INTEGER DEFAULT 0, skipped_tasks INTEGER DEFAULT 0, error_count INTEGER DEFAULT 0, current_list_id VARCHAR(50), current_page INTEGER DEFAULT 0, last_processed_task_id VARCHAR(50), started_at TIMESTAMPTZ, paused_at TIMESTAMPTZ, completed_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW(), import_config JSONB DEFAULT '{}'::jsonb)" "Criando tabela"
execute_sql "CREATE INDEX IF NOT EXISTS idx_mt_clickup_import_config ON mt_clickup_import_sessions(config_id)" "Criando índice config"
execute_sql "CREATE INDEX IF NOT EXISTS idx_mt_clickup_import_status ON mt_clickup_import_sessions(status)" "Criando índice status"
execute_sql "CREATE INDEX IF NOT EXISTS idx_mt_clickup_import_created ON mt_clickup_import_sessions(created_at DESC)" "Criando índice created"
echo ""

echo "=== PASSO 10: Criando tabela mt_clickup_migration_log ==="
execute_sql "CREATE TABLE IF NOT EXISTS mt_clickup_migration_log (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), config_id UUID NOT NULL REFERENCES mt_clickup_config(id) ON DELETE CASCADE, session_id UUID REFERENCES mt_clickup_import_sessions(id) ON DELETE SET NULL, clickup_task_id VARCHAR(50) NOT NULL, clickup_list_id VARCHAR(50), lead_id UUID REFERENCES mt_leads(id) ON DELETE SET NULL, status VARCHAR(20) NOT NULL DEFAULT 'pending', action VARCHAR(20), error_message TEXT, raw_data JSONB, transformed_data JSONB, created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(config_id, clickup_task_id))" "Criando tabela"
execute_sql "CREATE INDEX IF NOT EXISTS idx_mt_clickup_log_config ON mt_clickup_migration_log(config_id)" "Criando índice config"
execute_sql "CREATE INDEX IF NOT EXISTS idx_mt_clickup_log_status ON mt_clickup_migration_log(status)" "Criando índice status"
execute_sql "CREATE INDEX IF NOT EXISTS idx_mt_clickup_log_task ON mt_clickup_migration_log(clickup_task_id)" "Criando índice task"
execute_sql "CREATE INDEX IF NOT EXISTS idx_mt_clickup_log_created ON mt_clickup_migration_log(created_at DESC)" "Criando índice created"
echo ""

echo "=== PASSO 11: Habilitando RLS ==="
for table in mt_clickup_config mt_clickup_list_mapping mt_clickup_field_mapping mt_clickup_value_mapping mt_clickup_import_sessions mt_clickup_migration_log; do
    execute_sql "ALTER TABLE $table ENABLE ROW LEVEL SECURITY" "RLS em $table"
done
echo ""

echo "=== PASSO 12: Criando policies RLS ==="
# mt_clickup_config
execute_sql "DROP POLICY IF EXISTS clickup_config_select ON mt_clickup_config" "Drop policy config select"
execute_sql "CREATE POLICY clickup_config_select ON mt_clickup_config FOR SELECT USING (is_platform_admin() OR tenant_id = current_tenant_id())" "Policy config select"
execute_sql "DROP POLICY IF EXISTS clickup_config_insert ON mt_clickup_config" "Drop policy config insert"
execute_sql "CREATE POLICY clickup_config_insert ON mt_clickup_config FOR INSERT WITH CHECK (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()))" "Policy config insert"
execute_sql "DROP POLICY IF EXISTS clickup_config_update ON mt_clickup_config" "Drop policy config update"
execute_sql "CREATE POLICY clickup_config_update ON mt_clickup_config FOR UPDATE USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()))" "Policy config update"
execute_sql "DROP POLICY IF EXISTS clickup_config_delete ON mt_clickup_config" "Drop policy config delete"
execute_sql "CREATE POLICY clickup_config_delete ON mt_clickup_config FOR DELETE USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()))" "Policy config delete"

# mt_clickup_list_mapping
execute_sql "DROP POLICY IF EXISTS clickup_list_all ON mt_clickup_list_mapping" "Drop policy list"
execute_sql "CREATE POLICY clickup_list_all ON mt_clickup_list_mapping FOR ALL USING (EXISTS (SELECT 1 FROM mt_clickup_config c WHERE c.id = config_id AND (is_platform_admin() OR c.tenant_id = current_tenant_id())))" "Policy list all"

# mt_clickup_field_mapping
execute_sql "DROP POLICY IF EXISTS clickup_field_all ON mt_clickup_field_mapping" "Drop policy field"
execute_sql "CREATE POLICY clickup_field_all ON mt_clickup_field_mapping FOR ALL USING (EXISTS (SELECT 1 FROM mt_clickup_config c WHERE c.id = config_id AND (is_platform_admin() OR c.tenant_id = current_tenant_id())))" "Policy field all"

# mt_clickup_value_mapping
execute_sql "DROP POLICY IF EXISTS clickup_value_all ON mt_clickup_value_mapping" "Drop policy value"
execute_sql "CREATE POLICY clickup_value_all ON mt_clickup_value_mapping FOR ALL USING (EXISTS (SELECT 1 FROM mt_clickup_field_mapping fm JOIN mt_clickup_config c ON c.id = fm.config_id WHERE fm.id = field_mapping_id AND (is_platform_admin() OR c.tenant_id = current_tenant_id())))" "Policy value all"

# mt_clickup_import_sessions
execute_sql "DROP POLICY IF EXISTS clickup_import_all ON mt_clickup_import_sessions" "Drop policy import"
execute_sql "CREATE POLICY clickup_import_all ON mt_clickup_import_sessions FOR ALL USING (EXISTS (SELECT 1 FROM mt_clickup_config c WHERE c.id = config_id AND (is_platform_admin() OR c.tenant_id = current_tenant_id())))" "Policy import all"

# mt_clickup_migration_log
execute_sql "DROP POLICY IF EXISTS clickup_log_all ON mt_clickup_migration_log" "Drop policy log"
execute_sql "CREATE POLICY clickup_log_all ON mt_clickup_migration_log FOR ALL USING (EXISTS (SELECT 1 FROM mt_clickup_config c WHERE c.id = config_id AND (is_platform_admin() OR c.tenant_id = current_tenant_id())))" "Policy log all"
echo ""

echo "=== PASSO 13: Criando funções auxiliares ==="
execute_sql "CREATE OR REPLACE FUNCTION normalize_phone(phone TEXT) RETURNS TEXT AS \$\$ DECLARE numbers TEXT; BEGIN numbers := regexp_replace(phone, '[^0-9]', '', 'g'); IF length(numbers) = 11 THEN RETURN '+55' || numbers; ELSIF length(numbers) = 13 AND numbers LIKE '55%' THEN RETURN '+' || numbers; ELSIF length(numbers) = 10 THEN RETURN '+55' || substring(numbers, 1, 2) || '9' || substring(numbers, 3); ELSE RETURN '+55' || numbers; END IF; END; \$\$ LANGUAGE plpgsql IMMUTABLE" "Função normalize_phone"

execute_sql "CREATE OR REPLACE FUNCTION unix_ms_to_timestamp(unix_ms BIGINT) RETURNS TIMESTAMPTZ AS \$\$ BEGIN IF unix_ms IS NULL OR unix_ms = 0 THEN RETURN NULL; END IF; RETURN to_timestamp(unix_ms / 1000.0); END; \$\$ LANGUAGE plpgsql IMMUTABLE" "Função unix_ms_to_timestamp"

execute_sql "CREATE OR REPLACE FUNCTION parse_br_date(date_str TEXT) RETURNS DATE AS \$\$ DECLARE parts TEXT[]; BEGIN IF date_str IS NULL OR date_str = '' THEN RETURN NULL; END IF; parts := string_to_array(date_str, '/'); IF array_length(parts, 1) = 3 THEN RETURN make_date(parts[3]::INTEGER, parts[2]::INTEGER, parts[1]::INTEGER); END IF; RETURN NULL; EXCEPTION WHEN OTHERS THEN RETURN NULL; END; \$\$ LANGUAGE plpgsql IMMUTABLE" "Função parse_br_date"
echo ""

echo "=== PASSO 14: Criando trigger updated_at ==="
execute_sql "CREATE OR REPLACE FUNCTION update_clickup_config_updated_at() RETURNS TRIGGER AS \$\$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; \$\$ LANGUAGE plpgsql" "Função trigger"
execute_sql "DROP TRIGGER IF EXISTS tr_clickup_config_updated_at ON mt_clickup_config" "Drop trigger existente"
execute_sql "CREATE TRIGGER tr_clickup_config_updated_at BEFORE UPDATE ON mt_clickup_config FOR EACH ROW EXECUTE FUNCTION update_clickup_config_updated_at()" "Criar trigger"
echo ""

echo "=== PASSO 15: Adicionando comentários ==="
execute_sql "COMMENT ON TABLE mt_clickup_config IS 'Configuração da integração ClickUp por tenant'" "Comentário config"
execute_sql "COMMENT ON TABLE mt_clickup_list_mapping IS 'Mapeamento de listas do ClickUp para usuários do sistema'" "Comentário list"
execute_sql "COMMENT ON TABLE mt_clickup_field_mapping IS 'Mapeamento de campos customizados do ClickUp para colunas do mt_leads'" "Comentário field"
execute_sql "COMMENT ON TABLE mt_clickup_value_mapping IS 'Mapeamento de valores de dropdowns e labels do ClickUp'" "Comentário value"
execute_sql "COMMENT ON TABLE mt_clickup_import_sessions IS 'Sessões de importação com controle de progresso'" "Comentário import"
execute_sql "COMMENT ON TABLE mt_clickup_migration_log IS 'Log de migração de tarefas do ClickUp para leads'" "Comentário log"
echo ""

echo "=== PASSO 16: Verificação final ==="
echo ""
echo "Contando tabelas criadas:"
response=$(curl -s -X POST "$SUPABASE_URL/pg/query" \
    -H "Content-Type: application/json" \
    -H "apikey: $SERVICE_KEY" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -d '{"query": "SELECT table_name FROM information_schema.tables WHERE table_schema = '\''public'\'' AND table_name LIKE '\''mt_clickup%'\'' ORDER BY table_name"}')

echo "$response" | grep -o '"table_name":"[^"]*"' | sed 's/"table_name":"//g' | sed 's/"//g' | while read table; do
    echo -e "  ${GREEN}✓${NC} $table"
done

echo ""
echo "============================================"
echo -e "  ${GREEN}Migration concluída com sucesso!${NC}"
echo "============================================"
echo ""
echo "Tabelas criadas:"
echo "  • mt_clickup_config"
echo "  • mt_clickup_list_mapping"
echo "  • mt_clickup_field_mapping"
echo "  • mt_clickup_value_mapping"
echo "  • mt_clickup_import_sessions"
echo "  • mt_clickup_migration_log"
echo ""
echo "Próximos passos:"
echo "  1. Implementar hooks React para o módulo"
echo "  2. Criar páginas de configuração"
echo "  3. Testar integração com API ClickUp"
echo ""
