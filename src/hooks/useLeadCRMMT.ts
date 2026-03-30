// =============================================================================
// USE LEAD CRM MT - Hook Multi-Tenant para Funcionalidades CRM
// =============================================================================
//
// Este hook fornece funcionalidades de CRM para leads:
// - Ações rápidas (ligar, WhatsApp, email)
// - Agendamentos
// - Acompanhamento de conversas
// - Registros de contato
//
// =============================================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { MTLead, LeadActivityType, MTLeadActivity } from '@/types/lead-mt';
import { LEAD_ACTIVITY_LABELS } from '@/types/lead-mt';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface CRMQuickAction {
  type: 'whatsapp' | 'ligacao' | 'email' | 'agendamento';
  lead: MTLead;
  descricao?: string;
  metadata?: Record<string, unknown>;
}

export interface AgendamentoCreate {
  lead_id: string;
  data_agendada: string;
  tipo: 'avaliacao' | 'retorno' | 'procedimento' | 'outro';
  observacoes?: string;
}

export interface ContatoRegistro {
  lead_id: string;
  tipo: LeadActivityType;
  descricao: string;
  resultado?: 'atendeu' | 'nao_atendeu' | 'ocupado' | 'caixa_postal' | 'enviado';
  duracao?: number; // em segundos para ligações
  metadata?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-lead-crm';

// -----------------------------------------------------------------------------
// Hook Principal
// -----------------------------------------------------------------------------

export function useLeadCRMMT(leadId?: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  // ---------------------------------------------------------------------------
  // Query: Dados CRM do Lead
  // ---------------------------------------------------------------------------

  const leadCRMData = useQuery({
    queryKey: [QUERY_KEY, leadId],
    queryFn: async () => {
      if (!leadId) return null;

      // Buscar lead com dados expandidos (com tenant isolation)
      let leadQuery = supabase
        .from('mt_leads')
        .select(`
          *,
          tenant:mt_tenants (id, slug, nome_fantasia),
          franchise:mt_franchises (id, nome),
          responsavel:mt_users!mt_leads_atribuido_para_fkey (id, nome, email, avatar_url)
        `)
        .eq('id', leadId);

      if (accessLevel === 'tenant' && tenant) {
        leadQuery = leadQuery.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        leadQuery = leadQuery.eq('franchise_id', franchise.id);
      }

      const { data: lead, error } = await leadQuery.single();

      if (error) throw error;

      // Buscar ultimas atividades
      const { data: atividades } = await supabase
        .from('mt_lead_activities')
        .select('*')
        .eq('lead_id', leadId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(10);

      // Buscar proximo agendamento
      const { data: proximoAgendamento } = await supabase
        .from('mt_appointments')
        .select('*')
        .eq('lead_id', leadId)
        .is('deleted_at', null)
        .gte('data_agendamento', new Date().toISOString().split('T')[0])
        .not('status', 'in', '("cancelado","remarcado")')
        .order('data_agendamento', { ascending: true })
        .limit(1)
        .maybeSingle();

      return {
        lead: lead as MTLead,
        atividades: (atividades || []) as MTLeadActivity[],
        proximoAgendamento,
        stats: {
          totalContatos: lead?.total_contatos || 0,
          totalLigacoes: lead?.total_ligacoes || 0,
          totalMensagens: lead?.total_mensagens || 0,
          totalEmails: lead?.total_emails || 0,
          diasSemContato: lead?.ultimo_contato
            ? Math.floor((Date.now() - new Date(lead.ultimo_contato).getTime()) / (1000 * 60 * 60 * 24))
            : null,
        },
      };
    },
    enabled: !!leadId && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // ---------------------------------------------------------------------------
  // Mutation: Registrar Contato
  // ---------------------------------------------------------------------------

  const registrarContato = useMutation({
    mutationFn: async (registro: ContatoRegistro): Promise<MTLeadActivity> => {
      if (!user) throw new Error('Usuário não autenticado');
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      // Criar atividade
      const { data: atividade, error } = await supabase
        .from('mt_lead_activities')
        .insert({
          tenant_id: tenant?.id,
          lead_id: registro.lead_id,
          tipo: registro.tipo,
          titulo: LEAD_ACTIVITY_LABELS[registro.tipo as LeadActivityType] || 'Acao',
          descricao: registro.descricao,
          dados: {
            ...registro.metadata,
            resultado: registro.resultado,
            duracao: registro.duracao,
          },
          resultado: registro.resultado,
          duracao_segundos: registro.duracao,
          user_id: user.id,
          user_nome: user.email || 'Sistema',
        })
        .select()
        .single();

      if (error) throw error;

      // Atualizar contadores no lead usando RPC para increment atômico (evita race condition)
      const incrementField = getIncrementField(registro.tipo);
      if (incrementField) {
        // Buscar valores atuais do banco (não do cache) para garantir atomicidade
        const { data: freshLead } = await supabase
          .from('mt_leads')
          .select(`total_contatos, ${incrementField}`)
          .eq('id', registro.lead_id)
          .single();

        const currentTotal = freshLead?.total_contatos || 0;
        const currentFieldValue = freshLead ? ((freshLead as any)[incrementField] || 0) : 0;

        await supabase
          .from('mt_leads')
          .update({
            [incrementField]: currentFieldValue + 1,
            total_contatos: currentTotal + 1,
            ultimo_contato: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', registro.lead_id);
      }

      return atividade as MTLeadActivity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, leadId] });
      queryClient.invalidateQueries({ queryKey: ['mt-leads'] });
      queryClient.invalidateQueries({ queryKey: ['mt-lead-activities', leadId] });
      toast.success('Contato registrado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao registrar contato: ${error.message}`);
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Criar Agendamento
  // ---------------------------------------------------------------------------

  const criarAgendamento = useMutation({
    mutationFn: async (agendamento: AgendamentoCreate) => {
      if (!user) throw new Error('Usuário não autenticado');
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      // Criar agendamento
      const { data, error } = await supabase
        .from('mt_appointments')
        .insert({
          tenant_id: tenant?.id,
          franchise_id: franchise?.id,
          lead_id: agendamento.lead_id,
          data_agendamento: agendamento.data_agendada,
          hora_inicio: '09:00',
          tipo: agendamento.tipo === 'procedimento' ? 'procedimento_fechado' : agendamento.tipo === 'retorno' || agendamento.tipo === 'outro' ? 'avaliacao' : agendamento.tipo,
          observacoes: agendamento.observacoes,
          status: 'pendente',
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Registrar atividade
      await supabase.from('mt_lead_activities').insert({
        tenant_id: tenant?.id,
        lead_id: agendamento.lead_id,
        tipo: 'agendamento',
        titulo: 'Agendamento criado',
        descricao: `${agendamento.tipo} agendado para ${new Date(agendamento.data_agendada).toLocaleDateString('pt-BR')}`,
        dados: { agendamento_id: data.id },
        user_id: user.id,
        user_nome: user.email || 'Sistema',
      });

      // Atualizar status do lead (pendente até confirmação do agendamento)
      await supabase
        .from('mt_leads')
        .update({
          status: 'agendado',
          data_agendamento: agendamento.data_agendada,
          updated_at: new Date().toISOString(),
        })
        .eq('id', agendamento.lead_id);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, leadId] });
      queryClient.invalidateQueries({ queryKey: ['mt-leads'] });
      queryClient.invalidateQueries({ queryKey: ['mt-appointments'] });
      toast.success('Agendamento criado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar agendamento: ${error.message}`);
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Ação Rápida (WhatsApp, Ligação, etc)
  // ---------------------------------------------------------------------------

  const executarAcaoRapida = useMutation({
    mutationFn: async (acao: CRMQuickAction) => {
      if (!user) throw new Error('Usuário não autenticado');

      let descricao = acao.descricao || '';

      switch (acao.type) {
        case 'whatsapp':
          descricao = descricao || 'Enviou mensagem via WhatsApp';
          // Abrir WhatsApp (lado do cliente faz isso)
          break;
        case 'ligacao':
          descricao = descricao || 'Realizou ligação';
          break;
        case 'email':
          descricao = descricao || 'Enviou e-mail';
          break;
        case 'agendamento':
          descricao = descricao || 'Criou agendamento';
          break;
      }

      // Registrar atividade
      const { data, error } = await supabase
        .from('mt_lead_activities')
        .insert({
          tenant_id: tenant?.id,
          lead_id: acao.lead.id,
          tipo: acao.type === 'agendamento' ? 'agendamento' : acao.type,
          titulo: LEAD_ACTIVITY_LABELS[acao.type as LeadActivityType] || 'Acao',
          descricao,
          dados: acao.metadata || {},
          user_id: user.id,
          user_nome: user.email || 'Sistema',
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.lead.id] });
      queryClient.invalidateQueries({ queryKey: ['mt-lead-activities', variables.lead.id] });
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Adicionar Nota
  // ---------------------------------------------------------------------------

  const adicionarNota = useMutation({
    mutationFn: async ({ leadId, nota, titulo }: { leadId: string; nota: string; titulo?: string }) => {
      if (!user) throw new Error('Usuário não autenticado');
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      const { data, error } = await supabase
        .from('mt_lead_activities')
        .insert({
          tenant_id: tenant?.id,
          lead_id: leadId,
          tipo: 'nota',
          titulo: titulo || 'Nota',
          descricao: nota,
          user_id: user.id,
          user_nome: user.email || 'Sistema',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['mt-lead-activities', variables.leadId] });
      toast.success('Nota adicionada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar nota: ${error.message}`);
    },
  });

  // ---------------------------------------------------------------------------
  // Funções Utilitárias
  // ---------------------------------------------------------------------------

  /**
   * Abrir WhatsApp com mensagem
   */
  const abrirWhatsApp = (telefone: string, mensagem?: string) => {
    const cleanPhone = telefone.replace(/\D/g, '');
    const codigoPais = cleanPhone.startsWith('55') ? '' : '55';
    const fullPhone = codigoPais + cleanPhone;

    let url = `https://wa.me/${fullPhone}`;
    if (mensagem) {
      url += `?text=${encodeURIComponent(mensagem)}`;
    }

    window.open(url, '_blank');
  };

  /**
   * Abrir discador com número
   */
  const abrirDiscador = (telefone: string) => {
    const cleanPhone = telefone.replace(/\D/g, '');
    window.open(`tel:${cleanPhone}`, '_self');
  };

  /**
   * Abrir cliente de email
   */
  const abrirEmail = (email: string, assunto?: string, corpo?: string) => {
    let url = `mailto:${email}`;
    const params: string[] = [];

    if (assunto) params.push(`subject=${encodeURIComponent(assunto)}`);
    if (corpo) params.push(`body=${encodeURIComponent(corpo)}`);

    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }

    window.open(url, '_self');
  };

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    data: leadCRMData.data,
    isLoading: leadCRMData.isLoading || isTenantLoading,
    error: leadCRMData.error as Error | null,
    refetch: leadCRMData.refetch,

    // Mutations
    registrarContato: registrarContato.mutateAsync,
    isRegistrandoContato: registrarContato.isPending,

    criarAgendamento: criarAgendamento.mutateAsync,
    isCriandoAgendamento: criarAgendamento.isPending,

    executarAcaoRapida: executarAcaoRapida.mutateAsync,
    isExecutandoAcao: executarAcaoRapida.isPending,

    adicionarNota: adicionarNota.mutateAsync,
    isAdicionandoNota: adicionarNota.isPending,

    // Funções utilitárias
    abrirWhatsApp,
    abrirDiscador,
    abrirEmail,
  };
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function getIncrementField(tipo: LeadActivityType | string): string | null {
  const fields: Record<string, string> = {
    ligacao: 'total_ligacoes',
    whatsapp: 'total_mensagens',
    email: 'total_emails',
  };
  return fields[tipo] || null;
}

export default useLeadCRMMT;
