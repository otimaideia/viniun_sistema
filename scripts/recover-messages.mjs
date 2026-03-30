#!/usr/bin/env node
/**
 * Script de recuperação de mensagens perdidas.
 * Usa quando o webhook ficou fora do ar e mensagens não foram salvas.
 *
 * Uso:
 *   node scripts/recover-messages.mjs [session1] [session2] ...
 *   node scripts/recover-messages.mjs atendimento_principal mel julia
 *
 * Recupera até 200 mensagens por conversa para todas as conversas da sessão.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://supabase-app.yeslaserpraiagrande.com.br';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MDc4MTc0MCwiZXhwIjo0OTI2NDU1MzQwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.K1j07Xd07FuQHNNXqnwXnWvakPBfUirpKXqB5sZmkTE';
const WAHA_BASE_URL = process.env.WAHA_URL || 'https://waha.yeslaser.com.br';
const WAHA_KEY = process.env.WAHA_API_KEY || 'GY9SDuKPFnJ4_dr';

const SESSIONS = process.argv.slice(2).length > 0
  ? process.argv.slice(2)
  : ['atendimento_principal', 'mel', 'julia'];

const MSG_LIMIT = 200; // Mensagens por conversa

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function log(msg) { console.log(new Date().toISOString().substring(11, 19), msg); }
function err(msg) { console.error(new Date().toISOString().substring(11, 19), '❌', msg); }

function sanitize(value) {
  if (typeof value === 'string') return value.replace(/[\uD800-\uDFFF]/g, '?');
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sanitize(v)]));
  }
  return value;
}

async function wahaGet(path) {
  const url = `${WAHA_BASE_URL}${path}`;
  const res = await fetch(url, { headers: { 'X-Api-Key': WAHA_KEY } });
  if (!res.ok) throw new Error(`WAHA ${path} → ${res.status}`);
  return res.json();
}

async function recoverSession(sessionName) {
  log(`🔍 Recuperando mensagens para sessão: ${sessionName}`);

  // Buscar sessão no banco
  const { data: sessao, error: sessaoErr } = await supabase
    .from('mt_whatsapp_sessions')
    .select('id, tenant_id, franchise_id')
    .eq('session_name', sessionName)
    .maybeSingle();

  if (sessaoErr || !sessao) {
    err(`Sessão "${sessionName}" não encontrada.`);
    return;
  }

  const { id: sessaoId, tenant_id: tenantId } = sessao;
  log(`📋 Sessão ID: ${sessaoId}`);

  // Buscar todas as conversas dessa sessão
  const { data: conversas, error: convErr } = await supabase
    .from('mt_whatsapp_conversations')
    .select('id, chat_id, contact_name')
    .eq('session_id', sessaoId)
    .order('last_message_at', { ascending: false });

  if (convErr || !conversas || conversas.length === 0) {
    err(`Nenhuma conversa encontrada para sessão "${sessionName}".`);
    return;
  }

  log(`📦 ${conversas.length} conversas a recuperar...`);

  let totalMsgs = 0, totalConvsUpdated = 0, errors = 0;

  for (let i = 0; i < conversas.length; i++) {
    const conv = conversas[i];

    try {
      // Buscar mensagens do WAHA
      const msgs = await wahaGet(
        `/api/${sessionName}/chats/${encodeURIComponent(conv.chat_id)}/messages?limit=${MSG_LIMIT}&downloadMedia=false&sortOrder=desc`
      );

      if (!msgs || msgs.length === 0) continue;

      // Preparar para upsert
      const toInsert = msgs
        .filter(m => m.id)
        .map(m => {
          const msgId = typeof m.id === 'string' ? m.id : m.id?._serialized || '';
          if (!msgId) return null;
          return {
            tenant_id: tenantId,
            session_id: sessaoId,
            conversation_id: conv.id,
            message_id: msgId,
            from_me: m.fromMe ?? false,
            tipo: m.type || 'chat',
            body: m.body || null,
            ack: m.ack ?? 0,
            timestamp: m.timestamp ? new Date(m.timestamp * 1000).toISOString() : new Date().toISOString(),
          };
        })
        .filter(Boolean);

      if (toInsert.length === 0) continue;

      // Upsert em batches de 100
      for (let j = 0; j < toInsert.length; j += 100) {
        const batch = toInsert.slice(j, j + 100);
        const { error: upsertErr } = await supabase
          .from('mt_whatsapp_messages')
          .upsert(sanitize(batch), { onConflict: 'message_id', ignoreDuplicates: false });

        if (upsertErr) {
          err(`Upsert falhou para conversa ${conv.chat_id}: ${upsertErr.message}`);
          errors++;
          continue;
        }
      }

      totalMsgs += toInsert.length;
      totalConvsUpdated++;

      // Atualizar last_message_at da conversa
      const newest = msgs.filter(m => m.timestamp).sort((a, b) => b.timestamp - a.timestamp)[0];
      if (newest?.timestamp) {
        await supabase
          .from('mt_whatsapp_conversations')
          .update({ last_message_at: new Date(newest.timestamp * 1000).toISOString() })
          .eq('id', conv.id);
      }

    } catch (e) {
      // Chat pode não existir mais no WAHA — silencioso
      if (!e.message.includes('404') && !e.message.includes('400')) {
        err(`Chat ${conv.chat_id}: ${e.message}`);
        errors++;
      }
    }

    // Progresso a cada 50 conversas
    if ((i + 1) % 50 === 0 || i + 1 === conversas.length) {
      const pct = Math.round(((i + 1) / conversas.length) * 100);
      log(`📈 ${i + 1}/${conversas.length} (${pct}%) | Msgs recuperadas: ${totalMsgs} | Erros: ${errors}`);
    }

    // Pequena pausa para não sobrecarregar o WAHA
    await new Promise(r => setTimeout(r, 50));
  }

  log(`✅ Sessão "${sessionName}" concluída:`);
  log(`   Conversas processadas: ${totalConvsUpdated}`);
  log(`   Mensagens recuperadas/atualizadas: ${totalMsgs}`);
  log(`   Erros: ${errors}`);
}

// Executar para todas as sessões
(async () => {
  log(`🚀 Recuperação de mensagens iniciada para: ${SESSIONS.join(', ')}`);

  for (const session of SESSIONS) {
    await recoverSession(session);
    log('');
  }

  log('🏁 Recuperação completa!');
})().catch(e => {
  err(`Erro fatal: ${e.message}`);
  process.exit(1);
});
