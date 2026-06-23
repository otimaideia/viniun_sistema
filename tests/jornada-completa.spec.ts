import { test, expect, type APIRequestContext } from '@playwright/test';

/**
 * E2E — JORNADA COMPLETA (signup real de empresa):
 *   criar conta (/cadastro wizard) → admin habilita módulos imobiliários →
 *   login → cadastrar imóvel → cadastrar tabela → verificar no banco → LIMPAR tudo.
 *
 * Usa nome/email únicos (timestamp). A etapa "admin habilita módulos" e o cleanup
 * usam a service key (process.env.SERVICE_KEY).
 *
 * Rodar: SERVICE_KEY="<service_role>" npx playwright test tests/jornada-completa.spec.ts --project=chromium --workers=1
 */

const SUPABASE_URL = 'https://supabase.viniun.com.br';
const SERVICE_KEY = process.env.SERVICE_KEY || '';

const stamp = Date.now();
const EMPRESA = `E2E Jornada ${stamp}`;
const SLUG = `e2e-jornada-${stamp}`;
const EMAIL = `e2e-journey-${stamp}@viniun.com.br`;
const SENHA = 'Jornada@E2e2026';
const IMOVEL_TITULO = `E2E Jornada Apartamento ${stamp}`;
const TABELA_NOME = `E2E Jornada Tabela ${stamp}`;

test.describe.configure({ timeout: 180_000 });

async function pg(request: APIRequestContext, query: string) {
  const res = await request.post(`${SUPABASE_URL}/pg/query`, {
    headers: { 'Content-Type': 'application/json', apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    data: { query },
  });
  if (!res.ok()) throw new Error(`pg query falhou (${res.status()}): ${await res.text()}`);
  return res.json();
}

test('Jornada completa: cadastro empresa → módulos → login → imóvel → tabela', async ({ page, request }) => {
  expect(SERVICE_KEY, 'defina SERVICE_KEY no env').not.toEqual('');

  // ── ETAPA 1 — CRIAÇÃO DE CONTA (wizard /cadastro) ────────────────────────
  console.log(`\n[1/6] Criando empresa "${EMPRESA}" (${EMAIL})`);
  await page.goto('/cadastro', { waitUntil: 'domcontentloaded' });

  // Passo 1 — Empresa
  await expect(page.locator('#nome_fantasia')).toBeVisible({ timeout: 60_000 });
  await page.locator('#nome_fantasia').fill(EMPRESA);
  await page.locator('button[role="combobox"]').first().click();
  await page.getByRole('option', { name: 'Imobiliária' }).click();
  await page.getByRole('button', { name: /Próximo/i }).click();

  // Passo 2 — Endereço (mínimos: telefone + email_empresa)
  await expect(page.locator('#telefone')).toBeVisible({ timeout: 15_000 });
  await page.locator('#cidade').fill('Praia Grande');
  await page.locator('#estado').fill('SP');
  await page.locator('#telefone').fill('13991888100');
  await page.locator('#email_empresa').fill(`contato-${stamp}@viniun.com.br`);
  await page.getByRole('button', { name: /Próximo/i }).click();

  // Passo 3 — Acesso (admin)
  await expect(page.locator('#nome')).toBeVisible({ timeout: 15_000 });
  await page.locator('#nome').fill('Admin E2E Jornada');
  await page.locator('#email').fill(EMAIL);
  await page.locator('#senha').fill(SENHA);
  await page.locator('#confirmar_senha').fill(SENHA);
  await page.getByRole('button', { name: /Próximo/i }).click();

  // Passo 4 — Plano (default professional) → Próximo
  await page.getByRole('button', { name: /Próximo/i }).click();

  // Passo 5 — Revisão + termos → Criar minha conta
  await expect(page.locator('#aceite_termos')).toBeVisible({ timeout: 15_000 });
  await page.locator('#aceite_termos').click();
  await page.getByRole('button', { name: /Criar minha conta/i }).click();

  // Sucesso (ou erro de edge function signup-confirm)
  await page.waitForURL('**/cadastro/sucesso', { timeout: 45_000 });
  console.log('      ✓ Empresa criada (tenant + admin ativo)');

  // ── ETAPA 2 — ADMIN habilita módulos imobiliários (gap do signup) ────────
  console.log('[2/6] Admin habilitando módulos imoveis + tabelas_rede...');
  const tenantRows = await pg(request, `SELECT id FROM mt_tenants WHERE slug = '${SLUG}'`);
  expect(tenantRows.length, 'tenant criado').toBeGreaterThan(0);
  const tenantId = tenantRows[0].id;
  await pg(request, `INSERT INTO mt_tenant_modules (tenant_id, module_id, is_active)
    SELECT '${tenantId}', m.id, true FROM mt_modules m
    WHERE m.codigo IN ('imoveis','tabelas_rede','tabelas_preco')
    AND NOT EXISTS (SELECT 1 FROM mt_tenant_modules tm WHERE tm.tenant_id='${tenantId}' AND tm.module_id=m.id)`);
  console.log('      ✓ Módulos habilitados para o novo tenant');

  // ── ETAPA 3 — LOGIN (reload completo p/ TenantContext pegar os módulos) ───
  console.log('[3/6] Login com a nova conta...');
  await page.goto('/entrar', { waitUntil: 'domcontentloaded' });
  // se já estiver autenticado pelo signup, o app redireciona sozinho
  if (!page.url().includes('/leads/dashboard')) {
    const emailInput = page.locator('#email');
    if (await emailInput.isVisible().catch(() => false)) {
      await expect(emailInput).toBeEnabled({ timeout: 60_000 });
      await emailInput.fill(EMAIL);
      await page.locator('#password').fill(SENHA);
      await page.click('button[type="submit"]');
    }
  }
  await page.waitForURL('**/leads/dashboard', { timeout: 30_000 });
  console.log('      ✓ Login OK');

  // ── ETAPA 4 — CADASTRO DE IMÓVEL ─────────────────────────────────────────
  console.log('[4/6] Cadastrando imóvel...');
  await page.goto('/imoveis/novo', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Novo Imóvel/i })).toBeVisible({ timeout: 60_000 });
  await page.locator('input[name="titulo"]').fill(IMOVEL_TITULO);
  await page.getByRole('button', { name: /Criar Imóvel/i }).click();
  await page.waitForURL(/\/imoveis\/[0-9a-f-]{36}$/, { timeout: 30_000 });
  console.log('      ✓ Imóvel criado:', page.url());

  // ── ETAPA 5 — CADASTRO DE TABELA ─────────────────────────────────────────
  console.log('[5/6] Cadastrando tabela...');
  await page.goto('/imoveis/rede/novo', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('input[name="nome"]')).toBeVisible({ timeout: 60_000 });
  await page.locator('input[name="nome"]').fill(TABELA_NOME);
  await page.getByRole('button', { name: /Criar Tabela/i }).click();
  await page.waitForURL('**/imoveis/rede', { timeout: 30_000 });
  await expect(page.getByText(TABELA_NOME)).toBeVisible({ timeout: 15_000 });
  console.log('      ✓ Tabela criada e visível');

  // ── ETAPA 6 — VERIFICAÇÃO + CLEANUP ──────────────────────────────────────
  console.log('[6/6] Verificando no banco e limpando tudo...');
  const imovel = await pg(request, `SELECT id FROM mt_properties WHERE titulo = '${IMOVEL_TITULO}'`);
  const tabela = await pg(request, `SELECT id FROM mt_network_tables WHERE nome = '${TABELA_NOME}'`);
  expect(imovel.length, 'imóvel persistido').toBeGreaterThan(0);
  expect(tabela.length, 'tabela persistida').toBeGreaterThan(0);
  console.log('      ✓ Imóvel e tabela confirmados no banco');

  // Cleanup — apaga tudo do tenant de teste (ordem de dependência)
  for (const t of [
    'mt_network_table_items', 'mt_network_tables', 'mt_properties',
    'mt_user_roles', 'mt_franchise_modules', 'mt_tenant_modules',
    'mt_users', 'mt_franchises', 'mt_tenant_branding', 'mt_tenants',
  ]) {
    const col = t === 'mt_tenants' ? 'id' : 'tenant_id';
    await pg(request, `DELETE FROM ${t} WHERE ${col} = '${tenantId}'`);
  }
  await pg(request, `DELETE FROM auth.users WHERE email = '${EMAIL}'`);
  const restou = await pg(request, `SELECT count(*) AS n FROM mt_tenants WHERE id = '${tenantId}'`);
  expect(Number(restou[0].n)).toBe(0);
  console.log('      ✓ Tenant de teste e todos os dados removidos\n');
});
