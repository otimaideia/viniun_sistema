#!/usr/bin/env node
/**
 * Scraper de preços de concorrentes - YESlaser Painel
 *
 * Usa Playwright (headless Chromium) para extrair preços de sites concorrentes.
 *
 * Uso:
 *   node scripts/scrape-competitors.mjs
 *   node scripts/scrape-competitors.mjs --concorrente espaco-laser
 *   node scripts/scrape-competitors.mjs --concorrente vialaser
 *   node scripts/scrape-competitors.mjs --dry-run
 */

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

// =============================================================================
// CONFIG
// =============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://supabase-app.yeslaserpraiagrande.com.br';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SERVICE_ROLE_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MDc4MTc0MCwiZXhwIjo0OTI2NDU1MzQwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.K1j07Xd07FuQHNNXqnwXnWvakPBfUirpKXqB5sZmkTE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const args = process.argv.slice(2);
const filterSlug = args.includes('--concorrente') ? args[args.indexOf('--concorrente') + 1] : null;
const dryRun = args.includes('--dry-run');

// =============================================================================
// ÁREAS POR SITE
// =============================================================================

const ESPACO_LASER_AREAS = {
  feminino: [
    { slug: 'axilas', nome: 'Axilas' },
    { slug: 'virilha', nome: 'Virilha' },
    { slug: 'anus', nome: 'Perianal' },
    { slug: 'areolas', nome: 'Aréolas' },
    { slug: 'bracos-inteiros', nome: 'Braços Inteiros' },
    { slug: 'pescoco', nome: 'Pescoço' },
    { slug: 'glabela', nome: 'Glabela' },
    { slug: 'testa', nome: 'Testa' },
    { slug: 'faces-laterais', nome: 'Faces Laterais' },
    { slug: 'buco', nome: 'Buço' },
    { slug: 'costas', nome: 'Costas' },
    { slug: 'abdomen', nome: 'Abdômen' },
    { slug: 'pernas-inteiras', nome: 'Pernas Inteiras' },
    { slug: 'meia-perna', nome: 'Meia Perna' },
    { slug: 'nuca', nome: 'Nuca' },
    { slug: 'lombar', nome: 'Lombar' },
  ],
  masculino: [
    { slug: 'costas', nome: 'Costas' },
    { slug: 'abdomen', nome: 'Abdômen' },
    { slug: 'virilha', nome: 'Virilha' },
    { slug: 'barba', nome: 'Barba' },
    { slug: 'testa', nome: 'Testa' },
    { slug: 'pescoco', nome: 'Pescoço' },
    { slug: 'ombros', nome: 'Ombros' },
    { slug: 'peitoral', nome: 'Peitoral' },
    { slug: 'bracos-inteiros', nome: 'Braços Inteiros' },
    { slug: 'pernas-inteiras', nome: 'Pernas Inteiras' },
    { slug: 'axilas', nome: 'Axilas' },
    { slug: 'nuca', nome: 'Nuca' },
  ],
};

const VIALASER_AREAS = {
  feminino: [
    { slug: 'axilas', nome: 'Axilas' },
    { slug: 'virilha-completa', nome: 'Virilha Completa' },
    { slug: 'perianal', nome: 'Perianal' },
    { slug: 'bracos-inteiros', nome: 'Braços Inteiros' },
    { slug: 'antebraco', nome: 'Antebraço' },
    { slug: 'pernas-inteiras', nome: 'Pernas Inteiras' },
    { slug: 'meia-perna', nome: 'Meia Perna' },
    { slug: 'buco', nome: 'Buço' },
    { slug: 'abdomen', nome: 'Abdômen' },
    { slug: 'costas', nome: 'Costas' },
    { slug: 'lombar', nome: 'Lombar' },
    { slug: 'nuca', nome: 'Nuca' },
    { slug: 'gluteos', nome: 'Glúteos' },
  ],
  masculino: [
    { slug: 'costas', nome: 'Costas' },
    { slug: 'abdomen', nome: 'Abdômen' },
    { slug: 'peitoral', nome: 'Peitoral' },
    { slug: 'axilas', nome: 'Axilas' },
    { slug: 'bracos-inteiros', nome: 'Braços Inteiros' },
    { slug: 'pernas-inteiras', nome: 'Pernas Inteiras' },
    { slug: 'barba', nome: 'Barba' },
    { slug: 'nuca', nome: 'Nuca' },
  ],
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Extrai preço de um texto R$ no formato brasileiro.
 * Aceita: "R$ 1.639,00", "R$1639", "1.639,00", "R$ 54,63"
 */
function parsePrice(text) {
  if (!text) return null;
  // Match padrão brasileiro: R$ 1.234,56 ou 1234,56 ou 1234
  const match = text.match(/R?\$?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/);
  if (!match) return null;
  const cleaned = match[1].replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) || num < 10 ? null : num; // preço mínimo R$10
}

/**
 * Extrai TODOS os preços R$ de um texto, retorna array de números.
 */
function extractAllPrices(text) {
  if (!text) return [];
  const matches = text.match(/R\$\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})?/g) || [];
  return matches
    .map(m => parsePrice(m))
    .filter(p => p !== null && p >= 50 && p <= 50000); // faixa razoável
}

function parseParcelas(text) {
  if (!text) return { parcelas_max: null, valor_parcela: null };
  const match = text.match(/(\d+)\s*x\s*(?:de\s*)?R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/i);
  if (match) {
    return {
      parcelas_max: parseInt(match[1]),
      valor_parcela: parsePrice(`R$ ${match[2]}`),
    };
  }
  return { parcelas_max: null, valor_parcela: null };
}

function log(msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

function logError(msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.error(`[${ts}] ❌ ${msg}`);
}

// =============================================================================
// SCRAPER: ESPAÇO LASER
// =============================================================================

async function scrapeEspacoLaser(page, genero, areas) {
  const results = [];
  const baseUrl = genero === 'feminino'
    ? 'https://espacolaser.com.br/depilacao-feminino-'
    : 'https://espacolaser.com.br/depilacao-masculino-';

  for (const area of areas) {
    const url = `${baseUrl}${area.slug}`;
    log(`  [EL] ${genero} → ${area.nome}`);

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000); // aguardar Angular renderizar

      const data = await page.evaluate(() => {
        const text = document.body.innerText || '';

        // Extrair todos os preços R$ do texto
        const priceMatches = text.match(/R\$\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})?/g) || [];

        // Extrair parcelas (ex: "12x de R$ 149,90")
        const parcelasMatch = text.match(/(\d+)\s*x\s*(?:de\s*)?R\$\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})?/gi) || [];

        // Extrair sessões (ex: "10 sessões")
        const sessoesMatch = text.match(/(\d+)\s*sess[õoô]/gi) || [];

        return {
          all_prices: priceMatches.slice(0, 15),
          all_parcelas: parcelasMatch.slice(0, 5),
          all_sessoes: sessoesMatch.slice(0, 3),
          has_content: text.length > 500,
        };
      });

      // Parse preços
      const prices = extractAllPrices(data.all_prices.join(' '));
      const parcelasInfo = parseParcelas(data.all_parcelas[0] || '');

      // Preço total = maior valor razoável (excluindo valores > 10000 para areas únicas)
      const maxReasonable = area.slug.includes('pernas-inteiras') || area.slug === 'costas' ? 15000 : 8000;
      const validPrices = prices.filter(p => p <= maxReasonable);

      let precoTotal = validPrices.length > 0 ? Math.max(...validPrices) : null;
      let precoPromo = null;

      // Se tiver parcelas, o preço total pode ser calculado
      if (!precoTotal && parcelasInfo.parcelas_max && parcelasInfo.valor_parcela) {
        precoTotal = parcelasInfo.parcelas_max * parcelasInfo.valor_parcela;
      }

      // Se tiver mais de um preço, o menor é promoção
      if (validPrices.length >= 2) {
        const sorted = [...validPrices].sort((a, b) => b - a);
        precoTotal = sorted[0];
        // Segundo preço só é promoção se for < 90% do preço total
        if (sorted[1] < sorted[0] * 0.9 && sorted[1] > 100) {
          precoPromo = sorted[1];
        }
      }

      // Sessões
      let sessoes = 10; // Espaço Laser padrão
      if (data.all_sessoes.length > 0) {
        const m = data.all_sessoes[0].match(/(\d+)/);
        if (m) sessoes = parseInt(m[1]);
      }

      const result = {
        area_corporal: area.slug,
        nome_servico: `Depilação ${area.nome}`,
        genero,
        preco_total: precoTotal,
        preco_promocional: precoPromo,
        parcelas_max: parcelasInfo.parcelas_max,
        valor_parcela: parcelasInfo.valor_parcela,
        sessoes_pacote: sessoes,
        tecnologia: 'Candela Alexandrite',
        url_fonte: url,
        preco_por_sessao: precoTotal ? Math.round((precoTotal / sessoes) * 100) / 100 : null,
      };

      results.push(result);
      log(`    Total: ${precoTotal ? `R$ ${precoTotal.toFixed(2)}` : '—'} | Promo: ${precoPromo ? `R$ ${precoPromo.toFixed(2)}` : '—'} | ${parcelasInfo.parcelas_max || '?'}x | ${sessoes} sess`);
    } catch (err) {
      logError(`  ${area.nome}: ${err.message.split('\n')[0]}`);
      results.push({
        area_corporal: area.slug,
        nome_servico: `Depilação ${area.nome}`,
        genero,
        url_fonte: url,
        observacoes: `Erro: ${err.message.split('\n')[0]}`,
      });
    }
  }

  return results;
}

// =============================================================================
// SCRAPER: VIALASER
// =============================================================================

async function scrapeVialaser(page, genero, areas) {
  const results = [];
  const generoPath = genero === 'feminino' ? 'FEMININO' : 'MASCULINO';
  const baseUrl = `https://vialaser.com.br/pacotes/${generoPath}/`;

  for (const area of areas) {
    const url = `${baseUrl}${area.slug}`;
    log(`  [VL] ${genero} → ${area.nome}`);

    try {
      // Vialaser é mais pesado - usar domcontentloaded + timeout maior
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(5000); // Next.js precisa de mais tempo

      const data = await page.evaluate(() => {
        const text = document.body.innerText || '';
        const priceMatches = text.match(/R\$\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})?/g) || [];
        const parcelasMatch = text.match(/(\d+)\s*x\s*(?:de\s*)?R\$\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})?/gi) || [];
        const sessoesMatch = text.match(/(\d+)\s*sess[õoô]/gi) || [];

        return {
          all_prices: priceMatches.slice(0, 15),
          all_parcelas: parcelasMatch.slice(0, 5),
          all_sessoes: sessoesMatch.slice(0, 3),
          has_content: text.length > 500,
          snippet: text.slice(0, 500),
        };
      });

      const prices = extractAllPrices(data.all_prices.join(' '));
      const parcelasInfo = parseParcelas(data.all_parcelas[0] || '');

      const validPrices = prices.filter(p => p <= 15000);
      let precoTotal = validPrices.length > 0 ? Math.max(...validPrices) : null;
      let precoPromo = null;

      if (!precoTotal && parcelasInfo.parcelas_max && parcelasInfo.valor_parcela) {
        precoTotal = parcelasInfo.parcelas_max * parcelasInfo.valor_parcela;
      }

      if (validPrices.length >= 2) {
        const sorted = [...validPrices].sort((a, b) => b - a);
        precoTotal = sorted[0];
        if (sorted[1] < sorted[0] * 0.9 && sorted[1] > 50) {
          precoPromo = sorted[1];
        }
      }

      let sessoes = 10;
      if (data.all_sessoes.length > 0) {
        const m = data.all_sessoes[0].match(/(\d+)/);
        if (m) sessoes = parseInt(m[1]);
      }

      const result = {
        area_corporal: area.slug,
        nome_servico: `Depilação ${area.nome}`,
        genero,
        preco_total: precoTotal,
        preco_promocional: precoPromo,
        parcelas_max: parcelasInfo.parcelas_max,
        valor_parcela: parcelasInfo.valor_parcela,
        sessoes_pacote: sessoes,
        tecnologia: 'Splendor X / BLEND X',
        url_fonte: url,
        preco_por_sessao: precoTotal ? Math.round((precoTotal / sessoes) * 100) / 100 : null,
      };

      results.push(result);
      log(`    Total: ${precoTotal ? `R$ ${precoTotal.toFixed(2)}` : '—'} | Promo: ${precoPromo ? `R$ ${precoPromo.toFixed(2)}` : '—'} | ${parcelasInfo.parcelas_max || '?'}x | ${sessoes} sess`);
    } catch (err) {
      logError(`  ${area.nome}: ${err.message.split('\n')[0]}`);
      results.push({
        area_corporal: area.slug,
        nome_servico: `Depilação ${area.nome}`,
        genero,
        url_fonte: url,
        observacoes: `Erro: ${err.message.split('\n')[0]}`,
      });
    }
  }

  return results;
}

// =============================================================================
// SALVAR DADOS NO SUPABASE
// =============================================================================

async function saveResults(competitorId, tenantId, results) {
  let saved = 0;
  let errors = 0;

  for (const r of results) {
    if (!r.preco_total && !r.preco_promocional && !r.parcelas_max) {
      continue; // sem dados úteis
    }

    const record = {
      tenant_id: tenantId,
      competitor_id: competitorId,
      nome_servico: r.nome_servico,
      categoria: `depilacao_${r.genero}`,
      area_corporal: r.area_corporal,
      genero: r.genero,
      preco_total: r.preco_total,
      preco_promocional: r.preco_promocional,
      preco_por_sessao: r.preco_por_sessao,
      parcelas_max: r.parcelas_max,
      valor_parcela: r.valor_parcela,
      sessoes_pacote: r.sessoes_pacote,
      tecnologia: r.tecnologia,
      fonte: 'scraper',
      url_fonte: r.url_fonte,
      data_coleta: new Date().toISOString().split('T')[0],
      observacoes: r.observacoes || null,
    };

    // Upsert: deletar antigo e inserir novo
    await supabase
      .from('mt_competitor_prices')
      .delete()
      .eq('competitor_id', competitorId)
      .eq('area_corporal', r.area_corporal)
      .eq('genero', r.genero);

    const { error } = await supabase
      .from('mt_competitor_prices')
      .insert(record);

    if (error) {
      logError(`  Salvar ${r.nome_servico}: ${error.message}`);
      errors++;
    } else {
      saved++;
    }
  }

  return { saved, errors };
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  log('========================================');
  log('Scraper de Preços - Concorrentes');
  log('========================================');
  if (dryRun) log('MODO DRY-RUN');
  if (filterSlug) log(`Filtrando: ${filterSlug}`);

  const { data: competitors, error } = await supabase
    .from('mt_competitors')
    .select('*')
    .eq('is_active', true)
    .is('deleted_at', null);

  if (error) { logError(`Buscar concorrentes: ${error.message}`); process.exit(1); }

  const filtered = filterSlug ? competitors.filter(c => c.slug === filterSlug) : competitors;
  if (filtered.length === 0) { log('Nenhum concorrente.'); process.exit(0); }
  log(`${filtered.length} concorrente(s)`);

  log('Iniciando Chromium...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
    locale: 'pt-BR',
  });

  const page = await context.newPage();
  // Bloquear recursos desnecessários para performance
  await page.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2,ttf,eot,ico}', route => route.abort());
  await page.route('**/analytics**', route => route.abort());
  await page.route('**/gtag**', route => route.abort());
  await page.route('**/facebook**', route => route.abort());

  let totalSaved = 0;
  let totalErrors = 0;

  for (const competitor of filtered) {
    log(`\n--- ${competitor.nome} (${competitor.slug}) ---`);
    let allResults = [];

    if (competitor.slug === 'espaco-laser') {
      log('Feminino...');
      allResults = allResults.concat(await scrapeEspacoLaser(page, 'feminino', ESPACO_LASER_AREAS.feminino));
      log('Masculino...');
      allResults = allResults.concat(await scrapeEspacoLaser(page, 'masculino', ESPACO_LASER_AREAS.masculino));
    }
    else if (competitor.slug === 'vialaser') {
      log('Feminino...');
      allResults = allResults.concat(await scrapeVialaser(page, 'feminino', VIALASER_AREAS.feminino));
      log('Masculino...');
      allResults = allResults.concat(await scrapeVialaser(page, 'masculino', VIALASER_AREAS.masculino));
    }
    else {
      log(`Scraper não configurado para ${competitor.slug}`);
      continue;
    }

    const withData = allResults.filter(r => r.preco_total || r.preco_promocional);
    log(`\nResultados: ${allResults.length} áreas, ${withData.length} com preço`);

    if (dryRun) {
      for (const r of withData) {
        console.log(`  ${r.genero}/${r.area_corporal}: Total=${r.preco_total} Promo=${r.preco_promocional} Parcelas=${r.parcelas_max}x Sessões=${r.sessoes_pacote}`);
      }
    } else {
      const { saved, errors } = await saveResults(competitor.id, competitor.tenant_id, allResults);
      totalSaved += saved;
      totalErrors += errors;
      log(`Salvos: ${saved} | Erros: ${errors}`);
    }
  }

  await page.close();
  await context.close();
  await browser.close();

  log(`\n✅ CONCLUÍDO: ${totalSaved} preços salvos, ${totalErrors} erros`);
}

main().catch(err => {
  logError(`Fatal: ${err.message}`);
  process.exit(1);
});
