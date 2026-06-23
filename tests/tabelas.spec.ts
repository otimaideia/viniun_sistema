import { test, expect, type Page } from '@playwright/test';

/**
 * E2E — Venda de Tabelas (cliente final + corretor)
 * - Landing pública /tabelas (sem login)
 * - Tabela pública compartilhável /tabela/:id (sem login) + PDF
 * - Admin /imoveis/rede/:id com ações de distribuição (requer login)
 */

const TEST_USER = { email: 'e2e-test@viniun.com.br', password: 'E2eTest@viniun2026' };
const TABELA_ID = '28de9833-6b81-4a90-aa6b-ad2ea77078a6'; // tabela demo semeada

test.describe.configure({ timeout: 90_000 });

async function login(page: Page) {
  await page.goto('/entrar?tenant=viniun', { waitUntil: 'domcontentloaded' });
  const email = page.locator('#email');
  await expect(email).toBeEnabled({ timeout: 60_000 });
  await email.fill(TEST_USER.email);
  await page.locator('#password').fill(TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/leads/dashboard', { timeout: 30_000 });
}

test.describe('Landing pública de Tabelas (cliente final)', () => {
  test('1. /tabelas carrega vitrine com imóveis reais', async ({ page }) => {
    await page.goto('/tabelas', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Tabelas de Lançamentos/i })).toBeVisible({ timeout: 60_000 });
    // stats + cards
    await expect(page.getByText('imóveis disponíveis')).toBeVisible();
    await page.waitForTimeout(4000);
    // Cards: o CTA "Tabela" é um link (Button asChild → <a>)
    expect(await page.getByRole('link', { name: /Tabela/ }).count()).toBeGreaterThan(0);
    // CTA WhatsApp aponta para wa.me
    const waLink = page.getByRole('link', { name: /Receber tabelas no WhatsApp/i }).first();
    await expect(waLink).toHaveAttribute('href', /wa\.me/);
  });
});

test.describe('Tabela pública compartilhável', () => {
  test('2. /tabela/:id mostra a tabela demo e ações de distribuição', async ({ page }) => {
    await page.goto(`/tabela/${TABELA_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Lançamentos Canto do Forte/i })).toBeVisible({ timeout: 60_000 });
    // 12 itens → cards "Tenho interesse"
    await page.waitForTimeout(4000);
    expect(await page.getByRole('link', { name: /Tenho interesse/ }).count()).toBeGreaterThan(5);
    // Barra de distribuição
    await expect(page.getByRole('button', { name: /Baixar PDF/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Legenda Instagram/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Copiar link/i })).toBeVisible();
  });

  test('3. Botão "Baixar PDF" dispara download', async ({ page }) => {
    await page.goto(`/tabela/${TABELA_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Lançamentos Canto do Forte/i })).toBeVisible({ timeout: 60_000 });
    const downloadPromise = page.waitForEvent('download', { timeout: 20_000 });
    await page.getByRole('button', { name: /Baixar PDF/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });

  test('4. Tabela inexistente mostra estado "não encontrada"', async ({ page }) => {
    await page.goto('/tabela/00000000-0000-0000-0000-000000000000', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Tabela não encontrada/i)).toBeVisible({ timeout: 60_000 });
  });
});

test.describe('Admin Rede de Tabelas (corretor)', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('5. /imoveis/rede/:id mostra distribuição + PDF', async ({ page }) => {
    await page.goto(`/imoveis/rede/${TABELA_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Lançamentos Canto do Forte/i })).toBeVisible({ timeout: 60_000 });
    // Card Distribuir
    await expect(page.getByText('Distribuir tabela')).toBeVisible();
    await expect(page.getByRole('button', { name: /Baixar PDF/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Copiar link público/i })).toBeVisible();
    // PDF funciona no admin também
    const downloadPromise = page.waitForEvent('download', { timeout: 20_000 });
    await page.getByRole('button', { name: /Baixar PDF/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });
});
