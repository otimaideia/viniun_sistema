# PLANO DE MIGRAÇÃO MULTI-TENANT

**Data:** 01/02/2026
**Status:** Pré-aprovação

---

## 1. SITUAÇÃO ATUAL

### Descoberta Importante
O banco de dados **já possui separação parcial** entre YESlaser e PopDents!

```
ESTRUTURA ATUAL:
├── yeslaser_* (67 tabelas) ─── Sistema YESlaser
├── popdents_* (40 tabelas) ─── Sistema PopDents (duplicado!)
└── genéricas  (11 tabelas) ─── Tabelas compartilhadas
```

### Implicações
1. ✅ PopDents já tem estrutura própria
2. ❌ Código duplicado (não é multi-tenant real)
3. ❌ Manutenção dobrada
4. ❌ Não escala para 9+ empresas

---

## 2. TABELAS EQUIVALENTES

### Comparação YESlaser × PopDents

| Tabela Base | YESlaser | PopDents | Ação |
|-------------|----------|----------|------|
| franqueados | ✅ yeslaser_franqueados | ✅ popdents_franqueados | Unificar |
| profiles | ✅ yeslaser_profiles | ✅ popdents_profiles | Unificar |
| leads | ✅ sistema_leads_yeslaser | ✅ popdents_leads | Unificar |
| servicos | ✅ yeslaser_servicos | ✅ popdents_servicos | Unificar |
| formularios | ✅ yeslaser_formularios | ✅ popdents_formularios | Unificar |
| formulario_campos | ✅ yeslaser_formulario_campos | ✅ popdents_formulario_campos | Unificar |
| role_permissions | ✅ yeslaser_role_permissions | ✅ popdents_role_permissions | Unificar |
| user_roles | ✅ yeslaser_user_roles | ✅ popdents_user_roles | Unificar |
| modulos | ✅ yeslaser_modulos | ✅ popdents_modulos | Unificar |
| campanhas | ✅ yeslaser_campanhas | ✅ popdents_campanhas | Unificar |
| appointments | ✅ yeslaser_appointments | ✅ popdents_appointments | Unificar |
| diretorias | ✅ yeslaser_diretorias | ✅ popdents_diretorias | Unificar |
| whatsapp_* | ✅ 8 tabelas | ✅ 8 tabelas | Unificar |

### Tabelas Exclusivas YESlaser
| Tabela | Registros | Ação |
|--------|-----------|------|
| yeslaser_funis | 2 | Migrar → funis |
| yeslaser_funil_etapas | 38 | Migrar → funil_etapas |
| yeslaser_funil_leads | 277 | Migrar → funil_leads |
| yeslaser_influenciadoras | 5 | Migrar → influenciadoras |
| yeslaser_parcerias | 3 | Migrar → parcerias |
| yeslaser_candidatos | 0 | Migrar → candidatos |
| yeslaser_vagas | 0 | Migrar → vagas |
| yeslaser_entrevistas | 0 | Migrar → entrevistas |
| yeslaser_agendamentos | 1 | Migrar → agendamentos |
| yeslaser_metas | 0 | Migrar → metas |

---

## 3. ESTRATÉGIA DE MIGRAÇÃO

### Abordagem: Unificação Gradual

```
FASE 1: Criar estrutura multi-tenant
├── Criar tabela `tenants`
├── Criar tabelas unificadas (sem prefixo)
└── Adicionar tenant_id em todas

FASE 2: Migrar dados
├── YESlaser → tenant_id = uuid_yeslaser
├── PopDents → tenant_id = uuid_popdents
└── Validar integridade

FASE 3: Atualizar aplicação
├── Hooks com filtro tenant_id
├── TenantContext no frontend
└── TenantSelector no header

FASE 4: Remover tabelas antigas
├── Drop yeslaser_* (após validação)
├── Drop popdents_* (após validação)
└── Limpar código legado
```

---

## 4. ESTRUTURA NOVA PROPOSTA

### Tabela Master: tenants
```sql
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    razao_social VARCHAR(255),
    cnpj_matriz VARCHAR(20),
    logo_url TEXT,
    favicon_url TEXT,
    cores JSONB DEFAULT '{"primary": "#3B82F6", "secondary": "#1E40AF"}',
    dominio VARCHAR(255),
    email_contato VARCHAR(255),
    telefone VARCHAR(20),
    modulos_ativos TEXT[] DEFAULT ARRAY['leads', 'agendamentos'],
    settings JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'ativo',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 9 Tenants a Cadastrar
```sql
INSERT INTO tenants (slug, nome, razao_social, cores) VALUES
('yeslaser', 'YESlaser', 'YESlaser Franquias LTDA', '{"primary": "#7C3AED"}'),
('popdents', 'PopDents', 'PopDents Odontologia LTDA', '{"primary": "#3B82F6"}'),
('novalaser', 'NovaLaser', 'NovaLaser LTDA', '{"primary": "#EC4899"}'),
('intimacenter', 'IntimaCenter', 'IntimaCenter LTDA', '{"primary": "#F59E0B"}'),
('oralrecife', 'OralRecife', 'OralRecife Odontologia', '{"primary": "#10B981"}'),
('m1company', 'M1 Company', 'M1 Company Holding', '{"primary": "#6366F1"}'),
('amorimplantes', 'Amor Implantes', 'Amor Implantes LTDA', '{"primary": "#EF4444"}'),
('confiacredito', 'Confia Crédito', 'Confia Crédito LTDA', '{"primary": "#14B8A6"}'),
('franqueadora', 'Franqueadora', 'Franqueadora Master', '{"primary": "#8B5CF6"}');
```

### Exemplo: Tabela leads (Unificada)
```sql
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),  -- 👈 NOVO
    franqueado_id UUID REFERENCES franqueados(id),

    -- Dados pessoais
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telefone VARCHAR(20),
    cpf VARCHAR(14),
    data_nascimento DATE,
    genero VARCHAR(20),

    -- Endereço
    cep VARCHAR(10),
    endereco TEXT,
    cidade VARCHAR(100),
    estado VARCHAR(2),

    -- Tracking
    origem VARCHAR(50),
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),

    -- Status
    status VARCHAR(50) DEFAULT 'novo',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Índices
    CONSTRAINT leads_tenant_idx UNIQUE (tenant_id, email, telefone)
);

-- RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Isolamento por tenant" ON leads
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

---

## 5. SCRIPTS DE MIGRAÇÃO

### 5.1 Criar Tenants
```sql
-- Executar ANTES de qualquer migração
-- Cria os 9 tenants iniciais
```

### 5.2 Migrar Leads YESlaser
```sql
INSERT INTO leads (tenant_id, franqueado_id, nome, email, telefone, ...)
SELECT
    (SELECT id FROM tenants WHERE slug = 'yeslaser'),
    franqueado_id,
    nome,
    email,
    telefone,
    ...
FROM sistema_leads_yeslaser;
```

### 5.3 Migrar Leads PopDents
```sql
INSERT INTO leads (tenant_id, franqueado_id, nome, email, telefone, ...)
SELECT
    (SELECT id FROM tenants WHERE slug = 'popdents'),
    franqueado_id,
    nome,
    email,
    telefone,
    ...
FROM popdents_leads;
```

### 5.4 Migrar Franqueados
```sql
-- YESlaser
INSERT INTO franqueados (tenant_id, nome, cnpj, ...)
SELECT
    (SELECT id FROM tenants WHERE slug = 'yeslaser'),
    nome, cnpj, ...
FROM yeslaser_franqueados;

-- PopDents
INSERT INTO franqueados (tenant_id, nome, cnpj, ...)
SELECT
    (SELECT id FROM tenants WHERE slug = 'popdents'),
    nome, cnpj, ...
FROM popdents_franqueados;
```

---

## 6. VOLUME DE DADOS A MIGRAR

### Por Empresa

| Empresa | Tabelas | Registros Estimados |
|---------|---------|---------------------|
| YESlaser | 67 | ~5.000 |
| PopDents | 40 | ~240.000 (WhatsApp) |
| NovaLaser | - | 0 (novo) |
| IntimaCenter | - | 0 (novo) |
| OralRecife | - | 0 (novo) |
| M1 Company | - | 0 (novo) |
| Amor Implantes | - | 0 (novo) |
| Confia Crédito | - | 0 (novo) |
| Franqueadora | - | 0 (novo) |

### Tabelas com Mais Registros (Prioridade)

| Tabela | Registros | Tempo Estimado |
|--------|-----------|----------------|
| popdents_whatsapp_messages | 225.771 | ~30 min |
| popdents_whatsapp_conversations | 6.666 | ~5 min |
| yeslaser_franqueado_servicos | 1.111 | ~1 min |
| sistema_leads_yeslaser | 277 | < 1 min |
| yeslaser_funil_leads | 277 | < 1 min |

---

## 7. CHECKLIST DE MIGRAÇÃO

### Pré-Migração
- [x] Backup do código fonte
- [x] Backup do banco de dados
- [x] Documentar estrutura atual
- [ ] Validar sistema atual funciona
- [ ] Aprovar plano de migração

### Fase 1: Estrutura
- [ ] Criar tabela `tenants`
- [ ] Inserir 9 tenants
- [ ] Criar tabelas unificadas
- [ ] Criar índices
- [ ] Criar RLS policies

### Fase 2: Migração de Dados
- [ ] Migrar franqueados
- [ ] Migrar leads
- [ ] Migrar formulários
- [ ] Migrar whatsapp
- [ ] Validar contagens

### Fase 3: Aplicação
- [ ] Criar TenantContext
- [ ] Criar TenantSelector
- [ ] Atualizar hooks
- [ ] Testar por tenant

### Fase 4: Limpeza
- [ ] Validar dados migrados
- [ ] Backup das tabelas antigas
- [ ] Drop tabelas yeslaser_*
- [ ] Drop tabelas popdents_*
- [ ] Deploy final

---

## 8. RISCOS E MITIGAÇÕES

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Perda de dados | Baixa | Alto | Backups múltiplos + validação |
| Downtime | Média | Médio | Migração em horário de baixo uso |
| Bugs pós-migração | Alta | Médio | Testes extensivos + rollback |
| Performance | Baixa | Médio | Índices otimizados + monitoramento |

### Plano de Rollback
1. Manter tabelas antigas por 30 dias
2. Backup completo antes de cada fase
3. Script de rollback para cada migração
4. Ambiente de staging para testes

---

## 9. PRÓXIMOS PASSOS

1. **Aprovar este plano**
2. **Validar sistema atual** (testar todos os módulos)
3. **Criar ambiente de staging** (opcional)
4. **Executar Fase 1** (estrutura)
5. **Executar Fase 2** (dados)
6. **Executar Fase 3** (aplicação)
7. **Testes completos**
8. **Go-live**

---

*Documento gerado em: 01/02/2026*
