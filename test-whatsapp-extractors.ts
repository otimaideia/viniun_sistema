/**
 * Teste para validar funções de extração de contatos do WhatsApp
 * Execute com: npx ts-node test-whatsapp-extractors.ts
 * ou: deno run test-whatsapp-extractors.ts
 */

import {
  extractContactName,
  extractPhoneFromChatId,
  normalizeChatId,
  formatPhoneNumber,
  isPhoneNumber,
  isGroupChat,
  extractContactData,
  shouldUpdateContactName,
} from './src/utils/whatsapp/extractors.ts';

// ANSI color codes para output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  testsRun++;
  if (condition) {
    testsPassed++;
    console.log(`${GREEN}✓${RESET} ${testName}`);
  } else {
    testsFailed++;
    console.log(`${RED}✗${RESET} ${testName}`);
    if (details) {
      console.log(`  ${YELLOW}${details}${RESET}`);
    }
  }
}

console.log('\n=== TESTES DE EXTRAÇÃO DE CONTATOS DO WHATSAPP ===\n');

// === TESTE 1: isPhoneNumber ===
console.log('--- isPhoneNumber ---');
assert(isPhoneNumber('+5513991234567'), 'Detecta telefone com código internacional');
assert(isPhoneNumber('(13) 99123-4567'), 'Detecta telefone formatado BR');
assert(isPhoneNumber('13 99123-4567'), 'Detecta telefone com espaço');
assert(isPhoneNumber('13991234567'), 'Detecta telefone sem formatação');
assert(!isPhoneNumber('João Silva'), 'Rejeita nome comum');
assert(!isPhoneNumber('Maria Santos'), 'Rejeita nome com sobrenome');
assert(!isPhoneNumber(''), 'Rejeita string vazia');

// === TESTE 2: extractContactName ===
console.log('\n--- extractContactName ---');

// Caso 1: Nome válido em pushName
const payload1 = { pushName: 'João Silva' };
const name1 = extractContactName(payload1);
assert(name1 === 'João Silva', 'Extrai de pushName', `Esperado: "João Silva", Recebido: "${name1}"`);

// Caso 2: Nome válido em notifyName
const payload2 = { notifyName: 'Maria Santos' };
const name2 = extractContactName(payload2);
assert(name2 === 'Maria Santos', 'Extrai de notifyName', `Esperado: "Maria Santos", Recebido: "${name2}"`);

// Caso 3: Número de telefone não deve ser usado como nome
const payload3 = { pushName: '5513991234567' };
const name3 = extractContactName(payload3, '5513991234567');
assert(name3 === '5513991234567', 'Não usa telefone como nome (retorna fallback)', `Recebido: "${name3}"`);

// Caso 4: Prioriza name sobre pushName
const payload4 = { name: 'Ana Costa', pushName: 'Ana' };
const name4 = extractContactName(payload4);
assert(name4 === 'Ana Costa', 'Prioriza name sobre pushName', `Esperado: "Ana Costa", Recebido: "${name4}"`);

// Caso 5: Fallback em _data.pushName
const payload5 = { _data: { pushName: 'Pedro Oliveira' } };
const name5 = extractContactName(payload5);
assert(name5 === 'Pedro Oliveira', 'Extrai de _data.pushName', `Recebido: "${name5}"`);

// Caso 6: Múltiplas fontes com telefone
const payload6 = {
  pushName: '+55 13 99123-4567',
  notifyName: 'Carlos Lima',
};
const name6 = extractContactName(payload6);
assert(name6 === 'Carlos Lima', 'Pula telefone e usa próximo válido', `Esperado: "Carlos Lima", Recebido: "${name6}"`);

// === TESTE 3: extractPhoneFromChatId ===
console.log('\n--- extractPhoneFromChatId ---');

const phone1 = extractPhoneFromChatId('5513991234567@c.us');
assert(phone1 === '5513991234567', 'Remove @c.us', `Recebido: "${phone1}"`);

const phone2 = extractPhoneFromChatId('5513991234567@s.whatsapp.net');
assert(phone2 === '5513991234567', 'Remove @s.whatsapp.net', `Recebido: "${phone2}"`);

const phone3 = extractPhoneFromChatId('5513991234567@g.us');
assert(phone3 === '5513991234567', 'Remove @g.us', `Recebido: "${phone3}"`);

const phone4 = extractPhoneFromChatId('5513991234567@lid');
assert(phone4 === '5513991234567', 'Remove @lid', `Recebido: "${phone4}"`);

// === TESTE 4: normalizeChatId ===
console.log('\n--- normalizeChatId ---');

const chatId1 = normalizeChatId('5513991234567@s.whatsapp.net');
assert(chatId1 === '5513991234567@c.us', 'Converte @s.whatsapp.net para @c.us', `Recebido: "${chatId1}"`);

const chatId2 = normalizeChatId('5513991234567@lid');
assert(chatId2 === '5513991234567@c.us', 'Converte @lid para @c.us', `Recebido: "${chatId2}"`);

const chatId3 = normalizeChatId('120363354876543210@g.us');
assert(chatId3 === '120363354876543210@g.us', 'Mantém @g.us para grupos', `Recebido: "${chatId3}"`);

const chatId4 = normalizeChatId('5513991234567');
assert(chatId4 === '5513991234567@c.us', 'Adiciona @c.us se ausente', `Recebido: "${chatId4}"`);

// === TESTE 5: formatPhoneNumber ===
console.log('\n--- formatPhoneNumber ---');

const formatted1 = formatPhoneNumber('013991234567');
assert(formatted1 === '5513991234567', 'Remove zero à esquerda', `Recebido: "${formatted1}"`);

const formatted2 = formatPhoneNumber('13991234567');
assert(formatted2 === '5513991234567', 'Adiciona código do país', `Recebido: "${formatted2}"`);

const formatted3 = formatPhoneNumber('5513991234567');
assert(formatted3 === '5513991234567', 'Mantém se já tem código', `Recebido: "${formatted3}"`);

// === TESTE 6: isGroupChat ===
console.log('\n--- isGroupChat ---');

assert(isGroupChat('120363354876543210@g.us'), 'Detecta grupo');
assert(!isGroupChat('5513991234567@c.us'), 'Rejeita chat individual');

// === TESTE 7: extractContactData ===
console.log('\n--- extractContactData ---');

const data1 = extractContactData({
  from: '5513991234567@s.whatsapp.net',
  fromMe: false,
  payload: { pushName: 'Teste User' },
});
assert(data1.chatId === '5513991234567@c.us', 'extractContactData: normaliza chatId');
assert(data1.phoneNumber === '5513991234567', 'extractContactData: extrai telefone');
assert(data1.contactName === 'Teste User', 'extractContactData: extrai nome');
assert(data1.isGroup === false, 'extractContactData: detecta não-grupo');

const data2 = extractContactData({
  chatId: '120363354876543210@g.us',
  fromMe: true,
  payload: { name: 'Grupo Teste' },
});
assert(data2.isGroup === true, 'extractContactData: detecta grupo');

// === TESTE 8: shouldUpdateContactName ===
console.log('\n--- shouldUpdateContactName ---');

assert(shouldUpdateContactName('', 'João Silva'), 'Atualiza quando nome atual vazio');
assert(shouldUpdateContactName(null, 'Maria Santos'), 'Atualiza quando nome atual null');
assert(!shouldUpdateContactName('Pedro Lima', 'Carlos Costa'), 'Não atualiza quando já tem nome');
assert(!shouldUpdateContactName('', '5513991234567'), 'Não atualiza com telefone');
assert(!shouldUpdateContactName(null, '+55 13 99123-4567'), 'Não atualiza com telefone formatado');

// === RESUMO ===
console.log('\n=== RESUMO DOS TESTES ===');
console.log(`Total: ${testsRun}`);
console.log(`${GREEN}Passaram: ${testsPassed}${RESET}`);
console.log(`${RED}Falharam: ${testsFailed}${RESET}`);

if (testsFailed === 0) {
  console.log(`\n${GREEN}✓ Todos os testes passaram!${RESET}\n`);
  process.exit(0);
} else {
  console.log(`\n${RED}✗ Alguns testes falharam${RESET}\n`);
  process.exit(1);
}
