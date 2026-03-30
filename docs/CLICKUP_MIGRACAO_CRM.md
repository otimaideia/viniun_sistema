# Módulo ClickUp Migração CRM

## Documentação Técnica para Integração

**Versão:** 1.0
**Data:** 03 de Fevereiro de 2026
**Módulo:** `clickup_migracao`

---

## 1. Visão Geral

Módulo para migração de leads do ClickUp para o sistema YESlaser Multi-Tenant (`mt_leads`).

### Funcionalidades

- ✅ Configuração da API Key do ClickUp
- ✅ Teste de conexão automático
- ✅ Listagem de Workspaces, Spaces e Listas
- ✅ Mapeamento visual de campos (drag & drop)
- ✅ Mapeamento de valores (dropdowns, status, unidades)
- ✅ Preview da migração antes de executar
- ✅ Migração em lotes com progresso
- ✅ Logs de migração e erros
- ✅ Deduplicação por telefone/email

---

## 2. API do ClickUp

### 2.1 Autenticação

```typescript
// Header de autenticação
Authorization: pk_XXXXXX_XXXXXXXXXXXXXXXXXXXXXXXXXX

// Base URL
const CLICKUP_API_BASE = 'https://api.clickup.com/api/v2';
```

### 2.2 Endpoints Utilizados

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/user` | GET | Validar API Key e obter usuário |
| `/team` | GET | Listar Workspaces |
| `/team/{team_id}/space` | GET | Listar Spaces do Workspace |
| `/space/{space_id}/list` | GET | Listar Listas do Space |
| `/list/{list_id}/field` | GET | Obter Custom Fields da Lista |
| `/list/{list_id}/task` | GET | Buscar Tarefas (leads) |
| `/task/{task_id}` | GET | Detalhes de uma Tarefa |

### 2.3 Paginação de Tarefas

```typescript
// Parâmetros de paginação
GET /list/{list_id}/task?page=0&subtasks=true

// Resposta
{
  "tasks": [...],      // Máximo 100 por página
  "last_page": false   // Se true, não há mais páginas
}
```

---

## 3. Estrutura do ClickUp (Central Yeslaser)

### 3.1 Hierarquia

```
Workspace: Central Yeslaser (ID: 9011833943)
└── Space: CRM YES LASER (ID: 90113087521)
    ├── List: CRM - NÍTILA (3.736 leads)
    ├── List: CRM - YASMIN (2.363 leads)
    ├── List: CRM - BRUNA KAUANY (1.816 leads)
    ├── List: CRM - CLAUDENICE (1.598 leads)
    ├── List: CRM - MARIA EDUARDA (1.591 leads)
    ├── List: CRM - ELIZABETH (1.170 leads)
    ├── List: CRM - HEVELYN (923 leads)
    ├── List: CRM - BRUNA MARIA (851 leads)
    ├── List: CRM - PAULA (314 leads)
    └── ... (outras listas)

Total estimado: ~14.362 leads
```

### 3.2 Status do Funil (13 etapas)

| # | Status ClickUp | Tipo | Cor |
|---|----------------|------|-----|
| 0 | novo lead | open | ⬜ |
| 1 | não responsivo | custom | 🟧 |
| 2 | acompanhamento | custom | 🟪 |
| 3 | agendado | custom | 🩵 |
| 4 | remarcação | custom | 🟨 |
| 5 | pós atendimento | custom | 💗 |
| 6 | negociação | custom | 🟦 |
| 7 | fechamento | custom | 🟩 |
| 8 | comparecimento | custom | 💚 |
| 9 | recuperação | custom | 🔴 |
| 10 | fechamento claudenice | custom | 💗 |
| 11 | fechamento bruna m | custom | 🟧 |
| 12 | concluído | closed | ✅ |

### 3.3 Custom Fields (40 campos)

#### Campos de Identificação

| ID | Nome | Tipo | Uso |
|----|------|------|-----|
| `1385a485-2822-4d2a-b5a1-2cd6ebc475ad` | ⏩ Nome | short_text | Nome do cliente |
| `c2a89504-e0eb-408c-be8f-41b412c4d8fe` | Data Nascimento | short_text | DD/MM/YYYY |
| `16babec5-729b-4220-b488-afd0f5e9cf68` | Sexo | drop_down | HOMEM(0), MULHER(1) |

#### Campos de Localização

| ID | Nome | Tipo | Opções |
|----|------|------|--------|
| `d2945de9-d05f-4dce-b8f1-6616b5a2ec17` | Unidade | labels | 29 unidades (ver mapeamento) |
| `6438c11a-c7d4-4cf9-aa90-0fbe7b3ea953` | Marca | labels | POP DENTS, YES LASER |

#### Campos de Origem/Marketing

| ID | Nome | Tipo | Opções |
|----|------|------|--------|
| `f7e58548-6939-46e6-ada3-38667a1c158b` | Fonte | drop_down | 13 opções |
| `45d2240f-40cb-4119-976e-216a4fc5d61b` | Campanha | drop_down | 6 opções |
| `6c84548a-41a8-4c6e-b5c5-d7e77252f8c3` | Canal | drop_down | 9 opções |
| `4aaa6541-4606-4f8f-952e-dc1737583474` | ⚠ Ação | drop_down | 6 opções |

#### Campos de Interesse

| ID | Nome | Tipo | Opções |
|----|------|------|--------|
| `03270ea1-fef6-4d35-896e-63993ae797b0` | ℹ️ Interesse YES | drop_down | 9 serviços |

#### Campos de Agendamento

| ID | Nome | Tipo |
|----|------|------|
| `b9645cb1-3e31-4f71-ae99-bbd4bc397467` | Data agendamento | date |
| `c2ddbfc6-d2e2-4243-9814-1bb4bd5a5bd8` | Data remarcação | date |
| `b5203d15-c238-41b2-b5c9-0e9995806408` | Confirmação lembrete | date |
| `170d266d-3618-41ef-bd65-73789dfa0aad` | Data negociação | date |

#### Campos de Confirmação (checkbox)

| ID | Nome |
|----|------|
| `60a29eda-cc0e-4fb1-8432-1c54c79bc8d3` | ✅ Confirmação antecipada |
| `22267d29-9476-49b2-b91f-cdf353a03b3b` | ✅ Confirmado 1 dia antes |
| `474150ec-dbd4-4537-8c5e-d1e4db508f7d` | ✅ Confirmado no dia |
| `607c5fab-11bc-407c-a72f-f44e2f54a3a3` | Remarcou |
| `abfa1eb4-4c1f-4950-af11-ca726532d55b` | ❌ Não remarcou |
| `a1fa6037-ea76-47d9-9358-93ea633bfc1b` | ⛔ Esperando retorno |

#### Campos Financeiros (currency BRL)

| ID | Nome |
|----|------|
| `0375cf95-4712-4290-b9a1-736d141684db` | Venda |
| `c1e01569-b7bd-4860-9264-931a95d37772` | Venda (duplicado) |
| `2e272efa-50d8-4e07-8879-39139c2cd5a5` | Sdr Venda |
| `7a401dba-1b2f-47a9-9d32-6823cbd78a38` | Pós/auditoria |
| `5b1687fd-ad16-48d3-842e-7b6d7e39a158` | Em aberto |
| `9af19062-6a00-48e5-91a9-e3b5b0bcf2b5` | Recorrência |

#### Outros Campos

| ID | Nome | Tipo |
|----|------|------|
| `2e527f43-4aa8-477d-9cf5-264ad6c45cc0` | 👍 Guia enviada | checkbox |
| `354ff5a2-11cb-4e4d-bf84-25d1ae7ffd5a` | Ligação realizada | checkbox |
| `b49f8e3f-ff08-4527-8744-2e7778111542` | Pós-atendimento | checkbox |
| `cac4fa48-fe37-4b8a-adb8-512f1e3368ba` | 👁️ Visto | checkbox |
| `18d696f2-345d-4302-bb06-41503534b649` | NPS pesquisa | emoji (⭐ 1-5) |
| `d73a68f7-5085-428b-becc-9139203d48bf` | Etiqueta | drop_down |
| `9b5ff905-5bf2-4449-93e1-17238bdf90d7` | Agente | short_text |
| `6da73d96-d6c8-49b8-b2b6-f9d59e0e7868` | SDR treinamento | short_text |
| `d4bf7064-ef31-41dd-8ed9-0fd974c1cccf` | Sistema | short_text |
| `2e6e0ff4-e03c-4532-8763-1f729ad34e04` | Copy usado disparo | text |
| `d997019d-86dd-49f8-ab80-c6e9cb133c56` | Data último disparo | date |

---

## 4. Mapeamento de Campos

### 4.1 Campos Diretos (Task → mt_leads)

| Campo ClickUp | Tipo | Campo mt_leads | Transformação |
|---------------|------|----------------|---------------|
| `task.name` | string | `telefone` | Limpar formatação |
| `task.id` | string | `codigo` | Prefixo "CU-" |
| `task.status.status` | string | `etapa_funil` | Mapeamento de status |
| `task.date_created` | timestamp | `created_at` | Unix ms → ISO |
| `task.date_updated` | timestamp | `updated_at` | Unix ms → ISO |
| `task.due_date` | timestamp | `proximo_contato` | Unix ms → ISO |
| `task.assignees[0].username` | string | `observacoes` | "SDR: {nome}" |
| `task.description` | string | `observacoes` | Concatenar |

### 4.2 Custom Fields → mt_leads

| Custom Field | ID | Campo mt_leads | Transformação |
|--------------|----|--------------|--------------|
| ⏩ Nome | `1385a485...` | `nome` | Direto |
| Data Nascimento | `c2a89504...` | `data_nascimento` | DD/MM/YYYY → Date |
| Sexo | `16babec5...` | `genero` | 0=masculino, 1=feminino |
| Unidade | `d2945de9...` | `franchise_id` | Mapeamento UUID |
| Marca | `6438c11a...` | `tenant_id` | yeslaser ou popdents |
| Fonte | `f7e58548...` | `origem` | Mapeamento texto |
| Campanha | `45d2240f...` | `campanha` | Mapeamento texto |
| Canal | `6c84548a...` | `utm_medium` | Mapeamento texto |
| ⚠ Ação | `4aaa6541...` | `tags[]` | Array |
| ℹ️ Interesse YES | `03270ea1...` | `servico_interesse` | Mapeamento texto |
| Data agendamento | `b9645cb1...` | `data_agendamento` | Unix ms → ISO |
| ✅ Confirmado 1 dia antes | `22267d29...` | `confirmado` | Boolean |
| ✅ Confirmado no dia | `474150ec...` | `confirmado` | Boolean (OR) |
| Venda | `0375cf95...` | `valor_conversao` | Decimal |
| Sdr Venda | `2e272efa...` | `valor_estimado` | Decimal |
| NPS pesquisa | `18d696f2...` | `score_manual` | 1-5 → 20-100 |
| Etiqueta | `d73a68f7...` | `tags[]` | Array |

### 4.3 Mapeamento de Status → etapa_funil

| Status ClickUp | etapa_funil mt_leads | status mt_leads |
|----------------|----------------------|-----------------|
| novo lead | novo | ativo |
| não responsivo | nao_responsivo | ativo |
| acompanhamento | acompanhamento | ativo |
| agendado | agendado | ativo |
| remarcação | remarcacao | ativo |
| pós atendimento | pos_atendimento | ativo |
| negociação | negociacao | ativo |
| fechamento | fechamento | ativo |
| comparecimento | compareceu | ativo |
| recuperação | recuperacao | ativo |
| fechamento claudenice | fechamento | ativo |
| fechamento bruna m | fechamento | ativo |
| concluído | convertido | convertido |

### 4.4 Mapeamento de Unidades → franchise_id

| Unidade ClickUp | ID ClickUp | franchise_id (mt_franchises) |
|-----------------|------------|------------------------------|
| ALTAMIRA - PA | `ac4011ca...` | `84432049-6788-4346-ab49-60c4ecd7c638` |
| BATURITÉ | `a388f71c...` | *A criar* |
| CANINDÉ | `e01628d4...` | `4aef2f24-2a98-41df-b43b-c7791c247dc2` |
| CASTANHAL-PA | `61650a21...` | `223c1c86-10c8-4860-a08c-3982fc63d600` |
| CASTANHEIRA - PA | `da0634b6...` | `5feaf5c9-ac7e-4060-946c-822c3a358a26` |
| CENTRO BARÂO | `1115c933...` | `8949a8aa-27c5-4837-bb76-0f81dde1e525` |
| CRATEÚS | `b4db327e...` | `dd0a4e22-b3a5-4c7e-afba-df9ae30c29a6` |
| CRATO | `146dfc38...` | `7938af5c-7687-48c0-a09c-2fd1aa2507cc` |
| DOM LUÍS | `a0fff512...` | `76e119b5-e371-4ebf-958f-33d38cae8f04` |
| ENTRONCAMENTO - PA | `d63bd713...` | `2aeba4f7-8fd5-444e-b3ab-b95564ab946a` |
| GENERAL - CENTRO | `04e99097...` | `3e851a99-895f-4bdf-a679-1d86d3101e8b` |
| GUAMA - PA | `2f268ab8...` | `6cd8762d-b9f4-4e29-868c-556542fbe461` |
| ITAITUBA - PA | `8be25cc6...` | `1f127f91-dd7f-4cd7-886a-ce7f783a2c51` |
| ITAPIPOCA | `94c24663...` | `4862b7ec-2538-437e-8f87-7e8c76df39d6` |
| JOQUEI | `30fb1ea6...` | `dde24f58-d72d-494d-a709-c533b530113a` |
| JUREMA | `447a6da6...` | `aa7c0060-164c-4ec6-b077-6547669c1a34` |
| MAJOR FACUNDO | `525b85f9...` | `71e021cd-7756-4201-afae-f0c526bd2d7a` |
| MARACANAÚ SHOPPING | `88f3f339...` | `7d208c8b-50f0-461c-8689-93d4d42ea0c2` |
| MARITUBA | `e9002fe7...` | *A criar* |
| MESSEJANA | `06a42a3e...` | `fc2be420-5eaa-4d14-8b6a-1bf454ba8da0` |
| PARANGABA | `9af7449f...` | `9fd265e3-33bd-4ebc-9e61-cbf732ca1807` |
| PARQUE SHOPPING - PA | `292fba11...` | `baf5dcde-61ec-4e29-900a-f9d462a1bcc5` |
| PÁTIO BELÉM - PA | `d664f22e...` | `e2a6ea54-a462-469c-8c79-37d7fd6e95e5` |
| RIO MAR KENNEDY | `440286d1...` | `34166bde-8bc7-4575-ace5-9ad978b5403e` |
| TAUÁ | `eac7cd08...` | *A criar* |
| VER O PESO - PA | `948763ee...` | `b5d4afae-9e5d-4ed3-a6d8-3c99c8c1a425` |
| METROPOLE - PA | `ab348338...` | `6965fb3e-5dab-48c4-ac3c-a39ff7fe33fb` |
| FLORIANÓPOLIS | `7a4c6a1b...` | `50dbfc11-dc94-476e-bc05-fb5910cf428a` |
| TERESINA | `ca827080...` | *A criar* |

### 4.5 Mapeamento de Fonte → origem

| Fonte ClickUp | orderindex | origem mt_leads |
|---------------|------------|-----------------|
| AUDITORIA | 0 | auditoria |
| FACEBOOK | 1 | facebook |
| ORGANICO INSTAGRAM | 2 | instagram_organico |
| PATROCINADO | 3 | instagram_ads |
| INDICAÇÃO | 4 | indicacao |
| DISPARO | 5 | disparo_whatsapp |
| SAC | 6 | sac |
| AÇÃO EXTERNA | 7 | acao_externa |
| PATROCINADO REATIVADO | 8 | remarketing |
| PATROCINADO PAGO | 9 | meta_ads |
| EMBAIXADORA | 10 | influenciador |
| BAZAR MILEIDE | 11 | evento |
| LINK DA BIO | 12 | link_bio |

### 4.6 Mapeamento de Canal → utm_medium

| Canal ClickUp | utm_medium |
|---------------|------------|
| SMS | sms |
| WHATSAPP | whatsapp |
| DIRECT | instagram_direct |
| MESSENGER | messenger |
| CHAT GOOGLE | google_chat |
| TELEFONE | telefone |
| COMENTÁRIOS | comentarios |
| SITE | site |
| TV | tv |

### 4.7 Mapeamento de Interesse → servico_interesse

| Interesse ClickUp | servico_interesse |
|-------------------|-------------------|
| GERAL | Geral |
| BOTOX | Botox |
| LASER | Depilação a Laser |
| CRIOLIPÓLISE | Criolipólise |
| MASSAGEM RELAXANTE | Massagem Relaxante |
| MASSAGEM MODELADORA | Massagem Modeladora |
| CORRENTE RUSSA | Corrente Russa |
| RÁDIO FREQUÊNCIA | Radiofrequência |
| ULTRASSOM | Ultrassom |

### 4.8 Mapeamento de Campanha → campanha

| Campanha ClickUp | campanha mt_leads |
|------------------|-------------------|
| POP CARD | POP CARD |
| SITE | Site Institucional |
| INSTA BRASIL | Instagram Brasil |
| POP SMART | POP SMART |
| YES CARD | YES CARD |
| DIA D - IMPLANTE | Dia D Implante |

---

## 5. Estrutura do Módulo

### 5.1 Tabelas de Banco de Dados

```sql
-- Configurações da integração por tenant
CREATE TABLE mt_clickup_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES mt_tenants(id),
  api_key VARCHAR(255) NOT NULL, -- Criptografado
  workspace_id VARCHAR(50),
  workspace_name VARCHAR(255),
  space_id VARCHAR(50),
  space_name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id)
);

-- Mapeamento de listas (cada lista = um SDR)
CREATE TABLE mt_clickup_list_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES mt_clickup_config(id) ON DELETE CASCADE,
  clickup_list_id VARCHAR(50) NOT NULL,
  clickup_list_name VARCHAR(255),
  assigned_user_id UUID REFERENCES mt_users(id), -- SDR no sistema
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  total_tasks INTEGER DEFAULT 0,
  synced_tasks INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(config_id, clickup_list_id)
);

-- Mapeamento de campos customizados
CREATE TABLE mt_clickup_field_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES mt_clickup_config(id) ON DELETE CASCADE,
  clickup_field_id VARCHAR(100) NOT NULL,
  clickup_field_name VARCHAR(255),
  clickup_field_type VARCHAR(50),
  mt_leads_column VARCHAR(100) NOT NULL,
  transformation VARCHAR(50), -- direct, date, dropdown, currency, boolean
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(config_id, clickup_field_id)
);

-- Mapeamento de valores (para dropdowns e labels)
CREATE TABLE mt_clickup_value_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_mapping_id UUID NOT NULL REFERENCES mt_clickup_field_mapping(id) ON DELETE CASCADE,
  clickup_value VARCHAR(255) NOT NULL, -- ID ou orderindex
  clickup_label VARCHAR(255),
  mt_value VARCHAR(255) NOT NULL, -- Valor no sistema
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(field_mapping_id, clickup_value)
);

-- Log de migração
CREATE TABLE mt_clickup_migration_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES mt_clickup_config(id),
  clickup_task_id VARCHAR(50) NOT NULL,
  lead_id UUID REFERENCES mt_leads(id),
  status VARCHAR(20) NOT NULL, -- pending, success, error, skipped
  error_message TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(config_id, clickup_task_id)
);

-- Índices
CREATE INDEX idx_clickup_config_tenant ON mt_clickup_config(tenant_id);
CREATE INDEX idx_clickup_log_status ON mt_clickup_migration_log(status);
CREATE INDEX idx_clickup_log_task ON mt_clickup_migration_log(clickup_task_id);
```

### 5.2 Políticas RLS

```sql
-- Habilitar RLS
ALTER TABLE mt_clickup_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_clickup_list_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_clickup_field_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_clickup_value_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt_clickup_migration_log ENABLE ROW LEVEL SECURITY;

-- Policies para mt_clickup_config
CREATE POLICY "clickup_config_select" ON mt_clickup_config FOR SELECT
USING (is_platform_admin() OR tenant_id = current_tenant_id());

CREATE POLICY "clickup_config_insert" ON mt_clickup_config FOR INSERT
WITH CHECK (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

CREATE POLICY "clickup_config_update" ON mt_clickup_config FOR UPDATE
USING (is_platform_admin() OR (is_tenant_admin() AND tenant_id = current_tenant_id()));

-- Policies para tabelas relacionadas (via config_id)
CREATE POLICY "clickup_list_mapping_all" ON mt_clickup_list_mapping FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM mt_clickup_config c
    WHERE c.id = config_id
    AND (is_platform_admin() OR c.tenant_id = current_tenant_id())
  )
);

CREATE POLICY "clickup_field_mapping_all" ON mt_clickup_field_mapping FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM mt_clickup_config c
    WHERE c.id = config_id
    AND (is_platform_admin() OR c.tenant_id = current_tenant_id())
  )
);

CREATE POLICY "clickup_value_mapping_all" ON mt_clickup_value_mapping FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM mt_clickup_field_mapping fm
    JOIN mt_clickup_config c ON c.id = fm.config_id
    WHERE fm.id = field_mapping_id
    AND (is_platform_admin() OR c.tenant_id = current_tenant_id())
  )
);

CREATE POLICY "clickup_log_all" ON mt_clickup_migration_log FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM mt_clickup_config c
    WHERE c.id = config_id
    AND (is_platform_admin() OR c.tenant_id = current_tenant_id())
  )
);
```

### 5.3 Registrar Módulo

```sql
-- Inserir módulo
INSERT INTO mt_modules (codigo, nome, descricao, icone, categoria, ordem, is_core, is_active)
VALUES (
  'clickup_migracao',
  'ClickUp Migração CRM',
  'Migração de leads do ClickUp para o sistema',
  'ArrowRightLeft',
  'sistema',
  99,
  false,
  true
)
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao;

-- Habilitar para tenant yeslaser
INSERT INTO mt_tenant_modules (tenant_id, module_id, is_active)
SELECT t.id, m.id, true
FROM mt_tenants t
CROSS JOIN mt_modules m
WHERE m.codigo = 'clickup_migracao'
AND t.slug = 'yeslaser'
AND NOT EXISTS (
  SELECT 1 FROM mt_tenant_modules tm
  WHERE tm.tenant_id = t.id AND tm.module_id = m.id
);
```

---

## 6. Arquivos do Frontend

### 6.1 Estrutura de Pastas

```
src/
├── pages/
│   └── integracoes/
│       ├── ClickUpMigracao.tsx         # Página principal
│       ├── ClickUpConfig.tsx           # Configuração da API
│       ├── ClickUpFieldMapping.tsx     # Mapeamento de campos
│       └── ClickUpMigrationLog.tsx     # Log de migração
├── hooks/
│   └── useClickUpMigracao.ts           # Hook principal
├── services/
│   └── clickup-api.ts                  # Cliente da API
├── types/
│   └── clickup.ts                      # Tipos TypeScript
└── components/
    └── clickup/
        ├── WorkspaceSelector.tsx       # Seletor de workspace
        ├── SpaceSelector.tsx           # Seletor de space
        ├── ListSelector.tsx            # Seletor de listas
        ├── FieldMappingTable.tsx       # Tabela de mapeamento
        ├── ValueMappingModal.tsx       # Modal para valores
        ├── MigrationProgress.tsx       # Progresso da migração
        └── MigrationPreview.tsx        # Preview antes de migrar
```

### 6.2 Rotas

```tsx
// App.tsx
<Route path="/integracoes/clickup" element={<ClickUpMigracao />} />
<Route path="/integracoes/clickup/config" element={<ClickUpConfig />} />
<Route path="/integracoes/clickup/mapeamento" element={<ClickUpFieldMapping />} />
<Route path="/integracoes/clickup/logs" element={<ClickUpMigrationLog />} />
```

---

## 7. Fluxo de Migração

### 7.1 Etapas

```
1. CONFIGURAÇÃO
   ├── Inserir API Key
   ├── Testar conexão
   ├── Selecionar Workspace
   ├── Selecionar Space
   └── Selecionar Listas

2. MAPEAMENTO DE CAMPOS
   ├── Carregar Custom Fields do ClickUp
   ├── Mapear para colunas do mt_leads
   ├── Configurar transformações
   └── Mapear valores de dropdowns

3. PREVIEW
   ├── Buscar amostra de tarefas
   ├── Aplicar transformações
   ├── Mostrar resultado esperado
   └── Validar mapeamento

4. MIGRAÇÃO
   ├── Processar em lotes (100 por vez)
   ├── Verificar duplicatas (telefone/email)
   ├── Inserir/atualizar leads
   ├── Registrar logs
   └── Exibir progresso

5. VERIFICAÇÃO
   ├── Relatório de migração
   ├── Leads criados/atualizados
   ├── Erros encontrados
   └── Leads pulados (duplicatas)
```

### 7.2 Algoritmo de Migração

```typescript
async function migrateTasks(listId: string, config: ClickUpConfig) {
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    // Buscar tarefas
    const { tasks, last_page } = await fetchTasks(listId, page);
    hasMore = !last_page;
    page++;

    for (const task of tasks) {
      try {
        // Verificar se já migrado
        const existing = await checkExisting(config.id, task.id);
        if (existing?.status === 'success') continue;

        // Transformar dados
        const leadData = transformTask(task, config.fieldMappings);

        // Verificar duplicata por telefone
        const duplicate = await findByPhone(leadData.telefone);
        if (duplicate) {
          await logMigration(task.id, null, 'skipped', 'Duplicado');
          continue;
        }

        // Inserir lead
        const lead = await insertLead(leadData);
        await logMigration(task.id, lead.id, 'success');

      } catch (error) {
        await logMigration(task.id, null, 'error', error.message);
      }
    }
  }
}
```

---

## 8. Interface do Usuário

### 8.1 Tela de Configuração

```
┌─────────────────────────────────────────────────────────────┐
│  ClickUp Migração CRM                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔑 API Key                                                 │
│  ┌─────────────────────────────────────────┐ ┌───────────┐ │
│  │ pk_150602966_AFGR20RHKTW4P4WD...       │ │ Testar   │ │
│  └─────────────────────────────────────────┘ └───────────┘ │
│                                                             │
│  ✅ Conectado como: Supervisora Yeslaser                    │
│                                                             │
│  📁 Workspace                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Central Yeslaser                              ▼     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  📂 Space                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ CRM YES LASER                                 ▼     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  📋 Listas para Migrar                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ☑ CRM - NÍTILA (3.736)                              │   │
│  │ ☑ CRM - YASMIN (2.363)                              │   │
│  │ ☑ CRM - BRUNA KAUANY (1.816)                        │   │
│  │ ☑ CRM - CLAUDENICE (1.598)                          │   │
│  │ ☐ CRM - DUPLICAR (0)                                │   │
│  │ ...                                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌───────────────┐                                          │
│  │ Salvar Config │                                          │
│  └───────────────┘                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Tela de Mapeamento

```
┌─────────────────────────────────────────────────────────────┐
│  Mapeamento de Campos                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Campo ClickUp          │ Tipo      │ Campo Sistema │ Ação  │
│  ───────────────────────┼───────────┼───────────────┼────── │
│  task.name (telefone)   │ text      │ telefone      │ ✏️    │
│  ⏩ Nome                │ text      │ nome          │ ✏️    │
│  Data Nascimento        │ text      │ data_nascim...│ ✏️    │
│  Sexo                   │ dropdown  │ genero        │ 🔗    │
│  Unidade                │ labels    │ franchise_id  │ 🔗    │
│  Fonte                  │ dropdown  │ origem        │ 🔗    │
│  Campanha               │ dropdown  │ campanha      │ 🔗    │
│  Canal                  │ dropdown  │ utm_medium    │ 🔗    │
│  ℹ️ Interesse YES       │ dropdown  │ servico_int...│ 🔗    │
│  Data agendamento       │ date      │ data_agenda...│ ✏️    │
│  Venda                  │ currency  │ valor_conve...│ ✏️    │
│  status                 │ status    │ etapa_funil   │ 🔗    │
│                                                             │
│  🔗 = Clique para mapear valores                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8.3 Modal de Mapeamento de Valores

```
┌─────────────────────────────────────────────────────────────┐
│  Mapear Valores: Unidade → franchise_id              ✕     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Valor ClickUp              │ Valor Sistema                 │
│  ───────────────────────────┼─────────────────────────────  │
│  ALTAMIRA - PA              │ YESlaser Altamira       ▼     │
│  CANINDÉ                    │ YESlaser Canindé        ▼     │
│  CASTANHAL-PA               │ YESlaser Castanhal      ▼     │
│  PARANGABA                  │ YESlaser Shopping Para..▼     │
│  ...                        │                               │
│                                                             │
│  ┌──────────────────┐                                       │
│  │ Salvar Mapeamento│                                       │
│  └──────────────────┘                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8.4 Tela de Migração

```
┌─────────────────────────────────────────────────────────────┐
│  Executar Migração                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 Resumo                                                  │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Total de leads no ClickUp: 14.362                     │ │
│  │ Listas selecionadas: 9                                │ │
│  │ Campos mapeados: 15                                   │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  🔄 Progresso                                               │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ ████████████████████░░░░░░░░░░░░░░  45%              │ │
│  │ 6.463 / 14.362 leads processados                      │ │
│  │                                                       │ │
│  │ ✅ Criados: 5.892                                     │ │
│  │ 🔄 Atualizados: 312                                   │ │
│  │ ⏭️ Pulados (duplicatas): 259                          │ │
│  │ ❌ Erros: 0                                           │ │
│  │                                                       │ │
│  │ Lista atual: CRM - YASMIN (página 12/24)              │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─────────────┐ ┌────────────┐                            │
│  │ ⏸️ Pausar   │ │ ❌ Cancelar │                            │
│  └─────────────┘ └────────────┘                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Considerações Técnicas

### 9.1 Rate Limiting

A API do ClickUp tem limite de **100 requisições por minuto**. Implementar:

```typescript
// Rate limiter
const rateLimiter = new RateLimiter({
  tokensPerInterval: 100,
  interval: 'minute'
});

async function fetchWithRateLimit(url: string) {
  await rateLimiter.removeTokens(1);
  return fetch(url, { headers: { Authorization: apiKey } });
}
```

### 9.2 Tratamento de Telefone

```typescript
function normalizePhone(phone: string): string {
  // Remove tudo exceto números
  const numbers = phone.replace(/\D/g, '');

  // Adiciona código do país se necessário
  if (numbers.length === 11) {
    return `+55${numbers}`;
  } else if (numbers.length === 13 && numbers.startsWith('55')) {
    return `+${numbers}`;
  }

  return `+55${numbers}`;
}
```

### 9.3 Tratamento de Data

```typescript
function parseClickUpDate(value: string | number): Date | null {
  // Se for timestamp Unix (milissegundos)
  if (typeof value === 'number' || /^\d{13}$/.test(value)) {
    return new Date(Number(value));
  }

  // Se for DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [day, month, year] = value.split('/');
    return new Date(`${year}-${month}-${day}`);
  }

  return null;
}
```

### 9.4 Deduplicação

```typescript
async function findDuplicate(telefone: string, email?: string): Promise<Lead | null> {
  const normalizedPhone = normalizePhone(telefone);

  const { data } = await supabase
    .from('mt_leads')
    .select('id, nome, telefone')
    .or(`telefone.eq.${normalizedPhone},whatsapp.eq.${normalizedPhone}`)
    .limit(1);

  return data?.[0] || null;
}
```

---

## 10. Checklist de Implementação

### Fase 1: Banco de Dados
- [ ] Criar tabelas `mt_clickup_*`
- [ ] Aplicar políticas RLS
- [ ] Registrar módulo
- [ ] Criar índices

### Fase 2: Backend/Hooks
- [ ] `useClickUpConfig` - Configuração
- [ ] `useClickUpWorkspaces` - Listar workspaces
- [ ] `useClickUpSpaces` - Listar spaces
- [ ] `useClickUpLists` - Listar listas
- [ ] `useClickUpFields` - Listar campos
- [ ] `useClickUpTasks` - Buscar tarefas
- [ ] `useClickUpFieldMapping` - CRUD mapeamento
- [ ] `useClickUpMigration` - Executar migração

### Fase 3: Frontend
- [ ] Página de configuração
- [ ] Seletores (workspace, space, listas)
- [ ] Tabela de mapeamento de campos
- [ ] Modal de mapeamento de valores
- [ ] Preview de migração
- [ ] Tela de execução com progresso
- [ ] Logs de migração

### Fase 4: Testes
- [ ] Testar conexão com API
- [ ] Testar transformações
- [ ] Testar deduplicação
- [ ] Testar migração em lotes
- [ ] Testar rollback em caso de erro

---

## 11. Dados de Teste

### API Key

```
pk_150602966_AFGR20RHKTW4P4WDLVV5XRUFF97D76DT
```

### IDs Importantes

| Recurso | ID |
|---------|-----|
| Workspace | `9011833943` |
| Space CRM | `90113087521` |
| Lista Hevelyn | `901111603945` |
| Lista Nítila | `901108180969` |

### Exemplo de Tarefa

```json
{
  "id": "868hbu0dh",
  "name": "(85) 99616-4602",
  "status": { "status": "recuperação" },
  "custom_fields": [
    { "name": "⏩ Nome", "value": "Maria saionara Santana de Oliveira" },
    { "name": "Unidade", "value": ["9af7449f-f6f4-4eb8-9590-9f563926aa4f"] },
    { "name": "Fonte", "value": 4 },
    { "name": "Venda", "value": "1796" }
  ]
}
```

---

*Documentação criada em 03/02/2026 para o módulo ClickUp Migração CRM do sistema YESlaser Multi-Tenant.*
