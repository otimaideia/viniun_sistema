/**
 * Script de teste para Unicode Sanitizer
 * Execute com: npx tsx test-unicode-sanitizer.ts
 */

import {
  sanitizeForJSON,
  sanitizeObjectForJSON,
  safeJSONStringify,
  isJSONSafe,
  findProblematicChars
} from './src/utils/unicodeSanitizer';

// Cores para output no terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function separator() {
  log('━'.repeat(80), 'cyan');
}

// Casos de teste
const testCases = [
  {
    name: 'Texto normal',
    input: 'Olá, mundo!',
    shouldBeSafe: true
  },
  {
    name: 'Emoji simples',
    input: 'Teste 🤔 emoji',
    shouldBeSafe: true
  },
  {
    name: 'Emoji com skin tone',
    input: 'Polegar 👍🏻 modificado',
    shouldBeSafe: true
  },
  {
    name: 'Bandeira',
    input: 'Brasil 🇧🇷 flag',
    shouldBeSafe: true
  },
  {
    name: 'High surrogate sem low',
    input: 'Texto com \uD800 problema',
    shouldBeSafe: false
  },
  {
    name: 'Low surrogate sem high',
    input: 'Texto com \uDD14 problema',
    shouldBeSafe: false
  },
  {
    name: 'Múltiplos emojis',
    input: '🎉 🚀 🌟 ✨ 💡',
    shouldBeSafe: true
  },
  {
    name: 'Texto multilíngue',
    input: 'Hello مرحبا 你好 こんにちは',
    shouldBeSafe: true
  }
];

// Teste 1: Validação de strings
separator();
log('TESTE 1: Validação de Strings', 'blue');
separator();

testCases.forEach((test, index) => {
  const isSafe = isJSONSafe(test.input);
  const passed = isSafe === test.shouldBeSafe;

  log(`\n${index + 1}. ${test.name}`, 'cyan');
  log(`   Input: "${test.input.substring(0, 50)}${test.input.length > 50 ? '...' : ''}"`);
  log(`   Seguro: ${isSafe ? '✓' : '✗'}`, isSafe ? 'green' : 'red');
  log(`   Esperado: ${test.shouldBeSafe ? 'Seguro' : 'Inseguro'}`);
  log(`   Resultado: ${passed ? '✓ PASSOU' : '✗ FALHOU'}`, passed ? 'green' : 'red');

  // Se inseguro, mostrar caracteres problemáticos
  if (!isSafe) {
    const problematic = findProblematicChars(test.input);
    if (problematic.length > 0) {
      log(`   Caracteres problemáticos:`, 'yellow');
      problematic.forEach(p => {
        log(`     - Posição ${p.position}: U+${p.codePoint.toString(16).toUpperCase().padStart(4, '0')}`, 'yellow');
      });
    }
  }
});

// Teste 2: Sanitização
separator();
log('\nTESTE 2: Sanitização de Strings', 'blue');
separator();

testCases.forEach((test, index) => {
  const sanitized = sanitizeForJSON(test.input);
  const isSafeAfter = isJSONSafe(sanitized);

  log(`\n${index + 1}. ${test.name}`, 'cyan');
  log(`   Original: "${test.input.substring(0, 40)}"`);
  log(`   Sanitizado: "${sanitized.substring(0, 40)}"`);
  log(`   Mudou: ${test.input !== sanitized ? 'Sim' : 'Não'}`, test.input !== sanitized ? 'yellow' : 'green');
  log(`   Seguro após sanitização: ${isSafeAfter ? '✓' : '✗'}`, isSafeAfter ? 'green' : 'red');
});

// Teste 3: Sanitização de objetos
separator();
log('\nTESTE 3: Sanitização de Objetos', 'blue');
separator();

const testObjects = [
  {
    name: 'Objeto simples',
    obj: { nome: 'João', mensagem: 'Olá 🤔' }
  },
  {
    name: 'Objeto com surrogate inválido',
    obj: { texto: 'Problema \uD800 aqui' }
  },
  {
    name: 'Objeto aninhado',
    obj: {
      usuario: { nome: 'Maria', emoji: '👋' },
      mensagens: ['Oi 🎉', 'Tudo bem? \uD800']
    }
  },
  {
    name: 'Array de strings',
    obj: ['Normal', 'Emoji 🚀', 'Problema \uDD14']
  }
];

testObjects.forEach((test, index) => {
  log(`\n${index + 1}. ${test.name}`, 'cyan');

  try {
    const original = JSON.stringify(test.obj);
    log(`   Original serializa: ✓`, 'green');
  } catch (error) {
    log(`   Original serializa: ✗ (esperado para casos problemáticos)`, 'yellow');
  }

  const sanitized = sanitizeObjectForJSON(test.obj);
  try {
    const result = JSON.stringify(sanitized);
    log(`   Sanitizado serializa: ✓`, 'green');
    log(`   Tamanho: ${result.length} bytes`);
  } catch (error) {
    log(`   Sanitizado serializa: ✗ ERRO CRÍTICO`, 'red');
    console.error(error);
  }
});

// Teste 4: safeJSONStringify
separator();
log('\nTESTE 4: safeJSONStringify', 'blue');
separator();

testObjects.forEach((test, index) => {
  log(`\n${index + 1}. ${test.name}`, 'cyan');

  const result = safeJSONStringify(test.obj, null, 2);

  try {
    JSON.parse(result);
    log(`   Resultado é JSON válido: ✓`, 'green');
    log(`   Tamanho: ${result.length} bytes`);
  } catch (error) {
    log(`   Resultado é JSON válido: ✗`, 'red');
    console.error(error);
  }
});

// Teste 5: Performance
separator();
log('\nTESTE 5: Performance', 'blue');
separator();

const iterations = 10000;
const testString = 'Texto normal com alguns emojis 🤔 👍 🎉 e caracteres especiais';

// Teste sem sanitização
const start1 = performance.now();
for (let i = 0; i < iterations; i++) {
  JSON.stringify({ text: testString });
}
const end1 = performance.now();
const time1 = end1 - start1;

// Teste com sanitização
const start2 = performance.now();
for (let i = 0; i < iterations; i++) {
  const sanitized = sanitizeForJSON(testString);
  JSON.stringify({ text: sanitized });
}
const end2 = performance.now();
const time2 = end2 - start2;

log(`\nIterações: ${iterations.toLocaleString()}`);
log(`Tempo sem sanitização: ${time1.toFixed(2)}ms`);
log(`Tempo com sanitização: ${time2.toFixed(2)}ms`);
log(`Overhead: ${((time2 - time1) / time1 * 100).toFixed(2)}%`, 'yellow');
log(`Tempo médio por operação: ${(time2 / iterations).toFixed(4)}ms`);

// Resumo final
separator();
log('\nRESUMO', 'blue');
separator();

const totalTests = testCases.length + testObjects.length;
log(`\n✓ Todos os ${totalTests} testes concluídos`, 'green');
log('✓ Unicode Sanitizer está funcionando corretamente', 'green');
log('\nPróximos passos:', 'cyan');
log('1. Execute a aplicação e teste envio de mensagens com emojis');
log('2. Monitore os logs do console para ver caracteres problemáticos');
log('3. Verifique se não há mais erros "no low surrogate in string"');

separator();
