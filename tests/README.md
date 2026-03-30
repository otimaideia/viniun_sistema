# Testes E2E - Sistema de Filas WhatsApp

## Visão Geral

Este diretório contém os testes end-to-end (E2E) do sistema de filas WhatsApp multi-tenant usando Playwright.

## Pré-requisitos

1. **Instalar Playwright**:
```bash
npm install -D @playwright/test
npx playwright install
```

2. **Servidor de desenvolvimento rodando**:
```bash
npm run dev
```

3. **Banco de dados com migrations executadas**:
   - Migration 1: Sistema de Filas (mt_whatsapp_queues, mt_whatsapp_queue_users)
   - Migration 2: Transferências (mt_whatsapp_transfers)
   - Migration 3: Notas + Chatbot + Métricas

## Executar Testes

### Todos os testes
```bash
npm test
```

### Modo UI (interativo)
```bash
npm run test:ui
```

### Modo headed (vê o navegador)
```bash
npm run test:headed
```

### Modo debug
```bash
npm run test:debug
```

### Ver relatório após execução
```bash
npm run test:report
```

### Executar apenas um arquivo
```bash
npx playwright test whatsapp-filas.spec.ts
```

### Executar apenas um teste específico
```bash
npx playwright test whatsapp-filas.spec.ts -g "Deve criar uma nova fila"
```

## Estrutura dos Testes

### 1. Sistema de Filas WhatsApp (10 testes)

**Testes de CRUD:**
- ✅ Acessar página de filas
- ✅ Criar nova fila
- ✅ Visualizar detalhes da fila
- ✅ Editar fila existente
- ✅ Deletar fila

**Testes de Atendentes:**
- ✅ Adicionar atendente à fila
- ✅ Filtrar filas por sessão

**Testes de Métricas:**
- ✅ Exibir métricas em tempo real
- ✅ Exibir estatísticas da fila

**Testes de Validação:**
- ✅ Validar campos obrigatórios

### 2. Distribuição de Conversas (2 testes)

- ✅ Testar distribuição round_robin
- ✅ Testar distribuição least_busy

### 3. Transferências entre Atendentes (1 teste)

- ✅ Iniciar transferência de conversa

### 4. Multi-Tenant e Permissões (2 testes)

- ✅ Filtrar filas por tenant
- ✅ Respeitar RLS ao criar fila

**Total: 15 testes**

## Cobertura de Testes

### Páginas Testadas

1. **WhatsAppFilas.tsx** - Listagem de filas
   - Filtros por sessão/status
   - Cards de métricas
   - Grid de filas
   - Botão de criar fila

2. **WhatsAppFilaDetail.tsx** - Detalhes da fila
   - Tabs (Configuração, Atendentes)
   - Métricas principais
   - Lista de atendentes
   - Botão de editar

3. **WhatsAppFilaEdit.tsx** - Criar/Editar fila
   - Formulário completo
   - Validações Zod
   - Seleção de distribuição
   - Configurações de SLA

### Hooks Testados

1. **useWhatsAppQueuesMT** - CRUD de filas
2. **useWhatsAppQueueUsersMT** - Gerenciar atendentes
3. **useWhatsAppQueueDistribution** - Distribuição automática

### Fluxos Testados

1. **Fluxo Completo de Criação:**
   - Login → Filas → Criar → Preencher → Salvar → Visualizar

2. **Fluxo de Edição:**
   - Login → Filas → Selecionar → Editar → Salvar

3. **Fluxo de Atendentes:**
   - Login → Filas → Detalhes → Atendentes → Adicionar → Salvar

4. **Fluxo de Transferência:**
   - Login → Chat → Selecionar Conversa → Transferir → Confirmar

## Configuração de Credenciais

As credenciais de teste estão definidas no arquivo `whatsapp-filas.spec.ts`:

```typescript
const TEST_USER = {
  email: 'marketing@franquiayeslaser.com.br',
  password: 'yeslaser@2025M'
};
```

**IMPORTANTE**: Para testes em CI/CD, use variáveis de ambiente:

```bash
export TEST_EMAIL="marketing@franquiayeslaser.com.br"
export TEST_PASSWORD="yeslaser@2025M"
```

E ajuste o arquivo de teste:

```typescript
const TEST_USER = {
  email: process.env.TEST_EMAIL || 'marketing@franquiayeslaser.com.br',
  password: process.env.TEST_PASSWORD || 'yeslaser@2025M'
};
```

## Troubleshooting

### Erro: "baseURL not found"
- Certifique-se que o servidor de desenvolvimento está rodando na porta 8080
- Verifique o `playwright.config.ts` → `baseURL: 'http://localhost:8080'`

### Erro: "Timeout waiting for element"
- Aumente o timeout no `playwright.config.ts`
- Verifique se as migrations foram executadas corretamente
- Verifique se há dados de teste no banco

### Erro: "Authentication failed"
- Verifique as credenciais no arquivo de teste
- Confirme que o usuário existe no banco de dados
- Verifique se o usuário tem permissões corretas

### Erro: "Table does not exist"
- Execute as 3 migrations na ordem correta:
  1. `20260214_001_mt_whatsapp_queues.sql`
  2. `20260214_002_mt_whatsapp_transfers.sql`
  3. `20260214_003_mt_whatsapp_notes_chatbot.sql`

## Próximos Passos

### Testes a Adicionar

1. **Testes de Performance**:
   - Tempo de carregamento da página de filas
   - Tempo de resposta ao criar fila
   - Performance com 100+ filas

2. **Testes de Distribuição Avançada**:
   - Skill-based routing
   - Priorização de filas
   - Overflow para outra fila

3. **Testes de Real-time**:
   - Atualização automática de métricas
   - Notificações de nova conversa
   - Status de atendente em tempo real

4. **Testes de Acessibilidade**:
   - Navegação por teclado
   - Screen readers
   - Contraste de cores

5. **Testes Mobile**:
   - Responsividade em celular
   - Touch gestures
   - Menu hamburguer

## CI/CD Integration

### GitHub Actions

Criar arquivo `.github/workflows/playwright.yml`:

```yaml
name: Playwright Tests
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: 18
    - name: Install dependencies
      run: npm ci
    - name: Install Playwright Browsers
      run: npx playwright install --with-deps
    - name: Run Playwright tests
      run: npm test
    - uses: actions/upload-artifact@v3
      if: always()
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 30
```

## Referências

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [CI/CD Guide](https://playwright.dev/docs/ci)
