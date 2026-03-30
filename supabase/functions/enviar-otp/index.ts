// =============================================================================
// EDGE FUNCTION: enviar-otp
// =============================================================================
// Envia código OTP via WhatsApp (WAHA) ou Email (SMTP)
// Usado pelos portais de Influenciadoras e Parceiros
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface EnviarOtpRequest {
  metodo: "whatsapp" | "email";
  destino: string;        // telefone (whatsapp) ou email
  codigo: string;         // código OTP de 6 dígitos
  nome: string;           // nome do destinatário
  tipo: "influenciadora" | "parceiro" | "cliente";
  tenant_id?: string;     // para buscar config SMTP do tenant
}

// =============================================================================
// WhatsApp via WAHA
// =============================================================================

async function enviarWhatsApp(
  supabase: ReturnType<typeof createClient>,
  telefone: string,
  codigo: string,
  nome: string,
  tipo: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Buscar config WAHA
    const { data: wahaConfig, error: configError } = await supabase
      .from("mt_waha_config")
      .select("api_url, api_key, enabled")
      .maybeSingle();

    if (configError || !wahaConfig) {
      return { success: false, error: "Configuração WAHA não encontrada" };
    }

    if (!wahaConfig.enabled) {
      return { success: false, error: "WhatsApp está desabilitado" };
    }

    // 2. Buscar sessão ativa no banco
    let sessionName: string | null = null;

    const { data: sessoes } = await supabase
      .from("mt_whatsapp_sessions")
      .select("session_name, status")
      .eq("status", "working")
      .limit(1);

    if (sessoes && sessoes.length > 0) {
      sessionName = sessoes[0].session_name;
    } else {
      // Fallback: buscar direto na API WAHA
      try {
        const wahaResp = await fetch(`${wahaConfig.api_url}/api/sessions`, {
          headers: { "X-Api-Key": wahaConfig.api_key || "" },
        });
        if (wahaResp.ok) {
          const wahaSessions = await wahaResp.json();
          const active = wahaSessions.find(
            (s: { status: string }) =>
              s.status === "WORKING" || s.status === "working"
          );
          if (active) sessionName = active.name;
        }
      } catch (err) {
        console.error("[WAHA] Erro ao buscar sessões:", err);
      }
    }

    if (!sessionName) {
      return { success: false, error: "Nenhuma sessão WhatsApp ativa" };
    }

    // 3. Formatar telefone
    const cleaned = telefone.replace(/\D/g, "");
    const withCountry = cleaned.startsWith("55") ? cleaned : `55${cleaned}`;
    const chatId = `${withCountry}@c.us`;

    // 4. Montar mensagem conforme tipo
    const portalNome = tipo === "influenciadora" ? "Portal da Influenciadora" : "Portal do Parceiro";
    const mensagem = `🔐 *YESlaser - ${portalNome}*

Olá${nome ? `, ${nome}` : ""}!

Seu código de acesso é:

*${codigo}*

Este código é válido por 10 minutos.

⚠️ Se você não solicitou este código, ignore esta mensagem.

_Equipe YESlaser_`;

    // 5. Enviar
    const sendResp = await fetch(`${wahaConfig.api_url}/api/sendText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": wahaConfig.api_key || "",
      },
      body: JSON.stringify({
        session: sessionName,
        chatId,
        text: mensagem,
      }),
    });

    if (!sendResp.ok) {
      const errText = await sendResp.text();
      return { success: false, error: `WAHA retornou ${sendResp.status}: ${errText}` };
    }

    console.log(`[WAHA] OTP enviado para ${chatId} via ${sessionName}`);
    return { success: true };
  } catch (err) {
    console.error("[WAHA] Erro:", err);
    return { success: false, error: String(err) };
  }
}

// =============================================================================
// Email via SMTP (usando configuração em mt_platform_settings)
// =============================================================================

async function enviarEmail(
  supabase: ReturnType<typeof createClient>,
  email: string,
  codigo: string,
  nome: string,
  tipo: string,
  tenantId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Buscar configuração SMTP
    // Primeiro tenta configuração do tenant, depois plataforma
    let smtpConfig: {
      host: string;
      port: number;
      secure: boolean;
      user: string;
      pass: string;
      from_email: string;
      from_name: string;
    } | null = null;

    // Buscar de mt_platform_settings
    const { data: settings } = await supabase
      .from("mt_platform_settings")
      .select("chave, valor")
      .in("chave", [
        "smtp_host",
        "smtp_port",
        "smtp_secure",
        "smtp_user",
        "smtp_pass",
        "smtp_from_email",
        "smtp_from_name",
      ]);

    if (settings && settings.length > 0) {
      const settingsMap: Record<string, string> = {};
      settings.forEach((s: { chave: string; valor: string }) => {
        settingsMap[s.chave] = s.valor;
      });

      if (settingsMap.smtp_host && settingsMap.smtp_user && settingsMap.smtp_pass) {
        smtpConfig = {
          host: settingsMap.smtp_host,
          port: parseInt(settingsMap.smtp_port || "587"),
          secure: settingsMap.smtp_secure === "true",
          user: settingsMap.smtp_user,
          pass: settingsMap.smtp_pass,
          from_email: settingsMap.smtp_from_email || settingsMap.smtp_user,
          from_name: settingsMap.smtp_from_name || "YESlaser",
        };
      }
    }

    // Fallback: usar variáveis de ambiente do Deno (Supabase self-hosted)
    if (!smtpConfig) {
      const smtpHost = Deno.env.get("SMTP_HOST");
      const smtpUser = Deno.env.get("SMTP_USER");
      const smtpPass = Deno.env.get("SMTP_PASS");

      if (smtpHost && smtpUser && smtpPass) {
        smtpConfig = {
          host: smtpHost,
          port: parseInt(Deno.env.get("SMTP_PORT") || "587"),
          secure: Deno.env.get("SMTP_SECURE") === "true",
          user: smtpUser,
          pass: smtpPass,
          from_email: Deno.env.get("SMTP_FROM_EMAIL") || smtpUser,
          from_name: Deno.env.get("SMTP_FROM_NAME") || "YESlaser",
        };
      }
    }

    if (!smtpConfig) {
      console.warn("[EMAIL] SMTP não configurado - código:", codigo, "para:", email);
      return {
        success: false,
        error: "SMTP não configurado. Configure as credenciais em Configurações → Plataforma.",
      };
    }

    // 2. Montar HTML do email
    const portalNome = tipo === "influenciadora" ? "Portal da Influenciadora" : "Portal do Parceiro";
    const htmlBody = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Código de Verificação - YESlaser</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
          <tr>
            <td style="background:#E91E63;padding:32px;text-align:center">
              <h1 style="color:#fff;margin:0;font-size:24px">YESlaser</h1>
              <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px">${portalNome}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px">
              <h2 style="color:#333;margin:0 0 16px;font-size:20px">Código de Verificação</h2>
              <p style="color:#666;margin:0 0 24px;font-size:15px;line-height:1.6">
                Olá${nome ? `, <strong>${nome}</strong>` : ""}!<br>
                Use o código abaixo para acessar o ${portalNome}:
              </p>
              <div style="background:#f8f8f8;border:2px dashed #E91E63;border-radius:8px;padding:24px;text-align:center;margin:0 0 24px">
                <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#E91E63">${codigo}</span>
              </div>
              <p style="color:#888;margin:0;font-size:13px">
                ⏱️ Este código expira em <strong>10 minutos</strong>.<br>
                ⚠️ Se você não solicitou este código, ignore este email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8f8f8;padding:20px;text-align:center;border-top:1px solid #eee">
              <p style="color:#aaa;margin:0;font-size:12px">
                © ${new Date().getFullYear()} YESlaser. Todos os direitos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // 3. Enviar via SMTP usando fetch para serviço interno ou lib Deno
    // Usando abordagem de SMTP direto via TCP (Deno.connect)
    // Para ambientes self-hosted, usar nodemailer via npm:
    const { default: nodemailer } = await import("npm:nodemailer@6");

    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    await transporter.sendMail({
      from: `"${smtpConfig.from_name}" <${smtpConfig.from_email}>`,
      to: email,
      subject: `${codigo} - Código de verificação YESlaser`,
      html: htmlBody,
      text: `Olá${nome ? `, ${nome}` : ""}!\n\nSeu código de verificação YESlaser é: ${codigo}\n\nEste código expira em 10 minutos.\n\nEquipe YESlaser`,
    });

    console.log(`[EMAIL] OTP enviado para ${email}`);
    return { success: true };
  } catch (err) {
    console.error("[EMAIL] Erro:", err);
    return { success: false, error: String(err) };
  }
}

// =============================================================================
// Handler Principal
// =============================================================================

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Método não permitido" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body: EnviarOtpRequest = await req.json();

    if (!body.metodo || !body.destino || !body.codigo || !body.tipo) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: metodo, destino, codigo, tipo" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Inicializar Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let result: { success: boolean; error?: string };

    if (body.metodo === "whatsapp") {
      result = await enviarWhatsApp(
        supabase,
        body.destino,
        body.codigo,
        body.nome || "",
        body.tipo
      );
    } else {
      result = await enviarEmail(
        supabase,
        body.destino,
        body.codigo,
        body.nome || "",
        body.tipo,
        body.tenant_id
      );
    }

    if (!result.success) {
      return new Response(
        JSON.stringify({ success: false, error: result.error }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[enviar-otp] Erro inesperado:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
