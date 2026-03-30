// =============================================================================
// EDGE FUNCTION: totem-ponto
// =============================================================================
// Registro de ponto/presenca via totem (CPF + foto)
// Suporta CLT (ponto) e MEI (presenca) com terminologia dinamica
// Acoes: identificar (buscar por CPF) e registrar (entrada/saida ou check-in/check-out)
// Envia notificacao via WhatsApp e Email apos registro
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// =============================================================================
// Notificacao WhatsApp via WAHA
// =============================================================================

async function enviarWhatsAppPonto(
  supabase: ReturnType<typeof createClient>,
  telefone: string,
  mensagem: string,
  tenantId: string,
  franchiseId: string | null,
  nome: string,
  wahaConfigParam?: { api_url: string; api_key: string; enabled: boolean } | null
): Promise<{ success: boolean; error?: string }> {
  try {
    // Usar config pre-buscada ou buscar se nao fornecida
    const wahaConfig = wahaConfigParam ?? (await supabase
      .from("mt_waha_config")
      .select("api_url, api_key, enabled")
      .maybeSingle()).data;

    if (!wahaConfig?.enabled || !wahaConfig?.api_url) {
      return { success: false, error: "WhatsApp nao configurado" };
    }

    // Buscar sessao ativa — priorizar is_default + franchise, depois tenant
    let sessionName: string | null = null;
    let sessionId: string | null = null;
    let sessionTenantId: string | null = null;
    let sessionFranchiseId: string | null = null;

    // 1. Tentar sessao da franchise (priorizar is_default)
    if (franchiseId) {
      const { data: sessoes } = await supabase
        .from("mt_whatsapp_sessions")
        .select("id, session_name, tenant_id, franchise_id, is_default")
        .eq("franchise_id", franchiseId)
        .eq("status", "working")
        .order("is_default", { ascending: false })
        .limit(1);

      if (sessoes?.length) {
        sessionName = sessoes[0].session_name;
        sessionId = sessoes[0].id;
        sessionTenantId = sessoes[0].tenant_id;
        sessionFranchiseId = sessoes[0].franchise_id;
      }
    }

    // 2. Fallback: sessao do tenant (priorizar is_default)
    if (!sessionName) {
      const { data: sessoes } = await supabase
        .from("mt_whatsapp_sessions")
        .select("id, session_name, tenant_id, franchise_id, is_default")
        .eq("tenant_id", tenantId)
        .eq("status", "working")
        .order("is_default", { ascending: false })
        .limit(1);

      if (sessoes?.length) {
        sessionName = sessoes[0].session_name;
        sessionId = sessoes[0].id;
        sessionTenantId = sessoes[0].tenant_id;
        sessionFranchiseId = sessoes[0].franchise_id;
      }
    }

    if (!sessionName) {
      return { success: false, error: "Nenhuma sessao WhatsApp ativa" };
    }

    // Formatar telefone
    const cleaned = telefone.replace(/\D/g, "");
    const withCountry = cleaned.startsWith("55") ? cleaned : `55${cleaned}`;
    const chatId = `${withCountry}@c.us`;

    // Enviar via WAHA
    const sendResp = await fetch(`${wahaConfig.api_url}/api/sendText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": wahaConfig.api_key || "",
      },
      body: JSON.stringify({ session: sessionName, chatId, text: mensagem }),
    });

    if (!sendResp.ok) {
      const errText = await sendResp.text();
      return { success: false, error: `WAHA ${sendResp.status}: ${errText}` };
    }

    // Salvar mensagem no banco
    if (sessionId && sessionTenantId) {
      try {
        const now = new Date().toISOString();
        const sendData = await sendResp.json().catch(() => ({})) as { id?: string; timestamp?: number };
        const messageId = sendData?.id || `totem-ponto-${Date.now()}`;
        const msgTimestamp = sendData?.timestamp ? new Date(sendData.timestamp * 1000).toISOString() : now;

        // Upsert conversa
        const { data: existingConv } = await supabase
          .from("mt_whatsapp_conversations")
          .select("id")
          .eq("session_id", sessionId)
          .eq("chat_id", chatId)
          .maybeSingle();

        let conversationId: string | null = existingConv?.id || null;

        if (!conversationId) {
          const { data: newConv } = await supabase
            .from("mt_whatsapp_conversations")
            .insert({
              session_id: sessionId,
              tenant_id: sessionTenantId,
              franchise_id: sessionFranchiseId,
              chat_id: chatId,
              contact_name: nome,
              contact_phone: cleaned,
              is_group: false,
              status: "open",
              unread_count: 0,
              last_message_text: mensagem.substring(0, 100),
              last_message_at: msgTimestamp,
              last_message_from: "me",
            })
            .select("id")
            .single();
          conversationId = newConv?.id || null;
        } else {
          await supabase
            .from("mt_whatsapp_conversations")
            .update({
              last_message_text: mensagem.substring(0, 100),
              last_message_at: msgTimestamp,
              last_message_from: "me",
              updated_at: now,
            })
            .eq("id", conversationId);
        }

        if (conversationId) {
          await supabase
            .from("mt_whatsapp_messages")
            .upsert({
              session_id: sessionId,
              tenant_id: sessionTenantId,
              conversation_id: conversationId,
              message_id: messageId,
              from_me: true,
              tipo: "chat",
              body: mensagem,
              ack: 1,
              status: "sent",
              timestamp: msgTimestamp,
            }, { onConflict: "message_id", ignoreDuplicates: true });
        }
      } catch (dbErr) {
        console.error("[totem-ponto] Erro ao salvar msg no banco:", dbErr);
      }
    }

    console.log(`[totem-ponto] WhatsApp enviado para ${chatId}`);
    return { success: true };
  } catch (err) {
    console.error("[totem-ponto] Erro WhatsApp:", err);
    return { success: false, error: String(err) };
  }
}

// =============================================================================
// Notificacao Email via SMTP
// =============================================================================

async function enviarEmailPonto(
  supabase: ReturnType<typeof createClient>,
  email: string,
  nome: string,
  tipo: string,
  horario: string,
  dataFormatada: string,
  unidadeNome: string,
  smtpSettingsParam?: { chave: string; valor: string }[] | null,
  labels?: { emailTitle: string; emailSubject: string; emailBody: string; fromName: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Usar settings pre-buscadas ou buscar se nao fornecidas
    const settings = smtpSettingsParam ?? (await supabase
      .from("mt_platform_settings")
      .select("chave, valor")
      .in("chave", ["smtp_host", "smtp_port", "smtp_secure", "smtp_user", "smtp_pass", "smtp_from_email", "smtp_from_name"])).data;

    let smtpConfig: {
      host: string; port: number; secure: boolean;
      user: string; pass: string; from_email: string; from_name: string;
    } | null = null;

    if (settings && settings.length > 0) {
      const m: Record<string, string> = {};
      settings.forEach((s: { chave: string; valor: string }) => { m[s.chave] = s.valor; });
      if (m.smtp_host && m.smtp_user && m.smtp_pass) {
        smtpConfig = {
          host: m.smtp_host,
          port: parseInt(m.smtp_port || "587"),
          secure: m.smtp_secure === "true",
          user: m.smtp_user,
          pass: m.smtp_pass,
          from_email: m.smtp_from_email || m.smtp_user,
          from_name: m.smtp_from_name || (labels?.fromName || "Sistema de Ponto"),
        };
      }
    }

    if (!smtpConfig) {
      const host = Deno.env.get("SMTP_HOST");
      const user = Deno.env.get("SMTP_USER");
      const pass = Deno.env.get("SMTP_PASS");
      if (host && user && pass) {
        smtpConfig = {
          host, port: parseInt(Deno.env.get("SMTP_PORT") || "587"),
          secure: Deno.env.get("SMTP_SECURE") === "true",
          user, pass,
          from_email: Deno.env.get("SMTP_FROM_EMAIL") || user,
          from_name: Deno.env.get("SMTP_FROM_NAME") || (labels?.fromName || "Sistema de Ponto"),
        };
      }
    }

    if (!smtpConfig) {
      return { success: false, error: "SMTP nao configurado" };
    }

    const tipoLabel = tipo === "entrada" ? "Entrada" : "Saida";
    const corTipo = tipo === "entrada" ? "#22c55e" : "#f97316";

    const emailTitle = labels?.emailTitle || `Registro de Ponto - ${tipoLabel}`;
    const emailSubjectLine = labels?.emailSubject || `Registro de Ponto - ${tipoLabel} ${horario} - ${dataFormatada}`;
    const emailBodyText = labels?.emailBody || "Seu ponto foi registrado com sucesso via totem.";

    const htmlBody = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0">
    <tr><td align="center">
      <table width="500" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);max-width:500px">
        <tr><td style="background:${corTipo};padding:24px 32px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:22px">${emailTitle}</h1>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="color:#555;line-height:1.6;margin:0 0 16px">Ola, <strong>${nome}</strong>!</p>
          <p style="color:#555;line-height:1.6;margin:0 0 24px">${emailBodyText}</p>
          <div style="background:#f8f8f8;border-radius:8px;padding:20px;border-left:4px solid ${corTipo}">
            <table width="100%" style="font-size:14px;color:#555">
              <tr><td style="padding:4px 0"><strong>Tipo:</strong></td><td>${tipoLabel}</td></tr>
              <tr><td style="padding:4px 0"><strong>Horario:</strong></td><td>${horario}</td></tr>
              <tr><td style="padding:4px 0"><strong>Data:</strong></td><td>${dataFormatada}</td></tr>
              <tr><td style="padding:4px 0"><strong>Unidade:</strong></td><td>${unidadeNome}</td></tr>
              <tr><td style="padding:4px 0"><strong>Origem:</strong></td><td>Totem</td></tr>
            </table>
          </div>
          <p style="color:#888;font-size:12px;margin:24px 0 0;text-align:center">
            Em caso de divergencia, procure o RH.<br>
            Este email e um comprovante automatico.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const nodemailer = await import("npm:nodemailer@6");
    const transporter = nodemailer.default.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: { user: smtpConfig.user, pass: smtpConfig.pass },
    });

    await transporter.sendMail({
      from: `"${smtpConfig.from_name}" <${smtpConfig.from_email}>`,
      to: email,
      subject: emailSubjectLine,
      html: htmlBody,
    });

    console.log(`[totem-ponto] Email enviado para ${email}`);
    return { success: true };
  } catch (err) {
    console.error("[totem-ponto] Erro email:", err);
    return { success: false, error: String(err) };
  }
}

// =============================================================================
// Handler Principal
// =============================================================================

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Metodo nao permitido" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { action } = body;

    // =========================================================================
    // ACAO: IDENTIFICAR — Buscar funcionario por CPF
    // =========================================================================
    if (action === "identificar") {
      const { cpf, tenant_slug, franchise_id: franchiseIdParam, tipo_busca } = body;

      if (!cpf) {
        return jsonResponse({ error: "CPF e obrigatorio" }, 400);
      }

      const cpfLimpo = cpf.replace(/\D/g, "");

      // tipo_busca: 'clt' (default) ou 'mei' (prestadores de servico)
      const isMeiBusca = tipo_busca === "mei";

      // Determinar filtro: franchise_id tem prioridade, depois tenant_slug
      let tenantFilter: string | null = null;
      let franchiseFilter: string | null = franchiseIdParam || null;

      if (!franchiseFilter && tenant_slug) {
        const { data: tenant } = await supabase
          .from("mt_tenants")
          .select("id")
          .eq("slug", tenant_slug)
          .eq("is_active", true)
          .maybeSingle();

        if (tenant) tenantFilter = tenant.id;
      }

      // Se temos franchise_id, buscar o tenant_id da franquia
      if (franchiseFilter && !tenantFilter) {
        const { data: fr } = await supabase
          .from("mt_franchises")
          .select("tenant_id")
          .eq("id", franchiseFilter)
          .maybeSingle();
        if (fr) tenantFilter = fr.tenant_id;
      }

      // Buscar funcionario pelo CPF — filtro por tipo de contratacao
      let empQuery = supabase
        .from("mt_payroll_employees")
        .select("id, user_id, nome, cpf, telefone, email, tenant_id, franchise_id, horario_entrada, horario_saida, tipo_contratacao")
        .eq("cpf", cpfLimpo)
        .eq("is_active", true)
        .is("deleted_at", null);

      if (isMeiBusca) {
        // MEI: buscar qualquer tipo que NAO seja CLT (mei, pj, autonomo, etc)
        empQuery = empQuery.neq("tipo_contratacao", "clt");
      } else {
        empQuery = empQuery.eq("tipo_contratacao", "clt");
      }

      if (franchiseFilter) {
        empQuery = empQuery.eq("franchise_id", franchiseFilter);
      } else if (tenantFilter) {
        empQuery = empQuery.eq("tenant_id", tenantFilter);
      }

      const { data: employee, error: empError } = await empQuery.limit(1).maybeSingle();

      if (empError || !employee) {
        const errorMsg = isMeiBusca
          ? "CPF nao encontrado. Verifique se voce esta cadastrado como prestador de servico."
          : "CPF nao encontrado. Verifique se voce esta cadastrado como funcionario CLT.";
        return jsonResponse({ error: errorMsg }, 404);
      }

      // Buscar nome da franquia
      let franchiseName = "";
      if (employee.franchise_id) {
        const { data: franchise } = await supabase
          .from("mt_franchises")
          .select("nome_fantasia")
          .eq("id", employee.franchise_id)
          .maybeSingle();
        franchiseName = franchise?.nome_fantasia || "";
      }

      // Buscar TODOS os registros de hoje (multiplas batidas)
      const hoje = new Date().toISOString().split("T")[0];

      const { data: todayEntries } = await supabase
        .from("mt_professional_attendance")
        .select("id, checkin_em, checkout_em, status, registro_origem")
        .eq("user_id", employee.user_id)
        .eq("tenant_id", employee.tenant_id)
        .eq("data", hoje)
        .order("checkin_em", { ascending: true });

      const entries = todayEntries || [];

      // Determinar proxima acao:
      // Se nenhum registro → entrada
      // Se ultimo registro tem checkin_em mas nao checkout_em → saida
      // Se ultimo registro tem ambos → nova entrada (novo periodo)
      const lastEntry = entries.length > 0 ? entries[entries.length - 1] : null;
      let nextAction: "entrada" | "saida" = "entrada";
      if (lastEntry && lastEntry.checkin_em && !lastEntry.checkout_em) {
        nextAction = "saida";
      }

      // Labels para cada batida — dinamico por tipo de contratacao
      const isMeiEmployee = employee.tipo_contratacao !== "clt";
      const punchLabels = isMeiEmployee
        ? [
          "Check-in Manha", "Check-out Almoco",
          "Retorno Almoco", "Check-out",
          "Check-in Extra", "Check-out Extra",
        ]
        : [
          "Entrada Manha", "Saida Almoco",
          "Retorno Almoco", "Saida",
          "Entrada Extra", "Saida Extra",
        ];
      const totalPunches = entries.reduce((acc, e) => {
        let count = 0;
        if (e.checkin_em) count++;
        if (e.checkout_em) count++;
        return acc + count;
      }, 0);
      const nextPunchLabel = punchLabels[totalPunches] || `Batida ${totalPunches + 1}`;

      return jsonResponse({
        success: true,
        employee: {
          id: employee.id,
          user_id: employee.user_id,
          nome: employee.nome,
          tenant_id: employee.tenant_id,
          franchise_id: employee.franchise_id,
          franchise_name: franchiseName,
          horario_entrada: employee.horario_entrada,
          horario_saida: employee.horario_saida,
        },
        todayEntries: entries,
        nextAction,
        nextPunchLabel,
        totalPunches,
        // Compatibilidade: todayEntry aponta para o ultimo registro
        todayEntry: lastEntry,
      });
    }

    // =========================================================================
    // ACAO: REGISTRAR — Registrar entrada ou saida
    // =========================================================================
    if (action === "registrar") {
      const {
        employee_id, user_id, tipo, selfie_base64,
        latitude, longitude, accuracy,
        tenant_id, franchise_id,
      } = body;

      if (!employee_id || !tipo || !selfie_base64 || !tenant_id) {
        return jsonResponse({ error: "Dados incompletos. employee_id, tipo, selfie e tenant_id sao obrigatorios." }, 400);
      }

      if (tipo !== "entrada" && tipo !== "saida") {
        return jsonResponse({ error: "Tipo deve ser 'entrada' ou 'saida'" }, 400);
      }

      // Buscar employee + franchise + configs em PARALELO (otimizacao de performance)
      const [empResult, franchiseResult, wahaConfigResult, smtpResult, pontoConfigResult] = await Promise.all([
        // 1. Employee com JOIN em mt_users para contato
        supabase
          .from("mt_payroll_employees")
          .select("id, nome, cpf, telefone, email, user_id, tenant_id, franchise_id, tipo_contratacao, user:mt_users!left(telefone, email)")
          .eq("id", employee_id)
          .eq("tenant_id", tenant_id)
          .eq("is_active", true)
          .maybeSingle(),
        // 2. Franchise name + telefone (fallback para notificacoes)
        franchise_id
          ? supabase.from("mt_franchises").select("nome_fantasia, telefone").eq("id", franchise_id).maybeSingle()
          : Promise.resolve({ data: null }),
        // 3. WAHA config (pre-fetch para notificacoes)
        supabase.from("mt_waha_config").select("api_url, api_key, enabled").maybeSingle(),
        // 4. SMTP settings (pre-fetch para notificacoes)
        supabase.from("mt_platform_settings").select("chave, valor")
          .in("chave", ["smtp_host", "smtp_port", "smtp_secure", "smtp_user", "smtp_pass", "smtp_from_email", "smtp_from_name"]),
        // 5. Ponto config (notificacoes CC, requisitos)
        supabase.from("mt_ponto_config")
          .select("*")
          .eq("tenant_id", tenant_id)
          .order("franchise_id", { ascending: true, nullsFirst: false })
          .limit(2),
      ]);

      const employee = empResult.data;
      if (!employee) {
        return jsonResponse({ error: "Funcionario nao encontrado" }, 404);
      }

      // Usar user_id do employee (mais confiavel que o enviado pelo frontend)
      const effectiveUserId = employee.user_id || user_id;
      if (!effectiveUserId) {
        return jsonResponse({ error: "Funcionario sem usuario vinculado. Procure o RH." }, 400);
      }

      const franchiseName = franchiseResult.data?.nome_fantasia || "";
      const franchisePhone = franchiseResult.data?.telefone || null;
      const wahaConfig = wahaConfigResult.data;
      const smtpSettings = smtpResult.data;
      // Contato do mt_users (via JOIN)
      const userContact = (employee as Record<string, unknown>).user as { telefone?: string; email?: string } | null;

      // Ponto config: franchise-specific > tenant-wide > defaults
      const pontoConfigs = pontoConfigResult.data || [];
      const pontoConfig = (franchise_id
        ? pontoConfigs.find((c: any) => c.franchise_id === franchise_id)
        : null
      ) || pontoConfigs.find((c: any) => !c.franchise_id) || {
        notif_whatsapp_enabled: true,
        notif_email_enabled: true,
        notif_whatsapp_cc: [],
        notif_email_cc: [],
        notif_on_entrada: true,
        notif_on_saida: true,
      };

      const now = new Date();
      const hoje = now.toISOString().split("T")[0];
      const horarioAtual = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
      const dataFormatada = now.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

      // Upload selfie para Storage
      let selfieUrl: string | null = null;
      try {
        const base64Data = selfie_base64.replace(/^data:image\/\w+;base64,/, "");
        const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
        const timestamp = Date.now();
        const filePath = `totem/${tenant_id}/${employee_id}/${timestamp}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from("attendance-selfies")
          .upload(filePath, binaryData, {
            contentType: "image/jpeg",
            upsert: false,
          });

        if (uploadError) {
          console.error("[totem-ponto] Erro upload selfie:", uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from("attendance-selfies")
            .getPublicUrl(filePath);
          selfieUrl = urlData?.publicUrl || null;
        }
      } catch (uploadErr) {
        console.error("[totem-ponto] Erro ao processar selfie:", uploadErr);
      }

      let entry;

      if (tipo === "entrada") {
        // Verificar se ultimo registro de hoje ja tem entrada aberta (sem saida)
        const { data: openEntry } = await supabase
          .from("mt_professional_attendance")
          .select("id")
          .eq("user_id", effectiveUserId)
          .eq("tenant_id", tenant_id)
          .eq("data", hoje)
          .is("checkout_em", null)
          .limit(1)
          .maybeSingle();

        if (openEntry) {
          return jsonResponse({ error: "Voce tem uma entrada aberta. Registre a saida primeiro." }, 400);
        }

        // INSERT nova entrada (novo periodo do dia)
        const { data: newEntry, error: insertError } = await supabase
          .from("mt_professional_attendance")
          .insert({
            tenant_id,
            franchise_id: franchise_id || employee.franchise_id,
            user_id: effectiveUserId,
            data: hoje,
            checkin_em: now.toISOString(),
            status: "presente",
            registro_origem: "totem",
            checkin_latitude: latitude || null,
            checkin_longitude: longitude || null,
            checkin_accuracy: accuracy || null,
            checkin_selfie_url: selfieUrl,
          })
          .select()
          .single();

        if (insertError) {
          console.error("[totem-ponto] Erro insert:", insertError);
          return jsonResponse({ error: "Erro ao registrar entrada" }, 500);
        }

        entry = newEntry;
      } else {
        // UPDATE saida — buscar ultimo registro aberto de hoje
        const { data: todayRecord } = await supabase
          .from("mt_professional_attendance")
          .select("id, checkin_em")
          .eq("user_id", effectiveUserId)
          .eq("tenant_id", tenant_id)
          .eq("data", hoje)
          .is("checkout_em", null)
          .order("checkin_em", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!todayRecord) {
          return jsonResponse({ error: "Nenhuma entrada aberta encontrada hoje para registrar saida." }, 400);
        }

        const { data: updated, error: updateError } = await supabase
          .from("mt_professional_attendance")
          .update({
            checkout_em: now.toISOString(),
            checkout_latitude: latitude || null,
            checkout_longitude: longitude || null,
            checkout_accuracy: accuracy || null,
            checkout_selfie_url: selfieUrl,
            updated_at: now.toISOString(),
          })
          .eq("id", todayRecord.id)
          .select()
          .single();

        if (updateError) {
          console.error("[totem-ponto] Erro update:", updateError);
          return jsonResponse({ error: "Erro ao registrar saida" }, 500);
        }

        entry = updated;
      }

      // =======================================================================
      // Notificacoes (WhatsApp + Email) — nao bloqueia resposta
      // =======================================================================

      // Detectar tipo de contratacao para labels dinamicos
      const isMEI = (employee as Record<string, unknown>).tipo_contratacao !== "clt";
      const tipoLabel = isMEI
        ? (tipo === "entrada" ? "Check-in" : "Check-out")
        : (tipo === "entrada" ? "Entrada" : "Saida");
      const registroTitulo = isMEI ? "Presenca confirmada" : "Ponto registrado";
      const registroOrigem = isMEI ? "totem de presenca" : "totem";
      const contatoSuporte = isMEI ? "o responsavel da unidade" : "o RH";

      const cpfMascarado = employee.cpf
        ? `***.${employee.cpf.substring(3, 6)}.${employee.cpf.substring(6, 9)}-**`
        : "---";

      const mensagemWhatsApp = `${tipo === "entrada" ? "📥" : "📤"} *${registroTitulo} com sucesso!*

👤 ${employee.nome}
📋 CPF: ${cpfMascarado}
📅 ${dataFormatada}
⏰ ${tipoLabel}: ${horarioAtual}
${latitude ? "📍 Localizacao: capturada" : ""}
📷 Foto: registrada
🏢 ${franchiseName || "---"}

Registro feito via ${registroOrigem}.
Em caso de divergencia, procure ${contatoSuporte}.`;

      // Verificar se deve notificar neste tipo (entrada/saida)
      const shouldNotify = tipo === "entrada" ? pontoConfig.notif_on_entrada : pontoConfig.notif_on_saida;

      // Enviar notificacoes em paralelo (sem aguardar)
      const notifPromises: Promise<{ success: boolean; error?: string }>[] = [];

      if (shouldNotify) {
        // WhatsApp — enviar para funcionario
        if (pontoConfig.notif_whatsapp_enabled) {
          const telefone = employee.telefone || userContact?.telefone || franchisePhone;
          if (telefone) {
            notifPromises.push(
              enviarWhatsAppPonto(supabase, telefone, mensagemWhatsApp, tenant_id, franchise_id, employee.nome, wahaConfig)
            );
          }
        }

        // WhatsApp CC — enviar copia para gerentes/donos
        const whatsappCCs: string[] = pontoConfig.notif_whatsapp_cc || [];
        for (const ccPhone of whatsappCCs) {
          if (ccPhone) {
            notifPromises.push(
              enviarWhatsAppPonto(supabase, ccPhone, mensagemWhatsApp, tenant_id, franchise_id, employee.nome, wahaConfig)
            );
          }
        }

        // Labels dinamicos para email
        const emailLabels = isMEI ? {
          emailTitle: `Confirmacao de Presenca - ${tipoLabel}`,
          emailSubject: `Confirmacao de Presenca - ${tipoLabel} ${horarioAtual} - ${dataFormatada}`,
          emailBody: "Sua presenca foi confirmada com sucesso via totem de presenca.",
          fromName: "Sistema de Presenca",
        } : undefined;

        // Email — enviar para funcionario
        if (pontoConfig.notif_email_enabled) {
          const emailContato = employee.email || userContact?.email;
          if (emailContato) {
            notifPromises.push(
              enviarEmailPonto(supabase, emailContato, employee.nome, tipo, horarioAtual, dataFormatada, franchiseName, smtpSettings, emailLabels)
            );
          }
        }

        // Email CC — enviar copia para gerentes/donos
        const emailCCs: string[] = pontoConfig.notif_email_cc || [];
        for (const ccEmail of emailCCs) {
          if (ccEmail) {
            notifPromises.push(
              enviarEmailPonto(supabase, ccEmail, employee.nome, tipo, horarioAtual, dataFormatada, franchiseName, smtpSettings, emailLabels)
            );
          }
        }
      }

      // Aguardar notificacoes (mas nao falhar se der erro)
      const notifResults = await Promise.allSettled(notifPromises);
      const whatsappOk = notifResults.some(r => r.status === "fulfilled" && (r.value as { success: boolean }).success);
      const emailOk = notifResults.some(r =>
        r.status === "fulfilled" &&
        (r.value as { success: boolean }).success &&
        notifPromises.length > 1
      );

      const ccWaCount = (pontoConfig.notif_whatsapp_cc || []).length;
      const ccEmailCount = (pontoConfig.notif_email_cc || []).length;
      console.log(`[totem-ponto] Registro ${tipo} OK. WhatsApp=${whatsappOk} Email=${emailOk} Notif=${shouldNotify} CCs_WA=${ccWaCount} CCs_Email=${ccEmailCount}`);

      const successMsg = isMEI
        ? `${tipoLabel} confirmado com sucesso!`
        : `${tipoLabel} registrada com sucesso!`;

      return jsonResponse({
        success: true,
        message: successMsg,
        entry,
        horario: horarioAtual,
        notifications: {
          whatsapp: whatsappOk,
          email: emailOk,
        },
      });
    }

    // =========================================================================
    // ACAO: ATUALIZAR_GEO — Atualizar geolocalizacao de um registro existente
    // =========================================================================
    if (action === "atualizar_geo") {
      const { entry_id, tenant_id: tid, latitude, longitude, accuracy, tipo } = body;

      if (!entry_id || !tid) {
        return jsonResponse({ error: "entry_id e tenant_id obrigatorios" }, 400);
      }

      const geoField = tipo === "saida" ? {
        checkout_latitude: latitude || null,
        checkout_longitude: longitude || null,
        checkout_accuracy: accuracy || null,
      } : {
        checkin_latitude: latitude || null,
        checkin_longitude: longitude || null,
        checkin_accuracy: accuracy || null,
      };

      await supabase
        .from("mt_professional_attendance")
        .update({ ...geoField, updated_at: new Date().toISOString() })
        .eq("id", entry_id)
        .eq("tenant_id", tid);

      return jsonResponse({ success: true, message: "Geolocalizacao atualizada" });
    }

    return jsonResponse({ error: `Acao desconhecida: ${action}` }, 400);
  } catch (error) {
    console.error("[totem-ponto] Erro inesperado:", error);
    return jsonResponse({ error: "Erro interno do servidor" }, 500);
  }
});
