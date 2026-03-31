/**
 * useFormSubmissionPublic.ts
 *
 * Encapsulates ALL Supabase operations for the public form page (FormularioPublico).
 * This hook is designed for PUBLIC pages (no auth required) and accepts tenant_id
 * and franchise_id as parameters instead of using useTenantContext.
 */
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { FormularioCampo } from '@/types/formulario';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FormularioPublicoRecord {
  id: string;
  tenant_id: string;
  franchise_id?: string | null;
  slug: string;
  nome: string;
  campos?: FormularioCampo[];
  fields?: Record<string, unknown>[];
  round_robin_enabled?: boolean;
  round_robin_mode?: string;
  team_id?: string | null;
  department_id?: string | null;
  responsible_user_id?: string | null;
  total_visualizacoes?: number;
  [key: string]: unknown;
}

export interface IndicadorInfo {
  tipo: 'influenciadora' | 'lead' | 'parceiro' | null;
  nome: string;
  nome_real?: string;
  codigo: string;
  franchise_id?: string | null;
  indicador_id?: string | null;
}

export interface LeadData {
  tenant_id: string;
  franchise_id?: string | null;
  [key: string]: unknown;
}

export interface ActivityData {
  lead_id: string;
  tenant_id: string;
  franchise_id?: string | null;
  tipo: string;
  titulo: string;
  descricao: string;
  dados?: Record<string, unknown>;
}

export interface SubmissionData {
  form_id: string;
  tenant_id: string;
  franchise_id?: string | null;
  lead_id?: string;
  dados: Record<string, unknown>;
  user_agent: string;
  referrer: string;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  status: string;
}

export interface PromotionTrackingData {
  codigoPromocao: string;
  leadId: string;
}

export interface InfluencerReferralData {
  codigoInfluenciadora: string;
  leadId: string;
  franchiseIdFinal?: string | null;
  leadData: LeadData;
  indicadorInfo?: IndicadorInfo | null;
  codigoPromocao?: string | null;
}

export interface PartnershipReferralData {
  codigoParceria: string;
  leadId: string;
  tenantId: string;
  franchiseId?: string | null;
  leadData: LeadData;
  indicadorInfo?: IndicadorInfo | null;
}

export interface MagicTokenData {
  tenantId: string;
  leadId: string;
  formData: Record<string, unknown>;
  leadData: LeadData;
  franchiseIdFinal?: string | null;
}

export interface FranchiseNotificationData {
  leadId: string;
  tenantId: string;
  franchiseIdFinal?: string | null;
  leadNome: string;
  leadPhone: string;
  leadEmail: string;
  origemTexto: string;
  formularioNome: string;
}

export interface CreateIndicadoLeadData {
  nome: string;
  whatsapp: string;
  email?: string | null;
  tenantId: string;
  franchiseId?: string | null;
  indicadoPorId: string;
  formSlug: string;
  campanha?: string;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useFormSubmissionPublic() {

  // ── Load form by slug ──────────────────────────────────────────────────

  const loadFormulario = useCallback(async (slug: string) => {
    const { data, error } = await supabase
      .from('mt_forms')
      .select(`
        *,
        franchise:mt_franchises(id, nome_fantasia),
        fields:mt_form_fields(*)
      `)
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Formulario nao encontrado');

    // Map fields -> campos and sort
    if (data.fields) {
      data.campos = data.fields
        .map((f: Record<string, unknown>) => ({
          ...f,
          campo_lead: f.mapear_para_lead || f.campo_lead || null,
        }))
        .sort((a: FormularioCampo, b: FormularioCampo) => a.ordem - b.ordem);
    }

    return data as FormularioPublicoRecord;
  }, []);

  // ── Load services ─────────────────────────────────────────────────────

  const loadServicos = useCallback(async () => {
    const { data } = await supabase
      .from('mt_services')
      .select('*')
      .eq('is_active', true)
      .order('nome');
    return data || [];
  }, []);

  // ── Increment form view counter ───────────────────────────────────────

  const incrementFormView = useCallback(async (formId: string, currentViews: number) => {
    try {
      await supabase
        .from('mt_forms')
        .update({ total_visualizacoes: (currentViews || 0) + 1 })
        .eq('id', formId);
    } catch {
      // Ignore analytics error - should not block the form
    }
  }, []);

  // ── Load indicador info (influenciadora, lead, or parceiro) ───────────

  const loadIndicadorInfo = useCallback(async (params: {
    codigoInfluenciadora?: string | null;
    codigoParceria?: string | null;
    codigoIndicacao?: string | null;
  }): Promise<IndicadorInfo | null> => {
    const { codigoInfluenciadora, codigoParceria, codigoIndicacao } = params;
    const codigo = codigoInfluenciadora || codigoParceria || codigoIndicacao;
    if (!codigo) return null;

    // 1. If param is 'influenciadores', search ONLY in influencers
    if (codigoInfluenciadora) {
      const { data: influenciadora } = await supabase
        .from('mt_influencers')
        .select('nome, nome_artistico, franchise_id')
        .eq('codigo', codigoInfluenciadora.toUpperCase())
        .maybeSingle();

      if (influenciadora) {
        return {
          tipo: 'influenciadora',
          nome: influenciadora.nome_artistico || influenciadora.nome,
          nome_real: influenciadora.nome || influenciadora.nome_artistico,
          codigo: codigoInfluenciadora.toUpperCase(),
          franchise_id: influenciadora.franchise_id || undefined,
        };
      }
    }

    // 2. If param is 'parceria', search in partnerships
    if (codigoParceria) {
      const { data: parceria } = await supabase
        .from('mt_partnerships')
        .select('nome_fantasia, nome_empresa')
        .eq('codigo', codigoParceria.toUpperCase())
        .maybeSingle();

      if (parceria) {
        return {
          tipo: 'parceiro',
          nome: parceria.nome_fantasia || parceria.nome_empresa,
          codigo: codigoParceria.toUpperCase(),
        };
      }

      // Not found - show code as name
      return {
        tipo: 'parceiro',
        nome: codigoParceria.toUpperCase(),
        codigo: codigoParceria.toUpperCase(),
      };
    }

    // 3. If param is 'ref' or 'codigo', search influencers first then leads
    if (codigoIndicacao) {
      // Search influencers first
      const { data: influenciadora } = await supabase
        .from('mt_influencers')
        .select('nome, nome_artistico')
        .eq('codigo', codigoIndicacao.toUpperCase())
        .maybeSingle();

      if (influenciadora) {
        return {
          tipo: 'influenciadora',
          nome: influenciadora.nome_artistico || influenciadora.nome,
          codigo: codigoIndicacao.toUpperCase(),
        };
      }

      // Search leads
      const { data: lead } = await supabase
        .from('mt_leads')
        .select('id, nome, franchise_id')
        .eq('codigo_indicacao', codigoIndicacao.toUpperCase())
        .maybeSingle();

      if (lead) {
        return {
          tipo: 'lead',
          nome: lead.nome,
          codigo: codigoIndicacao.toUpperCase(),
          franchise_id: lead.franchise_id,
          indicador_id: lead.id,
        };
      }

      // Not found anywhere
      return {
        tipo: null,
        nome: codigoIndicacao.toUpperCase(),
        codigo: codigoIndicacao.toUpperCase(),
      };
    }

    return null;
  }, []);

  // ── Find existing lead by email/phone ─────────────────────────────────

  const findExistingLead = useCallback(async (leadData: LeadData) => {
    const orConditions: string[] = [];
    if (leadData.email) orConditions.push(`email.eq.${leadData.email}`);
    if (leadData.whatsapp) orConditions.push(`whatsapp.eq.${leadData.whatsapp}`);
    if (leadData.telefone) {
      const cleanedPhone = String(leadData.telefone).replace(/\D/g, '');
      orConditions.push(`telefone.eq.${leadData.telefone}`);
      if (cleanedPhone !== String(leadData.telefone)) {
        orConditions.push(`telefone.eq.${cleanedPhone}`);
      }
    }

    if (orConditions.length === 0) return null;

    const { data: existingLead, error } = await supabase
      .from('mt_leads')
      .select('id')
      .or(orConditions.join(','))
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar lead existente:', error);
    }

    return existingLead;
  }, []);

  // ── Update existing lead (personal fields only) ───────────────────────

  const updateExistingLead = useCallback(async (leadId: string, leadData: LeadData) => {
    const personalFields = [
      'nome', 'sobrenome', 'nome_social', 'email', 'telefone', 'whatsapp',
      'cpf', 'data_nascimento', 'genero', 'profissao', 'empresa', 'cargo',
      'cep', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado',
      'latitude', 'longitude', 'servico_interesse',
    ];
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const field of personalFields) {
      if (leadData[field] !== undefined && leadData[field] !== null && leadData[field] !== '') {
        updateData[field] = leadData[field];
      }
    }
    if (leadData.franchise_id) updateData.franchise_id = leadData.franchise_id;

    const { error } = await supabase
      .from('mt_leads')
      .update(updateData)
      .eq('id', leadId);

    if (error) {
      console.error('Erro ao atualizar lead:', error);
    }

    return leadId;
  }, []);

  // ── Create new lead ───────────────────────────────────────────────────

  const createLead = useCallback(async (leadData: LeadData): Promise<string | undefined> => {
    const { data: newLead, error: insertError } = await supabase
      .from('mt_leads')
      .insert(leadData)
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao criar lead:', insertError);
      console.error('Dados enviados:', leadData);

      // Fallback: if duplicate key, try to find and update
      if (insertError.code === '23505') {
        const cleanedPhone = leadData.telefone ? String(leadData.telefone).replace(/\D/g, '') : '';
        const fallbackOr: string[] = [];
        if (leadData.email) fallbackOr.push(`email.eq.${leadData.email}`);
        if (cleanedPhone) fallbackOr.push(`telefone.eq.${cleanedPhone}`);
        if (leadData.whatsapp) fallbackOr.push(`whatsapp.eq.${leadData.whatsapp}`);
        if (fallbackOr.length > 0) {
          const { data: fallbackLead } = await supabase
            .from('mt_leads')
            .select('id')
            .or(fallbackOr.join(','))
            .maybeSingle();
          if (fallbackLead) {
            await supabase.from('mt_leads').update(leadData).eq('id', fallbackLead.id);
            return fallbackLead.id;
          }
        }
      }
      return undefined;
    }

    return newLead?.id;
  }, []);

  // ── Log lead activity ─────────────────────────────────────────────────

  const logLeadActivity = useCallback(async (activity: ActivityData) => {
    try {
      await supabase.from('mt_lead_activities').insert(activity);
    } catch (err) {
      console.error('Erro ao registrar atividade:', err);
    }
  }, []);

  // ── Track promotion use ───────────────────────────────────────────────

  const trackPromotion = useCallback(async ({ codigoPromocao, leadId }: PromotionTrackingData) => {
    try {
      const { data: promocao } = await supabase
        .from('mt_promotions')
        .select('id, tenant_id')
        .eq('codigo', codigoPromocao.toUpperCase())
        .eq('status', 'ativa')
        .maybeSingle();

      if (!promocao) return null;

      // Link promotion to lead
      await supabase
        .from('mt_leads')
        .update({ promotion_id: promocao.id })
        .eq('id', leadId);

      // Record promotion use
      await supabase.from('mt_promotion_uses').insert({
        promotion_id: promocao.id,
        tenant_id: promocao.tenant_id,
        lead_id: leadId,
        source: 'formulario',
      });

      // Increment uses counter
      await supabase.rpc('increment_field', {
        table_name: 'mt_promotions',
        field_name: 'usos_count',
        row_id: promocao.id,
      }).catch(() => {
        // Fallback: direct update if RPC doesn't exist
        supabase
          .from('mt_promotions')
          .update({ usos_count: ((promocao as Record<string, unknown>).usos_count as number) ? ((promocao as Record<string, unknown>).usos_count as number) + 1 : 1 })
          .eq('id', promocao.id);
      });

      return promocao;
    } catch (err) {
      console.error('Erro ao registrar promocao:', err);
      return null;
    }
  }, []);

  // ── Track influencer referral ─────────────────────────────────────────

  const trackInfluencerReferral = useCallback(async ({
    codigoInfluenciadora,
    leadId,
    franchiseIdFinal,
    leadData,
    indicadorInfo,
    codigoPromocao,
  }: InfluencerReferralData) => {
    const { data: influenciadora } = await supabase
      .from('mt_influencers')
      .select('id, tenant_id')
      .eq('codigo', codigoInfluenciadora.toUpperCase())
      .maybeSingle();

    if (!influenciadora) return;

    await supabase.from('mt_influencer_referrals').insert({
      tenant_id: influenciadora.tenant_id,
      influencer_id: influenciadora.id,
      lead_id: leadId,
      codigo_usado: codigoInfluenciadora.toUpperCase(),
      status: 'pendente',
    });

    // Auto WhatsApp send to the referred lead (fire-and-forget)
    try {
      const leadPhone = String(leadData.whatsapp || leadData.telefone || '').replace(/\D/g, '');
      const leadNome = String(leadData.nome || '');
      const influencerNome = indicadorInfo?.nome_real || indicadorInfo?.nome || '';

      if (leadPhone && leadNome) {
        const { data: notifConfig } = await supabase.rpc('get_referral_notif_config', {
          p_tenant_id: influenciadora.tenant_id,
          p_franchise_id: franchiseIdFinal || null,
        });

        const autoSendEnabled = notifConfig?.auto_send_whatsapp_enabled !== false;
        const onIndicacaoCriada = notifConfig?.auto_send_on_indicacao_criada !== false;

        if (autoSendEnabled && onIndicacaoCriada) {
          const firstName = leadNome.split(' ')[0];
          const phoneWithCountry = leadPhone.startsWith('55') ? leadPhone : `55${leadPhone}`;

          let unidadeNome = 'nossa unidade';
          if (franchiseIdFinal) {
            unidadeNome = await getFranchiseDisplayName(franchiseIdFinal);
          }

          const mensagem =
            `Olá, ${firstName}! Tudo bem? 😊\n\n` +
            (influencerNome
              ? `*${influencerNome}* te indicou e você ganhou um presente especial! 🎁\n\n`
              : `Você ganhou um presente especial! 🎁\n\n`) +
            `✨ *Benefícios exclusivos GRATUITOS*!\n\n` +
            `Para garantir seus benefícios, é só agendar um *atendimento gratuito* aqui na *${unidadeNome}*. ` +
            `O atendimento é rápido, sem compromisso, e nosso especialista vai tirar todas as suas dúvidas.\n\n` +
            `📅 Quer agendar? Me conta qual o melhor dia e horário para você!\n\n` +
            `Te esperamos! 💜`;

          supabase.functions.invoke('whatsapp-send', {
            body: {
              phone: phoneWithCountry,
              message: mensagem,
              tenant_id: influenciadora.tenant_id,
            },
          }).catch(err => console.warn('[Auto-Send Indicacao] Erro (nao critico):', err));
        }
      }
    } catch (autoSendErr) {
      console.warn('[Auto-Send Indicacao] Erro (nao critico):', autoSendErr);
    }

    // If there's also a promotion, update subscription stats
    if (codigoPromocao) {
      try {
        const { data: promocao } = await supabase
          .from('mt_promotions')
          .select('id')
          .eq('codigo', codigoPromocao.toUpperCase())
          .eq('status', 'ativa')
          .maybeSingle();

        if (promocao) {
          const { data: sub } = await supabase
            .from('mt_promotion_subscriptions')
            .select('id, total_leads')
            .eq('promotion_id', promocao.id)
            .eq('influencer_id', influenciadora.id)
            .maybeSingle();

          if (sub) {
            await supabase
              .from('mt_promotion_subscriptions')
              .update({ total_leads: (sub.total_leads || 0) + 1 })
              .eq('id', sub.id);

            await supabase.from('mt_promotion_uses').insert({
              promotion_id: promocao.id,
              tenant_id: influenciadora.tenant_id,
              lead_id: leadId,
              influencer_id: influenciadora.id,
              subscription_id: sub.id,
              source: 'formulario',
            });
          }
        }
      } catch (subErr) {
        console.error('Erro ao atualizar subscription:', subErr);
      }
    }
  }, []);

  // ── Track partnership referral ────────────────────────────────────────

  const trackPartnershipReferral = useCallback(async ({
    codigoParceria,
    leadId,
    tenantId,
    franchiseId,
    leadData,
    indicadorInfo,
  }: PartnershipReferralData) => {
    const { data: parceria } = await supabase
      .from('mt_partnerships')
      .select('id, tenant_id, nome_fantasia, nome_empresa')
      .eq('codigo', codigoParceria.toUpperCase())
      .eq('status', 'ativo')
      .maybeSingle();

    if (!parceria) return;

    // Update lead with parceria_id
    await supabase
      .from('mt_leads')
      .update({ parceria_id: parceria.id })
      .eq('id', leadId);

    // Record partnership referral
    await supabase.from('mt_partnership_referrals').insert({
      tenant_id: tenantId,
      franchise_id: franchiseId || null,
      partnership_id: parceria.id,
      parceria_id: parceria.id,
      lead_id: leadId,
      codigo_usado: codigoParceria.toUpperCase(),
      code_used: codigoParceria.toUpperCase(),
      referral_code: codigoParceria.toUpperCase(),
      data_indicacao: new Date().toISOString(),
      status: 'pendente',
    });

    // Auto WhatsApp send (fire-and-forget)
    try {
      const leadPhone = String(leadData.whatsapp || leadData.telefone || '').replace(/\D/g, '');
      const leadNome = String(leadData.nome || '');
      const parceriaNome = parceria.nome_fantasia || parceria.nome_empresa || indicadorInfo?.nome || '';

      if (leadPhone && leadNome && parceriaNome) {
        const firstName = leadNome.split(' ')[0];
        const phoneWithCountry = leadPhone.startsWith('55') ? leadPhone : `55${leadPhone}`;

        let unidadeNome = 'nossa unidade';
        if (franchiseId) {
          unidadeNome = await getFranchiseDisplayName(franchiseId);
        }

        const mensagem =
          `Olá, ${firstName}! Tudo bem? 😊\n\n` +
          `*${parceriaNome}* tem uma parceria especial com a Viniun para você! 🎁\n\n` +
          `✨ *Benefícios exclusivos GRATUITOS*!\n\n` +
          `Para garantir seus benefícios, é só agendar um *atendimento gratuito* aqui na *${unidadeNome}*. ` +
          `O atendimento é rápido, sem compromisso, e nosso especialista vai tirar todas as suas dúvidas.\n\n` +
          `📅 Quer agendar? Me conta qual o melhor dia e horário para você!\n\n` +
          `Te esperamos! 💜`;

        supabase.functions.invoke('whatsapp-send', {
          body: {
            phone: phoneWithCountry,
            message: mensagem,
            tenant_id: parceria.tenant_id || tenantId,
          },
        }).catch(err => console.warn('[Auto-Send Parceria] Erro (nao critico):', err));
      }
    } catch (autoSendErr) {
      console.warn('[Auto-Send Parceria] Erro (nao critico):', autoSendErr);
    }
  }, []);

  // ── Create form submission ────────────────────────────────────────────

  const createFormSubmission = useCallback(async (submissionData: SubmissionData) => {
    await supabase.from('mt_form_submissions').insert(submissionData);
  }, []);

  // ── Create indicado (referred friend) lead ────────────────────────────

  const createIndicadoLead = useCallback(async ({
    nome, whatsapp, email, tenantId, franchiseId, indicadoPorId, formSlug, campanha,
  }: CreateIndicadoLeadData) => {
    const indicadoLeadData = {
      nome,
      whatsapp,
      telefone: whatsapp,
      email: email || null,
      tenant_id: tenantId,
      franchise_id: franchiseId,
      canal_entrada: 'site',
      origem: 'indicacao',
      status: 'Lead Recebido',
      landing_page: formSlug,
      indicado_por_id: indicadoPorId,
      campanha: campanha || `Indicacao - formulario`,
    };

    // Check if lead already exists
    const { data: existingIndicado, error: checkError } = await supabase
      .from('mt_leads')
      .select('id')
      .eq('whatsapp', whatsapp)
      .maybeSingle();

    if (checkError) {
      console.error('Erro ao verificar lead indicado:', checkError);
    }

    if (!existingIndicado) {
      const { error: insertError } = await supabase
        .from('mt_leads')
        .insert(indicadoLeadData);
      if (insertError) {
        console.error('Erro ao criar lead indicado:', insertError);
        console.error('Dados do indicado:', indicadoLeadData);
      }
    }
  }, []);

  // ── Notify franchise via WhatsApp ─────────────────────────────────────

  const notifyFranchiseNewLead = useCallback(async ({
    leadId,
    tenantId,
    franchiseIdFinal,
    leadNome,
    leadPhone,
    leadEmail,
    origemTexto,
    formularioNome,
  }: FranchiseNotificationData) => {
    try {
      let franchiseWhatsApp: string | null = null;
      let franchiseNome = '';
      const targetFranchiseId = franchiseIdFinal;

      if (targetFranchiseId) {
        const { data: franchise } = await supabase
          .from('mt_franchises')
          .select('whatsapp, nome_fantasia, nome')
          .eq('id', targetFranchiseId)
          .maybeSingle();
        if (franchise) {
          franchiseWhatsApp = franchise.whatsapp;
          franchiseNome = franchise.nome_fantasia || franchise.nome || '';
        }
      }

      // Fallback: first active franchise of the tenant with WhatsApp
      if (!franchiseWhatsApp) {
        const { data: defaultFranchise } = await supabase
          .from('mt_franchises')
          .select('whatsapp, nome_fantasia, nome')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .not('whatsapp', 'is', null)
          .limit(1)
          .maybeSingle();
        if (defaultFranchise) {
          franchiseWhatsApp = defaultFranchise.whatsapp;
          franchiseNome = defaultFranchise.nome_fantasia || defaultFranchise.nome || '';
        }
      }

      if (franchiseWhatsApp) {
        const franchiseMsg = `🆕 *Novo lead cadastrado!*\n\n` +
          `*Nome:* ${leadNome}\n` +
          `*WhatsApp:* ${leadPhone ? `(${leadPhone.slice(2, 4)}) ${leadPhone.slice(4, 9)}-${leadPhone.slice(9)}` : 'Nao informado'}\n` +
          `*Email:* ${leadEmail}\n` +
          `*Origem:* ${origemTexto}\n` +
          `*Formulário:* ${formularioNome}\n` +
          (franchiseNome ? `*Unidade:* ${franchiseNome}\n` : '') +
          `\n_Cadastrado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}_`;

        supabase.functions.invoke('whatsapp-send', {
          body: {
            phone: String(franchiseWhatsApp).replace(/\D/g, ''),
            message: franchiseMsg,
            tenant_id: tenantId,
          },
        }).catch(err => console.warn('Erro ao notificar franquia (novo lead):', err));
      }
    } catch (notifErr) {
      console.warn('Erro ao notificar franquia:', notifErr);
    }
  }, []);

  // ── Create magic token for client portal ──────────────────────────────

  const createMagicToken = useCallback(async ({
    tenantId,
    leadId,
    formData,
    leadData: _leadData,
    franchiseIdFinal,
  }: MagicTokenData): Promise<string | null> => {
    try {
      const magicToken = crypto.randomUUID().replace(/-/g, '');
      await supabase.from('mt_cliente_magic_tokens').insert({
        tenant_id: tenantId,
        lead_id: leadId,
        token: magicToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      // Send WhatsApp with portal link
      const clientPhone = formData.whatsapp || formData.telefone;
      if (clientPhone) {
        const portalUrl = `${window.location.origin}/cliente/agendar?token=${magicToken}`;
        const firstName = ((formData.nome as string) || 'Cliente').split(' ')[0];
        const portalMsg = `Olá, ${firstName}! 😊\n\n` +
          `Seu cadastro foi realizado com sucesso!\n\n` +
          `Acesse seu painel para agendar sua sessão gratuita:\n${portalUrl}\n\n` +
          `É só clicar e escolher o melhor horário para você! 📅`;

        supabase.functions.invoke('whatsapp-send', {
          body: {
            phone: String(clientPhone).replace(/\D/g, ''),
            message: portalMsg,
            tenant_id: tenantId,
          },
        }).catch(err => console.warn('Erro ao enviar WhatsApp portal:', err));
      }

      return magicToken;
    } catch (magicErr) {
      console.warn('Erro ao gerar magic token:', magicErr);
      return null;
    }
  }, []);

  // ── Get franchise slug ────────────────────────────────────────────────

  const getFranchiseSlug = useCallback(async (franchiseId: string): Promise<string> => {
    try {
      const slugPromise = supabase.from('mt_franchises').select('slug').eq('id', franchiseId).single();
      const timeoutP = new Promise((_, reject) => setTimeout(() => reject('timeout'), 2000));
      const { data: slugData } = await Promise.race([slugPromise, timeoutP]) as { data: { slug?: string } | null };
      return slugData?.slug || '';
    } catch {
      return '';
    }
  }, []);

  // ── Get franchise display name (helper) ───────────────────────────────

  const getFranchiseDisplayName = useCallback(async (franchiseId: string): Promise<string> => {
    try {
      const franchisePromise = supabase
        .from('mt_franchises')
        .select('nome_fantasia, nome, cidade')
        .eq('id', franchiseId)
        .single();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject('timeout'), 3000));
      const { data: refFranchise } = await Promise.race([franchisePromise, timeoutPromise]) as { data: { nome_fantasia?: string; nome?: string; cidade?: string } | null };
      if (refFranchise) {
        const fName = refFranchise.nome_fantasia || refFranchise.nome || '';
        return refFranchise.cidade ? `${fName} - ${refFranchise.cidade}` : fName;
      }
    } catch {
      // Timeout - use fallback
    }
    return 'nossa unidade';
  }, []);

  // ── Update webhook status on submission ───────────────────────────────

  const updateWebhookStatus = useCallback(async (sessionId: string, formularioId: string, statusCode?: number) => {
    try {
      await supabase
        .from('mt_form_submissions')
        .update({
          webhook_enviado: true,
          webhook_response_code: statusCode,
        })
        .eq('session_id', sessionId)
        .eq('formulario_id', formularioId);
    } catch (err) {
      console.error('Erro ao atualizar status do webhook:', err);
    }
  }, []);

  // ── RPC: increment_field ──────────────────────────────────────────────

  const incrementField = useCallback(async (tableName: string, fieldName: string, rowId: string) => {
    return supabase.rpc('increment_field', {
      table_name: tableName,
      field_name: fieldName,
      row_id: rowId,
    });
  }, []);

  // ── RPC: get_referral_notif_config ────────────────────────────────────

  const getReferralNotifConfig = useCallback(async (tenantId: string, franchiseId?: string | null) => {
    const { data } = await supabase.rpc('get_referral_notif_config', {
      p_tenant_id: tenantId,
      p_franchise_id: franchiseId || null,
    });
    return data;
  }, []);

  // ── Send WhatsApp message (fire-and-forget) ───────────────────────────

  const sendWhatsApp = useCallback((phone: string, message: string, tenantId: string) => {
    supabase.functions.invoke('whatsapp-send', {
      body: { phone, message, tenant_id: tenantId },
    }).catch(err => console.warn('Erro ao enviar WhatsApp:', err));
  }, []);

  return {
    // Data loading
    loadFormulario,
    loadServicos,
    loadIndicadorInfo,
    incrementFormView,

    // Lead operations
    findExistingLead,
    updateExistingLead,
    createLead,
    createIndicadoLead,
    logLeadActivity,

    // Tracking
    trackPromotion,
    trackInfluencerReferral,
    trackPartnershipReferral,

    // Form submission
    createFormSubmission,

    // Notifications
    notifyFranchiseNewLead,
    sendWhatsApp,

    // Client portal
    createMagicToken,

    // Utilities
    getFranchiseSlug,
    getFranchiseDisplayName,
    updateWebhookStatus,
    incrementField,
    getReferralNotifConfig,
  };
}
