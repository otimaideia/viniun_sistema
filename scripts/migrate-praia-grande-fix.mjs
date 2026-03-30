#!/usr/bin/env node
/**
 * FIX: Migrar appointments, vagas e candidatos com campos corretos
 * Roda após o script principal que já migrou leads e referrals
 */

import { readFileSync, writeFileSync } from 'fs';

const NEW_URL = 'https://supabase-app.yeslaserpraiagrande.com.br';
const NEW_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MDc4MTc0MCwiZXhwIjo0OTI2NDU1MzQwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.K1j07Xd07FuQHNNXqnwXnWvakPBfUirpKXqB5sZmkTE';
const TENANT_ID = 'ebf87fe2-093a-4fba-bb56-c6835cbc1465';
const FRANCHISE_ID = '529bac26-008c-473b-ad30-305e17e95e53';
const BACKUP_DIR = '/tmp/migration_backup';

const APPT_STATUS_MAP = {
  'scheduled': 'agendado',
  'confirmed': 'confirmado',
  'completed': 'concluido',
  'cancelled': 'cancelado',
  'no_show': 'nao_compareceu',
};

const VAGA_STATUS_MAP = {
  'aberta': 'publicada',
  'pausada': 'pausada',
  'fechada': 'encerrada',
};

const CANDIDATO_STATUS_MAP = {
  'novo': 'novo',
  'triagem': 'em_analise',
  'entrevista_agendada': 'entrevista_agendada',
  'aprovado': 'aprovado',
  'reprovado': 'reprovado',
  'contratado': 'aprovado',
};

// Carregar mapeamento de IDs da migração anterior
const idMapping = JSON.parse(readFileSync(`${BACKUP_DIR}/id_mapping.json`, 'utf8'));
const leadIdMap = new Map(Object.entries(idMapping.leads));
const vagaIdMap = new Map();

const report = {
  appointments: { total: 0, migrated: 0, errors: 0 },
  vagas: { total: 0, migrated: 0, errors: 0 },
  candidatos: { total: 0, migrated: 0, errors: 0 },
};

function cleanPhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('55')) return digits;
  if (digits.length >= 10 && digits.length <= 11) return '55' + digits;
  if (digits.length >= 12 && digits.length <= 13) return digits;
  return digits.length >= 10 ? digits : null;
}

async function supabaseQuery(endpoint, options = {}) {
  const url = `${NEW_URL}/rest/v1/${endpoint}`;
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'apikey': NEW_KEY,
      'Authorization': `Bearer ${NEW_KEY}`,
      'Prefer': options.prefer || 'return=representation',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${res.status}: ${text}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function loadBackup(table) {
  return JSON.parse(readFileSync(`${BACKUP_DIR}/${table}.json`, 'utf8'));
}

// === MIGRAR AGENDAMENTOS ===
// Campos reais: tenant_id, franchise_id, lead_id, cliente_nome, cliente_telefone,
// cliente_email, servico_nome, data_agendamento, hora_inicio, hora_fim,
// duracao_minutos, status, observacoes, origem, created_at, updated_at
async function migrateAppointments() {
  console.log('\n=== MIGRANDO AGENDAMENTOS ===');
  const appointments = loadBackup('appointments');
  report.appointments.total = appointments.length;

  // Buscar dados do lead para preencher cliente_nome/telefone
  for (const appt of appointments) {
    try {
      const newLeadId = leadIdMap.get(appt.lead_id);

      // Buscar info do lead
      let clienteNome = '';
      let clienteTelefone = '';
      let clienteEmail = '';
      if (newLeadId) {
        try {
          const leadData = await supabaseQuery(`mt_leads?select=nome,whatsapp,email&id=eq.${newLeadId}&limit=1`);
          if (leadData && leadData[0]) {
            clienteNome = leadData[0].nome || '';
            clienteTelefone = leadData[0].whatsapp || '';
            clienteEmail = leadData[0].email || '';
          }
        } catch(e) { /* ignore */ }
      }

      const mtAppt = {
        tenant_id: TENANT_ID,
        franchise_id: FRANCHISE_ID,
        lead_id: newLeadId || null,
        cliente_nome: clienteNome,
        cliente_telefone: clienteTelefone,
        cliente_email: clienteEmail,
        servico_nome: appt.service_type || 'Laser',
        data_agendamento: appt.appointment_date,
        hora_inicio: appt.appointment_time || '09:00:00',
        hora_fim: calculateEndTime(appt.appointment_time || '09:00:00', 30),
        duracao_minutos: 30,
        status: APPT_STATUS_MAP[appt.status] || 'agendado',
        observacoes: [
          appt.notes,
          `Sessão ${appt.session_number || 1}`,
          `[Migrado: appointments_praia_grande, ID: ${appt.id}]`
        ].filter(Boolean).join(' | '),
        origem: 'migracao',
        created_at: appt.created_at,
        updated_at: appt.updated_at || appt.created_at,
      };

      await supabaseQuery('mt_appointments', {
        method: 'POST',
        body: mtAppt,
        prefer: 'return=minimal',
      });

      report.appointments.migrated++;
    } catch (err) {
      console.error(`  Erro appt ${appt.id}:`, err.message?.substring(0, 120));
      report.appointments.errors++;
    }
  }

  console.log(`  Total: ${report.appointments.total} | Migrados: ${report.appointments.migrated} | Erros: ${report.appointments.errors}`);
}

function calculateEndTime(startTime, durationMinutes) {
  const [h, m, s] = startTime.split(':').map(Number);
  const totalMinutes = h * 60 + m + durationMinutes;
  const endH = Math.floor(totalMinutes / 60) % 24;
  const endM = totalMinutes % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`;
}

// === MIGRAR VAGAS ===
// Campos reais: tenant_id, franchise_id, titulo, descricao, requisitos, beneficios,
// departamento, tipo_contrato, modalidade, faixa_salarial_min, faixa_salarial_max,
// quantidade_vagas, status, created_at, updated_at
async function migrateVagas() {
  console.log('\n=== MIGRANDO VAGAS ===');
  const vagas = loadBackup('vagas');
  report.vagas.total = vagas.length;

  for (const vaga of vagas) {
    try {
      // Determinar modalidade a partir de 'regime'
      const modalidadeMap = {
        'Presencial': 'presencial',
        'Remoto': 'remoto',
        'Híbrido': 'hibrido',
      };

      const mtVaga = {
        tenant_id: TENANT_ID,
        franchise_id: FRANCHISE_ID,
        titulo: vaga.titulo,
        descricao: [
          vaga.descricao,
          vaga.area ? `Área: ${vaga.area}` : null,
          vaga.localizacao ? `Local: ${vaga.localizacao}` : null,
          `[Migrado: vagas_praia_grande, ID: ${vaga.id}]`,
        ].filter(Boolean).join('\n\n'),
        requisitos: vaga.requisitos || null,
        beneficios: vaga.beneficios || null,
        departamento: vaga.area || null,
        tipo_contrato: vaga.tipo || null,
        modalidade: modalidadeMap[vaga.regime] || 'presencial',
        faixa_salarial_min: vaga.salario_min || null,
        faixa_salarial_max: vaga.salario_max || null,
        quantidade_vagas: vaga.qtd_vagas || 1,
        status: VAGA_STATUS_MAP[vaga.status] || 'publicada',
        created_at: vaga.created_at,
        updated_at: vaga.updated_at || vaga.created_at,
      };

      const result = await supabaseQuery('mt_job_positions', {
        method: 'POST',
        body: mtVaga,
        prefer: 'return=representation',
      });

      if (result && result[0]) {
        vagaIdMap.set(vaga.id, result[0].id);
        report.vagas.migrated++;
      }
    } catch (err) {
      console.error(`  Erro vaga ${vaga.id} (${vaga.titulo}):`, err.message?.substring(0, 120));
      report.vagas.errors++;
    }
  }

  console.log(`  Total: ${report.vagas.total} | Migrados: ${report.vagas.migrated} | Erros: ${report.vagas.errors}`);
}

// === MIGRAR CANDIDATOS ===
// Campos reais: tenant_id, position_id, nome, email, telefone, whatsapp, cpf,
// data_nascimento, cidade, estado, formacao, experiencia, curriculo_url,
// linkedin_url, portfolio_url, pretensao_salarial, disponibilidade, notas, status
async function migrateCandidatos() {
  console.log('\n=== MIGRANDO CANDIDATOS ===');
  const candidatos = loadBackup('candidatos');
  report.candidatos.total = candidatos.length;

  for (const cand of candidatos) {
    try {
      const positionId = vagaIdMap.get(cand.vaga_id);
      const phone = cleanPhone(cand.telefone || cand.whatsapp);

      const notas = [
        cand.notas,
        cand.endereco ? `Endereço: ${cand.endereco}` : null,
        cand.cep ? `CEP: ${cand.cep}` : null,
        cand.origem ? `Origem: ${cand.origem}` : null,
        `[Migrado: candidatos_praia_grande, ID: ${cand.id}]`,
      ].filter(Boolean).join('\n');

      const mtCand = {
        tenant_id: TENANT_ID,
        position_id: positionId || null,
        nome: cand.nome_completo || cand.nome || '',
        email: cand.email?.trim()?.toLowerCase() || null,
        telefone: phone || null,
        whatsapp: cleanPhone(cand.whatsapp) || phone || null,
        cpf: cand.cpf || null,
        data_nascimento: cand.data_nascimento || null,
        cidade: cand.cidade || null,
        estado: cand.estado || null,
        formacao: cand.escolaridade || null,
        experiencia: cand.experiencia_resumo || null,
        curriculo_url: cand.curriculo_url || null,
        linkedin_url: cand.linkedin_url || null,
        pretensao_salarial: cand.pretensao_salarial ? parseFloat(cand.pretensao_salarial) || null : null,
        disponibilidade: cand.disponibilidade || null,
        notas: notas,
        status: CANDIDATO_STATUS_MAP[cand.status] || 'novo',
        created_at: cand.created_at,
        updated_at: cand.updated_at || cand.created_at,
      };

      await supabaseQuery('mt_candidates', {
        method: 'POST',
        body: mtCand,
        prefer: 'return=minimal',
      });

      report.candidatos.migrated++;
    } catch (err) {
      console.error(`  Erro candidato ${cand.id} (${cand.nome_completo}):`, err.message?.substring(0, 120));
      report.candidatos.errors++;
    }
  }

  console.log(`  Total: ${report.candidatos.total} | Migrados: ${report.candidatos.migrated} | Erros: ${report.candidatos.errors}`);
}

// === MAIN ===
async function main() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║  FIX: Appointments, Vagas, Candidatos             ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log(`Lead ID mappings loaded: ${leadIdMap.size}`);

  await migrateAppointments();
  await migrateVagas();
  await migrateCandidatos();

  console.log('\n=== RELATÓRIO FIX ===');
  console.log(JSON.stringify(report, null, 2));

  // Salvar mapeamento de vagas
  const vagaMapping = Object.fromEntries(vagaIdMap);
  writeFileSync('/tmp/migration_backup/vaga_mapping.json', JSON.stringify(vagaMapping, null, 2));

  console.log('\n✅ Fix concluído!');
}

main().catch(err => {
  console.error('❌ ERRO FATAL:', err.message);
  process.exit(1);
});
