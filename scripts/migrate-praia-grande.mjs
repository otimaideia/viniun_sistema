#!/usr/bin/env node
/**
 * Migração: Landing Page Praia Grande → Sistema Multi-Tenant
 *
 * Migra dados de 6 tabelas do Supabase antigo para o novo:
 * - leads (195) → mt_leads
 * - referrals (70) → mt_leads + mt_lead_activities
 * - appointments (39) → mt_appointments
 * - vagas (5) → mt_job_positions
 * - candidatos (18) → mt_candidates
 * - entrevistas (0) → mt_interviews
 */

import { readFileSync, writeFileSync } from 'fs';

// === CONFIGURAÇÃO ===
const NEW_URL = 'https://supabase-app.yeslaserpraiagrande.com.br';
const NEW_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MDc4MTc0MCwiZXhwIjo0OTI2NDU1MzQwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.K1j07Xd07FuQHNNXqnwXnWvakPBfUirpKXqB5sZmkTE';

const TENANT_ID = 'ebf87fe2-093a-4fba-bb56-c6835cbc1465';
const FRANCHISE_ID = '529bac26-008c-473b-ad30-305e17e95e53';

const BACKUP_DIR = '/tmp/migration_backup';

// === MAPEAMENTOS ===
const STATUS_MAP = {
  'pending': 'novo',
  'contacted': 'contato',
  'converted': 'convertido',
  'cancelled': 'cancelado',
};

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

// Mapeamento old_id → new_id
const leadIdMap = new Map();
const vagaIdMap = new Map();

// Relatório
const report = {
  leads: { total: 0, migrated: 0, duplicates: 0, errors: 0 },
  referrals: { total: 0, migrated: 0, duplicates: 0, errors: 0 },
  activities: { total: 0, created: 0, errors: 0 },
  appointments: { total: 0, migrated: 0, errors: 0 },
  vagas: { total: 0, migrated: 0, errors: 0 },
  candidatos: { total: 0, migrated: 0, errors: 0 },
};

// === HELPERS ===
function cleanPhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  // Remover prefixo 55 se tiver 13 dígitos (55 + DDD + número)
  if (digits.length === 13 && digits.startsWith('55')) {
    return digits;
  }
  // Se já tem 10-11 dígitos, adicionar 55
  if (digits.length >= 10 && digits.length <= 11) {
    return '55' + digits;
  }
  // Se tem 12-13 dígitos, retornar como está
  if (digits.length >= 12 && digits.length <= 13) {
    return digits;
  }
  return digits.length >= 10 ? digits : null;
}

async function supabaseQuery(endpoint, options = {}) {
  const url = `${NEW_URL}/rest/v1/${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'apikey': NEW_KEY,
    'Authorization': `Bearer ${NEW_KEY}`,
    'Prefer': options.prefer || 'return=representation',
    ...options.headers,
  };

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase error ${res.status}: ${text}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function pgQuery(sql) {
  const res = await fetch(`${NEW_URL}/pg/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': NEW_KEY,
      'Authorization': `Bearer ${NEW_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function loadBackup(table) {
  return JSON.parse(readFileSync(`${BACKUP_DIR}/${table}.json`, 'utf8'));
}

// === ETAPA 1: MIGRAR LEADS ===
async function migrateLeads() {
  console.log('\n=== ETAPA 1: MIGRANDO LEADS ===');
  const leads = loadBackup('leads');
  report.leads.total = leads.length;

  for (const lead of leads) {
    try {
      const phone = cleanPhone(lead.whatsapp);
      const email = lead.email?.trim()?.toLowerCase();

      // Verificar duplicata
      if (phone || email) {
        const conditions = [];
        if (phone) conditions.push(`whatsapp.eq.${phone}`);
        if (email) conditions.push(`email.eq.${email}`);

        const existing = await supabaseQuery(
          `mt_leads?select=id&or=(${conditions.join(',')})&limit=1`
        );

        if (existing && existing.length > 0) {
          leadIdMap.set(lead.id, existing[0].id);
          report.leads.duplicates++;
          continue;
        }
      }

      // Mapear dados
      const mtLead = {
        tenant_id: TENANT_ID,
        franchise_id: FRANCHISE_ID,
        nome: lead.name || '',
        email: email || null,
        whatsapp: phone || null,
        telefone: phone || null,
        genero: lead.genero || null,
        cep: lead.cep || null,
        endereco: lead.logradouro || null,
        complemento: lead.complemento || null,
        bairro: lead.bairro || null,
        cidade: lead.cidade || null,
        estado: lead.uf || null,
        data_nascimento: lead.data_nascimento || null,
        observacoes: lead.observacoes || null,
        origem: lead.origem || 'site',
        status: STATUS_MAP[lead.status] || 'novo',
        dados_extras: JSON.stringify({
          legacy_table: 'leads_praia_grande',
          legacy_id: lead.id,
          consent: lead.consent,
          ibge: lead.ibge,
          gia: lead.gia,
          ddd: lead.ddd,
          siafi: lead.siafi,
          source: lead.source,
          tipo_promocao: lead.tipo_promocao,
        }),
        created_at: lead.created_at,
        updated_at: lead.updated_at || lead.created_at,
      };

      // Adicionar deleted_at se existir
      if (lead.deleted_at) {
        mtLead.deleted_at = lead.deleted_at;
      }

      const result = await supabaseQuery('mt_leads', {
        method: 'POST',
        body: mtLead,
        prefer: 'return=representation',
      });

      if (result && result[0]) {
        leadIdMap.set(lead.id, result[0].id);
        report.leads.migrated++;
      }
    } catch (err) {
      console.error(`  Erro lead ${lead.id} (${lead.name}):`, err.message);
      report.leads.errors++;
      // Mesmo com erro, tentar mapear pelo ID original
      leadIdMap.set(lead.id, lead.id);
    }
  }

  console.log(`  Total: ${report.leads.total} | Migrados: ${report.leads.migrated} | Duplicatas: ${report.leads.duplicates} | Erros: ${report.leads.errors}`);
}

// === ETAPA 2: MIGRAR INDICAÇÕES ===
async function migrateReferrals() {
  console.log('\n=== ETAPA 2: MIGRANDO INDICAÇÕES ===');
  const referrals = loadBackup('referrals');
  report.referrals.total = referrals.length;

  for (const ref of referrals) {
    try {
      const phone = cleanPhone(ref.friend_whatsapp);
      const email = ref.friend_email?.trim()?.toLowerCase() || null;
      const indicadorId = leadIdMap.get(ref.lead_id);

      // Verificar se amigo já existe como lead
      if (phone || email) {
        const conditions = [];
        if (phone) conditions.push(`whatsapp.eq.${phone}`);
        if (email) conditions.push(`email.eq.${email}`);

        const existing = await supabaseQuery(
          `mt_leads?select=id&or=(${conditions.join(',')})&limit=1`
        );

        if (existing && existing.length > 0) {
          report.referrals.duplicates++;
          // Registrar atividade mesmo se duplicata
          if (indicadorId) {
            await createReferralActivity(indicadorId, ref.friend_name, ref.id);
          }
          continue;
        }
      }

      // Criar novo lead para o amigo
      const mtLead = {
        tenant_id: TENANT_ID,
        franchise_id: FRANCHISE_ID,
        nome: ref.friend_name || 'Indicado',
        email: email,
        whatsapp: phone,
        telefone: phone,
        origem: 'indicacao',
        status: 'novo',
        indicado_por_id: indicadorId || null,
        dados_extras: JSON.stringify({
          legacy_table: 'referrals_praia_grande',
          legacy_referral_id: ref.id,
          legacy_lead_indicador_id: ref.lead_id,
        }),
        created_at: ref.created_at,
        updated_at: ref.created_at,
      };

      if (ref.deleted_at) {
        mtLead.deleted_at = ref.deleted_at;
      }

      const result = await supabaseQuery('mt_leads', {
        method: 'POST',
        body: mtLead,
        prefer: 'return=representation',
      });

      if (result && result[0]) {
        report.referrals.migrated++;
      }

      // Registrar atividade no lead indicador
      if (indicadorId) {
        await createReferralActivity(indicadorId, ref.friend_name, ref.id);
      }
    } catch (err) {
      console.error(`  Erro referral ${ref.id} (${ref.friend_name}):`, err.message);
      report.referrals.errors++;
    }
  }

  console.log(`  Total: ${report.referrals.total} | Migrados: ${report.referrals.migrated} | Duplicatas: ${report.referrals.duplicates} | Erros: ${report.referrals.errors}`);
  console.log(`  Atividades: ${report.activities.created} criadas, ${report.activities.errors} erros`);
}

async function createReferralActivity(leadId, friendName, refId) {
  try {
    report.activities.total++;
    await supabaseQuery('mt_lead_activities', {
      method: 'POST',
      body: {
        tenant_id: TENANT_ID,
        lead_id: leadId,
        tipo: 'indicacao',
        titulo: `Indicou amigo: ${friendName}`,
        descricao: 'Indicação migrada do sistema antigo (landing page Praia Grande)',
        dados: JSON.stringify({
          legacy_table: 'referrals_praia_grande',
          legacy_referral_id: refId,
          friend_name: friendName,
        }),
      },
      prefer: 'return=minimal',
    });
    report.activities.created++;
  } catch (err) {
    console.error(`  Erro atividade para lead ${leadId}:`, err.message);
    report.activities.errors++;
  }
}

// === ETAPA 3: MIGRAR AGENDAMENTOS ===
async function migrateAppointments() {
  console.log('\n=== ETAPA 3: MIGRANDO AGENDAMENTOS ===');
  const appointments = loadBackup('appointments');
  report.appointments.total = appointments.length;

  for (const appt of appointments) {
    try {
      const leadId = leadIdMap.get(appt.lead_id);

      // Construir data_inicio
      const dataInicio = `${appt.appointment_date}T${appt.appointment_time || '09:00:00'}`;
      // data_fim = data_inicio + 30min
      const startDate = new Date(dataInicio);
      const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);

      const titulo = `Sessão ${appt.session_number || 1} - ${appt.service_type || 'Laser'}`;
      const tipo = (appt.session_number === 1) ? 'avaliacao' : 'sessao';

      const mtAppt = {
        tenant_id: TENANT_ID,
        franqueado_id: FRANCHISE_ID,
        lead_id: leadId || null,
        titulo: titulo,
        descricao: appt.notes || `Serviço: ${appt.service_type || 'N/A'}`,
        tipo: tipo,
        data_inicio: dataInicio,
        data_fim: endDate.toISOString(),
        dia_todo: false,
        status: APPT_STATUS_MAP[appt.status] || 'agendado',
        cor: '#E91E63',
        metadata: JSON.stringify({
          legacy_table: 'appointments_praia_grande',
          legacy_id: appt.id,
          session_number: appt.session_number,
          service_type: appt.service_type,
        }),
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
      console.error(`  Erro appointment ${appt.id}:`, err.message);
      report.appointments.errors++;
    }
  }

  console.log(`  Total: ${report.appointments.total} | Migrados: ${report.appointments.migrated} | Erros: ${report.appointments.errors}`);
}

// === ETAPA 4: MIGRAR VAGAS ===
async function migrateVagas() {
  console.log('\n=== ETAPA 4: MIGRANDO VAGAS ===');
  const vagas = loadBackup('vagas');
  report.vagas.total = vagas.length;

  for (const vaga of vagas) {
    try {
      // Converter texto para array
      const requisitosArr = vaga.requisitos
        ? vaga.requisitos.split(/[;\n]/).map(r => r.trim()).filter(Boolean)
        : null;
      const beneficiosArr = vaga.beneficios
        ? vaga.beneficios.split(/[;\n]/).map(b => b.trim()).filter(Boolean)
        : null;

      const mtVaga = {
        tenant_id: TENANT_ID,
        unidade_id: FRANCHISE_ID,
        titulo: vaga.titulo,
        descricao: vaga.descricao || null,
        requisitos: requisitosArr,
        beneficios: beneficiosArr,
        tipo_contrato: vaga.tipo || null,
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
      console.error(`  Erro vaga ${vaga.id} (${vaga.titulo}):`, err.message);
      report.vagas.errors++;
    }
  }

  console.log(`  Total: ${report.vagas.total} | Migrados: ${report.vagas.migrated} | Erros: ${report.vagas.errors}`);
}

// === ETAPA 5: MIGRAR CANDIDATOS ===
async function migrateCandidatos() {
  console.log('\n=== ETAPA 5: MIGRANDO CANDIDATOS ===');
  const candidatos = loadBackup('candidatos');
  report.candidatos.total = candidatos.length;

  for (const cand of candidatos) {
    try {
      const vagaId = vagaIdMap.get(cand.vaga_id);
      const phone = cleanPhone(cand.telefone || cand.whatsapp);

      // Montar observações com campos extras
      const extras = [];
      if (cand.cpf) extras.push(`CPF: ${cand.cpf}`);
      if (cand.data_nascimento) extras.push(`Data Nasc: ${cand.data_nascimento}`);
      if (cand.genero) extras.push(`Gênero: ${cand.genero}`);
      if (cand.escolaridade) extras.push(`Escolaridade: ${cand.escolaridade}`);
      if (cand.experiencia_resumo) extras.push(`Experiência: ${cand.experiencia_resumo}`);
      if (cand.pretensao_salarial) extras.push(`Pretensão: R$ ${cand.pretensao_salarial}`);
      if (cand.disponibilidade) extras.push(`Disponibilidade: ${cand.disponibilidade}`);
      if (cand.endereco) extras.push(`Endereço: ${cand.endereco}`);
      if (cand.cidade) extras.push(`Cidade: ${cand.cidade}/${cand.estado || ''}`);
      if (cand.cep) extras.push(`CEP: ${cand.cep}`);
      if (cand.origem) extras.push(`Origem: ${cand.origem}`);
      if (cand.notas) extras.push(`Notas: ${cand.notas}`);
      extras.push(`[Migrado de: candidatos_praia_grande, ID: ${cand.id}]`);

      const mtCand = {
        tenant_id: TENANT_ID,
        vaga_id: vagaId || null,
        nome: cand.nome_completo || cand.nome || '',
        email: cand.email?.trim()?.toLowerCase() || null,
        telefone: phone || null,
        curriculo_url: cand.curriculo_url || null,
        linkedin: cand.linkedin_url || null,
        status: CANDIDATO_STATUS_MAP[cand.status] || 'novo',
        unidade_interesse_id: FRANCHISE_ID,
        observacoes: extras.join('\n'),
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
      console.error(`  Erro candidato ${cand.id} (${cand.nome_completo}):`, err.message);
      report.candidatos.errors++;
    }
  }

  console.log(`  Total: ${report.candidatos.total} | Migrados: ${report.candidatos.migrated} | Erros: ${report.candidatos.errors}`);
}

// === EXECUÇÃO PRINCIPAL ===
async function main() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║  MIGRAÇÃO: Praia Grande → Sistema Multi-Tenant    ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log(`Tenant: ${TENANT_ID}`);
  console.log(`Franchise: ${FRANCHISE_ID}`);
  console.log(`Data: ${new Date().toISOString()}`);

  // Testar conexão
  console.log('\nTestando conexão com Supabase novo...');
  const test = await pgQuery('SELECT 1 as test');
  if (!test || !test[0]) {
    throw new Error('Falha na conexão com Supabase novo!');
  }
  console.log('  ✅ Conexão OK');

  // Executar migração na ordem correta
  await migrateLeads();
  await migrateReferrals();
  await migrateAppointments();
  await migrateVagas();
  await migrateCandidatos();

  // Relatório final
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║              RELATÓRIO FINAL                       ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log(JSON.stringify(report, null, 2));

  // Salvar relatório
  writeFileSync('/tmp/migration_backup/report.json', JSON.stringify(report, null, 2));

  // Salvar mapeamento de IDs
  const idMapping = {
    leads: Object.fromEntries(leadIdMap),
    vagas: Object.fromEntries(vagaIdMap),
  };
  writeFileSync('/tmp/migration_backup/id_mapping.json', JSON.stringify(idMapping, null, 2));

  console.log('\n✅ Migração concluída! Relatório salvo em /tmp/migration_backup/report.json');
}

main().catch(err => {
  console.error('\n❌ ERRO FATAL:', err.message);
  process.exit(1);
});
