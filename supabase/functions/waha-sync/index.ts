/**
 * waha-sync — Edge Function para sincronizar conversas + mensagens WhatsApp
 *
 * Usa paginação para não estourar wall clock limit do Edge Runtime.
 * O frontend chama repetidamente até status === "completed".
 *
 * POST /functions/v1/waha-sync
 * Body: { session_id: string, labels_only?: boolean }
 * Returns: { status, session_id, processed, total, done }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BATCH_SIZE = 10; // Chats por chamada (cabe em ~60s de wall clock)
const MSG_LIMIT = 50; // Mensagens por chat
const MEDIA_BUCKET = 'whatsapp-media';
const MAX_MEDIA_SIZE = 50 * 1024 * 1024; // 50MB

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/gif': 'gif',
  'image/webp': 'webp', 'video/mp4': 'mp4', 'video/webm': 'webm',
  'audio/mpeg': 'mp3', 'audio/ogg': 'ogg', 'audio/opus': 'opus',
  'audio/ogg; codecs=opus': 'ogg', 'application/pdf': 'pdf',
};

// ─── helpers ───────────────────────────────────────────────────────────────

function cleanPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  // 10-13 dígitos = telefone válido
  // 14+ dígitos = LID do WhatsApp (NÃO é telefone!)
  // <10 dígitos = muito curto, inválido
  return digits.length >= 10 && digits.length <= 13 ? digits : null;
}

function extractPhoneSync(chatId: string, chat: Record<string, unknown>): string | null {
  if (chatId.includes("@g.us")) return null;

  // 1. chatId direto @c.us ou @s.whatsapp.net
  if (chatId.includes("@c.us") || chatId.includes("@s.whatsapp.net")) {
    return cleanPhone(chatId.split("@")[0]);
  }

  // 2. Campos diretos do chat
  for (const field of ["phone", "phoneNumber", "number"]) {
    const v = chat[field] as string | undefined;
    if (v) { const p = cleanPhone(v); if (p) return p; }
  }

  // 3. Contact phone
  const contact = chat.contact as Record<string, unknown> | undefined;
  if (contact) {
    for (const field of ["phone", "number", "phoneNumber"]) {
      const v = contact[field] as string | undefined;
      if (v) { const p = cleanPhone(v); if (p) return p; }
    }
    // contact.jid ou chatData.jid
    for (const jid of [contact.jid as string | undefined, chat.jid as string | undefined]) {
      if (jid && (jid.includes("@c.us") || jid.includes("@s.whatsapp.net"))) {
        const p = cleanPhone(jid.split("@")[0]);
        if (p) return p;
      }
    }
  } else {
    // chatData.jid (sem contact object)
    const jid = chat.jid as string | undefined;
    if (jid && (jid.includes("@c.us") || jid.includes("@s.whatsapp.net"))) {
      return cleanPhone(jid.split("@")[0]);
    }
  }

  // 4. lastMessage._data.key.remoteJidAlt (principal para @lid)
  const lastMsg = (chat.lastMessage || chat._data) as Record<string, unknown> | undefined;
  const msgData = lastMsg?._data as Record<string, unknown> | undefined;
  const key = msgData?.key as Record<string, unknown> | undefined;
  const jidAlt = key?.remoteJidAlt as string | undefined;
  if (jidAlt && !jidAlt.includes("@lid") && !jidAlt.includes("@g.us")) {
    return cleanPhone(jidAlt.split("@")[0]);
  }

  // 5. from/to da última mensagem
  for (const src of [
    msgData?.from as string | undefined,
    msgData?.to as string | undefined,
    lastMsg?.from as string | undefined,
    lastMsg?.to as string | undefined,
  ]) {
    if (src && (src.includes("@c.us") || src.includes("@s.whatsapp.net"))) {
      return cleanPhone(src.split("@")[0]);
    }
  }

  // 6. participant
  for (const src of [
    lastMsg?.participant as string | undefined,
    chat.participant as string | undefined,
  ]) {
    if (src && (src.includes("@c.us") || src.includes("@s.whatsapp.net"))) {
      return cleanPhone(src.split("@")[0]);
    }
  }

  // 7. chat.name (se parece com telefone: 10-15 dígitos)
  const name = chat.name as string | undefined;
  if (name) {
    const p = cleanPhone(name);
    if (p) return p;
  }

  return null;
}

/** Busca TODOS os mapeamentos LID → telefone de uma sessão (bulk) */
async function fetchAllLidMappings(
  sessionName: string,
  wahaGet: (path: string, timeout?: number) => Promise<unknown>,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const result = await wahaGet(`/api/${sessionName}/lids`, 15000) as Array<Record<string, unknown>>;
    if (Array.isArray(result)) {
      for (const item of result) {
        const lid = item.lid as string;
        const pn = (item.pn || item.phoneNumber || item.number) as string;
        if (lid && pn) {
          const phone = cleanPhone(pn.replace(/@.*$/, ""));
          if (phone) {
            // Guardar tanto "123@lid" quanto "123"
            map.set(lid, phone);
            map.set(lid.replace(/@lid$/, ""), phone);
          }
        }
      }
    }
    console.log(`[SYNC] Bulk LID resolve: ${map.size / 2} mapeamentos carregados`);
  } catch (err) {
    console.warn("[SYNC] Bulk LID resolve falhou:", err);
  }
  return map;
}

/** Extrai telefone com fallback para API WAHA (para @lid) */
async function extractPhoneAsync(
  chatId: string,
  chat: Record<string, unknown>,
  sessionName: string,
  wahaGet: (path: string, timeout?: number) => Promise<unknown>,
  lidCache: Map<string, string>,
): Promise<string | null> {
  // Tentar extração local primeiro (sem API)
  const local = extractPhoneSync(chatId, chat);
  if (local) return local;

  // Se é grupo, não buscar
  if (chatId.includes("@g.us")) return null;

  // Se é @lid, tentar resolver via caches e API WAHA
  if (chatId.includes("@lid")) {
    const lid = chatId.split("@")[0];

    // 1. Tentar cache bulk de LIDs (mais eficiente)
    const cached = lidCache.get(chatId) || lidCache.get(lid);
    if (cached) return cached;

    // 2. Tentar resolver LID individual via API: /api/{session}/lids/{lid}
    try {
      const resolved = await wahaGet(`/api/${sessionName}/lids/${lid}`, 5000) as Record<string, unknown>;
      const rawPhone = (resolved?.pn as string) || (resolved?.phoneNumber as string)
        || (resolved?.number as string) || (resolved?.id as string);
      if (rawPhone) {
        const p = cleanPhone(rawPhone.replace(/@.*$/, ""));
        if (p) {
          lidCache.set(chatId, p);
          return p;
        }
      }
    } catch (_) { /* silent */ }

    // 3. Tentar buscar contato via API
    try {
      const contactData = await wahaGet(
        `/api/contacts?session=${sessionName}&contactId=${encodeURIComponent(chatId)}`, 5000
      ) as Record<string, unknown>;
      const number = (contactData?.number as string) || (contactData?.phone as string);
      if (number) {
        const p = cleanPhone(number);
        if (p) {
          lidCache.set(chatId, p);
          return p;
        }
      }
      // Tentar contact.id se não for @lid
      const cid = contactData?.id as string;
      if (cid && !cid.includes("@lid") && (cid.includes("@c.us") || cid.includes("@s.whatsapp.net"))) {
        const p = cleanPhone(cid.split("@")[0]);
        if (p) {
          lidCache.set(chatId, p);
          return p;
        }
      }
    } catch (_) { /* silent */ }
  }

  return null;
}

function avatar(name: string): string {
  const c = encodeURIComponent((name || "C").substring(0, 2));
  return `https://ui-avatars.com/api/?name=${c}&background=E91E63&color=fff&size=128`;
}

/** Verifica se string parece um número de telefone (só dígitos, 10-15 chars) */
function isPhoneNumber(s: string | null | undefined): boolean {
  if (!s) return true;
  const cleaned = s.replace(/[\s\-\+\(\)]/g, "");
  return /^\d{10,15}$/.test(cleaned);
}

/** Verifica se um nome é o display_name da sessão (nome comercial da conta) */
function isSessionDisplayName(name: string, sessionDisplayName: string | null): boolean {
  if (!sessionDisplayName || !name) return false;
  return name.trim().toLowerCase() === sessionDisplayName.trim().toLowerCase();
}

/** Extrai nome do contato de múltiplas fontes (8+ campos) */
function extractName(chat: Record<string, unknown>, sessionDisplayName: string | null = null): string | null {
  // Campos prioritários para nome
  const fields = [
    "pushName", "notifyName", "displayName", "shortName",
    "formattedName", "verifiedName", "name", "subject",
  ];

  const isValid = (v: string | undefined): string | null => {
    if (!v || typeof v !== "string" || !v.trim() || isPhoneNumber(v)) return null;
    if (isSessionDisplayName(v, sessionDisplayName)) return null;
    return v.trim();
  };

  // 1. Tentar campos diretos do chat
  for (const f of fields) {
    const name = isValid(chat[f] as string | undefined);
    if (name) return name;
  }

  // 2. Tentar dentro de chat.contact
  const contact = chat.contact as Record<string, unknown> | undefined;
  if (contact) {
    for (const f of fields) {
      const name = isValid(contact[f] as string | undefined);
      if (name) return name;
    }
  }

  // 3. Tentar dentro de lastMessage (pushName do remetente)
  const lastMsg = chat.lastMessage as Record<string, unknown> | undefined;
  if (lastMsg) {
    for (const f of ["pushName", "notifyName", "senderName"]) {
      const name = isValid(lastMsg[f] as string | undefined);
      if (name) return name;
    }

    // 4. Tentar dentro de lastMessage._data
    const msgData = lastMsg._data as Record<string, unknown> | undefined;
    if (msgData) {
      for (const f of ["pushName", "notifyName", "name", "verifiedBizName"]) {
        const name = isValid(msgData[f] as string | undefined);
        if (name) return name;
      }
    }
  }

  // 5. Último recurso: chat.name (mas NÃO se for display_name da sessão)
  const chatName = chat.name as string | undefined;
  if (chatName && typeof chatName === "string" && chatName.trim()) {
    if (!isSessionDisplayName(chatName, sessionDisplayName)) {
      return chatName.trim();
    }
  }

  return null;
}

/** Busca foto de perfil do contato via WAHA API */
async function fetchProfilePicture(
  sessionName: string,
  chatId: string,
  wahaGet: (path: string, timeout?: number) => Promise<unknown>,
): Promise<string | null> {
  try {
    // Tentar /api/contacts/profile-picture
    const result = await wahaGet(
      `/api/contacts/profile-picture?session=${sessionName}&contactId=${encodeURIComponent(chatId)}`,
      5000,
    ) as Record<string, unknown>;
    const url = (result?.profilePictureURL || result?.url || result?.profilePicture) as string;
    if (url && typeof url === "string" && url.startsWith("http") && url.length > 20) {
      return url;
    }
  } catch { /* silent */ }

  try {
    // Fallback: /api/{session}/contacts/{id}/profile-picture
    const result2 = await wahaGet(
      `/api/${sessionName}/contacts/${encodeURIComponent(chatId)}/profile-picture`,
      5000,
    ) as Record<string, unknown>;
    const url2 = (result2?.profilePictureURL || result2?.url || result2?.profilePicture) as string;
    if (url2 && typeof url2 === "string" && url2.startsWith("http") && url2.length > 20) {
      return url2;
    }
  } catch { /* silent */ }

  return null;
}

/** Busca informações do contato (nome + foto) via WAHA contacts API */
async function fetchContactInfo(
  sessionName: string,
  chatId: string,
  wahaGet: (path: string, timeout?: number) => Promise<unknown>,
  sessionDisplayName: string | null = null,
): Promise<{ name: string | null; picture: string | null }> {
  try {
    const data = await wahaGet(
      `/api/contacts?session=${sessionName}&contactId=${encodeURIComponent(chatId)}`,
      5000,
    ) as Record<string, unknown>;

    let name: string | null = null;
    for (const f of ["pushName", "name", "notifyName", "displayName", "shortName", "verifiedName"]) {
      const v = data?.[f] as string | undefined;
      if (v && typeof v === "string" && v.trim() && !isPhoneNumber(v) && !isSessionDisplayName(v, sessionDisplayName)) {
        name = v.trim();
        break;
      }
    }

    const picture = (data?.profilePictureURL || data?.profilePicture || data?.picture) as string | null;

    return {
      name,
      picture: picture && typeof picture === "string" && picture.startsWith("http") ? picture : null,
    };
  } catch {
    return { name: null, picture: null };
  }
}

/** Remove surrogate characters inválidos do WhatsApp */
function sanitize<T>(v: T): T {
  if (typeof v === "string") return v.replace(/[\uD800-\uDFFF]/g, "?") as unknown as T;
  if (Array.isArray(v)) return v.map(sanitize) as unknown as T;
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, sanitize(val)])
    ) as unknown as T;
  }
  return v;
}

// ─── Round Robin ──────────────────────────────────────────────────────────

async function getNextResponsible(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  tenantId: string,
  sessionConfig?: { round_robin_enabled?: boolean; round_robin_mode?: string; team_id?: string | null; department_id?: string | null; responsible_user_id?: string | null },
): Promise<string | null> {
  // Se round robin não está habilitado, usar responsável fixo da sessão
  if (sessionConfig && !sessionConfig.round_robin_enabled) {
    return sessionConfig.responsible_user_id || null;
  }

  // 1. Tentar round robin existente
  const { data } = await supabase
    .from("mt_whatsapp_round_robin_state")
    .select("user_order, current_user_index, total_assigned")
    .eq("session_id", sessionId)
    .maybeSingle();

  let users: string[] = data?.user_order || [];

  // 2. Se não tem round robin ou user_order vazio, buscar membros conforme modo configurado
  if (users.length === 0) {
    const mode = sessionConfig?.round_robin_mode || "team";

    // 2a. Tentar buscar da equipe (team) vinculada à sessão
    if (mode === "team" && sessionConfig?.team_id) {
      const { data: teamMembers } = await supabase
        .from("mt_team_members")
        .select("user_id")
        .eq("team_id", sessionConfig.team_id)
        .eq("is_active", true);

      if (teamMembers?.length) {
        // Filtrar apenas users ativos
        const userIds = teamMembers.map((m) => m.user_id).filter(Boolean);
        if (userIds.length > 0) {
          const { data: activeUsers } = await supabase
            .from("mt_users")
            .select("id")
            .in("id", userIds)
            .eq("is_active", true);
          if (activeUsers?.length) {
            users = activeUsers.map((u) => u.id);
          }
        }
      }
    }

    // 2b. Tentar buscar do departamento vinculado à sessão
    if (users.length === 0 && mode === "department" && sessionConfig?.department_id) {
      const { data: deptMembers } = await supabase
        .from("mt_user_departments")
        .select("user_id")
        .eq("department_id", sessionConfig.department_id)
        .eq("is_active", true);

      if (deptMembers?.length) {
        const userIds = deptMembers.map((m) => m.user_id).filter(Boolean);
        if (userIds.length > 0) {
          const { data: activeUsers } = await supabase
            .from("mt_users")
            .select("id")
            .in("id", userIds)
            .eq("is_active", true);
          if (activeUsers?.length) {
            users = activeUsers.map((u) => u.id);
          }
        }
      }
    }

    // 2c. Fallback: membros da sessão (mt_whatsapp_user_sessions)
    if (users.length === 0) {
      const { data: members } = await supabase
        .from("mt_whatsapp_user_sessions")
        .select("user_id")
        .eq("whatsapp_session_id", sessionId)
        .eq("is_active", true);

      if (members?.length) {
        users = members.map((m) => m.user_id).filter(Boolean);
      }
    }

    // 2d. NÃO buscar todos os users do tenant — isso causava distribuição para todos
    if (users.length === 0) {
      console.warn(`[RoundRobin] Nenhum membro encontrado para sessão ${sessionId}. Usando responsável fixo.`);
      return sessionConfig?.responsible_user_id || null;
    }

    // Criar/atualizar estado round robin automaticamente
    await supabase
      .from("mt_whatsapp_round_robin_state")
      .upsert({
        session_id: sessionId,
        tenant_id: tenantId,
        user_order: users,
        current_user_index: 0,
        total_assigned: 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: "session_id" });
  }

  if (users.length === 0) return null;

  const idx: number = data?.current_user_index ?? 0;
  const userId = users[idx % users.length];

  await supabase
    .from("mt_whatsapp_round_robin_state")
    .update({
      current_user_index: (idx + 1) % users.length,
      total_assigned: (data?.total_assigned ?? 0) + 1,
    })
    .eq("session_id", sessionId);

  return userId;
}

// ─── Labels / Etiquetas ──────────────────────────────────────────────────

/** Mapeamento de índice de cor WAHA → hex */
const WAHA_COLOR_TO_HEX: Record<number, string> = {
  0: '#00a884', 1: '#55ccb3', 2: '#d4a373', 3: '#22C55E',
  4: '#3B82F6', 5: '#64c4ff', 6: '#ffd429', 7: '#ff9485',
  8: '#dfaef0', 9: '#A855F7', 10: '#EC4899', 11: '#EF4444',
  12: '#F97316', 13: '#EAB308', 14: '#6B7280', 15: '#8B5CF6',
  16: '#06B6D4', 17: '#6B7280', 18: '#78716C', 19: '#374151',
};

/** Mapeamento hex → índice de cor WAHA (inverso) */
const HEX_TO_WAHA_COLOR: Record<string, number> = {
  '#EF4444': 11, '#F97316': 12, '#EAB308': 13, '#22C55E': 3,
  '#3B82F6': 4,  '#A855F7': 9,  '#EC4899': 10, '#6B7280': 17,
  '#64c4ff': 5,  '#ffd429': 13, '#ff9485': 11, '#dfaef0': 9,
  '#55ccb3': 1,  '#00a884': 0,  '#8B5CF6': 15, '#06B6D4': 16,
};

function hexToWahaColor(hex: string): number {
  return HEX_TO_WAHA_COLOR[hex] || HEX_TO_WAHA_COLOR[hex.toLowerCase()] || 14;
}

/** Sincronização BIDIRECIONAL de labels: WAHA ↔ banco */
async function syncLabelsFromWaha(
  supabase: ReturnType<typeof createClient>,
  wahaGet: (path: string, timeout?: number) => Promise<unknown>,
  wahaPost: (path: string, body: unknown, method?: string, timeout?: number) => Promise<unknown>,
  sessionName: string,
  tenantId: string,
  franchiseId: string | null,
): Promise<Map<string, string>> {
  // Map: waha_label_id → mt_whatsapp_labels.id
  const labelMap = new Map<string, string>();

  try {
    // 1. Buscar labels do WAHA
    let wahaLabels: Array<Record<string, unknown>> = [];
    try {
      const result = await wahaGet(`/api/${sessionName}/labels`, 10000);
      if (Array.isArray(result)) wahaLabels = result;
    } catch {
      console.warn(`[SYNC] Não foi possível buscar labels do WAHA para ${sessionName}`);
    }

    console.log(`[SYNC] ${wahaLabels.length} labels encontradas no WAHA`);

    // 2. Buscar labels existentes no banco para este tenant
    const { data: existingLabels } = await supabase
      .from("mt_whatsapp_labels")
      .select("id, name, waha_label_id, color")
      .eq("tenant_id", tenantId)
      .eq("is_active", true);

    const existingByWahaId = new Map<string, string>();
    const existingByName = new Map<string, { id: string; waha_label_id: string | null; color: string | null }>();
    if (existingLabels) {
      for (const l of existingLabels) {
        if (l.waha_label_id) existingByWahaId.set(l.waha_label_id, l.id);
        existingByName.set(l.name.toLowerCase(), { id: l.id, waha_label_id: l.waha_label_id, color: l.color });
      }
    }

    // Rastrear labels do WAHA que já foram processadas (para saber quais do banco ainda faltam)
    const wahaLabelNames = new Set<string>();

    // 3. WAHA → Banco: Para cada label do WAHA, criar ou vincular no banco
    for (const wl of wahaLabels) {
      const wahaId = String(wl.id || wl.labelId || "");
      const name = (wl.name as string) || `Label ${wahaId}`;
      const colorIdx = typeof wl.color === "number" ? wl.color : null;
      const colorHex = (wl.colorHex as string) || (colorIdx !== null ? WAHA_COLOR_TO_HEX[colorIdx] : null) || "#6B7280";

      if (!wahaId) continue;
      wahaLabelNames.add(name.toLowerCase());

      // Verificar se já existe por waha_label_id
      if (existingByWahaId.has(wahaId)) {
        labelMap.set(wahaId, existingByWahaId.get(wahaId)!);
        continue;
      }

      // Verificar se já existe por nome (match case-insensitive)
      const byName = existingByName.get(name.toLowerCase());
      if (byName) {
        // Atualizar waha_label_id se não tinha
        if (!byName.waha_label_id) {
          await supabase
            .from("mt_whatsapp_labels")
            .update({ waha_label_id: wahaId, updated_at: new Date().toISOString() })
            .eq("id", byName.id);
        }
        labelMap.set(wahaId, byName.id);
        continue;
      }

      // Criar nova label no banco
      const { data: newLabel } = await supabase
        .from("mt_whatsapp_labels")
        .insert({
          tenant_id: tenantId,
          franchise_id: franchiseId,
          name,
          color: colorHex,
          waha_label_id: wahaId,
          is_active: true,
          display_order: 100 + (parseInt(wahaId) || 0),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (newLabel) {
        labelMap.set(wahaId, newLabel.id);
        console.log(`[SYNC] Label criada no banco: "${name}" (WAHA ID: ${wahaId})`);
      }
    }

    // 4. Banco → WAHA: Para cada label do banco que NÃO existe no WAHA, criar no WAHA
    if (existingLabels) {
      for (const dbLabel of existingLabels) {
        // Pular se já tem waha_label_id (já existe no WAHA)
        if (dbLabel.waha_label_id) continue;

        // Pular se uma label com mesmo nome já existe no WAHA
        if (wahaLabelNames.has(dbLabel.name.toLowerCase())) continue;

        try {
          const wahaColor = hexToWahaColor(dbLabel.color || "#6B7280");
          const created = await wahaPost(`/api/${sessionName}/labels`, {
            name: dbLabel.name,
            color: wahaColor,
          }) as Record<string, unknown>;

          const newWahaId = String(created?.id || created?.labelId || "");
          if (newWahaId) {
            // Salvar waha_label_id no banco
            await supabase
              .from("mt_whatsapp_labels")
              .update({ waha_label_id: newWahaId, updated_at: new Date().toISOString() })
              .eq("id", dbLabel.id);

            labelMap.set(newWahaId, dbLabel.id);
            console.log(`[SYNC] Label criada no WAHA: "${dbLabel.name}" → WAHA ID: ${newWahaId}`);
          }
        } catch (err) {
          console.warn(`[SYNC] Erro ao criar label "${dbLabel.name}" no WAHA:`, err);
        }
      }
    }

    console.log(`[SYNC] Labels sincronizadas (bidirecional): ${labelMap.size} mapeamentos`);
  } catch (err) {
    console.warn("[SYNC] Erro ao sincronizar labels:", err);
  }

  return labelMap;
}

/** Busca labels de um chat específico no WAHA e associa no banco */
async function syncChatLabels(
  supabase: ReturnType<typeof createClient>,
  wahaGet: (path: string, timeout?: number) => Promise<unknown>,
  sessionName: string,
  chatId: string,
  conversaId: string,
  tenantId: string,
  labelMap: Map<string, string>,
): Promise<number> {
  if (labelMap.size === 0) return 0;

  try {
    // Buscar labels do chat no WAHA
    const chatLabels = await wahaGet(
      `/api/${sessionName}/labels/chats/${encodeURIComponent(chatId)}/`,
      5000,
    ) as Array<Record<string, unknown>>;

    if (!Array.isArray(chatLabels) || chatLabels.length === 0) return 0;

    // Buscar associações existentes para esta conversa
    const { data: existingAssocs } = await supabase
      .from("mt_whatsapp_conversation_labels")
      .select("label_id")
      .eq("conversation_id", conversaId);

    const existingLabelIds = new Set(existingAssocs?.map(a => a.label_id) || []);

    let added = 0;
    for (const cl of chatLabels) {
      const wahaLabelId = String(cl.id || cl.labelId || "");
      const dbLabelId = labelMap.get(wahaLabelId);

      if (!dbLabelId || existingLabelIds.has(dbLabelId)) continue;

      // Criar associação
      const { error } = await supabase
        .from("mt_whatsapp_conversation_labels")
        .insert({
          tenant_id: tenantId,
          conversation_id: conversaId,
          label_id: dbLabelId,
          assigned_at: new Date().toISOString(),
        });

      if (!error) {
        added++;
        // Incrementar usage_count
        await supabase.rpc("increment_label_usage", { p_label_id: dbLabelId }).catch(() => {
          // Se RPC não existe, atualizar diretamente
          supabase
            .from("mt_whatsapp_labels")
            .update({ usage_count: added })
            .eq("id", dbLabelId)
            .then(() => {});
        });
      }
    }

    return added;
  } catch {
    return 0;
  }
}

// ─── Persistir progresso no banco ──────────────────────────────────────────

async function saveProgress(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  progress: Record<string, unknown>
) {
  await supabase
    .from("mt_whatsapp_sessions")
    .update({
      sync_status: progress.status as string,
      sync_progress: progress,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
}

// ─── WAHA API helper ──────────────────────────────────────────────────────

function makeWahaGet(wahaUrl: string, wahaKey: string) {
  return async function wahaGet(path: string, timeout = 30000) {
    const r = await fetch(`${wahaUrl}${path}`, {
      headers: { "X-Api-Key": wahaKey },
      signal: AbortSignal.timeout(timeout),
    });
    if (!r.ok) throw new Error(`WAHA ${path} → ${r.status}`);
    return r.json();
  };
}

function makeWahaPost(wahaUrl: string, wahaKey: string) {
  return async function wahaPost(path: string, body: unknown, method = "POST", timeout = 10000) {
    const r = await fetch(`${wahaUrl}${path}`, {
      method,
      headers: { "X-Api-Key": wahaKey, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    });
    if (!r.ok) throw new Error(`WAHA ${method} ${path} → ${r.status}`);
    return r.json();
  };
}

// ─── Processar batch de chats ──────────────────────────────────────────────

async function processBatch(
  supabase: ReturnType<typeof createClient>,
  wahaGet: (path: string, timeout?: number) => Promise<unknown>,
  chats: Array<Record<string, unknown>>,
  sessionId: string,
  sessionName: string,
  tenantId: string,
  franchiseId: string | null,
  sessionResponsibleUserId: string | null,
  existingConvMap: Map<string, string>,
  phoneCache: Map<string, string | null>,
  existingMsgIds: Set<string>,
  lidCache: Map<string, string>,
  labelMap: Map<string, string>,
  sessionDisplayName: string | null = null,
  sessionConfig?: { round_robin_enabled?: boolean; round_robin_mode?: string; team_id?: string | null; department_id?: string | null; responsible_user_id?: string | null },
): Promise<{ processed: number; leadsCreated: number; errors: number; totalMessages: number; labelsLinked: number; skipped: Array<{ chatId: string; reason: string }> }> {
  let processed = 0, leadsCreated = 0, errors = 0, totalMessages = 0, labelsLinked = 0;
  const skipped: Array<{ chatId: string; reason: string }> = [];

  for (const chat of chats) {
    const rawId = chat.chatId || chat.id;
    const chatId = typeof rawId === "string" ? rawId : "";
    if (!chatId) { processed++; skipped.push({ chatId: "empty", reason: "chatId vazio" }); continue; }

    try {
      const isGroup = chatId.includes("@g.us") || chat.isGroup === true;
      const isLid = chatId.includes("@lid");
      let phone: string | null;
      if (phoneCache.has(chatId)) {
        phone = phoneCache.get(chatId)!;
      } else {
        phone = await extractPhoneAsync(chatId, chat, sessionName, wahaGet, lidCache);
        phoneCache.set(chatId, phone ?? null);
      }

      // ── Nome do contato: múltiplas fontes com validação ──
      let chatName = extractName(chat, sessionDisplayName);

      // ── Foto do contato: tentar campo direto e API WAHA ──
      let contactPic = (chat.picture as string | undefined) || null;

      if (!isGroup) {
        // Para contatos: buscar nome e foto via API WAHA se necessário
        if (!chatName || isPhoneNumber(chatName) || !contactPic) {
          const contactInfo = await fetchContactInfo(sessionName, chatId, wahaGet, sessionDisplayName);
          if ((!chatName || isPhoneNumber(chatName)) && contactInfo.name) {
            chatName = contactInfo.name;
          }
          if (!contactPic && contactInfo.picture) {
            contactPic = contactInfo.picture;
          }
        }
        // Se ainda não tem foto, buscar profile picture diretamente
        if (!contactPic) {
          contactPic = await fetchProfilePicture(sessionName, chatId, wahaGet);
        }
      } else {
        // Para grupos: tentar buscar foto do grupo
        if (!contactPic) {
          contactPic = await fetchProfilePicture(sessionName, chatId, wahaGet);
        }
      }

      // Fallback final para nome
      if (!chatName || isPhoneNumber(chatName)) {
        chatName = phone || (isLid && !phone ? "Contato WhatsApp" : chatId.replace(/@.*$/, ""));
      }

      // Fallback para foto: gerar avatar padrão (usar nome real, não telefone)
      if (!contactPic && !isGroup) {
        contactPic = avatar(chatName);
      }
      const identifierType = isGroup ? "group" : (isLid && !phone ? "lid" : "phone");
      const lastMsg = chat.lastMessage as Record<string, unknown> | undefined;
      const lastMsgText = (lastMsg?.body as string) || (lastMsg?.text as string) || null;
      const lastTs = (lastMsg?.timestamp as number) || (chat.timestamp as number);
      const ultimaMensagem = lastTs ? new Date(lastTs * 1000).toISOString() : null;

      // Verificar se já existe conversa com mesmo telefone mas chat_id diferente
      // Isso resolve duplicatas @lid vs @c.us/@s.whatsapp.net
      let existingConvId: string | null = null;
      if (!isGroup && phone && phone.length >= 10 && phone.length <= 13) {
        // Buscar pelo phone em conversas existentes desta sessão
        for (const [existChatId, existConvId] of existingConvMap.entries()) {
          const existPhone = phoneCache.get(existChatId);
          if (existPhone === phone && existChatId !== chatId) {
            existingConvId = existConvId;
            console.log(`[Sync] Conversa duplicada detectada: ${chatId} = ${existChatId} (phone: ${phone}). Atualizando chat_id.`);
            // Atualizar chat_id da conversa existente para o novo formato
            await supabase
              .from("mt_whatsapp_conversations")
              .update({
                chat_id: chatId,
                contact_name: chatName,
                contact_avatar: contactPic,
                has_phone_number: true,
                identifier_type: identifierType,
                last_message_text: lastMsgText,
                last_message_at: ultimaMensagem,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existConvId);
            // Atualizar cache
            existingConvMap.delete(existChatId);
            existingConvMap.set(chatId, existConvId);
            phoneCache.set(chatId, phone);
            break;
          }
        }
      }

      // Upsert conversa (se não encontrou duplicata por phone)
      let conversaId = existingConvId;
      if (!conversaId) {
        const { data: conv } = await supabase
          .from("mt_whatsapp_conversations")
          .upsert(sanitize({
            tenant_id: tenantId,
            franchise_id: franchiseId,
            session_id: sessionId,
            chat_id: chatId,
            contact_name: chatName,
            contact_phone: phone || null,
            contact_avatar: contactPic,
            is_group: isGroup,
            has_phone_number: !!phone,
            identifier_type: identifierType,
            unread_count: (chat.unreadCount as number) || 0,
            last_message_text: lastMsgText,
            last_message_at: ultimaMensagem,
            updated_at: new Date().toISOString(),
          }), { onConflict: "session_id,chat_id" })
          .select("id")
          .single();

        conversaId = conv?.id || null;
      }

      if (!conversaId) { errors++; processed++; continue; }

      // Buscar mensagens do WAHA para esta conversa
      try {
        const wahaMessages = await wahaGet(
          `/api/${sessionName}/chats/${encodeURIComponent(chatId)}/messages?limit=${MSG_LIMIT}&downloadMedia=false`
        ) as Array<Record<string, unknown>>;

        if (Array.isArray(wahaMessages) && wahaMessages.length > 0) {
          const newMessages = wahaMessages.filter((msg) => {
            const msgId = (msg.id as string) || ((msg._data as Record<string, unknown>)?.id as string);
            return msgId && !existingMsgIds.has(msgId);
          });

          if (newMessages.length > 0) {
            const msgRows = newMessages.map((msg) => {
              const msgId = (msg.id as string) || ((msg._data as Record<string, unknown>)?.id as string) || null;
              const fromMe = msg.fromMe === true || (msg._data as Record<string, unknown>)?.fromMe === true;
              const ts = (msg.timestamp as number) || 0;
              const timestamp = ts > 0 ? new Date(ts * 1000).toISOString() : new Date().toISOString();

              let body = (msg.body as string) || (msg.text as string) || null;
              if (!body) {
                const data = msg._data as Record<string, unknown> | undefined;
                body = (data?.body as string) || (data?.caption as string) || null;
              }

              // Extrair tipo real da mensagem (compatível NOWEB)
              const msgContent = (msg._data as Record<string, unknown> | undefined)?.message as Record<string, unknown> | undefined;
              let tipo = "chat";
              const hasMedia = msg.hasMedia === true || !!msg.mediaUrl || !!msgContent?.imageMessage || !!msgContent?.videoMessage || !!msgContent?.audioMessage || !!msgContent?.pttMessage || !!msgContent?.documentMessage || !!msgContent?.stickerMessage || !!msgContent?.documentWithCaptionMessage;
              if (hasMedia) {
                const mtype = (msg.type as string) || (msg.mediaType as string) || "";
                if (mtype.includes("image") || mtype === "image" || msgContent?.imageMessage) tipo = "image";
                else if (mtype.includes("video") || mtype === "video" || msgContent?.videoMessage) tipo = "video";
                else if (mtype.includes("audio") || mtype === "ptt" || mtype === "audio" || msgContent?.audioMessage || msgContent?.pttMessage) tipo = "audio";
                else if (mtype.includes("document") || mtype === "document" || msgContent?.documentMessage || msgContent?.documentWithCaptionMessage) tipo = "document";
                else if (mtype.includes("sticker") || mtype === "sticker" || msgContent?.stickerMessage) tipo = "sticker";
                else tipo = mtype || "media";
              } else if ((msg.type as string) === "location") {
                tipo = "location";
              }

              // Resolver media_url: WAHA pode não enviar quando downloadMedia=false
              // Construir URL de download a partir do messageId
              let mediaUrl = (msg.mediaUrl as string) || null;
              if (!mediaUrl && hasMedia && msgId) {
                // URL padrão do WAHA para download de mídia por messageId
                mediaUrl = `/api/files/${sessionName}/download/${encodeURIComponent(msgId)}`;
              }

              // Extrair caption de NOWEB _data.message
              let caption = (msg.caption as string) || ((msg._data as Record<string, unknown>)?.caption as string) || null;
              if (!caption && msgContent) {
                const mediaMsg = (msgContent.imageMessage || msgContent.videoMessage || msgContent.documentMessage || (msgContent.documentWithCaptionMessage as Record<string, unknown>)?.message?.documentMessage) as Record<string, unknown> | undefined;
                if (mediaMsg?.caption) caption = mediaMsg.caption as string;
              }

              // Extrair mimetype de NOWEB
              let mimetype = (msg.mimetype as string) || null;
              if (!mimetype && msgContent) {
                const mediaMsg = (msgContent.imageMessage || msgContent.videoMessage || msgContent.audioMessage || msgContent.pttMessage || msgContent.documentMessage || msgContent.stickerMessage) as Record<string, unknown> | undefined;
                if (mediaMsg?.mimetype) mimetype = mediaMsg.mimetype as string;
              }

              const senderName = (msg.senderName as string) || ((msg._data as Record<string, unknown>)?.pushName as string) || null;
              const senderId = (msg.from as string) || (msg.participant as string) || null;
              const ack = typeof msg.ack === "number" ? msg.ack : null;

              return sanitize({
                tenant_id: tenantId,
                conversation_id: conversaId,
                session_id: sessionId,
                message_id: msgId,
                from_me: fromMe,
                tipo,
                body: body || caption,
                media_url: mediaUrl,
                media_mimetype: mimetype,
                caption,
                ack,
                sender_id: senderId,
                sender_name: senderName,
                timestamp,
                created_at: timestamp,
              });
            });

            // Inserir em batches de 50
            for (let b = 0; b < msgRows.length; b += 50) {
              const batch = msgRows.slice(b, b + 50);
              await supabase
                .from("mt_whatsapp_messages")
                .upsert(batch, { onConflict: "message_id", ignoreDuplicates: true });
            }

            totalMessages += newMessages.length;

            for (const msg of newMessages) {
              const msgId = (msg.id as string) || ((msg._data as Record<string, unknown>)?.id as string);
              if (msgId) existingMsgIds.add(msgId);
            }

            // Download de mídia → Supabase Storage (até 5 por chat para não demorar)
            const mediaRows = msgRows.filter(r => r.media_url && ['audio', 'image', 'video', 'document', 'sticker'].includes(r.tipo));
            const mediaBatch = mediaRows.slice(0, 5); // Limitar para não estourar timeout
            for (const row of mediaBatch) {
              try {
                let fullUrl = row.media_url as string;
                if (!fullUrl.startsWith('http')) {
                  const baseUrl = wahaGet.toString().includes('waha') ? '' : '';
                  // Buscar config WAHA para a URL base
                  const { data: wCfg } = await supabase.from("mt_waha_config").select("api_url, api_key").eq("tenant_id", tenantId).maybeSingle();
                  const apiUrl = wCfg?.api_url || "https://waha.otimaideia.com.br";
                  const apiKey = wCfg?.api_key || "";
                  fullUrl = `${apiUrl}${fullUrl.startsWith('/') ? '' : '/'}${fullUrl}`;

                  if (!apiKey) continue;

                  const resp = await fetch(fullUrl, {
                    headers: { 'X-Api-Key': apiKey },
                    signal: AbortSignal.timeout(15000),
                  }).catch(() => null);

                  if (!resp || !resp.ok) continue;

                  const blob = await resp.blob();
                  if (blob.size === 0 || blob.size > MAX_MEDIA_SIZE) continue;

                  const mt = (row.media_mimetype as string) || blob.type || '';
                  const ext = MIME_TO_EXT[mt.toLowerCase()] || 'bin';
                  const safeMsgId = (row.message_id as string).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 80);
                  const storagePath = `${tenantId}/${conversaId}/${safeMsgId}_${Date.now()}.${ext}`;

                  const { error: upErr } = await supabase.storage
                    .from(MEDIA_BUCKET)
                    .upload(storagePath, blob, {
                      contentType: mt || 'application/octet-stream',
                      cacheControl: '31536000',
                      upsert: true,
                    });

                  if (!upErr) {
                    // Use external URL directly (edge runtime resolves to internal supabase-kong hostname)
                    const EXTERNAL_URL = "https://supabase.viniun.com.br";
                    const pubUrl = `${EXTERNAL_URL}/storage/v1/object/public/${MEDIA_BUCKET}/${storagePath}`;
                    await supabase.from("mt_whatsapp_messages")
                      .update({ storage_path: pubUrl, media_url: pubUrl })
                      .eq("message_id", row.message_id);
                    console.log(`[Sync] Mídia salva: ${storagePath}`);
                  }
                }
              } catch {
                // Erro no download de mídia não é crítico
              }
            }
          }
        }
      } catch (_msgErr) {
        // Erro ao buscar mensagens - não é crítico, continuar
      }

      // Criar/vincular lead (somente se conversa é nova)
      if (isGroup) {
        skipped.push({ chatId, reason: "grupo" });
      } else if (!phone) {
        skipped.push({ chatId, reason: `sem telefone (lid=${isLid})` });
      } else if (existingConvMap.has(chatId)) {
        skipped.push({ chatId, reason: "conversa já existia" });
      }

      if (!isGroup && phone && tenantId && !existingConvMap.has(chatId)) {
        const { data: existingLead } = await supabase
          .from("mt_leads")
          .select("id")
          .eq("tenant_id", tenantId)
          .or(`telefone.eq.${phone},whatsapp.eq.${phone}`)
          .maybeSingle();

        let leadId: string | null = existingLead?.id || null;

        if (!leadId) {
          // Round robin → fallback para responsible da sessão
          const rrUserId = await getNextResponsible(supabase, sessionId, tenantId, sessionConfig);
          const assignedUserId = rrUserId || sessionResponsibleUserId || null;
          const { data: newLead, error: lErr } = await supabase
            .from("mt_leads")
            .insert(sanitize({
              tenant_id: tenantId,
              franchise_id: franchiseId || null,
              nome: chatName || phone,
              telefone: phone,
              whatsapp: phone,
              foto_url: contactPic || avatar(chatName),
              origem: franchiseId
                ? `whatsapp_sync (franquia: ${franchiseId})`
                : "whatsapp_sync (central)",
              status: "novo",
              observacoes: `Lead criado via sync WhatsApp (${sessionName})`,
              ...(assignedUserId ? {
                atribuido_para: assignedUserId,
                responsible_user_id: assignedUserId,
                atribuido_em: new Date().toISOString(),
                atribuido_por: assignedUserId,
              } : {}),
            }))
            .select("id")
            .single();

          if (lErr?.code === "23505") {
            const { data: rl } = await supabase
              .from("mt_leads")
              .select("id")
              .eq("tenant_id", tenantId)
              .or(`telefone.eq.${phone},whatsapp.eq.${phone}`)
              .maybeSingle();
            leadId = rl?.id || null;
          } else if (newLead) {
            leadId = newLead.id;
            leadsCreated++;
          }
        }

        if (leadId) {
          await supabase
            .from("mt_whatsapp_conversations")
            .update({ lead_id: leadId })
            .eq("id", conversaId);
        }
      }

      // ── Sincronizar labels/etiquetas do chat ──
      if (labelMap.size > 0 && conversaId) {
        try {
          const linked = await syncChatLabels(supabase, wahaGet, sessionName, chatId, conversaId, tenantId, labelMap);
          labelsLinked += linked;
        } catch { /* não crítico */ }
      }
    } catch (_) {
      errors++;
    }

    processed++;
  }

  return { processed, leadsCreated, errors, totalMessages, labelsLinked, skipped };
}

// ─── Handler principal ─────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const body = await req.json();
    const sessionId: string = body.session_id;
    const labelsOnly: boolean = body.labels_only === true;
    if (!sessionId) return json({ error: "session_id obrigatório" }, 400);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 1. Buscar sessão no banco
    const { data: sessao, error: sessaoErr } = await supabase
      .from("mt_whatsapp_sessions")
      .select("id, session_name, tenant_id, franchise_id, responsible_user_id, sync_status, sync_progress, display_name, round_robin_enabled, round_robin_mode, team_id, department_id")
      .eq("id", sessionId)
      .single();

    if (sessaoErr || !sessao) return json({ error: "Sessão não encontrada" }, 404);

    // 2. Buscar config WAHA
    const { data: wahaConfig } = await supabase
      .from("mt_waha_config")
      .select("api_url, api_key")
      .maybeSingle();

    const wahaUrl: string = wahaConfig?.api_url || "https://waha.otimaideia.com.br";
    const wahaKey: string = wahaConfig?.api_key || Deno.env.get("WAHA_API_KEY") || "";
    const wahaGet = makeWahaGet(wahaUrl, wahaKey);
    const wahaPost = makeWahaPost(wahaUrl, wahaKey);

    // ── Modo labels_only: sincroniza apenas etiquetas e retorna ──
    if (labelsOnly) {
      try {
        const labelMap = await syncLabelsFromWaha(supabase, wahaGet, wahaPost, sessao.session_name, sessao.tenant_id, sessao.franchise_id);
        return json({
          status: "completed",
          done: true,
          labels_only: true,
          labels_synced: labelMap.size,
          session_id: sessionId,
        });
      } catch (labelErr) {
        const msg = labelErr instanceof Error ? labelErr.message : String(labelErr);
        console.error("[waha-sync] labels_only error:", msg);
        return json({ error: `Erro ao sincronizar etiquetas: ${msg}` }, 500);
      }
    }

    // 3. Determinar offset (continuar de onde parou ou começar do zero)
    const prevProgress = sessao.sync_progress as Record<string, unknown> | null;
    const isResuming = sessao.sync_status === "syncing"
      && prevProgress?.status === "syncing"
      && typeof prevProgress?.offset === "number"
      && (prevProgress?.offset as number) > 0;

    let offset: number;
    let chatIds: string[];
    let totalChats: number;
    let accProcessed: number;
    let accLeads: number;
    let accErrors: number;
    let accMessages: number;
    let accLabels: number;
    let startedAt: string;

    if (isResuming && prevProgress?.chat_ids) {
      // Retomar: usar lista de chats salva no progresso
      offset = prevProgress.offset as number;
      chatIds = prevProgress.chat_ids as string[];
      totalChats = prevProgress.total as number;
      accProcessed = prevProgress.processed as number || 0;
      accLeads = prevProgress.leads_created as number || 0;
      accErrors = prevProgress.errors as number || 0;
      accMessages = prevProgress.total_messages as number || 0;
      accLabels = prevProgress.labels_linked as number || 0;
      startedAt = prevProgress.started_at as string || new Date().toISOString();
    } else {
      // Nova sync: buscar chats do WAHA
      let wahaChats: Array<Record<string, unknown>> = [];
      try {
        const chats = await wahaGet(`/api/${sessao.session_name}/chats?limit=5000`);
        if (Array.isArray(chats)) wahaChats = chats;
      } catch (_) { /* silent */ }

      if (wahaChats.length === 0) {
        const errResult = {
          status: "error",
          error: "Nenhum chat encontrado. Verifique se a sessão está conectada e o store está habilitado.",
          updated_at: new Date().toISOString(),
        };
        await saveProgress(supabase, sessionId, errResult);
        return json(errResult);
      }

      // Salvar IDs dos chats para retomar depois
      chatIds = wahaChats.map(c => {
        const raw = c.chatId || c.id;
        return typeof raw === "string" ? raw : "";
      }).filter(Boolean);

      totalChats = chatIds.length;
      offset = 0;
      accProcessed = 0;
      accLeads = 0;
      accErrors = 0;
      accMessages = 0;
      accLabels = 0;
      startedAt = new Date().toISOString();

      // Salvar progresso inicial com lista de chats
      await saveProgress(supabase, sessionId, {
        status: "syncing",
        offset: 0,
        total: totalChats,
        processed: 0,
        leads_created: 0,
        total_messages: 0,
        errors: 0,
        chat_ids: chatIds,
        started_at: startedAt,
        updated_at: new Date().toISOString(),
      });
    }

    // 4. Verificar se já terminou
    if (offset >= totalChats) {
      const finalProgress = {
        status: "completed",
        offset: totalChats,
        total: totalChats,
        processed: accProcessed,
        leads_created: accLeads,
        total_messages: accMessages,
        errors: accErrors,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await saveProgress(supabase, sessionId, finalProgress);
      await supabase
        .from("mt_whatsapp_sessions")
        .update({ last_sync_at: new Date().toISOString(), total_chats: accProcessed })
        .eq("id", sessionId);
      return json({ ...finalProgress, done: true, session_id: sessionId });
    }

    // 5. Pre-cache dados existentes
    const existingConvMap = new Map<string, string>();
    const phoneCache = new Map<string, string | null>();
    const existingMsgIds = new Set<string>();

    const { data: existing } = await supabase
      .from("mt_whatsapp_conversations")
      .select("id, chat_id, contact_phone")
      .eq("session_id", sessionId);

    if (existing) {
      for (const c of existing) {
        existingConvMap.set(c.chat_id, c.id);
        if (c.chat_id && c.contact_phone) phoneCache.set(c.chat_id, c.contact_phone);
      }
    }

    // Pre-cache message_ids para dedup
    const { data: existingMsgs } = await supabase
      .from("mt_whatsapp_messages")
      .select("message_id")
      .eq("session_id", sessionId)
      .not("message_id", "is", null);

    if (existingMsgs) {
      for (const m of existingMsgs) {
        if (m.message_id) existingMsgIds.add(m.message_id);
      }
    }

    // 5b. Pre-fetch TODOS os mapeamentos LID → telefone (bulk, uma vez por sessão)
    const lidCache = await fetchAllLidMappings(sessao.session_name, wahaGet);

    // 5c. Sincronizar labels BIDIRECIONAL: WAHA ↔ banco (uma vez no início da sync)
    const labelMap = await syncLabelsFromWaha(supabase, wahaGet, wahaPost, sessao.session_name, sessao.tenant_id, sessao.franchise_id);

    // 6. Processar o batch atual (BATCH_SIZE chats)
    const batchChatIds = chatIds.slice(offset, offset + BATCH_SIZE);

    // Buscar dados completos dos chats do WAHA para este batch
    const batchChats: Array<Record<string, unknown>> = [];
    for (const cid of batchChatIds) {
      // Buscar overview do chat individual (mais rápido que buscar todos)
      batchChats.push({ chatId: cid, id: cid });
    }

    // Buscar chats completos do WAHA para ter name, picture, lastMessage etc.
    let fullChatData: Array<Record<string, unknown>> = [];
    try {
      const allChats = await wahaGet(`/api/${sessao.session_name}/chats?limit=5000`) as Array<Record<string, unknown>>;
      if (Array.isArray(allChats)) {
        const chatMap = new Map<string, Record<string, unknown>>();
        for (const c of allChats) {
          const rid = (c.chatId || c.id) as string;
          if (rid) chatMap.set(rid, c);
        }
        for (const cid of batchChatIds) {
          const full = chatMap.get(cid);
          if (full) fullChatData.push(full);
          else fullChatData.push({ chatId: cid, id: cid });
        }
      }
    } catch (_) {
      // Fallback: usar IDs simples
      fullChatData = batchChats;
    }

    const result = await processBatch(
      supabase,
      wahaGet,
      fullChatData,
      sessionId,
      sessao.session_name,
      sessao.tenant_id,
      sessao.franchise_id,
      sessao.responsible_user_id || null,
      existingConvMap,
      phoneCache,
      existingMsgIds,
      lidCache,
      labelMap,
      sessao.display_name || null,
      {
        round_robin_enabled: sessao.round_robin_enabled ?? false,
        round_robin_mode: sessao.round_robin_mode || "team",
        team_id: sessao.team_id,
        department_id: sessao.department_id,
        responsible_user_id: sessao.responsible_user_id,
      },
    );

    const newOffset = offset + batchChatIds.length;
    const newProcessed = accProcessed + result.processed;
    const newLeads = accLeads + result.leadsCreated;
    const newErrors = accErrors + result.errors;
    const newMessages = accMessages + result.totalMessages;
    const newLabels = accLabels + result.labelsLinked;
    const done = newOffset >= totalChats;

    const progress: Record<string, unknown> = {
      status: done ? "completed" : "syncing",
      offset: newOffset,
      total: totalChats,
      processed: newProcessed,
      leads_created: newLeads,
      total_messages: newMessages,
      labels_linked: newLabels,
      errors: newErrors,
      chat_ids: chatIds,
      started_at: startedAt,
      updated_at: new Date().toISOString(),
    };

    if (done) {
      progress.completed_at = new Date().toISOString();
      // Limpar chat_ids do progresso final (pode ser grande)
      delete progress.chat_ids;
    }

    await saveProgress(supabase, sessionId, progress);

    if (done) {
      await supabase
        .from("mt_whatsapp_sessions")
        .update({ last_sync_at: new Date().toISOString(), total_chats: newProcessed })
        .eq("id", sessionId);
    }

    // Resumo dos skips por motivo
    const skipSummary: Record<string, number> = {};
    for (const s of result.skipped) {
      skipSummary[s.reason] = (skipSummary[s.reason] || 0) + 1;
    }

    return json({
      status: done ? "completed" : "syncing",
      session_id: sessionId,
      offset: newOffset,
      total: totalChats,
      processed: newProcessed,
      leads_created: newLeads,
      total_messages: newMessages,
      labels_linked: newLabels,
      errors: newErrors,
      done,
      skip_reasons: skipSummary,
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message }, 500);
  }
});
