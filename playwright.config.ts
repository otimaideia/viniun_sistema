import { defineConfig, devices } from '@playwright/test';

/**
 * Configuração do Playwright para testes E2E do Sistema Clínicas
 * Testa o sistema de filas WhatsApp multi-tenant
 */
export default defineConfig({
  testDir: './tests',

  /* Timeout máximo por teste */
  timeout: 30 * 1000,

  /* Executar testes em paralelo */
  fullyParallel: true,

  /* Falhar build se deixar test.only no CI */
  forbidOnly: !!process.env.CI,

  /* Retry em caso de falha */
  retries: process.env.CI ? 2 : 0,

  /* Workers em paralelo */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter */
  reporter: 'html',

  /* Configurações compartilhadas */
  use: {
    /* URL base do sistema */
    baseURL: 'http://localhost:8080',

    /* Coletar trace em caso de falha */
    trace: 'on-first-retry',

    /* Screenshot em caso de falha */
    screenshot: 'only-on-failure',

    /* Video em caso de falha */
    video: 'retain-on-failure',
  },

  /* Configurar projetos para diferentes navegadores */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Testes mobile */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* Servidor de desenvolvimento */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
