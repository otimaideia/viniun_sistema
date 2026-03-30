#!/usr/bin/env node
/**
 * Script standalone para sincronizar conversas WhatsApp do WAHA para o Supabase.
 * Executa independentemente do navegador — sobrevive a erros e reinicializações.
 *
 * Uso:
 *   node scripts/sync-whatsapp.mjs [session_name]
 *
 * Se session_name não for especificado, sincroniza atendimento_principal.
 *
 * CREDENCIAIS: Preferencialmente usar variáveis de ambiente:
 *   export SUPABASE_URL="https://supabase-app.yeslaserpraiagrande.com.br"
 *   export SUPABASE_SERVICE_KEY="sua_service_role_key"
 *   export WAHA_URL="https://waha.yeslaser.com.br"
 *   export WAHA_API_KEY="sua_waha_api_key"
 *
 * Fallback: valores hardcoded abaixo para compatibilidade (manter apenas em dev local)
 */

import { createClient } from '@supabase/supabase-js';

// =============================================================================
// CONFIG
// =============================================================================

// Carregar de env vars (preferencial) ou usar valores padrão (legacy)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://supabase-app.yeslaserpraiagrande.com.br';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SERVICE_ROLE_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MDc4MTc0MCwiZXhwIjo0OTI2NDU1MzQwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.K1j07Xd07FuQHNNXqnwXnWvakPBfUirpKXqB5sZmkTE';
const WAHA_BASE_URL = process.env.WAHA_URL || 'https://waha.yeslaser.com.br';
const WAHA_KEY = process.env.WAHA_API_KEY || 'GY9SDuKPFnJ4_dr'; // manter o valor atual como fallback

// Session a sincronizar (argumento ou padrão)
const TARGET_SESSION = process.argv[2] || 'atendimento_principal';

// =============================================================================
// HELPERS
// =============================================================================

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function log(msg) { console.log(new Date().toISOString().substring(11, 19), msg); }
function err(msg) { console.error(new Date().toISOString().substring(11, 19), '❌', msg); }

/** Remove caracteres surrogate inválidos do JSON (vindos do WhatsApp) */
function sanitize(value) {
  if (typeof value === 'string') {
    return value.replace(/[\uD800-\uDFFF]/g, '?');
  }
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sanitize(v)]));
  }
  return value;
}

/** Gera avatar padrão */
function avatar(name) {
  const clean = encodeURIComponent((name || 'C').substring(0, 2));
  return `https://ui-avatars.com/api/?name=${clean}&background=E91E63&color=fff&size=128`;
}

/** Limpa número de telefone */
function cleanPhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

/** Verifica se uma string é um número de telefone (não nome real) */
function isPhoneNumber(value) {
  if (!value) return false;
  const cleaned = value.replace(/\s+/g, '');
  const phonePattern = /^[\+\(]?[\d\s\-()]+$/;
  const digitCount = (cleaned.match(/\d/g) || []).length;
  return phonePattern.test(cleaned) && digitCount >= 8;
}

/**
 * Extrai nome do contato de múltiplas fontes (8+)
 * Mesmo algoritmo do extractors.ts do frontend
 */
function extractContactName(data, fallback) {
  if (!data) return fallback || null;
  const sources = [
    data.name,
    data.pushName,
    data.pushname,
    data.notifyName,
    data.contact?.name,
    data.contact?.pushName,
    data._data?.pushName,
    data._data?.notifyName,
    // também tenta nas fontes do lastMessage
    data.lastMessage?.pushName,
    data.lastMessage?._data?.pushName,
    data.lastMessage?._data?.notifyName,
  ];
  for (const n of sources) {
    if (n && typeof n === 'string' && n.trim() && !isPhoneNumber(n.trim())) {
      return n.trim();
    }
  }
  return fallback || null;
}

/** Extrai telefone do chatId e dados do chat */
function extractPhone(chatId, chatData, engine = 'NOWEB') {
  // Grupos nunca têm telefone
  if (chatId.includes('@g.us')) return null;

  // chatId é @c.us → número está antes do @
  // Funciona em todos os engines (GOWS nativo, NOWEB também possível)
  if (chatId.includes('@c.us') || chatId.includes('@s.whatsapp.net')) {
    return cleanPhone(chatId.split('@')[0]);
  }

  // @lid — apenas NOWEB; GOWS não deveria gerar esse formato
  if (chatId.includes('@lid')) {
    if (engine === 'GOWS') {
      console.warn(`[sync] GOWS session com chat @lid inesperado: ${chatId}`);
    }

    // Campos diretos no chatData (NOWEB às vezes preenche)
    for (const field of ['phone', 'phoneNumber', 'number']) {
      if (chatData[field]) {
        const p = cleanPhone(chatData[field]);
        if (p) return p;
      }
    }

    // remoteJidAlt na última mensagem — principal fonte para @lid no NOWEB
    const lastMsg = chatData.lastMessage || chatData._data;
    if (lastMsg?._data?.key?.remoteJidAlt) {
      const jid = lastMsg._data.key.remoteJidAlt;
      if (!jid.includes('@lid') && !jid.includes('@g.us')) {
        return cleanPhone(jid.split('@')[0]);
      }
    }

    // from/to da última mensagem
    if (lastMsg?._data?.from || lastMsg?._data?.to) {
      for (const src of [lastMsg._data.from, lastMsg._data.to]) {
        if (src && (src.includes('@c.us') || src.includes('@s.whatsapp.net'))) {
          return cleanPhone(src.split('@')[0]);
        }
      }
    }

    return null; // @lid sem resolução possível nesta fase
  }

  // Campos diretos no chatData (engines que não expõem @c.us no chatId)
  for (const field of ['phone', 'phoneNumber', 'number']) {
    if (chatData[field]) {
      const p = cleanPhone(chatData[field]);
      if (p) return p;
    }
  }

  // remoteJidAlt na última mensagem
  const lastMsg = chatData.lastMessage || chatData._data;
  if (lastMsg?._data?.key?.remoteJidAlt) {
    const jid = lastMsg._data.key.remoteJidAlt;
    if (!jid.includes('@lid') && !jid.includes('@g.us')) {
      return cleanPhone(jid.split('@')[0]);
    }
  }

  // from/to da última mensagem
  if (lastMsg?._data?.from || lastMsg?._data?.to) {
    for (const src of [lastMsg._data.from, lastMsg._data.to]) {
      if (src && (src.includes('@c.us') || src.includes('@s.whatsapp.net'))) {
        return cleanPhone(src.split('@')[0]);
      }
    }
  }

  return null;
}

/** Chama a WAHA API */
async function wahaGet(path) {
  const url = `${WAHA_BASE_URL}${path}`;
  const res = await fetch(url, { headers: { 'X-Api-Key': WAHA_KEY } });
  if (!res.ok) throw new Error(`WAHA ${path} → ${res.status}`);
  return res.json();
}

/**
 * Busca foto de perfil via API WAHA tentando múltiplos formatos de contactId.
 * Espelha as fases 1-3 do getContactInfo() no waha-api.ts do frontend.
 *
 * Para contatos @lid (NOWEB engine), o chatId não funciona diretamente —
 * é necessário tentar phone@s.whatsapp.net ou phone@c.us.
 *
 * @param {string} sessionName - Nome da sessão WAHA
 * @param {string} contactId   - chatId raw (pode ser @lid, @c.us, etc.)
 * @param {string|null} phone  - Telefone limpo extraído (ex: "5513999999999")
 */
async function fetchProfilePicture(sessionName, contactId, phone) {
  async function tryFetch(id) {
    try {
      const data = await wahaGet(
        `/api/contacts/profile-picture?session=${sessionName}&contactId=${encodeURIComponent(id)}`
      );
      const url = data?.profilePictureURL || data?.url || data?.picture || null;
      return (url && url.length > 10) ? url : null;
    } catch {
      return null;
    }
  }

  // Fase 1: tenta com o chatId original
  let url = await tryFetch(contactId);
  if (url) return url;

  // Fase 2: tenta phone@s.whatsapp.net (formato que funciona com @lid no NOWEB)
  if (phone) {
    url = await tryFetch(`${phone}@s.whatsapp.net`);
    if (url) return url;
  }

  // Fase 3: tenta phone@c.us (formato alternativo)
  if (phone) {
    url = await tryFetch(`${phone}@c.us`);
    if (url) return url;
  }

  return null; // Contato sem foto ou privada
}

// =============================================================================
// ROUND ROBIN
// =============================================================================

let rrState = null;
let rrUsers = [];

async function loadRoundRobinState(sessionId) {
  const { data } = await supabase
    .from('mt_whatsapp_round_robin_state')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (!data) {
    log('⚠️ Round Robin state não encontrado. Leads sem responsável.');
    return;
  }

  rrState = data;
  rrUsers = data.user_order || [];
  log(`🔄 Round Robin ativo: ${rrUsers.length} usuários, índice atual: ${data.current_user_index}`);
}

async function getNextResponsible() {
  if (!rrState || rrUsers.length === 0) return null;

  const userId = rrUsers[rrState.current_user_index % rrUsers.length];
  const nextIndex = (rrState.current_user_index + 1) % rrUsers.length;

  // Atualizar estado no banco
  await supabase
    .from('mt_whatsapp_round_robin_state')
    .update({
      current_user_index: nextIndex,
      total_assigned: (rrState.total_assigned || 0) + 1,
    })
    .eq('session_id', rrState.session_id);

  // Atualizar estado local
  rrState.current_user_index = nextIndex;
  rrState.total_assigned = (rrState.total_assigned || 0) + 1;

  return userId;
}

// =============================================================================
// SYNC PRINCIPAL
// =============================================================================

async function syncSession(sessionName) {
  log(`🚀 Iniciando sync para sessão: ${sessionName}`);

  // ===== SEÇÃO 1: Carregar configuração da sessão =====
  const { data: sessao, error: sessaoErr } = await supabase
    .from('mt_whatsapp_sessions')
    .select('id, tenant_id, franchise_id, responsible_user_id, round_robin_enabled, engine')
    .eq('session_name', sessionName)
    .maybeSingle();

  if (sessaoErr || !sessao) {
    err(`Sessão "${sessionName}" não encontrada no banco.`);
    return;
  }

  const { id: sessaoId, tenant_id: tenantId, franchise_id: franchiseId } = sessao;
  log(`📋 Sessão: ${sessaoId} | Tenant: ${tenantId} | Franchise: ${franchiseId}`);

  // Carregar Round Robin state
  await loadRoundRobinState(sessaoId);

  // ===== SEÇÃO 2: Pre-carregar cache de conversas já existentes =====
  const phoneCache = new Map();      // chatId → phone (para resolver @lid)
  const existingChatIds = new Set(); // chatId → exists in DB
  const phoneToConvId = new Map();   // phone → conv.id (evita duplicatas por formato diferente)

  const { data: existingConvs } = await supabase
    .from('mt_whatsapp_conversations')
    .select('chat_id, contact_phone, id')
    .eq('session_id', sessaoId);

  if (existingConvs) {
    for (const conv of existingConvs) {
      existingChatIds.add(conv.chat_id);
      if (conv.chat_id && conv.contact_phone) {
        phoneCache.set(conv.chat_id, conv.contact_phone);
        // Mapear phone → conv.id para deduplicação por número de telefone
        if (!phoneToConvId.has(conv.contact_phone)) {
          phoneToConvId.set(conv.contact_phone, conv.id);
        }
      }
    }
    log(`📦 Cache: ${existingChatIds.size} conversas no banco, ${phoneToConvId.size} com telefone mapeado`);

    // Aviso se o cache crescer demais — considere paginação para sessões com muitos chats
    if (existingChatIds.size > 5000) {
      console.warn('[Sync] Cache grande: %d chats. Considere paginação para sessões com muitos chats.', existingChatIds.size);
    }
  }

  // ===== SEÇÃO 3: Buscar chats do WAHA =====
  log('📡 Buscando chats do WAHA via /chats/overview...');
  let wahaChats = [];
  try {
    const overview = await wahaGet(`/api/${sessionName}/chats/overview?limit=5000`);
    if (Array.isArray(overview) && overview.length > 0) {
      wahaChats = overview;
      log(`✅ /chats/overview retornou ${wahaChats.length} chats`);
    }
  } catch (e) {
    log(`⚠️ /chats/overview falhou: ${e.message}`);
  }

  // Fallback: tentar /chats
  if (wahaChats.length === 0) {
    log('📡 Tentando /chats...');
    try {
      const chats = await wahaGet(`/api/${sessionName}/chats?limit=5000`);
      if (Array.isArray(chats) && chats.length > 0) {
        wahaChats = chats;
        log(`✅ /chats retornou ${wahaChats.length} chats`);
      }
    } catch (e) {
      err(`Falha ao buscar chats: ${e.message}`);
    }
  }

  if (wahaChats.length === 0) {
    err('Nenhum chat encontrado no WAHA. Verifique se a sessão está conectada.');
    return;
  }

  const totalChats = wahaChats.length;
  log(`📊 Total no WAHA: ${totalChats} | Já no banco: ${existingChatIds.size} | Pendentes: ~${totalChats - existingChatIds.size}`);

  // ===== SEÇÃO 4: Criar/atualizar conversas no banco e processar leads (round-robin) =====
  let processed = 0, created = 0, updated = 0, leadsCreated = 0, errors = 0;

  for (let i = 0; i < totalChats; i++) {
    const chat = wahaChats[i];
    const chatId = chat.chatId || (typeof chat.id === 'string' ? chat.id : '');
    if (!chatId) continue;

    // Pular chats já sincronizados (já existem no banco com esse exato chatId)
    if (existingChatIds.has(chatId)) {
      processed++;
      continue;
    }

    try {
      // Extrair telefone
      let phone = phoneCache.get(chatId);
      if (phone === undefined) {
        phone = extractPhone(chatId, chat, sessao.engine || 'NOWEB');

        // Para @lid sem telefone, tentar via mensagens
        if (!phone && chatId.includes('@lid')) {
          try {
            const msgs = await wahaGet(`/api/${sessionName}/chats/${encodeURIComponent(chatId)}/messages?limit=1&downloadMedia=false`);
            if (msgs?.[0]) {
              const m = msgs[0];
              const jid = m._data?.key?.remoteJidAlt;
              if (jid && !jid.includes('@lid') && !jid.includes('@g.us')) {
                phone = cleanPhone(jid.split('@')[0]);
              }
              if (!phone) {
                for (const src of [m._data?.from, m._data?.to]) {
                  if (src && (src.includes('@c.us') || src.includes('@s.whatsapp.net'))) {
                    phone = cleanPhone(src.split('@')[0]);
                    if (phone) break;
                  }
                }
              }
            }
          } catch {
            // Silencioso
          }
        }
        phoneCache.set(chatId, phone);
      }

      const isGroup = chatId.includes('@g.us') || chat.isGroup === true;
      const isLid = chatId.includes('@lid');
      // Extração de nome com 11 fontes + validação (não usar telefone como nome)
      const chatName = isGroup
        ? (chat.name || chatId.replace(/@.*$/, ''))  // grupos: aceita nome numérico
        : (extractContactName(chat, null) || phone || (isLid && !phone ? 'Contato WhatsApp' : chatId.replace(/@.*$/, '')));

      // Buscar foto de perfil: primeiro usa o que veio no overview,
      // se não tiver, chama a API específica de foto do WAHA com múltiplos formatos
      let contactPic = chat.picture || null;
      if (!contactPic && !isGroup) {
        contactPic = await fetchProfilePicture(sessionName, chatId, phone);
      }
      // Fallback para avatar gerado apenas se não encontrou foto real
      if (!contactPic && !isGroup) {
        contactPic = avatar(chatName || phone);
      }
      const identifierType = isGroup ? 'group' : (isLid && !phone ? 'lid' : 'phone');
      const lastMsgText = chat.lastMessage?.body || chat.lastMessage?.text || null;
      const lastMsgTs = chat.lastMessage?.timestamp || chat.timestamp;
      const ultimaMensagem = lastMsgTs ? new Date(lastMsgTs * 1000).toISOString() : null;

      // ── DEDUPLICAÇÃO POR TELEFONE ──────────────────────────────────────────
      // Se já existe conversa com este telefone (mesmo com chatId diferente: @lid vs @c.us),
      // atualizar a existente ao invés de criar nova (evita duplicatas por mudança de formato).
      if (!isGroup && phone && phoneToConvId.has(phone)) {
        const existingConvId = phoneToConvId.get(phone);

        // Atualizar chat_id para o formato atual do WAHA e metadados da conversa
        await supabase
          .from('mt_whatsapp_conversations')
          .update(sanitize({
            chat_id: chatId,
            contact_name: chatName || undefined,
            contact_avatar: contactPic || undefined,
            unread_count: chat.unreadCount || 0,
            ...(ultimaMensagem ? { last_message_at: ultimaMensagem } : {}),
            ...(lastMsgText ? { last_message_text: lastMsgText } : {}),
            updated_at: new Date().toISOString(),
          }))
          .eq('id', existingConvId);

        // Registrar novo chatId no cache para pular na próxima iteração se aparecer de novo
        existingChatIds.add(chatId);
        updated++;
        processed++;
        continue;
      }
      // ── FIM DEDUPLICAÇÃO ──────────────────────────────────────────────────

      // Upsert conversa (novo contato — não existe nem por chatId nem por telefone)
      const { data: upsertedConv } = await supabase
        .from('mt_whatsapp_conversations')
        .upsert(sanitize({
          tenant_id: tenantId,
          franchise_id: franchiseId,
          session_id: sessaoId,
          chat_id: chatId,
          contact_name: chatName,
          contact_phone: phone || null,
          contact_avatar: contactPic,
          is_group: isGroup,
          has_phone_number: !!phone,
          identifier_type: identifierType,
          unread_count: chat.unreadCount || 0,
          last_message_text: lastMsgText,
          last_message_at: ultimaMensagem,
          updated_at: new Date().toISOString(),
        }), { onConflict: 'session_id,chat_id' })
        .select('id')
        .single();

      const conversaId = upsertedConv?.id;
      if (!conversaId) { errors++; continue; }
      // Registrar no mapa de telefones para deduplicação subsequente
      if (phone) phoneToConvId.set(phone, conversaId);
      created++;

      // Criar/vincular lead (apenas contatos individuais com telefone)
      let leadId = null;
      let leadJustCreated = false;

      if (!isGroup && phone && tenantId) {
        try {
          const { data: existingLead } = await supabase
            .from('mt_leads')
            .select('id, nome, foto_url')
            .eq('tenant_id', tenantId)
            .or(`telefone.eq.${phone},whatsapp.eq.${phone}`)
            .maybeSingle();

          if (!existingLead) {
            const assignedUserId = await getNextResponsible();
            const leadOrigin = franchiseId
              ? `whatsapp_sync (franquia: ${franchiseId})`
              : 'whatsapp_sync (central)';

            const { data: newLead, error: leadErr } = await supabase
              .from('mt_leads')
              .insert(sanitize({
                tenant_id: tenantId,
                franchise_id: franchiseId || null,
                nome: chatName || phone,
                telefone: phone,
                whatsapp: phone,
                foto_url: contactPic || avatar(chatName || phone),
                origem: leadOrigin,
                status: 'novo',
                observacoes: `Lead criado via sync WhatsApp (${sessionName})`,
                ...(assignedUserId ? {
                  atribuido_para: assignedUserId,
                  responsible_user_id: assignedUserId,
                  atribuido_em: new Date().toISOString(),
                  atribuido_por: assignedUserId,
                } : {}),
              }))
              .select('id')
              .single();

            if (!leadErr && newLead) {
              leadId = newLead.id;
              leadJustCreated = true;
              leadsCreated++;
            } else if (leadErr?.code === '23505') {
              // Race condition — pegar o existente
              const { data: rl } = await supabase
                .from('mt_leads')
                .select('id')
                .eq('tenant_id', tenantId)
                .or(`telefone.eq.${phone},whatsapp.eq.${phone}`)
                .maybeSingle();
              leadId = rl?.id || null;
            }
          } else {
            leadId = existingLead.id;
          }

          // Vincular lead_id na conversa
          if (leadId && conversaId) {
            await supabase
              .from('mt_whatsapp_conversations')
              .update({ lead_id: leadId })
              .eq('id', conversaId);
          }
        } catch (leadErr) {
          // Não impede o resto da sync
        }
      }

      // ===== SEÇÃO 5: Sincronizar mensagens =====
      // (limitar a 50 por chat para não sobrecarregar)
      try {
        const msgs = await wahaGet(`/api/${sessionName}/chats/${encodeURIComponent(chatId)}/messages?limit=50&downloadMedia=false&sortOrder=desc`);

        if (msgs?.length > 0) {
          const toInsert = msgs
            .filter(m => m.id)
            .map(m => {
              const msgId = typeof m.id === 'string' ? m.id : m.id?._serialized || '';
              if (!msgId) return null;
              const fromMe = m.fromMe ?? false;
              return {
                tenant_id: tenantId,
                session_id: sessaoId,
                conversation_id: conversaId,
                message_id: msgId,
                from_me: fromMe,
                tipo: m.type || 'chat',
                body: m.body || null,
                ack: m.ack ?? 0,
                timestamp: m.timestamp ? new Date(m.timestamp * 1000).toISOString() : new Date().toISOString(),
              };
            })
            .filter(Boolean);

          if (toInsert.length > 0) {
            const batches = [];
            for (let j = 0; j < toInsert.length; j += 100) batches.push(toInsert.slice(j, j + 100));
            for (const batch of batches) {
              await supabase
                .from('mt_whatsapp_messages')
                .upsert(sanitize(batch), { onConflict: 'message_id', ignoreDuplicates: false });
            }
          }

          // Atualizar created_at do lead com data da mensagem mais antiga
          if (leadId && leadJustCreated && msgs.length > 0) {
            const oldestTs = msgs
              .filter(m => m.timestamp)
              .reduce((min, m) => m.timestamp < min ? m.timestamp : min, Infinity);
            if (oldestTs !== Infinity) {
              await supabase
                .from('mt_leads')
                .update({ created_at: new Date(oldestTs * 1000).toISOString() })
                .eq('id', leadId);
            }
          }
        }
      } catch {
        // Silencioso — mensagens são opcionais
      }

    } catch (chatErr) {
      errors++;
      err(`Chat ${chatId}: ${chatErr.message}`);
    }

    processed++;

    // Progresso a cada 10 chats
    if (processed % 10 === 0 || processed === totalChats) {
      const pct = Math.round((processed / totalChats) * 100);
      log(`📈 Progresso: ${processed}/${totalChats} (${pct}%) | Novos: ${created} | Atualizados: ${updated} | Leads: +${leadsCreated} | Erros: ${errors}`);
    }
  }

  log(`✅ Sync concluída!`);
  log(`   Total processados: ${processed}`);
  log(`   Novas conversas: ${created}`);
  log(`   Conversas atualizadas (dedup por telefone): ${updated}`);
  log(`   Leads criados: ${leadsCreated}`);
  log(`   Erros: ${errors}`);

  // Estado final do banco
  const { count } = await supabase
    .from('mt_whatsapp_conversations')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessaoId);
  log(`   Total no banco agora: ${count}`);
}

// =============================================================================
// BACKFILL DE FOTOS (para conversas existentes com placeholder)
// =============================================================================

/**
 * Atualiza fotos reais para conversas que ainda têm avatar placeholder.
 * Chama a API WAHA para cada contato individual sem foto real.
 */
async function backfillPhotos(sessionName) {
  log(`📸 Iniciando backfill de fotos para sessão: ${sessionName}`);

  const { data: sessao } = await supabase
    .from('mt_whatsapp_sessions')
    .select('id')
    .eq('session_name', sessionName)
    .maybeSingle();

  if (!sessao) {
    err(`Sessão "${sessionName}" não encontrada.`);
    return;
  }

  // Buscar todas as conversas com placeholder ou sem foto (incluindo contact_phone)
  const { data: convs } = await supabase
    .from('mt_whatsapp_conversations')
    .select('id, chat_id, contact_avatar, contact_name, contact_phone')
    .eq('session_id', sessao.id)
    .eq('is_group', false)
    .or('contact_avatar.is.null,contact_avatar.like.%ui-avatars%');

  if (!convs || convs.length === 0) {
    log('✅ Nenhuma conversa com placeholder para atualizar.');
    return;
  }

  log(`📋 ${convs.length} conversas com placeholder para atualizar...`);

  let updated = 0, skipped = 0, total = convs.length;

  for (let i = 0; i < convs.length; i++) {
    const conv = convs[i];
    try {
      // Passa contact_phone para tentar phone@s.whatsapp.net e phone@c.us (corrige @lid)
      const photoUrl = await fetchProfilePicture(sessionName, conv.chat_id, conv.contact_phone);

      if (photoUrl) {
        await supabase
          .from('mt_whatsapp_conversations')
          .update({ contact_avatar: photoUrl })
          .eq('id', conv.id);

        // Atualizar foto no lead também, se vinculado
        await supabase
          .from('mt_whatsapp_conversations')
          .select('lead_id')
          .eq('id', conv.id)
          .maybeSingle()
          .then(async ({ data: convData, error: convErr }) => {
            if (convErr) { console.error('[Sync] Erro ao buscar lead_id da conversa:', convErr.message); return; }
            if (convData?.lead_id) {
              const { error: leadUpdateErr } = await supabase
                .from('mt_leads')
                .update({ foto_url: photoUrl })
                .eq('id', convData.lead_id)
                .like('foto_url', '%ui-avatars%'); // só se ainda tem placeholder
              if (leadUpdateErr) { console.error('[Sync] Erro ao atualizar foto do lead:', leadUpdateErr.message); }
            }
          })
          .catch(err => console.error('[Sync] Erro inesperado ao atualizar foto do lead:', err.message));

        updated++;
      } else {
        skipped++;
      }
    } catch {
      skipped++;
    }

    if ((i + 1) % 20 === 0 || i + 1 === total) {
      const pct = Math.round(((i + 1) / total) * 100);
      log(`📸 Progresso: ${i + 1}/${total} (${pct}%) | Atualizadas: ${updated} | Sem foto: ${skipped}`);
    }

    // Pequena pausa para não sobrecarregar o WAHA
    await new Promise(r => setTimeout(r, 80));
  }

  log(`✅ Backfill concluído! Atualizadas: ${updated} | Sem foto real: ${skipped}`);
}

// =============================================================================
// ENTRY POINT
// =============================================================================

const mode = process.argv[3] || 'sync';

if (mode === 'photos') {
  // Modo: node scripts/sync-whatsapp.mjs <session> photos
  backfillPhotos(TARGET_SESSION).catch(e => {
    err(`Erro fatal: ${e.message}`);
    process.exit(1);
  });
} else {
  syncSession(TARGET_SESSION).catch(e => {
    err(`Erro fatal: ${e.message}`);
    process.exit(1);
  });
}
