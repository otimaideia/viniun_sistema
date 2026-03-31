import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface CheckinRequest {
  appointment_id: string;      // MT: appointment_id (era agendamento_id)
  lead_id: string;
  franchise_id: string;        // MT: franchise_id (era unidade_id)
  checkin_type: "cpf" | "telefone" | "portal";  // MT: checkin_type (era metodo)
}

interface BuscarAgendamentosRequest {
  cpf_ou_telefone: string;
  franchise_id: string;  // MT: franchise_id (era unidade_id)
}

function limparNumeros(valor: string): string {
  return valor.replace(/\D/g, "");
}

function detectarTipoInput(valor: string): "cpf" | "telefone" {
  const limpo = valor.replace(/\D/g, "");
  if (limpo.length === 11) {
    const primeiroDigito = parseInt(limpo[0]);
    if (primeiroDigito <= 6) {
      return "cpf";
    }
  }
  return "telefone";
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Metodo nao permitido" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const action = pathParts[pathParts.length - 1];

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Acao: buscar-agendamentos
    if (action === "buscar" || action === "buscar-agendamentos") {
      const body: BuscarAgendamentosRequest = await req.json();

      if (!body.cpf_ou_telefone || !body.franchise_id) {
        return new Response(
          JSON.stringify({ error: "CPF/Telefone e franchise_id sao obrigatorios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 1. PRIMEIRO: Buscar tenant_id da franquia para garantir isolamento MT
      const { data: franchise, error: franchiseError } = await supabase
        .from("mt_franchises")
        .select("id, tenant_id")
        .eq("id", body.franchise_id)
        .single();

      if (franchiseError || !franchise) {
        return new Response(
          JSON.stringify({ error: "Unidade nao encontrada" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const tenantId = franchise.tenant_id;

      const tipoInput = detectarTipoInput(body.cpf_ou_telefone);
      const valorLimpo = limparNumeros(body.cpf_ou_telefone);

      // 2. Buscar lead FILTRANDO POR TENANT_ID (isolamento MT)
      let leadQuery = supabase
        .from("mt_leads")
        .select("id, nome, telefone, cpf")
        .eq("tenant_id", tenantId);  // FILTRO MT OBRIGATÓRIO

      if (tipoInput === "cpf") {
        leadQuery = leadQuery.eq("cpf", valorLimpo);
      } else {
        leadQuery = leadQuery.or(`telefone.eq.${valorLimpo},telefone.ilike.%${valorLimpo}`);
      }

      const { data: lead, error: leadError } = await leadQuery.maybeSingle();

      if (leadError || !lead) {
        return new Response(
          JSON.stringify({ error: "Cliente nao encontrado. Verifique seu CPF ou telefone." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 3. Buscar agendamentos do dia FILTRANDO POR TENANT_ID
      const hoje = new Date().toISOString().split("T")[0];

      const { data: agendamentos, error: agError } = await supabase
        .from("mt_appointments")
        .select(`
          id,
          data_agendamento,
          hora_inicio,
          hora_fim,
          servico,
          status,
          observacoes,
          tenant_id
        `)
        .eq("tenant_id", tenantId)       // FILTRO MT OBRIGATÓRIO
        .eq("lead_id", lead.id)
        .eq("franchise_id", body.franchise_id)
        .eq("data_agendamento", hoje)
        .neq("status", "cancelado")
        .order("hora_inicio", { ascending: true });

      if (agError) {
        console.error("Erro ao buscar agendamentos:", agError);
        return new Response(
          JSON.stringify({ error: "Erro ao buscar agendamentos" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verificar quais ja tem checkin
      const appointmentIds = agendamentos?.map((a) => a.id) || [];

      let checkinsExistentes: string[] = [];
      if (appointmentIds.length > 0) {
        const { data: checkins } = await supabase
          .from("mt_checkins")
          .select("appointment_id")
          .in("appointment_id", appointmentIds);

        checkinsExistentes = checkins?.map((c) => c.appointment_id) || [];
      }

      // Retornar agendamentos com flag de checkin
      const agendamentosComCheckin = (agendamentos || []).map((ag) => ({
        ...ag,
        lead_id: lead.id,
        lead_nome: lead.nome,
        franchise_id: body.franchise_id,
        ja_fez_checkin: checkinsExistentes.includes(ag.id),
      }));

      return new Response(
        JSON.stringify({
          success: true,
          lead: {
            id: lead.id,
            nome: lead.nome,
          },
          agendamentos: agendamentosComCheckin,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Acao: registrar checkin
    if (action === "registrar" || action === "totem-checkin") {
      const body: CheckinRequest = await req.json();

      if (!body.appointment_id || !body.lead_id || !body.franchise_id) {
        return new Response(
          JSON.stringify({ error: "Dados incompletos para checkin" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 1. PRIMEIRO: Buscar tenant_id da franquia para garantir isolamento MT
      const { data: franchise, error: franchiseError } = await supabase
        .from("mt_franchises")
        .select("id, tenant_id")
        .eq("id", body.franchise_id)
        .single();

      if (franchiseError || !franchise) {
        return new Response(
          JSON.stringify({ error: "Unidade nao encontrada" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const tenantId = franchise.tenant_id;

      // 2. Verificar se agendamento existe E pertence ao mesmo tenant
      const { data: agendamento, error: agError } = await supabase
        .from("mt_appointments")
        .select("id, status, tenant_id")
        .eq("id", body.appointment_id)
        .eq("lead_id", body.lead_id)
        .eq("tenant_id", tenantId)  // VALIDAÇÃO MT: deve ser do mesmo tenant
        .single();

      if (agError || !agendamento) {
        return new Response(
          JSON.stringify({ error: "Agendamento nao encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verificar se ja fez checkin
      const { data: checkinExistente } = await supabase
        .from("mt_checkins")
        .select("id")
        .eq("appointment_id", body.appointment_id)
        .maybeSingle();

      if (checkinExistente) {
        return new Response(
          JSON.stringify({ error: "Check-in ja realizado para este agendamento" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Registrar checkin com campos MT (usando tenantId validado da franquia)
      const { data: novoCheckin, error: checkinError } = await supabase
        .from("mt_checkins")
        .insert({
          tenant_id: tenantId,                      // MT: usar tenant validado da franquia
          franchise_id: body.franchise_id,          // MT: franchise_id
          appointment_id: body.appointment_id,      // MT: appointment_id
          lead_id: body.lead_id,
          checkin_type: body.checkin_type || "cpf", // MT: checkin_type
          checkin_time: new Date().toISOString(),   // MT: checkin_time
          source: "totem",                          // MT: source
        })
        .select()
        .single();

      if (checkinError) {
        console.error("Erro ao registrar checkin:", checkinError);
        return new Response(
          JSON.stringify({ error: "Erro ao registrar check-in" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Atualizar status do agendamento para "confirmado" e buscar dados completos
      const { data: aptFull } = await supabase
        .from("mt_appointments")
        .update({ status: "confirmado", checkin_em: new Date().toISOString() })
        .eq("id", body.appointment_id)
        .select("id, profissional_id, consultora_id, cliente_nome, hora_inicio, servico_nome, sessao_numero, total_sessoes")
        .single();

      // =========================================================
      // NOTIFICAÇÃO: WhatsApp para profissional e consultora
      // =========================================================
      if (aptFull) {
        try {
          // Buscar sessão WAHA padrão do tenant
          const { data: wahaSession } = await supabase
            .from("mt_whatsapp_sessions")
            .select("session_name")
            .eq("tenant_id", tenantId)
            .eq("is_default", true)
            .eq("status", "WORKING")
            .maybeSingle();

          if (wahaSession?.session_name) {
            // Buscar config de notificações
            const checkNotifEnabled = async (type: string): Promise<boolean> => {
              const { data } = await supabase
                .from("mt_appointment_notification_configs")
                .select("is_active")
                .eq("tenant_id", tenantId)
                .eq("notification_type", type)
                .maybeSingle();
              return data?.is_active ?? false;
            };

            const wahaUrl = Deno.env.get("WAHA_URL") || "https://waha.otimaideia.com.br";
            const wahaApiKey = Deno.env.get("WAHA_API_KEY") || "sitema-crm@2025";

            const sendWhatsApp = async (phone: string, text: string) => {
              try {
                const cleanPhone = phone.replace(/\D/g, "");
                const chatId = cleanPhone.startsWith("55") ? `${cleanPhone}@c.us` : `55${cleanPhone}@c.us`;
                await fetch(`${wahaUrl}/api/sendText`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "X-Api-Key": wahaApiKey },
                  body: JSON.stringify({ session: wahaSession.session_name, chatId, text }),
                });
              } catch (e) {
                console.error("Erro ao enviar WhatsApp:", e);
              }
            };

            const sessaoInfo = aptFull.sessao_numero
              ? ` (Sessão ${aptFull.sessao_numero}${aptFull.total_sessoes ? '/' + aptFull.total_sessoes : ''})`
              : '';
            const msg = `🏥 *Check-in realizado!*\n\n${aptFull.cliente_nome} acabou de fazer check-in para o atendimento das ${aptFull.hora_inicio}${sessaoInfo}.\n\nServiço: ${aptFull.servico_nome || 'Não especificado'}`;

            // Notificar profissional
            if (aptFull.profissional_id && await checkNotifEnabled("checkin_profissional")) {
              const { data: prof } = await supabase
                .from("mt_users")
                .select("telefone")
                .eq("id", aptFull.profissional_id)
                .maybeSingle();
              if (prof?.telefone) {
                await sendWhatsApp(prof.telefone, msg);
                // Registrar notificação
                await supabase.from("mt_appointment_notifications").insert({
                  tenant_id: tenantId, franchise_id: body.franchise_id,
                  appointment_id: body.appointment_id,
                  notification_type: "checkin_profissional", channel: "whatsapp",
                  status: "enviado", sent_at: new Date().toISOString(),
                  message_content: msg,
                });
              }
            }

            // Notificar consultora
            if (aptFull.consultora_id && await checkNotifEnabled("checkin_consultora")) {
              const { data: cons } = await supabase
                .from("mt_users")
                .select("telefone")
                .eq("id", aptFull.consultora_id)
                .maybeSingle();
              if (cons?.telefone) {
                await sendWhatsApp(cons.telefone, msg);
                await supabase.from("mt_appointment_notifications").insert({
                  tenant_id: tenantId, franchise_id: body.franchise_id,
                  appointment_id: body.appointment_id,
                  notification_type: "checkin_consultora", channel: "whatsapp",
                  status: "enviado", sent_at: new Date().toISOString(),
                  message_content: msg,
                });
              }
            }
          }
        } catch (notifErr) {
          console.error("Erro ao enviar notificações de check-in:", notifErr);
          // Não falhar o check-in por causa de erro na notificação
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Check-in realizado com sucesso!",
          checkin: novoCheckin,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Acao desconhecida: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro inesperado:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
