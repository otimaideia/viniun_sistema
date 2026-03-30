import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Agendamento } from '@/types/agendamento';
import { Lead } from '@/types/lead-mt';
import { Checkin } from '@/types/checkin';

interface AgendamentoComDetalhes extends Agendamento {
  unidade_nome?: string;
  unidade_cidade?: string;
  ja_fez_checkin?: boolean;
}

interface UseClienteAgendamentosReturn {
  // Estado
  agendamentos: AgendamentoComDetalhes[];
  agendamentosFuturos: AgendamentoComDetalhes[];
  agendamentosPassados: AgendamentoComDetalhes[];
  proximoAgendamento: AgendamentoComDetalhes | null;
  isLoading: boolean;
  error: string | null;

  // Ações
  refetch: () => void;
  remarcarAgendamento: (id: string, novaData: string, novaHora: string) => Promise<boolean>;
  cancelarAgendamento: (id: string) => Promise<boolean>;
  fazerCheckin: (agendamentoId: string) => Promise<boolean>;
  registrarComparecimento: (franchiseId: string, lead: Lead, observacoes?: string) => Promise<boolean>;
  atualizarDados: (dados: Partial<Lead>) => Promise<boolean>;
}

export function useClienteAgendamentos(leadId: string | null): UseClienteAgendamentosReturn {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  // Buscar agendamentos do cliente
  const { data: agendamentos = [], isLoading, refetch } = useQuery({
    queryKey: ['cliente-agendamentos', leadId],
    queryFn: async () => {
      if (!leadId) return [];

      const { data, error: fetchError } = await supabase
        .from('mt_appointments')
        .select(`
          *,
          unidade:mt_franchises(nome_fantasia, cidade)
        `)
        .eq('lead_id', leadId)
        .order('data_agendamento', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      // Buscar check-ins
      const agendamentoIds = data?.map(a => a.id) || [];
      const { data: checkins } = await supabase
        .from('mt_checkins')
        .select('agendamento_id')
        .in('agendamento_id', agendamentoIds);

      const checkinIds = new Set(checkins?.map(c => c.agendamento_id) || []);

      return (data || []).map(ag => ({
        ...ag,
        unidade_nome: ag.unidade?.nome_fantasia,
        unidade_cidade: ag.unidade?.cidade,
        ja_fez_checkin: checkinIds.has(ag.id),
      })) as AgendamentoComDetalhes[];
    },
    enabled: !!leadId,
  });

  // Helper para extrair data no formato YYYY-MM-DD
  const getDateString = (date: string | null | undefined) => {
    if (!date) return '';
    return date.includes('T') ? date.split('T')[0] : date;
  };

  // Separar agendamentos futuros e passados
  const today = new Date().toISOString().split('T')[0];

  const agendamentosFuturos = agendamentos.filter(
    ag => getDateString(ag.data_agendamento) >= today && ag.status !== 'cancelado'
  );

  const agendamentosPassados = agendamentos.filter(
    ag => getDateString(ag.data_agendamento) < today || ag.status === 'cancelado' || ag.status === 'realizado'
  );

  // Próximo agendamento (primeiro dos futuros)
  const proximoAgendamento = agendamentosFuturos
    .filter(ag => ag.status === 'agendado' || ag.status === 'confirmado')
    .sort((a, b) => {
      const dateA = new Date(`${a.data_agendamento}T${a.hora_inicio}`);
      const dateB = new Date(`${b.data_agendamento}T${b.hora_inicio}`);
      return dateA.getTime() - dateB.getTime();
    })[0] || null;

  /**
   * Remarcar agendamento
   */
  const remarcarAgendamento = useCallback(async (
    id: string,
    novaData: string,
    novaHora: string
  ): Promise<boolean> => {
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('mt_appointments')
        .update({
          data_agendamento: novaData,
          hora_inicio: novaHora,
          status: 'agendado', // Volta para agendado se estava confirmado
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('lead_id', leadId); // Garantir que pertence ao lead

      if (updateError) {
        throw updateError;
      }

      queryClient.invalidateQueries({ queryKey: ['cliente-agendamentos', leadId] });
      return true;
    } catch (err) {
      console.error('Erro ao remarcar agendamento:', err);
      setError('Erro ao remarcar agendamento. Tente novamente.');
      return false;
    }
  }, [leadId, queryClient]);

  /**
   * Cancelar agendamento
   */
  const cancelarAgendamento = useCallback(async (id: string): Promise<boolean> => {
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('mt_appointments')
        .update({
          status: 'cancelado',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('lead_id', leadId); // Garantir que pertence ao lead

      if (updateError) {
        throw updateError;
      }

      queryClient.invalidateQueries({ queryKey: ['cliente-agendamentos', leadId] });
      return true;
    } catch (err) {
      console.error('Erro ao cancelar agendamento:', err);
      setError('Erro ao cancelar agendamento. Tente novamente.');
      return false;
    }
  }, [leadId, queryClient]);

  /**
   * Fazer check-in pelo portal
   */
  const fazerCheckin = useCallback(async (agendamentoId: string): Promise<boolean> => {
    if (!leadId) {
      setError('Usuário não autenticado');
      return false;
    }

    setError(null);

    try {
      // Buscar dados do agendamento
      const agendamento = agendamentos.find(a => a.id === agendamentoId);
      if (!agendamento) {
        setError('Agendamento não encontrado');
        return false;
      }

      // Verificar se é hoje
      const today = new Date().toISOString().split('T')[0];
      const agendamentoDate = agendamento.data_agendamento?.includes('T')
        ? agendamento.data_agendamento.split('T')[0]
        : agendamento.data_agendamento;
      if (agendamentoDate !== today) {
        setError('Check-in só pode ser feito no dia do agendamento');
        return false;
      }

      // Verificar se já fez check-in
      if (agendamento.ja_fez_checkin) {
        setError('Check-in já realizado para este agendamento');
        return false;
      }

      // Criar check-in
      const { error: checkinError } = await supabase
        .from('mt_checkins')
        .insert({
          agendamento_id: agendamentoId,
          lead_id: leadId,
          unidade_id: agendamento.unidade_id,
          metodo: 'portal',
          user_agent: navigator.userAgent,
        });

      if (checkinError) {
        throw checkinError;
      }

      // Atualizar status do agendamento
      await supabase
        .from('mt_appointments')
        .update({ status: 'confirmado' })
        .eq('id', agendamentoId);

      queryClient.invalidateQueries({ queryKey: ['cliente-agendamentos', leadId] });
      return true;
    } catch (err) {
      console.error('Erro ao fazer check-in:', err);
      setError('Erro ao confirmar presença. Tente novamente.');
      return false;
    }
  }, [leadId, agendamentos, queryClient]);

  /**
   * Atualizar dados pessoais do lead
   */
  const atualizarDados = useCallback(async (dados: Partial<Lead>): Promise<boolean> => {
    if (!leadId) {
      setError('Usuário não autenticado');
      return false;
    }

    setError(null);

    try {
      // Apenas permitir atualização de campos específicos
      const camposPermitidos: (keyof Lead)[] = [
        // Dados Pessoais Básicos
        'nome',
        'sobrenome',
        'email',
        'telefone',
        'whatsapp',
        'data_nascimento',
        'profissao',
        'estado_civil',
        'nacionalidade',
        // Endereço
        'cep',
        'endereco',
        'numero',
        'complemento',
        'bairro',
        'proximidade',
        // Contato e Redes Sociais
        'instagram',
        'preferencia_contato',
        'melhor_horario_contato',
        'dia_preferencial',
        // Saúde e Tratamento
        'tipo_pele',
        'alergias',
        'condicoes_medicas',
        'medicamentos_uso',
        'historico_tratamentos',
        'areas_interesse',
        'fotossensibilidade',
        'gravidez_lactacao',
        // Contato de Emergência
        'contato_emergencia_nome',
        'contato_emergencia_telefone',
        'contato_emergencia_parentesco',
        // Preferências
        'aceita_marketing',
        'aceita_pesquisa',
      ];
      const dadosFiltrados: Partial<Lead> = {};

      for (const campo of camposPermitidos) {
        if (campo in dados) {
          dadosFiltrados[campo] = dados[campo];
        }
      }

      const { error: updateError } = await supabase
        .from('mt_leads')
        .update({
          ...dadosFiltrados,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      if (updateError) {
        throw updateError;
      }

      return true;
    } catch (err) {
      console.error('Erro ao atualizar dados:', err);
      setError('Erro ao atualizar dados. Tente novamente.');
      return false;
    }
  }, [leadId]);

  /**
   * Registrar comparecimento walk-in (sem agendamento prévio)
   * Cria agendamento + check-in automaticamente
   */
  const registrarComparecimento = useCallback(async (
    franchiseId: string,
    lead: Lead,
    observacoes?: string
  ): Promise<boolean> => {
    if (!leadId) {
      setError('Usuário não autenticado');
      return false;
    }

    setError(null);

    try {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const horaStr = now.toTimeString().substring(0, 5);

      // 1. Criar agendamento walk-in
      const { data: appointment, error: apptError } = await supabase
        .from('mt_appointments')
        .insert({
          lead_id: leadId,
          tenant_id: lead.tenant_id,
          franchise_id: franchiseId,
          data_agendamento: todayStr,
          hora_inicio: horaStr,
          tipo: 'avaliacao',
          status: 'confirmado',
          cliente_nome: lead.nome || '',
          cliente_telefone: lead.telefone || lead.whatsapp || '',
          cliente_email: lead.email || '',
          observacoes: observacoes || 'Comparecimento sem agendamento prévio (walk-in)',
          confirmado: true,
          confirmado_em: now.toISOString(),
          confirmado_via: 'portal_cliente',
          checkin_em: now.toISOString(),
        })
        .select()
        .single();

      if (apptError) throw apptError;

      // 2. Criar check-in
      const { error: checkinError } = await supabase
        .from('mt_checkins')
        .insert({
          agendamento_id: appointment.id,
          lead_id: leadId,
          unidade_id: franchiseId,
          metodo: 'portal',
          user_agent: navigator.userAgent,
        });

      if (checkinError) {
        console.error('Erro ao criar check-in (agendamento foi criado):', checkinError);
      }

      queryClient.invalidateQueries({ queryKey: ['cliente-agendamentos', leadId] });
      return true;
    } catch (err) {
      console.error('Erro ao registrar comparecimento:', err);
      setError('Erro ao registrar comparecimento. Tente novamente.');
      return false;
    }
  }, [leadId, queryClient]);

  return {
    agendamentos,
    agendamentosFuturos,
    agendamentosPassados,
    proximoAgendamento,
    isLoading,
    error,
    refetch,
    remarcarAgendamento,
    cancelarAgendamento,
    fazerCheckin,
    registrarComparecimento,
    atualizarDados,
  };
}
