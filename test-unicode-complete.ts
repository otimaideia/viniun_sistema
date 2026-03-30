/**
 * Teste completo do Unicode Sanitizer
 * Testa todas as 8 proteções implementadas
 */

import { sanitizeForJSON, findProblematicChars, getUnicodeStats, isJSONSafe } from './src/utils/unicodeSanitizer';

// Cores para output
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function testCase(name: string, input: string, shouldHaveProblems: boolean, expectedTypes?: string[]): boolean {
  console.log(`\n📋 Teste: ${name}`);
  console.log(`   Input: "${input}"`);

  // 1. Verificar se há problemas
  const problems = findProblematicChars(input);
  const stats = getUnicodeStats(input);

  console.log(`   Problemas encontrados: ${problems.length}`);
  if (problems.length > 0) {
    problems.forEach(p => {
      console.log(`     - ${p.type} na posição ${p.position}: ${p.description}`);
    });
  }

  // 2. Sanitizar
  const sanitized = sanitizeForJSON(input);
  const isSafe = isJSONSafe(sanitized);

  console.log(`   Após sanitização: "${sanitized}"`);
  console.log(`   JSON safe? ${isSafe ? GREEN + 'SIM' + RESET : RED + 'NÃO' + RESET}`);

  // 3. Validar resultado
  let passed = true;

  if (shouldHaveProblems && problems.length === 0) {
    console.log(`   ${RED}✗ FALHOU: Deveria ter encontrado problemas${RESET}`);
    passed = false;
  } else if (!shouldHaveProblems && problems.length > 0) {
    console.log(`   ${YELLOW}⚠ AVISO: Encontrou problemas inesperados${RESET}`);
  }

  if (!isSafe) {
    console.log(`   ${RED}✗ FALHOU: String sanitizada não é JSON-safe${RESET}`);
    passed = false;
  }

  if (expectedTypes) {
    const foundTypes = problems.map(p => p.type);
    const missingTypes = expectedTypes.filter(t => !foundTypes.includes(t));
    const extraTypes = foundTypes.filter(t => !expectedTypes.includes(t));

    if (missingTypes.length > 0) {
      console.log(`   ${RED}✗ FALHOU: Tipos esperados não encontrados: ${missingTypes.join(', ')}${RESET}`);
      passed = false;
    }
    if (extraTypes.length > 0) {
      console.log(`   ${YELLOW}⚠ AVISO: Tipos extras encontrados: ${extraTypes.join(', ')}${RESET}`);
    }
  }

  if (passed) {
    console.log(`   ${GREEN}✓ PASSOU${RESET}`);
  }

  return passed;
}

async function runTests() {
  console.log('🧪 Teste Completo do Unicode Sanitizer\n');
  console.log('Testando 8 proteções:\n');
  console.log('1. Caracteres NULL');
  console.log('2. BOM no meio do texto');
  console.log('3. Caracteres de controle inválidos');
  console.log('4. Surrogates inválidos');
  console.log('5. Modificadores órfãos (skin tones)');
  console.log('6. ZWJ órfãos');
  console.log('7. Variation Selectors órfãos');
  console.log('8. Private Use Area problemáticos');
  console.log('═'.repeat(60));

  const results: boolean[] = [];

  // Teste 1: Caracteres NULL
  results.push(testCase(
    'Caractere NULL',
    'Texto\0com NULL',
    true,
    ['NULL']
  ));

  // Teste 2: BOM no meio
  results.push(testCase(
    'BOM no meio do texto',
    'Texto\uFEFFcom BOM',
    true,
    ['BOM']
  ));

  // Teste 3: Caracteres de controle
  results.push(testCase(
    'Caracteres de controle inválidos',
    'Texto\x01com\x7Fcontrole',
    true,
    ['CONTROL']
  ));

  // Teste 4a: High surrogate órfão
  results.push(testCase(
    'High surrogate órfão',
    'Texto\uD800órfão',
    true,
    ['HIGH_SURROGATE']
  ));

  // Teste 4b: Low surrogate órfão
  results.push(testCase(
    'Low surrogate órfão',
    'Texto\uDC00órfão',
    true,
    ['LOW_SURROGATE']
  ));

  // Teste 5: Modificador órfão (skin tone)
  results.push(testCase(
    'Modificador órfão (skin tone)',
    'Texto\u{1F3FB}órfão',
    true,
    ['VS_ORPHAN'] // Nota: pode não detectar em todas as implementações
  ));

  // Teste 6a: ZWJ no início
  results.push(testCase(
    'ZWJ no início',
    '\u200DTexto',
    true,
    ['ZWJ_ORPHAN']
  ));

  // Teste 6b: ZWJ no fim
  results.push(testCase(
    'ZWJ no fim',
    'Texto\u200D',
    true,
    ['ZWJ_ORPHAN']
  ));

  // Teste 6c: ZWJ duplicado
  results.push(testCase(
    'ZWJ duplicado',
    'Texto\u200D\u200Dduplicado',
    true,
    ['ZWJ_DUPLICATE']
  ));

  // Teste 7a: VS no início
  results.push(testCase(
    'Variation Selector no início',
    '\uFE0FTexto',
    true,
    ['VS_ORPHAN']
  ));

  // Teste 7b: VS duplicado
  results.push(testCase(
    'Variation Selector duplicado',
    'Texto\uFE0F\uFE0Fduplicado',
    true,
    ['VS_DUPLICATE']
  ));

  // Teste 8: Emojis válidos (não devem ter problemas)
  results.push(testCase(
    'Emoji simples válido',
    'Texto 🤔 emoji',
    false
  ));

  results.push(testCase(
    'Emoji com skin tone válido',
    'Texto 👍🏻 emoji',
    false
  ));

  results.push(testCase(
    'Bandeira válida',
    'Brasil 🇧🇷 flag',
    false
  ));

  results.push(testCase(
    'ZWJ sequence válido (emoji família)',
    'Família 👨‍👩‍👧‍👦',
    false
  ));

  // Teste 9: Casos complexos (múltiplos problemas)
  results.push(testCase(
    'Múltiplos problemas',
    'Texto\0com\uD800vários\x01problemas\uFEFF',
    true,
    ['NULL', 'HIGH_SURROGATE', 'CONTROL', 'BOM']
  ));

  // Teste 10: Texto normal sem problemas
  results.push(testCase(
    'Texto normal sem problemas',
    'Este é um texto completamente normal, sem caracteres problemáticos!',
    false
  ));

  // Resultado final
  console.log('\n' + '═'.repeat(60));
  const passed = results.filter(r => r).length;
  const total = results.length;
  const percentage = (passed / total * 100).toFixed(1);

  console.log(`\n📊 Resultado: ${passed}/${total} testes passaram (${percentage}%)\n`);

  if (passed === total) {
    console.log(`${GREEN}✓ Todos os testes passaram!${RESET}`);
    console.log(`${GREEN}✓ Unicode Sanitizer está funcionando perfeitamente${RESET}\n`);
    process.exit(0);
  } else {
    console.log(`${RED}✗ Alguns testes falharam${RESET}`);
    console.log(`${YELLOW}⚠ Revise os casos que falharam acima${RESET}\n`);
    process.exit(1);
  }
}

// Executar testes
runTests().catch(error => {
  console.error(`${RED}Erro ao executar testes:${RESET}`, error);
  process.exit(1);
});
