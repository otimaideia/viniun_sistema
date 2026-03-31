// =============================================================================
// EDGE FUNCTION: send-contract-notification
// =============================================================================
// Envia notificações de contratos de influenciadoras por WhatsApp (WAHA) e Email (SMTP).
// Tipos: contrato_criado, aditivo_gerado, assinatura_confirmada, contrato_encerrado,
//        pagamento_registrado, post_aprovado, post_rejeitado
// Respeita configuração de notificações em mt_influencer_notif_config.
// Envia para influenciadora + CC recipients configurados.
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type NotificationType =
  | "boas_vindas"
  | "contrato_criado"
  | "aditivo_gerado"
  | "assinatura_confirmada"
  | "contrato_encerrado"
  | "cancelamento_empresa"
  | "cancelamento_influenciadora"
  | "pagamento_registrado"
  | "post_aprovado"
  | "post_rejeitado";

interface SendNotificationRequest {
  influencerId: string;
  contractId?: string;
  tenantId: string;
  franchiseId?: string;
  type: NotificationType;
  signatureUrl?: string;
  extra?: Record<string, unknown>;
}

// Map notification type → config column
const TYPE_TO_CONFIG: Record<NotificationType, string> = {
  boas_vindas: "notif_on_contrato_criado",
  contrato_criado: "notif_on_contrato_criado",
  aditivo_gerado: "notif_on_aditivo_gerado",
  assinatura_confirmada: "notif_on_assinatura_confirmada",
  contrato_encerrado: "notif_on_contrato_encerrado",
  cancelamento_empresa: "notif_on_contrato_encerrado",
  cancelamento_influenciadora: "notif_on_contrato_encerrado",
  pagamento_registrado: "notif_on_pagamento",
  post_aprovado: "notif_on_post_aprovado",
  post_rejeitado: "notif_on_post_aprovado",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// =============================================================================
// Buscar Configuração de Notificação (cascade: franchise → tenant → defaults)
// =============================================================================

interface NotifConfig {
  whatsapp_enabled: boolean;
  email_enabled: boolean;
  whatsapp_cc: string[];
  email_cc: string[];
  event_enabled: boolean;
}

async function getNotifConfig(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  franchiseId: string | undefined,
  type: NotificationType
): Promise<NotifConfig> {
  const defaults: NotifConfig = {
    whatsapp_enabled: true,
    email_enabled: true,
    whatsapp_cc: [],
    email_cc: [],
    event_enabled: true,
  };

  const configColumn = TYPE_TO_CONFIG[type];

  // Try franchise-specific config first
  if (franchiseId) {
    const { data: fc } = await supabase
      .from("mt_influencer_notif_config")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("franchise_id", franchiseId)
      .maybeSingle();

    if (fc) {
      return {
        whatsapp_enabled: fc.notif_whatsapp_enabled ?? true,
        email_enabled: fc.notif_email_enabled ?? true,
        whatsapp_cc: fc.notif_whatsapp_cc || [],
        email_cc: fc.notif_email_cc || [],
        event_enabled: fc[configColumn] ?? true,
      };
    }
  }

  // Fallback: tenant config (franchise_id IS NULL)
  const { data: tc } = await supabase
    .from("mt_influencer_notif_config")
    .select("*")
    .eq("tenant_id", tenantId)
    .is("franchise_id", null)
    .maybeSingle();

  if (tc) {
    return {
      whatsapp_enabled: tc.notif_whatsapp_enabled ?? true,
      email_enabled: tc.notif_email_enabled ?? true,
      whatsapp_cc: tc.notif_whatsapp_cc || [],
      email_cc: tc.notif_email_cc || [],
      event_enabled: tc[configColumn] ?? true,
    };
  }

  return defaults;
}

// =============================================================================
// Montar Mensagem por Tipo
// =============================================================================

interface MessageContent {
  whatsapp: string;
  emailSubject: string;
  emailBody: string;
}

function buildMessage(
  type: NotificationType,
  nome: string,
  tenantName: string,
  signatureUrl?: string,
  extra?: Record<string, unknown>
): MessageContent {
  const link = signatureUrl || "";

  switch (type) {
    case "boas_vindas": {
      const portalUrl = extra?.portalUrl || link.replace(/\/contrato\/.*/, "/login");
      return {
        whatsapp: `Bem-vindo(a) ao time ${tenantName}!\n\nOi, *${nome}*!\n\nSua parceria como influenciador(a) da *${tenantName}* foi aprovada!\n\nAcesse seu portal exclusivo para gerenciar tudo:\n${portalUrl}\n\nNo portal voce pode:\n- Ver seus contratos\n- Acompanhar indicacoes\n- Verificar ganhos e permutas\n- Enviar posts para aprovacao\n\nEquipe ${tenantName}`,
        emailSubject: `Bem-vindo(a) ao time ${tenantName}!`,
        emailBody: buildEmailHtml(
          tenantName,
          `Oi, ${nome}!`,
          `Sua parceria como influenciador(a) da <strong>${tenantName}</strong> foi aprovada! Acesse seu portal exclusivo para gerenciar contratos, indicações, ganhos e permutas.`,
          portalUrl ? `<a href="${portalUrl}" style="background:#662E8E;color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:bold;display:inline-block">Acessar Portal</a>` : "",
        ),
      };
    }

    case "contrato_criado":
      return {
        whatsapp: `Seu contrato esta pronto para assinatura!\n\n*${nome}*, seu contrato de parceria com a *${tenantName}* foi gerado.\n\nAcesse o link abaixo para revisar e assinar digitalmente:\n${link}\n\nA assinatura digital tem validade juridica.\n\nEquipe ${tenantName}`,
        emailSubject: `📋 Seu contrato ${tenantName} está pronto para assinatura`,
        emailBody: buildEmailHtml(
          tenantName,
          `Olá, ${nome}!`,
          "Seu contrato foi criado e está pronto para assinatura digital.",
          link ? `<a href="${link}" style="background:#662E8E;color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:bold;display:inline-block">Assinar contrato</a>` : "",
        ),
      };

    case "aditivo_gerado":
      return {
        whatsapp: `📝 *Aditivo Contratual - ${tenantName}*\n\nOlá, *${nome}*!\n\nSeu contrato foi atualizado com um novo aditivo${extra?.aditivo_numero ? ` (nº ${extra.aditivo_numero})` : ""}.\n\n👉 Acesse o link para visualizar e assinar:\n${link}\n\n_Equipe ${tenantName}_`,
        emailSubject: `📝 Aditivo contratual - ${tenantName}`,
        emailBody: buildEmailHtml(
          tenantName,
          `Olá, ${nome}!`,
          `Seu contrato foi atualizado com um novo aditivo${extra?.aditivo_numero ? ` (nº ${extra.aditivo_numero})` : ""}. Acesse o link abaixo para visualizar as alterações e assinar.`,
          link ? `<a href="${link}" style="background:#662E8E;color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:bold;display:inline-block">Ver aditivo e assinar</a>` : "",
        ),
      };

    case "assinatura_confirmada": {
      const portalUrl = extra?.portalUrl || link.replace(/\/contrato\/.*/, "/login") || "";
      return {
        whatsapp: `Assinatura Confirmada - ${tenantName}\n\nOla, *${nome}*!\n\nSua assinatura digital foi registrada com sucesso. Seu contrato esta ativo.\n\nAcesse seu portal exclusivo para acompanhar tudo:\n${portalUrl}\n\nEquipe ${tenantName}`,
        emailSubject: `Assinatura confirmada - ${tenantName}`,
        emailBody: buildEmailHtml(
          tenantName,
          `Olá, ${nome}!`,
          "Sua assinatura digital foi registrada com sucesso! Seu contrato está ativo. Acesse seu portal exclusivo para acompanhar contratos, indicações e ganhos.",
          portalUrl ? `<a href="${portalUrl}" style="background:#662E8E;color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:bold;display:inline-block">Acessar Portal</a>` : "",
        ),
      };
    }

    case "contrato_encerrado":
      return {
        whatsapp: `🔴 *Contrato Encerrado - ${tenantName}*\n\nOlá, *${nome}*.\n\nSeu contrato com ${tenantName} foi encerrado${extra?.motivo ? `. Motivo: ${extra.motivo}` : ""}.\n\nAgradecemos pela parceria!\n\n_Equipe ${tenantName}_`,
        emailSubject: `Contrato encerrado - ${tenantName}`,
        emailBody: buildEmailHtml(
          tenantName,
          `Olá, ${nome}.`,
          `Seu contrato com ${tenantName} foi encerrado${extra?.motivo ? `. Motivo: ${extra.motivo}` : ""}. Agradecemos pela parceria!`,
          "",
        ),
      };

    case "cancelamento_empresa":
      return {
        whatsapp: `🔴 *Contrato Cancelado - ${tenantName}*\n\nOlá, *${nome}*.\n\nSeu contrato de parceria com a *${tenantName}* foi cancelado pela empresa.\n\n${extra?.motivo ? `📋 *Motivo:* ${extra.motivo}\n\n` : ""}${extra?.dentro_prazo_cdc ? "ℹ️ Cancelamento dentro do prazo de arrependimento (CDC Art. 49).\n\n" : ""}⚠️ Os procedimentos/créditos acordados foram encerrados.\n\nAgradecemos pela parceria!\n\n_Equipe ${tenantName}_`,
        emailSubject: `Contrato cancelado - ${tenantName}`,
        emailBody: buildEmailHtml(
          tenantName,
          `Olá, ${nome}.`,
          `Seu contrato de parceria com a <strong>${tenantName}</strong> foi cancelado pela empresa.${extra?.motivo ? `<br><br><strong>Motivo:</strong> ${extra.motivo}` : ""}${extra?.dentro_prazo_cdc ? "<br><br><em>Cancelamento dentro do prazo de arrependimento (CDC Art. 49).</em>" : ""}<br><br>⚠️ Os procedimentos/créditos acordados foram encerrados.<br><br>Agradecemos pela parceria!`,
          "",
        ),
      };

    case "cancelamento_influenciadora": {
      const infNome = extra?.influencer_nome || nome;
      const baseLegal = extra?.dentro_prazo_cdc
        ? "CDC Art. 49 (Direito de Arrependimento — até 7 dias)"
        : "Cláusula 7ª (Aviso prévio de 30 dias)";
      return {
        whatsapp: `🔴 *Cancelamento de Contrato - ${tenantName}*\n\nO(A) influenciador(a) *${infNome}* solicitou o cancelamento do contrato.\n\n📋 *Motivo:* ${extra?.motivo || "Não informado"}\n⏱ *Vigência:* ${extra?.dias_vigencia ?? "?"} dia(s)\n📜 *Base legal:* ${baseLegal}\n\n_Notificação automática do sistema_`,
        emailSubject: `Cancelamento solicitado por influenciador(a) ${infNome} - ${tenantName}`,
        emailBody: buildEmailHtml(
          tenantName,
          `Cancelamento de Contrato`,
          `O(A) influenciador(a) <strong>${infNome}</strong> solicitou o cancelamento do contrato.<br><br><strong>Motivo:</strong> ${extra?.motivo || "Não informado"}<br><strong>Vigência:</strong> ${extra?.dias_vigencia ?? "?"} dia(s)<br><strong>Base legal:</strong> ${baseLegal}`,
          "",
        ),
      };
    }

    case "pagamento_registrado":
      return {
        whatsapp: `💰 *Pagamento Registrado - ${tenantName}*\n\nOlá, *${nome}*!\n\nUm pagamento${extra?.valor ? ` de R$ ${extra.valor}` : ""} foi registrado para você.\n\n_Equipe ${tenantName}_`,
        emailSubject: `💰 Pagamento registrado - ${tenantName}`,
        emailBody: buildEmailHtml(
          tenantName,
          `Olá, ${nome}!`,
          `Um pagamento${extra?.valor ? ` de R$ ${extra.valor}` : ""} foi registrado para você.`,
          "",
        ),
      };

    case "post_aprovado":
      return {
        whatsapp: `👍 *Post Aprovado - ${tenantName}*\n\nOlá, *${nome}*!\n\nSeu post foi aprovado com sucesso!${extra?.feedback ? `\n\nFeedback: ${extra.feedback}` : ""}\n\n_Equipe ${tenantName}_ ✨`,
        emailSubject: `👍 Post aprovado - ${tenantName}`,
        emailBody: buildEmailHtml(
          tenantName,
          `Olá, ${nome}!`,
          `Seu post foi aprovado com sucesso!${extra?.feedback ? `<br><br>Feedback: ${extra.feedback}` : ""}`,
          "",
        ),
      };

    case "post_rejeitado":
      return {
        whatsapp: `❌ *Post Rejeitado - ${tenantName}*\n\nOlá, *${nome}*.\n\nSeu post foi rejeitado.${extra?.motivo ? `\n\nMotivo: ${extra.motivo}` : ""}\n\nPor favor, ajuste e reenvie.\n\n_Equipe ${tenantName}_`,
        emailSubject: `Post rejeitado - ${tenantName}`,
        emailBody: buildEmailHtml(
          tenantName,
          `Olá, ${nome}.`,
          `Seu post foi rejeitado.${extra?.motivo ? `<br><br>Motivo: ${extra.motivo}` : ""}<br><br>Por favor, ajuste e reenvie.`,
          "",
        ),
      };
  }
}

function buildEmailHtml(tenantName: string, greeting: string, body: string, cta: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);max-width:600px">
        <tr><td style="background:linear-gradient(135deg,#662E8E,#F2B705);padding:32px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:24px">${tenantName}</h1>
        </td></tr>
        <tr><td style="padding:32px">
          <h2 style="color:#662E8E;margin:0 0 16px">${greeting}</h2>
          <p style="color:#555;line-height:1.6;margin:0 0 24px">${body}</p>
          ${cta ? `<div style="text-align:center;margin:24px 0">${cta}</div>` : ""}
        </td></tr>
        <tr><td style="background:#f8f4ff;padding:20px 32px;text-align:center;border-top:1px solid #e8d5f5">
          <p style="color:#888;font-size:12px;margin:0">© 2026 ${tenantName}. Todos os direitos reservados.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// =============================================================================
// Enviar WhatsApp via WAHA
// =============================================================================

async function enviarWhatsApp(
  supabase: ReturnType<typeof createClient>,
  telefone: string,
  mensagem: string,
  tenantId?: string,
  franchiseId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: wahaConfig } = await supabase
      .from("mt_waha_config")
      .select("api_url, api_key, enabled")
      .maybeSingle();

    if (!wahaConfig?.enabled) {
      return { success: false, error: "WhatsApp não configurado ou desabilitado" };
    }

    // Buscar sessão padrão (is_default) da unidade, depois fallbacks
    let sessionName: string | null = null;

    // 1. Sessão padrão (is_default=true) da franquia ou tenant
    {
      let q = supabase
        .from("mt_whatsapp_sessions")
        .select("session_name")
        .eq("status", "working")
        .eq("is_default", true)
        .limit(1);

      if (franchiseId) q = q.eq("franchise_id", franchiseId);
      else if (tenantId) q = q.eq("tenant_id", tenantId);

      const { data } = await q;
      if (data?.length) sessionName = data[0].session_name;
    }

    // 2. Fallback: qualquer sessão ativa do tenant
    if (!sessionName && tenantId) {
      const { data } = await supabase
        .from("mt_whatsapp_sessions")
        .select("session_name")
        .eq("status", "working")
        .eq("tenant_id", tenantId)
        .limit(1);
      if (data?.length) sessionName = data[0].session_name;
    }

    // 3. Fallback: qualquer sessão ativa
    if (!sessionName) {
      const { data } = await supabase
        .from("mt_whatsapp_sessions")
        .select("session_name")
        .eq("status", "working")
        .limit(1);
      if (data?.length) sessionName = data[0].session_name;
    }

    // 4. Último fallback: API WAHA direta
    if (!sessionName) {
      try {
        const resp = await fetch(`${wahaConfig.api_url}/api/sessions`, {
          headers: { "X-Api-Key": wahaConfig.api_key || "" },
        });
        if (resp.ok) {
          const sessions = await resp.json();
          const active = sessions.find((s: { status: string }) =>
            s.status === "WORKING" || s.status === "working"
          );
          if (active) sessionName = active.name;
        }
      } catch (_) { /* ignora */ }
    }

    if (!sessionName) {
      return { success: false, error: "Nenhuma sessão WhatsApp ativa" };
    }

    const cleaned = telefone.replace(/\D/g, "");
    const withCountry = cleaned.startsWith("55") ? cleaned : `55${cleaned}`;
    const chatId = `${withCountry}@c.us`;

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

    console.log(`[send-contract-notification] WhatsApp enviado para ${chatId}`);
    return { success: true };
  } catch (err) {
    console.error("[send-contract-notification] Erro WhatsApp:", err);
    return { success: false, error: String(err) };
  }
}

// =============================================================================
// Enviar Email via SMTP
// =============================================================================

async function enviarEmail(
  supabase: ReturnType<typeof createClient>,
  email: string,
  subject: string,
  htmlBody: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Buscar config SMTP
    const { data: settings } = await supabase
      .from("mt_platform_settings")
      .select("chave, valor")
      .in("chave", ["smtp_host", "smtp_port", "smtp_secure", "smtp_user", "smtp_pass", "smtp_from_email", "smtp_from_name"]);

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
          from_name: m.smtp_from_name || "Viniun",
        };
      }
    }

    // Fallback env vars
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
          from_name: Deno.env.get("SMTP_FROM_NAME") || "Viniun",
        };
      }
    }

    if (!smtpConfig) {
      return { success: false, error: "SMTP não configurado" };
    }

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
      subject,
      html: htmlBody,
    });

    console.log(`[send-contract-notification] Email enviado para ${email}`);
    return { success: true };
  } catch (err) {
    console.error("[send-contract-notification] Erro email:", err);
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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, serviceKey);

    const body: SendNotificationRequest = await req.json();
    const { influencerId, contractId, tenantId, franchiseId, type, signatureUrl, extra } = body;

    if (!influencerId || !tenantId || !type) {
      return jsonResponse({ error: "influencerId, tenantId e type são obrigatórios" }, 400);
    }

    console.log(`[send-contract-notification] type=${type} influencer=${influencerId} contract=${contractId}`);

    // 1. Buscar config de notificação
    const config = await getNotifConfig(supabase, tenantId, franchiseId, type);

    if (!config.event_enabled) {
      console.log(`[send-contract-notification] Evento ${type} desabilitado nas configurações`);
      return jsonResponse({ success: true, skipped: true, reason: "Evento desabilitado" });
    }

    if (!config.whatsapp_enabled && !config.email_enabled) {
      console.log(`[send-contract-notification] Todos os canais desabilitados`);
      return jsonResponse({ success: true, skipped: true, reason: "Canais desabilitados" });
    }

    // 2. Buscar influenciadora
    const { data: influencer, error: fetchError } = await supabase
      .from("mt_influencers")
      .select("nome, email, telefone, whatsapp")
      .eq("id", influencerId)
      .single();

    if (fetchError || !influencer) {
      return jsonResponse({ error: "Influenciadora não encontrada" }, 404);
    }

    // 3. Buscar nome e slug do tenant
    const { data: tenantInfo } = await supabase
      .from("mt_tenants")
      .select("nome_fantasia, slug, dominio_customizado")
      .eq("id", tenantId)
      .maybeSingle();

    const tenantName = tenantInfo?.nome_fantasia || "Viniun";
    const nome = influencer.nome || "Influenciadora";
    const telefone = influencer.whatsapp || influencer.telefone;
    const email = influencer.email;

    // Construir portal URL a partir do domínio do tenant
    const domain = tenantInfo?.dominio_customizado || "www.viniun.com.br";
    const portalUrl = `https://${domain}/influenciadores/painel`;

    // 4. Montar mensagem (inclui portalUrl no extra se não fornecido)
    const enrichedExtra = { ...extra, portalUrl: extra?.portalUrl || portalUrl };
    const message = buildMessage(type, nome, tenantName, signatureUrl, enrichedExtra);

    // 5. Enviar notificações
    const promises: Promise<{ success: boolean; error?: string }>[] = [];
    const labels: string[] = [];

    // WhatsApp principal + CCs (usa sessão da unidade/tenant)
    if (config.whatsapp_enabled) {
      if (telefone) {
        promises.push(enviarWhatsApp(supabase, telefone, message.whatsapp, tenantId, franchiseId));
        labels.push(`wa:${telefone}`);
      }
      for (const ccPhone of config.whatsapp_cc) {
        promises.push(enviarWhatsApp(supabase, ccPhone, message.whatsapp, tenantId, franchiseId));
        labels.push(`wa-cc:${ccPhone}`);
      }
    }

    // Email principal + CCs
    if (config.email_enabled) {
      if (email) {
        promises.push(enviarEmail(supabase, email, message.emailSubject, message.emailBody));
        labels.push(`email:${email}`);
      }
      for (const ccEmail of config.email_cc) {
        promises.push(enviarEmail(supabase, ccEmail, message.emailSubject, message.emailBody));
        labels.push(`email-cc:${ccEmail}`);
      }
    }

    if (promises.length === 0) {
      return jsonResponse({ success: true, skipped: true, reason: "Sem destinatários" });
    }

    const results = await Promise.allSettled(promises);

    const summary = results.map((r, i) => ({
      target: labels[i],
      success: r.status === "fulfilled" ? r.value.success : false,
      error: r.status === "fulfilled" ? r.value.error : String((r as PromiseRejectedResult).reason),
    }));

    const anySuccess = summary.some(s => s.success);

    console.log(`[send-contract-notification] Resultado: ${summary.filter(s => s.success).length}/${summary.length} enviados`);

    return jsonResponse({
      success: anySuccess,
      type,
      sent: summary.filter(s => s.success).length,
      total: summary.length,
      details: summary,
    });
  } catch (err) {
    console.error("[send-contract-notification] Erro geral:", err);
    return jsonResponse({ error: String(err) }, 500);
  }
});
