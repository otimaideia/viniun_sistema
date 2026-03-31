import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LojaSubmissionParams {
  tenant_id: string;
  franchise_id?: string | null;
}

interface LeadData {
  nome: string;
  whatsapp?: string | null;
  email?: string | null;
  genero?: string | null;
  cep?: string | null;
  endereco?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  servico_interesse?: string | null;
  influenciador_codigo?: string | null;
}

interface FormSubmissionData {
  form_id: string;
  dados: Record<string, unknown>;
  user_agent?: string;
  referrer?: string | null;
  utm_source?: string;
  utm_medium?: string;
}

export function useLojaPublicSubmission({ tenant_id, franchise_id }: LojaSubmissionParams) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Find existing lead by email or whatsapp, update if found, create if not.
   * Returns { leadId, isNew }.
   */
  const upsertLead = async (data: LeadData): Promise<{ leadId: string | undefined; isNew: boolean }> => {
    const whatsClean = (data.whatsapp || '').replace(/\D/g, '');
    const orConditions: string[] = [];
    if (data.email) orConditions.push(`email.eq.${data.email}`);
    if (whatsClean) orConditions.push(`whatsapp.eq.${whatsClean}`);

    let leadId: string | undefined;
    let isNew = true;

    if (orConditions.length > 0) {
      const { data: existingData } = await supabase
        .from('mt_leads')
        .select('id')
        .eq('tenant_id', tenant_id)
        .or(orConditions.join(','))
        .maybeSingle();

      if (existingData) {
        isNew = false;
        leadId = existingData.id;
        await supabase.from('mt_leads').update({
          nome: data.nome.trim(),
          genero: data.genero || null,
          cep: data.cep || null,
          endereco: data.endereco || null,
          bairro: data.bairro || null,
          cidade: data.cidade || null,
          estado: data.estado || null,
          servico_interesse: data.servico_interesse || null,
          ultimo_contato: new Date().toISOString(),
          landing_page: window.location.href,
        }).eq('id', existingData.id);
      }
    }

    if (!leadId) {
      const cepClean = (data.cep || '').replace(/\D/g, '');
      const leadPayload: Record<string, unknown> = {
        tenant_id,
        franchise_id: franchise_id || null,
        nome: data.nome.trim(),
        whatsapp: whatsClean || null,
        telefone: whatsClean || null,
        email: data.email || null,
        genero: data.genero || null,
        cep: cepClean || null,
        endereco: data.endereco || null,
        bairro: data.bairro || null,
        cidade: data.cidade || null,
        estado: data.estado || null,
        servico_interesse: data.servico_interesse || null,
        origem: 'loja',
        utm_source: 'loja',
        utm_medium: 'formulario',
        landing_page: window.location.href,
        referrer_url: document.referrer || null,
        influenciador_codigo: data.influenciador_codigo || null,
        status: 'novo',
        temperatura: 'morno',
        tags: ['loja-online'],
        dados_extras: {
          interesse: data.servico_interesse,
          genero: data.genero,
          cep: cepClean,
          endereco: data.endereco,
          bairro: data.bairro,
          cidade: data.cidade,
          estado: data.estado,
          consent: true,
          source: 'loja-publica',
        },
      };

      const { data: newLead } = await supabase
        .from('mt_leads')
        .insert(leadPayload)
        .select('id')
        .single();
      leadId = newLead?.id;
    }

    return { leadId, isNew };
  };

  /**
   * Register activity on a lead after form submission.
   */
  const registerLeadActivity = async (
    leadId: string,
    isNew: boolean,
    extra?: { interesse?: string; influencerCode?: string | null },
  ) => {
    try {
      await supabase.from('mt_lead_activities').insert({
        lead_id: leadId,
        tenant_id,
        franchise_id: franchise_id || null,
        tipo: isNew ? 'cadastro' : 'formulario',
        titulo: isNew ? 'Lead cadastrado via Loja Online' : 'Nova submissao via Loja Online',
        descricao: isNew
          ? `Cadastro realizado pela loja online${extra?.interesse ? ` - Interesse: ${extra.interesse}` : ''}${extra?.influencerCode ? ` - Cod. influenciadora: ${extra.influencerCode}` : ''}`
          : `Lead se cadastrou novamente pela loja online${extra?.interesse ? ` - Interesse: ${extra.interesse}` : ''}${extra?.influencerCode ? ` - Cod. influenciadora: ${extra.influencerCode}` : ''}`,
        dados: {
          origem: 'loja',
          canal_entrada: 'loja-online',
          landing_page: window.location.href,
          referrer_url: document.referrer || null,
          interesse: extra?.interesse,
          influencer_code: extra?.influencerCode || null,
          is_resubmissao: !isNew,
        },
        user_nome: 'Sistema (Loja Publica)',
      });
    } catch (err) {
      console.error('[useLojaPublicSubmission] Erro ao registrar atividade:', err);
    }
  };

  /**
   * Submit form data to mt_form_submissions.
   */
  const submitFormData = async (
    leadId: string | undefined,
    submission: FormSubmissionData,
  ) => {
    await supabase.from('mt_form_submissions').insert({
      tenant_id,
      form_id: submission.form_id,
      lead_id: leadId || null,
      dados: submission.dados,
      ip_address: null,
      user_agent: submission.user_agent || navigator.userAgent,
      referrer: submission.referrer || document.referrer || null,
      utm_source: submission.utm_source || 'loja',
      utm_medium: submission.utm_medium || 'formulario',
    });
  };

  return {
    upsertLead,
    registerLeadActivity,
    submitFormData,
    isSubmitting,
    setIsSubmitting,
  };
}
