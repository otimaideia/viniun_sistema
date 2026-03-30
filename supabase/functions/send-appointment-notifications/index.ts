import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://supabase-app.yeslaserpraiagrande.com.br';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const notificationType = body.type || 'lembrete_dia';

    console.log(`[Notifications] Processando tipo: ${notificationType}`);

    if (notificationType === 'lembrete_dia') {
      return await sendMorningReminders(supabase);
    }

    return new Response(
      JSON.stringify({ error: `Tipo desconhecido: ${notificationType}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[Notifications] Erro:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function sendMorningReminders(supabase: any) {
  // Data de hoje em formato YYYY-MM-DD (Brasília = UTC-3)
  const now = new Date();
  const brasiliaOffset = -3 * 60;
  const brasiliaTime = new Date(now.getTime() + (now.getTimezoneOffset() + brasiliaOffset) * 60000);
  const today = brasiliaTime.toISOString().split('T')[0];

  console.log(`[Notifications] Buscando agendamentos para: ${today}`);

  // 1. Buscar agendamentos de hoje que não foram cancelados
  const { data: appointments, error: aptError } = await supabase
    .from('mt_appointments')
    .select(`
      id, tenant_id, franchise_id, lead_id,
      cliente_nome, cliente_telefone,
      servico_nome, data_agendamento, hora_inicio,
      status, tipo,
      lead:mt_leads(id, nome, telefone, whatsapp),
      franchise:mt_franchises(id, nome_fantasia, nome, endereco, cidade)
    `)
    .eq('data_agendamento', today)
    .is('deleted_at', null)
    .not('status', 'in', '("cancelado","remarcado","concluido","nao_compareceu")');

  if (aptError) {
    console.error('[Notifications] Erro ao buscar agendamentos:', aptError);
    return new Response(
      JSON.stringify({ error: 'Erro ao buscar agendamentos', details: aptError }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!appointments || appointments.length === 0) {
    console.log('[Notifications] Nenhum agendamento para hoje');
    return new Response(
      JSON.stringify({ success: true, sent: 0, message: 'Nenhum agendamento hoje' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  console.log(`[Notifications] ${appointments.length} agendamentos encontrados`);

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const apt of appointments) {
    try {
      // Verificar se já enviou lembrete para este agendamento
      const { data: existingNotif } = await supabase
        .from('mt_appointment_notifications')
        .select('id')
        .eq('appointment_id', apt.id)
        .eq('notification_type', 'lembrete_dia')
        .maybeSingle();

      if (existingNotif) {
        skipped++;
        continue;
      }

      // Verificar se lembrete_dia está habilitado para este tenant/franchise
      const { data: config } = await supabase
        .from('mt_appointment_notification_configs')
        .select('is_active, custom_message')
        .eq('tenant_id', apt.tenant_id)
        .eq('notification_type', 'lembrete_dia')
        .maybeSingle();

      if (config && !config.is_active) {
        skipped++;
        continue;
      }

      // Determinar telefone do cliente
      const phone = apt.lead?.telefone || apt.lead?.whatsapp || apt.cliente_telefone;
      if (!phone) {
        console.warn(`[Notifications] Sem telefone para agendamento ${apt.id}`);
        skipped++;
        continue;
      }

      const cleanPhone = phone.replace(/\D/g, '');
      const nome = apt.lead?.nome || apt.cliente_nome || 'Cliente';
      const firstName = nome.split(' ')[0];
      const franchiseName = apt.franchise?.nome_fantasia || apt.franchise?.nome || 'nossa unidade';
      const endereco = apt.franchise?.endereco || '';
      const cidade = apt.franchise?.cidade || '';
      const location = [franchiseName, endereco, cidade].filter(Boolean).join(' - ');

      // Montar mensagem (usar custom_message se disponível)
      let message: string;
      if (config?.custom_message) {
        message = config.custom_message
          .replace(/\{nome\}/g, firstName)
          .replace(/\{data\}/g, formatDate(apt.data_agendamento))
          .replace(/\{horario\}/g, apt.hora_inicio)
          .replace(/\{servico\}/g, apt.servico_nome || 'Sessão')
          .replace(/\{franquia\}/g, franchiseName);
      } else {
        message = `Bom dia, ${firstName}! ☀️\n\n` +
          `Lembrete: você tem sessão agendada para *HOJE*!\n\n` +
          `🕐 *${apt.hora_inicio}*\n` +
          `💆 ${apt.servico_nome || 'Sessão'}\n` +
          `📍 ${location}\n\n` +
          `Te esperamos! 😊`;
      }

      // Buscar sessão WAHA ativa
      const { data: wahaConfig } = await supabase
        .from('mt_waha_config')
        .select('api_url, api_key, enabled')
        .maybeSingle();

      if (!wahaConfig?.enabled || !wahaConfig?.api_url) {
        console.warn('[Notifications] WAHA não configurado/habilitado');
        break;
      }

      const { data: sessions } = await supabase
        .from('mt_whatsapp_sessions')
        .select('session_name, status')
        .eq('status', 'WORKING')
        .limit(1);

      if (!sessions || sessions.length === 0) {
        console.warn('[Notifications] Nenhuma sessão WhatsApp ativa');
        break;
      }

      const sessionName = sessions[0].session_name;

      // Enviar via WAHA
      const chatId = cleanPhone.startsWith('55') ? `${cleanPhone}@c.us` : `55${cleanPhone}@c.us`;

      const wahaResponse = await fetch(`${wahaConfig.api_url}/api/sendText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': wahaConfig.api_key || '',
        },
        body: JSON.stringify({
          session: sessionName,
          chatId,
          text: message,
        }),
      });

      if (!wahaResponse.ok) {
        const errText = await wahaResponse.text();
        console.error(`[Notifications] WAHA erro para ${apt.id}:`, errText);
        errors++;

        await supabase.from('mt_appointment_notifications').insert({
          tenant_id: apt.tenant_id,
          franchise_id: apt.franchise_id,
          appointment_id: apt.id,
          notification_type: 'lembrete_dia',
          channel: 'whatsapp',
          status: 'failed',
          error_message: errText.substring(0, 500),
          sent_at: new Date().toISOString(),
        });
        continue;
      }

      // Registrar notificação enviada
      await supabase.from('mt_appointment_notifications').insert({
        tenant_id: apt.tenant_id,
        franchise_id: apt.franchise_id,
        appointment_id: apt.id,
        notification_type: 'lembrete_dia',
        channel: 'whatsapp',
        status: 'sent',
        sent_at: new Date().toISOString(),
      });

      sent++;
      console.log(`[Notifications] Lembrete enviado para ${firstName} (${cleanPhone})`);

      // Pausa de 2s entre mensagens para não spammar
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.error(`[Notifications] Erro no agendamento ${apt.id}:`, err);
      errors++;
    }
  }

  const result = {
    success: true,
    date: today,
    total: appointments.length,
    sent,
    skipped,
    errors,
  };

  console.log('[Notifications] Resultado:', result);

  return new Response(
    JSON.stringify(result),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}
