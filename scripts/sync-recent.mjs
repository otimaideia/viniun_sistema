#!/usr/bin/env node
/**
 * sync-recent.mjs — Daemon de sincronização de mensagens recentes.
 * ZERO dependências externas — usa fetch nativo do Node 20.
 *
 * Funciona em DOIS modos:
 *
 * 1. MODO FILA: Processa eventos salvos em mt_webhook_queue que
 *    não foram processados pela edge function (cold start / timeout).
 *
 * 2. MODO POLL: Busca mensagens recentes do WAHA para conversas
 *    que tiveram atividade nos últimos 15 minutos e atualiza o banco.
 *
 * Uso:
 *   node sync-recent.mjs           # daemon contínuo (2min)
 *   node sync-recent.mjs --once    # executa uma vez e sai
 *
 * Cron (a cada 2 minutos):
 *   Editar com: crontab -e
 *   Adicionar: STAR/2 * * * * /usr/bin/node /root/sync-recent.mjs --once >> /var/log/whasync.log 2>&1
 *   (substituir STAR por asterisco)
 */

// =============================================================================
// CONFIG
// =============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://supabase-app.yeslaserpraiagrande.com.br';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MDc4MTc0MCwiZXhwIjo0OTI2NDU1MzQwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.K1j07Xd07FuQHNNXqnwXnWvakPBfUirpKXqB5sZmkTE';
const WAHA_BASE_URL = process.env.WAHA_URL || 'https://waha.yeslaser.com.br';
const WAHA_KEY = process.env.WAHA_API_KEY || 'GY9SDuKPFnJ4_dr';

const RECENT_WINDOW_MINUTES = 15;
const MSG_LIMIT = 50;
const DAEMON_INTERVAL_MS = 2 * 60 * 1000;
const QUEUE_BATCH_SIZE = 200;

const IS_ONCE = process.argv.includes('--once');

function log(msg) { console.log(`[${new Date().toISOString().substring(11, 19)}]`, msg); }
function err(msg) { console.error(`[${new Date().toISOString().substring(11, 19)}] ERR`, msg); }

function sanitize(value) {
  if (typeof value === 'string') return value.replace(/[\uD800-\uDFFF]/g, '?');
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sanitize(v)]));
  }
  return value;
}

// =============================================================================
// SUPABASE REST API (sem dependências)
// =============================================================================

const SB_HEADERS = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_SERVICE_KEY,
  'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
};

async function sbSelect(table, params = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`;
  const res = await fetch(url, { headers: SB_HEADERS });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SB SELECT ${table}: ${res.status} ${text}`);
  }
  return res.json();
}

async function sbSelectSingle(table, params = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params}&limit=1`;
  const res = await fetch(url, {
    headers: { ...SB_HEADERS, 'Accept': 'application/vnd.pgrst.object+json' },
  });
  if (res.status === 406) return null; // not found
  if (!res.ok) {
    const text = await res.text();
    // 406 means no rows found, which is acceptable
    if (res.status === 406) return null;
    throw new Error(`SB SINGLE ${table}: ${res.status} ${text}`);
  }
  return res.json();
}

async function sbInsert(table, data, options = {}) {
  const headers = { ...SB_HEADERS, 'Prefer': 'return=representation' };
  if (options.upsert) {
    headers['Prefer'] = `return=representation,resolution=merge-duplicates`;
  }
  if (options.ignoreDuplicates) {
    headers['Prefer'] = `return=minimal,resolution=ignore-duplicates`;
  }
  if (options.onConflict) {
    // Use query param for onConflict column
  }
  let url = `${SUPABASE_URL}/rest/v1/${table}`;
  if (options.onConflict) {
    url += `?on_conflict=${options.onConflict}`;
  }
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    // Duplicate key is acceptable for upserts
    if (res.status === 409) return null;
    throw new Error(`SB INSERT ${table}: ${res.status} ${text}`);
  }
  if (options.ignoreDuplicates) return null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('json')) return res.json();
  return null;
}

async function sbUpdate(table, data, filters) {
  let url = `${SUPABASE_URL}/rest/v1/${table}?${filters}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { ...SB_HEADERS, 'Prefer': 'return=minimal' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SB UPDATE ${table}: ${res.status} ${text}`);
  }
}

async function sbDelete(table, filters) {
  let url = `${SUPABASE_URL}/rest/v1/${table}?${filters}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: SB_HEADERS,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SB DELETE ${table}: ${res.status} ${text}`);
  }
}

// =============================================================================
// WAHA API
// =============================================================================

async function wahaGet(path) {
  const url = `${WAHA_BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { 'X-Api-Key': WAHA_KEY },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`WAHA ${path} -> ${res.status}`);
  return res.json();
}

// =============================================================================
// PARTE 1: Processar eventos da fila (mt_webhook_queue)
// =============================================================================

async function extractAndSaveMessage(payload, sessao) {
  const msg = payload.payload;
  if (!msg?.id) return;

  const chatId = msg.fromMe ? msg.to : msg.from;
  if (!chatId || chatId.endsWith('@g.us')) return;

  const messageId = typeof msg.id === 'string' ? msg.id : String(msg.id);
  const messageTimestamp = msg.timestamp
    ? new Date(msg.timestamp * 1000).toISOString()
    : new Date().toISOString();

  // Buscar conversa existente
  let conversa = null;
  try {
    conversa = await sbSelectSingle(
      'mt_whatsapp_conversations',
      `select=id&session_id=eq.${sessao.id}&chat_id=eq.${encodeURIComponent(chatId)}`
    );
  } catch (e) {
    // 406 = not found, will create below
    conversa = null;
  }

  if (!conversa) {
    try {
      const results = await sbInsert('mt_whatsapp_conversations', {
        tenant_id: sessao.tenant_id,
        franchise_id: sessao.franchise_id || null,
        session_id: sessao.id,
        chat_id: chatId,
        contact_name: msg.notifyName || msg.pushName || null,
        is_group: false,
        last_message_at: messageTimestamp,
        unread_count: msg.fromMe ? 0 : 1,
      });
      conversa = Array.isArray(results) ? results[0] : results;
    } catch (e) {
      // Pode já existir (race condition) — buscar de novo
      try {
        conversa = await sbSelectSingle(
          'mt_whatsapp_conversations',
          `select=id&session_id=eq.${sessao.id}&chat_id=eq.${encodeURIComponent(chatId)}`
        );
      } catch (e2) {
        return;
      }
    }
  } else {
    await sbUpdate(
      'mt_whatsapp_conversations',
      { last_message_at: messageTimestamp, updated_at: new Date().toISOString() },
      `id=eq.${conversa.id}`
    );
  }

  if (!conversa?.id) return;

  // Upsert mensagem
  const body = msg.body || msg.text?.body || msg._data?.body || null;
  await sbInsert('mt_whatsapp_messages', sanitize({
    tenant_id: sessao.tenant_id,
    session_id: sessao.id,
    conversation_id: conversa.id,
    message_id: messageId,
    from_me: msg.fromMe ?? false,
    tipo: msg.type || 'chat',
    body: body,
    ack: msg.fromMe ? 1 : 0,
    timestamp: messageTimestamp,
  }), { onConflict: 'message_id', ignoreDuplicates: true });
}

async function processQueue() {
  let events;
  try {
    events = await sbSelect(
      'mt_webhook_queue',
      `select=*&processed=eq.false&retry_count=lt.3&order=received_at.asc&limit=${QUEUE_BATCH_SIZE}`
    );
  } catch (e) {
    err(`Erro ao ler fila: ${e.message}`);
    return 0;
  }

  if (!events || events.length === 0) return 0;

  log(`Processando ${events.length} eventos da fila...`);
  let processed = 0;

  for (const event of events) {
    try {
      if (event.event_type === 'message.any' || event.event_type === 'message') {
        // Buscar sessão
        const sessao = await sbSelectSingle(
          'mt_whatsapp_sessions',
          `select=id,tenant_id,franchise_id&session_name=eq.${encodeURIComponent(event.session_name)}`
        );

        if (sessao) {
          await extractAndSaveMessage(event.payload, sessao);
        }
      }

      // Marcar como processado
      await sbUpdate(
        'mt_webhook_queue',
        { processed: true, processed_at: new Date().toISOString() },
        `id=eq.${event.id}`
      );
      processed++;
    } catch (e) {
      err(`Evento ${event.id}: ${e.message}`);
      await sbUpdate(
        'mt_webhook_queue',
        { retry_count: (event.retry_count || 0) + 1, error_msg: e.message },
        `id=eq.${event.id}`
      );
    }
  }

  if (processed > 0) log(`Fila: ${processed} eventos processados`);
  return processed;
}

async function cleanupQueue() {
  try {
    // 1. Deletar processados com mais de 3 dias (não precisa 7)
    const cutoff3d = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    await sbDelete('mt_webhook_queue', `processed=eq.true&processed_at=lt.${cutoff3d}`);

    // 2. Deletar falhas permanentes (retry >= 3) com mais de 24h
    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await sbDelete('mt_webhook_queue', `retry_count=gte.3&received_at=lt.${cutoff24h}`);

    log('Cleanup da fila executado');
  } catch (e) {
    // Silenciar erro de cleanup
  }
}

// Hard limit: se fila > 5000 registros, forçar cleanup imediato
async function checkQueueSize() {
  try {
    const rows = await sbSelect('mt_webhook_queue', 'select=id&limit=1&offset=5000');
    if (rows && rows.length > 0) {
      log('ALERTA: Fila > 5000 registros, forcando cleanup...');
      await cleanupQueue();
      // Se ainda grande, deletar processados mais antigos que 1 dia
      const cutoff1d = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await sbDelete('mt_webhook_queue', `processed=eq.true&processed_at=lt.${cutoff1d}`);
    }
  } catch (e) {
    // Silenciar
  }
}

// =============================================================================
// PARTE 2: Poll de conversas recentes do WAHA
// =============================================================================

async function syncRecentConversations() {
  const since = new Date(Date.now() - RECENT_WINDOW_MINUTES * 60 * 1000).toISOString();

  let sessions;
  try {
    sessions = await sbSelect(
      'mt_whatsapp_sessions',
      'select=id,session_name,tenant_id,franchise_id&status=eq.working'
    );
  } catch (e) {
    err(`Erro ao buscar sessões: ${e.message}`);
    return;
  }

  if (!sessions || sessions.length === 0) return;

  let totalMsgs = 0;

  for (const sessao of sessions) {
    let convs;
    try {
      convs = await sbSelect(
        'mt_whatsapp_conversations',
        `select=id,chat_id,contact_name&session_id=eq.${sessao.id}&last_message_at=gte.${since}&is_group=eq.false`
      );
    } catch (e) {
      continue;
    }

    if (!convs || convs.length === 0) continue;

    log(`[${sessao.session_name}] ${convs.length} conversas ativas nos ultimos ${RECENT_WINDOW_MINUTES}min`);

    for (const conv of convs) {
      try {
        const msgs = await wahaGet(
          `/api/${sessao.session_name}/chats/${encodeURIComponent(conv.chat_id)}/messages?limit=${MSG_LIMIT}&downloadMedia=false&sortOrder=desc`
        );

        if (!msgs || msgs.length === 0) continue;

        const toInsert = msgs
          .filter(m => m.id && m.timestamp)
          .map(m => {
            const msgId = typeof m.id === 'string' ? m.id : m.id?._serialized || '';
            if (!msgId) return null;
            const body = m.body || m.text?.body || null;
            return sanitize({
              tenant_id: sessao.tenant_id,
              session_id: sessao.id,
              conversation_id: conv.id,
              message_id: msgId,
              from_me: m.fromMe ?? false,
              tipo: m.type || 'chat',
              body: body,
              ack: m.ack ?? 0,
              timestamp: new Date(m.timestamp * 1000).toISOString(),
            });
          })
          .filter(Boolean);

        if (toInsert.length === 0) continue;

        try {
          await sbInsert('mt_whatsapp_messages', toInsert, {
            onConflict: 'message_id',
            ignoreDuplicates: true,
          });
          totalMsgs += toInsert.length;
        } catch (e) {
          // ignorar erros de upsert
        }

        // Atualizar last_message_at da conversa
        const newest = msgs
          .filter(m => m.timestamp)
          .sort((a, b) => b.timestamp - a.timestamp)[0];
        if (newest?.timestamp) {
          await sbUpdate(
            'mt_whatsapp_conversations',
            { last_message_at: new Date(newest.timestamp * 1000).toISOString() },
            `id=eq.${conv.id}`
          );
        }
      } catch (e) {
        if (!e.message.includes('404') && !e.message.includes('400')) {
          err(`[${sessao.session_name}] ${conv.chat_id}: ${e.message}`);
        }
      }

      // Pausa para não sobrecarregar WAHA
      await new Promise(r => setTimeout(r, 100));
    }
  }

  if (totalMsgs > 0) log(`Poll: ${totalMsgs} mensagens verificadas/atualizadas`);
}

// =============================================================================
// MAIN
// =============================================================================

async function runOnce() {
  const start = Date.now();

  // 1. Processar fila de eventos perdidos
  await processQueue();

  // 2. Sync de conversas recentes via poll
  await syncRecentConversations();

  // 3. Limpeza periódica (10% chance = ~1x/hora com cron de 2min)
  if (Math.random() < 0.10) await cleanupQueue();

  // 4. Verificar hard limit da fila (1% chance)
  if (Math.random() < 0.01) await checkQueueSize();

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  log(`Ciclo completo em ${elapsed}s`);
}

if (IS_ONCE) {
  runOnce()
    .then(() => process.exit(0))
    .catch(e => { err(`Fatal: ${e.message}`); process.exit(1); });
} else {
  log(`Daemon iniciado (intervalo: ${DAEMON_INTERVAL_MS / 1000}s)`);
  runOnce();
  setInterval(runOnce, DAEMON_INTERVAL_MS);
}
