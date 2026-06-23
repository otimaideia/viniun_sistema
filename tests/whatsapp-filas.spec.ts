import { test, expect, type Page } from '@playwright/test';

/**
 * Testes E2E do Sistema de Filas WhatsApp Multi-Tenant — Tenant: VINIUN
 *
 * Estratégia:
 * - SMOKE (read-only): login + navegação + asserts contra a UI real.
 *   Seguros para rodar contra o backend de produção (não escrevem dados).
 * - CRUD/Distribuição/Transferência: marcados como test.skip. São destrutivos
 *   (criam/editam/excluem filas reais) e dependem de um ambiente de staging +
 *   de uma sessão WhatsApp (`session_id` é obrigatório no formulário).
 *   Reabilitar somente quando houver banco de teste isolado.
 *
 * Selectors validados contra:
 *   - src/pages/Login.tsx
 *   - src/pages/WhatsAppFilas.tsx
 *   - src/pages/WhatsAppFilaEdit.tsx
 *   - src/pages/WhatsAppFilaDetail.tsx
 */

// Usuário dedicado de E2E — tenant_admin do tenant viniun (criado p/ testes)
const TEST_USER = {
  email: 'e2e-test@viniun.com.br',
  password: 'E2eTest@viniun2026',
};

// ?tenant=viniun torna a detecção de tenant determinística em dev (localhost)
const URLS = {
  login: '/entrar?tenant=viniun',
  filas: '/whatsapp/filas',
  filaNovo: '/whatsapp/filas/novo',
};

// App pesada (bundle ~7MB) + dev server compila sob demanda → timeouts generosos
test.describe.configure({ timeout: 90_000 });

async function login(page: Page) {
  await page.goto(URLS.login, { waitUntil: 'domcontentloaded' });
  // Inputs ficam disabled enquanto isDetecting=true (Login.tsx). Espera habilitar.
  const email = page.locator('#email');
  await expect(email).toBeEnabled({ timeout: 60_000 });
  await email.fill(TEST_USER.email);
  await page.locator('#password').fill(TEST_USER.password);
  await page.click('button[type="submit"]');
  // Após login o app redireciona para /leads/dashboard
  await page.waitForURL('**/leads/dashboard', { timeout: 30_000 });
}

test.describe('Filas WhatsApp — Smoke (read-only)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('1. Página de filas carrega com título e botão de criação', async ({ page }) => {
    await page.goto(URLS.filas, { waitUntil: 'domcontentloaded' });

    // h1 da listagem (WhatsAppFilas.tsx:44). Bootstrap de deep-link leva ~10s.
    await expect(page.getByRole('heading', { name: 'Filas de Atendimento' })).toBeVisible({ timeout: 60_000 });

    // Botão "Nova Fila" (visível para platform/tenant admin)
    await expect(page.getByRole('link', { name: /Nova Fila/i }).first()).toBeVisible();
  });

  test('2. Formulário de nova fila renderiza os campos reais', async ({ page }) => {
    await page.goto(URLS.filaNovo, { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Nova Fila' })).toBeVisible({ timeout: 30_000 });

    // Campos via react-hook-form ({...field} injeta o atributo name)
    await expect(page.locator('input[name="codigo"]')).toBeVisible();
    await expect(page.locator('input[name="nome"]')).toBeVisible();
    await expect(page.locator('textarea[name="descricao"]')).toBeVisible();
    await expect(page.locator('input[name="max_concurrent_per_user"]')).toBeVisible();
    await expect(page.locator('input[name="first_response_sla_minutes"]')).toBeVisible();
    await expect(page.locator('input[name="resolution_sla_minutes"]')).toBeVisible();
    // welcome_message: campo antes ausente no form (bug corrigido)
    await expect(page.locator('textarea[name="welcome_message"]')).toBeVisible();

    // Botões de ação
    await expect(page.getByRole('button', { name: 'Salvar' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancelar' })).toBeVisible();
  });

  test('3. Detalhe de uma fila existente exibe métricas e abas (se houver filas)', async ({ page }) => {
    await page.goto(URLS.filas, { waitUntil: 'domcontentloaded' });

    // Aguarda o carregamento terminar: ou o título (lista) ou estado vazio.
    await expect(page.getByRole('heading', { name: 'Filas de Atendimento' })).toBeVisible({ timeout: 60_000 });

    // Estado vazio: nenhuma fila cadastrada → pular sem falhar
    const emptyState = page.getByText('Nenhuma fila cadastrada');
    if (await emptyState.isVisible().catch(() => false)) {
      test.skip(true, 'Tenant viniun não possui filas cadastradas');
      return;
    }

    // Cada fila é um Card clicável (WhatsAppFilas.tsx:121). Abre o primeiro.
    const firstQueue = page.locator('.cursor-pointer').first();
    await firstQueue.click();
    await page.waitForURL('**/whatsapp/filas/*', { timeout: 10000 });

    // Métricas (WhatsAppFilaDetail.tsx:57-92)
    await expect(page.getByText('Conversas Totais')).toBeVisible();
    await expect(page.getByText('Resolvidas')).toBeVisible();
    await expect(page.getByText('Tempo Médio Espera')).toBeVisible();
    await expect(page.getByText('Atendentes', { exact: false }).first()).toBeVisible();

    // Abas (Tabs do shadcn → role tab)
    await expect(page.getByRole('tab', { name: 'Configuração' })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Atendentes/ })).toBeVisible();
  });
});

/**
 * ─────────────────────────────────────────────────────────────────────────
 * SUÍTE DESTRUTIVA — DESABILITADA
 * ─────────────────────────────────────────────────────────────────────────
 * Estes testes criam/editam/excluem filas reais e exigem:
 *   1. Banco de staging isolado (hoje o app aponta para supabase.viniun.com.br
 *      em produção).
 *   2. Pelo menos uma sessão WhatsApp ativa — `session_id` é obrigatório no
 *      formulário (WhatsAppFilaEdit.tsx:25, z.string().uuid()).
 *   3. UI de gestão de atendentes na página de detalhe — atualmente a aba
 *      "Atendentes" apenas LISTA; não há botão "Adicionar Atendente".
 *
 * NOTA: o formulário tem um campo `welcome_message` no schema (linha 34) que
 * NÃO é renderizado — possível bug a corrigir antes de reabilitar o teste de
 * mensagem de boas-vindas.
 *
 * Para reabilitar: configurar VITE_SUPABASE_URL de staging e remover .skip.
 */
test.describe('Filas WhatsApp — CRUD (destrutivo, requer staging)', () => {
  test.skip(true, 'Destrutivo: escreve no banco de produção. Requer staging + sessão WhatsApp.');

  test('Criar fila', async ({ page }) => {
    await login(page);
    await page.goto(URLS.filaNovo);
    await page.fill('input[name="codigo"]', 'vendas-test');
    await page.fill('input[name="nome"]', 'Fila de Vendas - Teste');
    await page.fill('textarea[name="descricao"]', 'Fila criada por teste automatizado');
    // distribution_type / session_id usam Radix Select (não <select> nativo):
    //   await page.getByRole('combobox').click(); await page.getByRole('option', { name: 'Revezamento Circular' }).click();
    await page.fill('input[name="max_concurrent_per_user"]', '3');
    await page.fill('input[name="first_response_sla_minutes"]', '5');
    await page.fill('input[name="resolution_sla_minutes"]', '30');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await page.waitForURL('**/whatsapp/filas', { timeout: 10000 });
    await expect(page.getByText('Fila de Vendas - Teste')).toBeVisible();
  });

  test('Validar campos obrigatórios', async ({ page }) => {
    await login(page);
    await page.goto(URLS.filaNovo);
    await page.getByRole('button', { name: 'Salvar' }).click();
    // Mensagens do zodResolver (WhatsAppFilaEdit.tsx:22-23)
    await expect(page.getByText('Mínimo 2 caracteres')).toBeVisible();
    await expect(page.getByText('Mínimo 3 caracteres')).toBeVisible();
  });
});
