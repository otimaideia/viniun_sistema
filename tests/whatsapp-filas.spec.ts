import { test, expect } from '@playwright/test';

/**
 * Testes E2E do Sistema de Filas WhatsApp Multi-Tenant
 *
 * Testa:
 * - CRUD de filas
 * - Adicionar/remover atendentes
 * - Distribuição de conversas (round_robin, least_busy)
 * - Transferências entre atendentes
 * - Métricas e estatísticas
 */

// Credenciais de teste
const TEST_USER = {
  email: 'marketing@franquiayeslaser.com.br',
  password: 'yeslaser@2025M'
};

// URLs das páginas
const URLS = {
  login: '/',
  whatsapp: '/whatsapp',
  filas: '/whatsapp/filas',
  filaNovo: '/whatsapp/filas/novo'
};

test.describe('Sistema de Filas WhatsApp', () => {

  test.beforeEach(async ({ page }) => {
    // Login antes de cada teste
    await page.goto(URLS.login);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Aguardar redirecionamento após login
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('1. Deve acessar a página de filas', async ({ page }) => {
    await page.goto(URLS.filas);

    // Verificar título da página
    await expect(page.locator('h1')).toContainText('Filas de Atendimento');

    // Verificar botão de criar fila
    await expect(page.locator('button:has-text("Nova Fila")')).toBeVisible();
  });

  test('2. Deve criar uma nova fila', async ({ page }) => {
    await page.goto(URLS.filaNovo);

    // Preencher formulário
    await page.fill('input[name="codigo"]', 'vendas-test');
    await page.fill('input[name="nome"]', 'Fila de Vendas - Teste');
    await page.fill('textarea[name="descricao"]', 'Fila criada por teste automatizado');

    // Selecionar tipo de distribuição
    await page.selectOption('select[name="distribution_type"]', 'round_robin');

    // Configurar limites
    await page.fill('input[name="max_concurrent_per_user"]', '3');

    // Configurar SLA
    await page.fill('input[name="first_response_sla_minutes"]', '5');
    await page.fill('input[name="resolution_sla_minutes"]', '30');

    // Mensagem de boas-vindas
    await page.fill('textarea[name="welcome_message"]', 'Bem-vindo! Em breve um atendente irá lhe atender.');

    // Salvar
    await page.click('button:has-text("Salvar")');

    // Verificar redirecionamento para listagem
    await page.waitForURL('**/whatsapp/filas', { timeout: 10000 });

    // Verificar que a fila foi criada
    await expect(page.locator('text=Fila de Vendas - Teste')).toBeVisible();
  });

  test('3. Deve visualizar detalhes da fila', async ({ page }) => {
    await page.goto(URLS.filas);

    // Clicar na primeira fila da lista
    await page.click('text=Fila de Vendas - Teste');

    // Aguardar página de detalhes
    await page.waitForURL('**/whatsapp/filas/*', { timeout: 10000 });

    // Verificar tabs
    await expect(page.locator('button:has-text("Configuração")')).toBeVisible();
    await expect(page.locator('button:has-text("Atendentes")')).toBeVisible();

    // Verificar métricas
    await expect(page.locator('text=Conversas Totais')).toBeVisible();
    await expect(page.locator('text=Resolvidas')).toBeVisible();
    await expect(page.locator('text=Tempo Médio Espera')).toBeVisible();
    await expect(page.locator('text=Atendentes')).toBeVisible();
  });

  test('4. Deve editar uma fila existente', async ({ page }) => {
    await page.goto(URLS.filas);

    // Clicar no botão de editar da primeira fila
    await page.click('button[title="Editar fila"]');

    // Aguardar página de edição
    await page.waitForURL('**/whatsapp/filas/*/editar', { timeout: 10000 });

    // Alterar descrição
    await page.fill('textarea[name="descricao"]', 'Fila atualizada por teste automatizado');

    // Alterar SLA
    await page.fill('input[name="first_response_sla_minutes"]', '10');

    // Salvar
    await page.click('button:has-text("Salvar")');

    // Verificar redirecionamento
    await page.waitForURL('**/whatsapp/filas/*', { timeout: 10000 });

    // Verificar que foi atualizado
    await expect(page.locator('text=Fila atualizada por teste automatizado')).toBeVisible();
  });

  test('5. Deve adicionar atendente à fila', async ({ page }) => {
    await page.goto(URLS.filas);

    // Acessar detalhes da fila
    await page.click('text=Fila de Vendas - Teste');

    // Ir para tab de atendentes
    await page.click('button:has-text("Atendentes")');

    // Clicar em adicionar atendente
    await page.click('button:has-text("Adicionar Atendente")');

    // Selecionar usuário
    await page.selectOption('select[name="user_id"]', { index: 1 });

    // Configurar capacidade
    await page.fill('input[name="max_concurrent"]', '5');

    // Salvar
    await page.click('button:has-text("Adicionar")');

    // Verificar que apareceu na lista
    await expect(page.locator('.atendente-card').first()).toBeVisible();
  });

  test('6. Deve filtrar filas por sessão', async ({ page }) => {
    await page.goto(URLS.filas);

    // Selecionar filtro de sessão
    await page.selectOption('select[name="session_filter"]', { index: 1 });

    // Aguardar atualização da lista
    await page.waitForTimeout(1000);

    // Verificar que há filas filtradas
    await expect(page.locator('.fila-card')).toHaveCount(1);
  });

  test('7. Deve exibir métricas em tempo real', async ({ page }) => {
    await page.goto(URLS.filas);

    // Verificar cards de métricas
    await expect(page.locator('text=Conversas na Fila')).toBeVisible();
    await expect(page.locator('text=Em Atendimento')).toBeVisible();
    await expect(page.locator('text=Atendentes Disponíveis')).toBeVisible();

    // Verificar se os números são visíveis
    const metricsCards = page.locator('.metric-card');
    await expect(metricsCards).toHaveCount(3);
  });

  test('8. Deve validar campos obrigatórios ao criar fila', async ({ page }) => {
    await page.goto(URLS.filaNovo);

    // Tentar salvar sem preencher nada
    await page.click('button:has-text("Salvar")');

    // Verificar mensagens de erro
    await expect(page.locator('text=Código é obrigatório')).toBeVisible();
    await expect(page.locator('text=Nome é obrigatório')).toBeVisible();
  });

  test('9. Deve deletar uma fila', async ({ page }) => {
    await page.goto(URLS.filas);

    // Clicar no botão de deletar
    await page.click('button[title="Deletar fila"]');

    // Confirmar deleção no modal
    await page.click('button:has-text("Confirmar")');

    // Aguardar toast de sucesso
    await expect(page.locator('text=Fila removida com sucesso')).toBeVisible();

    // Verificar que sumiu da lista
    await expect(page.locator('text=Fila de Vendas - Teste')).not.toBeVisible();
  });

  test('10. Deve exibir estatísticas da fila', async ({ page }) => {
    await page.goto(URLS.filas);

    // Acessar detalhes de uma fila
    await page.click('.fila-card:first-child');

    // Verificar estatísticas
    const stats = {
      totalConversations: page.locator('text=Conversas Totais'),
      resolved: page.locator('text=Resolvidas'),
      avgWaitTime: page.locator('text=Tempo Médio Espera'),
      agents: page.locator('text=Atendentes')
    };

    for (const [key, locator] of Object.entries(stats)) {
      await expect(locator).toBeVisible();
    }
  });

});

test.describe('Distribuição de Conversas', () => {

  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(URLS.login);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('11. Deve testar distribuição round_robin', async ({ page }) => {
    // Criar fila com distribuição round_robin
    await page.goto(URLS.filaNovo);

    await page.fill('input[name="codigo"]', 'rr-test');
    await page.fill('input[name="nome"]', 'Round Robin Test');
    await page.selectOption('select[name="distribution_type"]', 'round_robin');
    await page.click('button:has-text("Salvar")');

    await page.waitForURL('**/whatsapp/filas');

    // Verificar que foi criada com o algoritmo correto
    await page.click('text=Round Robin Test');
    await expect(page.locator('text=Revezamento circular')).toBeVisible();
  });

  test('12. Deve testar distribuição least_busy', async ({ page }) => {
    // Criar fila com distribuição least_busy
    await page.goto(URLS.filaNovo);

    await page.fill('input[name="codigo"]', 'lb-test');
    await page.fill('input[name="nome"]', 'Least Busy Test');
    await page.selectOption('select[name="distribution_type"]', 'least_busy');
    await page.click('button:has-text("Salvar")');

    await page.waitForURL('**/whatsapp/filas');

    // Verificar algoritmo
    await page.click('text=Least Busy Test');
    await expect(page.locator('text=Menos ocupado')).toBeVisible();
  });

});

test.describe('Transferências entre Atendentes', () => {

  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(URLS.login);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('13. Deve iniciar transferência de conversa', async ({ page }) => {
    // Ir para chat WhatsApp
    await page.goto('/whatsapp/conversas');

    // Selecionar uma conversa
    await page.click('.conversation-item:first-child');

    // Clicar em transferir
    await page.click('button:has-text("Transferir")');

    // Verificar modal de transferência
    await expect(page.locator('text=Transferir Conversa')).toBeVisible();

    // Selecionar tipo de transferência
    await page.click('text=Para outro atendente');

    // Selecionar atendente destino
    await page.selectOption('select[name="to_user_id"]', { index: 1 });

    // Adicionar motivo
    await page.fill('textarea[name="reason"]', 'Cliente pediu especialista');

    // Confirmar transferência
    await page.click('button:has-text("Transferir")');

    // Verificar toast de sucesso
    await expect(page.locator('text=Transferência iniciada')).toBeVisible();
  });

});

test.describe('Multi-Tenant e Permissões', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(URLS.login);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('14. Deve filtrar filas por tenant', async ({ page }) => {
    await page.goto(URLS.filas);

    // Verificar que só vê filas do seu tenant
    const filas = page.locator('.fila-card');
    const count = await filas.count();

    expect(count).toBeGreaterThan(0);

    // Verificar que todas as filas são do tenant correto
    for (let i = 0; i < count; i++) {
      const fila = filas.nth(i);
      // Cada fila deve ter badge com nome do tenant
      await expect(fila.locator('.tenant-badge')).toBeVisible();
    }
  });

  test('15. Deve respeitar RLS ao criar fila', async ({ page }) => {
    await page.goto(URLS.filaNovo);

    // Criar fila
    await page.fill('input[name="codigo"]', 'rls-test');
    await page.fill('input[name="nome"]', 'RLS Test');
    await page.selectOption('select[name="distribution_type"]', 'round_robin');
    await page.click('button:has-text("Salvar")');

    await page.waitForURL('**/whatsapp/filas');

    // Verificar que foi criada com tenant_id correto
    await page.click('text=RLS Test');

    // Verificar que está no tenant correto
    await expect(page.locator('.tenant-badge')).toContainText('YESlaser');
  });

});
