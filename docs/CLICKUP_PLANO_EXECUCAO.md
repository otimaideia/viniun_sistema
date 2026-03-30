# ClickUp Migration - Plano de Execução

**Data de Criação**: 03 de Fevereiro de 2026
**Status**: Pendente de Execução

---

## 📋 Resumo

Este documento contém o plano completo para executar a migration do módulo ClickUp Migração CRM no banco de dados.

---

## 🗂️ Arquivos Relacionados

| Arquivo | Descrição |
|---------|-----------|
| `supabase/migrations/20260203_001_mt_clickup_migracao.sql` | SQL completo da migration |
| `scripts/run_clickup_migration.sh` | Script de execução automática |
| `src/types/clickup.ts` | Tipos TypeScript |
| `docs/CLICKUP_MIGRACAO_CRM.md` | Documentação migração manual YESlaser |
| `docs/CLICKUP_INTEGRACAO.md` | Documentação módulo dinâmico |

---

## 🔧 Opção 1: Executar via Script (Recomendado)

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/sites/yeslaserpainel
./scripts/run_clickup_migration.sh
```

O script executa cada passo com verificação e feedback visual.

---

## 🔧 Opção 2: Executar SQL Manualmente

### Passo 1: Verificar Conexão

```bash
SERVICE_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MzA2MTM2MCwiZXhwIjo0OTE4NzM0OTYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.xKjCIHG1qqMkTOgjI_rl9UuAmoCoq-cOAErjcEgRp9s"

curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"query": "SELECT 1 as test"}'
```

### Passo 2: Registrar Módulo

```bash
curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"query": "INSERT INTO mt_modules (codigo, nome, descricao, icone, categoria, ordem, is_core, is_active) VALUES ('\''clickup_migracao'\'', '\''ClickUp Migração CRM'\'', '\''Migração de leads do ClickUp para o sistema'\'', '\''ArrowRightLeft'\'', '\''sistema'\'', 99, false, true) ON CONFLICT (codigo) DO UPDATE SET nome = EXCLUDED.nome"}'
```

### Passo 3: Habilitar para YESlaser

```bash
curl -s -X POST "https://supabase.yeslaser.com.br/pg/query" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{"query": "INSERT INTO mt_tenant_modules (tenant_id, module_id, is_active) SELECT t.id, m.id, true FROM mt_tenants t CROSS JOIN mt_modules m WHERE m.codigo = '\''clickup_migracao'\'' AND t.slug = '\''yeslaser'\'' AND NOT EXISTS (SELECT 1 FROM mt_tenant_modules tm WHERE tm.tenant_id = t.id AND tm.module_id = m.id)"}'
```

### Passo 4-10: Criar Tabelas

Ver arquivo `scripts/run_clickup_migration.sh` para os comandos completos de cada tabela.

---

## 📊 Tabelas a Serem Criadas

| Tabela | Registros Esperados | Descrição |
|--------|---------------------|-----------|
| `mt_clickup_config` | 1 por tenant | Configuração da integração |
| `mt_clickup_list_mapping` | ~13 (YESlaser) | Mapeamento de listas |
| `mt_clickup_field_mapping` | ~20-30 por config | Mapeamento de campos |
| `mt_clickup_value_mapping` | ~50-100 por config | Mapeamento de valores |
| `mt_clickup_import_sessions` | 1+ por importação | Sessões de importação |
| `mt_clickup_migration_log` | ~14.362 (YESlaser) | Log de migração |

---

## 🔐 Políticas RLS

Todas as tabelas terão RLS habilitado com as seguintes regras:

- **Platform Admin**: Acesso total a todos os registros
- **Tenant Admin**: Acesso apenas aos registros do seu tenant
- **Usuário comum**: Sem acesso direto (via tenant admin)

---

## ⚙️ Funções Auxiliares

| Função | Descrição |
|--------|-----------|
| `normalize_phone(TEXT)` | Normaliza telefone para +55XXXXXXXXXXX |
| `unix_ms_to_timestamp(BIGINT)` | Converte Unix timestamp (ms) para TIMESTAMPTZ |
| `parse_br_date(TEXT)` | Converte DD/MM/YYYY para DATE |

---

## ✅ Checklist de Verificação Pós-Execução

- [ ] Módulo `clickup_migracao` registrado em `mt_modules`
- [ ] Módulo habilitado para tenant `yeslaser` em `mt_tenant_modules`
- [ ] Tabela `mt_clickup_config` criada com RLS
- [ ] Tabela `mt_clickup_list_mapping` criada com RLS
- [ ] Tabela `mt_clickup_field_mapping` criada com RLS
- [ ] Tabela `mt_clickup_value_mapping` criada com RLS
- [ ] Tabela `mt_clickup_import_sessions` criada com RLS
- [ ] Tabela `mt_clickup_migration_log` criada com RLS
- [ ] Função `normalize_phone` criada
- [ ] Função `unix_ms_to_timestamp` criada
- [ ] Função `parse_br_date` criada
- [ ] Trigger `tr_clickup_config_updated_at` criado

---

## 🔍 Queries de Verificação

### Verificar tabelas criadas

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'mt_clickup%'
ORDER BY table_name;
```

### Verificar módulo registrado

```sql
SELECT codigo, nome, is_active
FROM mt_modules
WHERE codigo = 'clickup_migracao';
```

### Verificar módulo habilitado para YESlaser

```sql
SELECT t.slug, m.codigo, tm.is_active
FROM mt_tenant_modules tm
JOIN mt_tenants t ON t.id = tm.tenant_id
JOIN mt_modules m ON m.id = tm.module_id
WHERE m.codigo = 'clickup_migracao';
```

### Verificar funções criadas

```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('normalize_phone', 'unix_ms_to_timestamp', 'parse_br_date');
```

---

## 🚀 Próximos Passos (Após Migration)

1. **Implementar hooks React**
   - `useClickUpConfig` - CRUD configuração
   - `useClickUpLists` - Buscar listas do ClickUp
   - `useClickUpFields` - Detectar campos
   - `useClickUpMapping` - CRUD mapeamentos
   - `useClickUpImport` - Controle de importação

2. **Criar páginas do módulo**
   - `/configuracoes/clickup` - Página de configuração
   - `/configuracoes/clickup/conectar` - Wizard de conexão
   - `/configuracoes/clickup/mapear` - Interface de mapeamento
   - `/configuracoes/clickup/importar` - Controle de importação

3. **Testar integração**
   - Conectar com API ClickUp usando a API Key
   - Buscar workspaces, spaces, lists
   - Detectar campos customizados
   - Fazer importação de teste

---

## 📝 Notas

- A migration usa `CREATE TABLE IF NOT EXISTS`, então pode ser executada múltiplas vezes sem problemas
- As políticas RLS são recriadas (DROP + CREATE) para garantir atualização
- O módulo fica desabilitado para outros tenants por padrão (habilitar via `mt_tenant_modules`)

---

## 📞 Dados de Teste (YESlaser)

- **API Key**: `pk_150602966_AFGR20RHKTW4P4WDLVV5XRUFF97D76DT`
- **Workspace**: Central Yeslaser (ID: 9018243838)
- **Space**: CRM YES LASER (ID: 90183376648)
- **Total de Tasks**: ~14.362 leads
- **Listas**: 13 (SDRs)

---

**Última atualização**: 03/02/2026
