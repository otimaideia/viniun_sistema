// =============================================================================
// EDGE FUNCTION: send-welcome
// =============================================================================
// Envia mensagem de boas-vindas por WhatsApp (WAHA) e Email (SMTP)
// Chamada quando admin ativa uma influenciadora no painel
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SendWelcomeRequest {
  influenciadoraId: string;
  tenantId: string;
  portalUrl?: string; // override para URL do portal
}

// =============================================================================
// WhatsApp via WAHA
// =============================================================================

async function enviarWhatsAppBoasVindas(
  supabase: ReturnType<typeof createClient>,
  telefone: string,
  nome: string,
  portalUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: wahaConfig } = await supabase
      .from("mt_waha_config")
      .select("api_url, api_key, enabled")
      .maybeSingle();

    if (!wahaConfig?.enabled) {
      return { success: false, error: "WhatsApp não configurado ou desabilitado" };
    }

    // Buscar sessão ativa (com id, tenant_id, franchise_id para salvar no banco)
    let sessionName: string | null = null;
    let sessionId: string | null = null;
    let tenantId: string | null = null;
    let franchiseId: string | null = null;

    const { data: sessoes } = await supabase
      .from("mt_whatsapp_sessions")
      .select("id, session_name, tenant_id, franchise_id")
      .eq("status", "working")
      .limit(1);

    if (sessoes && sessoes.length > 0) {
      sessionName = sessoes[0].session_name;
      sessionId = sessoes[0].id;
      tenantId = sessoes[0].tenant_id;
      franchiseId = sessoes[0].franchise_id;
    } else {
      // Fallback: buscar direto na API WAHA
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

    const mensagem = `🌟 *Bem-vinda ao Portal Viniun!*

Olá, *${nome}*! 🎉

Sua conta de influenciadora foi ativada e você já pode acessar seu portal exclusivo.

👉 Acesse agora:
${portalUrl}

No portal você encontra:
• 📋 Seu contrato
• 💰 Seus ganhos e comissões
• 🔗 Seu código de indicação exclusivo
• 📊 Estatísticas das suas indicações

Use seu WhatsApp ou email para fazer login e completar seu cadastro.

_Equipe Viniun_ ✨`;

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

    // Salvar diretamente no banco (sem depender do webhook echo)
    // Isso garante que a mensagem apareça no painel mesmo se o webhook falhar
    if (sessionId && tenantId) {
      try {
        const now = new Date().toISOString();
        const sendData = await sendResp.json().catch(() => ({})) as { id?: string; timestamp?: number };
        const messageId = sendData?.id || `send-welcome-${Date.now()}`;
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
              tenant_id: tenantId,
              franchise_id: franchiseId,
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
          // Atualizar conversa existente
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

        // Inserir mensagem (upsert por message_id para não duplicar se webhook também processar)
        if (conversationId) {
          await supabase
            .from("mt_whatsapp_messages")
            .upsert({
              session_id: sessionId,
              tenant_id: tenantId,
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

        console.log(`[send-welcome] Mensagem salva no banco: conv=${conversationId}`);
      } catch (dbErr) {
        // Não falhar o envio por erro no banco — webhook pode pegar depois
        console.error("[send-welcome] Erro ao salvar no banco:", dbErr);
      }
    }

    console.log(`[send-welcome] WhatsApp enviado para ${chatId}`);
    return { success: true };
  } catch (err) {
    console.error("[send-welcome] Erro WhatsApp:", err);
    return { success: false, error: String(err) };
  }
}

// =============================================================================
// Email via SMTP
// =============================================================================

async function enviarEmailBoasVindas(
  supabase: ReturnType<typeof createClient>,
  email: string,
  nome: string,
  portalUrl: string
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

    const htmlBody = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vinda ao Portal Viniun</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);max-width:600px">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#662E8E,#F2B705);padding:40px 32px;text-align:center">
              <h1 style="color:#fff;margin:0;font-size:28px;font-weight:bold">✨ Viniun</h1>
              <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:16px">Portal da Influenciadora</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 32px">
              <h2 style="color:#662E8E;margin:0 0 16px;font-size:22px">Bem-vinda, ${nome}! 🎉</h2>
              <p style="color:#555;line-height:1.6;margin:0 0 24px">
                Sua conta de influenciadora foi ativada! Estamos muito felizes em ter você como parte da nossa família.
              </p>

              <div style="background:#f8f4ff;border-radius:8px;padding:24px;margin:0 0 24px;border-left:4px solid #662E8E">
                <p style="margin:0 0 8px;font-weight:bold;color:#662E8E">O que você encontra no portal:</p>
                <ul style="margin:0;padding:0 0 0 20px;color:#555;line-height:2">
                  <li>📋 Seu contrato e condições</li>
                  <li>🔗 Seu código de indicação exclusivo</li>
                  <li>💰 Seus ganhos e comissões</li>
                  <li>📊 Estatísticas das suas indicações</li>
                  <li>🔄 Suas permutas e créditos</li>
                </ul>
              </div>

              <div style="text-align:center;margin:32px 0">
                <a href="${portalUrl}" style="background:linear-gradient(135deg,#662E8E,#8B3FB5);color:#fff;text-decoration:none;padding:16px 40px;border-radius:8px;font-size:16px;font-weight:bold;display:inline-block">
                  Acessar meu portal 🚀
                </a>
              </div>

              <p style="color:#888;font-size:14px;text-align:center;margin:0">
                Use seu WhatsApp ou email para fazer login.<br>
                <a href="${portalUrl}" style="color:#662E8E">${portalUrl}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8f4ff;padding:24px 32px;text-align:center;border-top:1px solid #e8d5f5">
              <p style="color:#888;font-size:12px;margin:0">
                © ${new Date().getFullYear()} Viniun. Todos os direitos reservados.<br>
                Este email foi enviado porque você foi cadastrada como influenciadora.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Enviar via nodemailer
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
      subject: `🌟 Bem-vinda ao Portal Viniun, ${nome}!`,
      html: htmlBody,
    });

    console.log(`[send-welcome] Email enviado para ${email}`);
    return { success: true };
  } catch (err) {
    console.error("[send-welcome] Erro email:", err);
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

    const body: SendWelcomeRequest = await req.json();
    const { influenciadoraId, tenantId, portalUrl } = body;

    if (!influenciadoraId || !tenantId) {
      return new Response(
        JSON.stringify({ error: "influenciadoraId e tenantId são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar influenciadora
    const { data: influenciadora, error: fetchError } = await supabase
      .from("mt_influencers")
      .select("nome, email, telefone, whatsapp")
      .eq("id", influenciadoraId)
      .single();

    if (fetchError || !influenciadora) {
      return new Response(
        JSON.stringify({ error: "Influenciadora não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const nome = influenciadora.nome || "Influenciadora";
    const telefone = influenciadora.whatsapp || influenciadora.telefone;
    const email = influenciadora.email;
    const loginUrl = portalUrl || `${req.headers.get("origin") || "https://www.viniun.com.br"}/influenciadora/login`;

    // Enviar em paralelo
    const [whatsappResult, emailResult] = await Promise.allSettled([
      telefone
        ? enviarWhatsAppBoasVindas(supabase, telefone, nome, loginUrl)
        : Promise.resolve({ success: false, error: "Sem telefone" }),
      email
        ? enviarEmailBoasVindas(supabase, email, nome, loginUrl)
        : Promise.resolve({ success: false, error: "Sem email" }),
    ]);

    const whatsapp = whatsappResult.status === "fulfilled" ? whatsappResult.value : { success: false };
    const emailRes = emailResult.status === "fulfilled" ? emailResult.value : { success: false };

    console.log(`[send-welcome] Resultado: WhatsApp=${whatsapp.success} Email=${emailRes.success}`);

    return new Response(
      JSON.stringify({
        success: whatsapp.success || emailRes.success,
        whatsapp: whatsapp.success,
        email: emailRes.success,
        whatsappError: !whatsapp.success ? (whatsapp as { success: boolean; error?: string }).error : undefined,
        emailError: !emailRes.success ? (emailRes as { success: boolean; error?: string }).error : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[send-welcome] Erro geral:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
