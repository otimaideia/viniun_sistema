import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TotemAgendamento, TotemUnidade, CreateCheckinData } from '@/types/checkin';
import { cleanCPF, isCPFFormat } from '@/utils/cpf';
import { cleanPhone, isPhoneFormat } from '@/utils/phone';

interface UseTotemCheckinReturn {
  // Estado
  unidade: TotemUnidade | null;
  agendamentos: TotemAgendamento[];
  isLoading: boolean;
  isLoadingUnidade: boolean;
  isCheckinLoading: boolean;
  error: string | null;

  // Ações
  getUnidadeBySlug: (slug: string) => Promise<TotemUnidade | null>;
  buscarAgendamentos: (cpfOrPhone: string, franchiseId: string, inputType?: 'cpf' | 'telefone') => Promise<TotemAgendamento[]>;
  registrarCheckin: (appointmentId: string, leadId: string, franchiseId: string, checkinType: 'cpf' | 'telefone') => Promise<boolean>;
  clearError: () => void;
  clearAgendamentos: () => void;
}

export function useTotemCheckin(): UseTotemCheckinReturn {
  const [unidade, setUnidade] = useState<TotemUnidade | null>(null);
  const [agendamentos, setAgendamentos] = useState<TotemAgendamento[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUnidade, setIsLoadingUnidade] = useState(false);
  const [isCheckinLoading, setIsCheckinLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);
  const clearAgendamentos = useCallback(() => setAgendamentos([]), []);

  /**
   * Busca a unidade pelo slug (inclui tenant_id para isolamento MT)
   */
  const getUnidadeBySlug = useCallback(async (slug: string): Promise<TotemUnidade | null> => {
    setIsLoadingUnidade(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('mt_franchises')
        .select('id, tenant_id, nome_fantasia, slug, cidade, estado, endereco')  // MT: incluir tenant_id
        .eq('slug', slug.toLowerCase())
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          setError('Unidade não encontrada');
          return null;
        }
        throw fetchError;
      }

      const unidadeData: TotemUnidade = {
        id: data.id,
        tenant_id: data.tenant_id,    // MT: armazenar tenant_id
        nome_fantasia: data.nome_fantasia,
        slug: data.slug || slug,
        cidade: data.cidade,
        estado: data.estado,
        endereco: data.endereco,
      };

      setUnidade(unidadeData);
      return unidadeData;
    } catch (err) {
      console.error('Erro ao buscar unidade:', err);
      setError('Erro ao carregar dados da unidade');
      return null;
    } finally {
      setIsLoadingUnidade(false);
    }
  }, []);

  /**
   * Busca agendamentos do dia por CPF ou telefone
   * IMPORTANTE: Filtra por tenant_id para garantir isolamento MT
   */
  const buscarAgendamentos = useCallback(async (
    cpfOrPhone: string,
    franchiseId: string,
    inputType?: 'cpf' | 'telefone'
  ): Promise<TotemAgendamento[]> => {
    setIsLoading(true);
    setError(null);
    setAgendamentos([]);

    try {
      // MT: Garantir que temos o tenant_id da unidade
      if (!unidade?.tenant_id) {
        setError('Unidade não carregada corretamente');
        return [];
      }

      const tenantId = unidade.tenant_id;
      const cleaned = cpfOrPhone.replace(/\D/g, '');

      // Usar tipo informado ou detectar automaticamente
      const searchByCPF = inputType === 'cpf';
      const searchByPhone = inputType === 'telefone';

      // Se não foi informado tipo, tenta detectar
      if (!inputType) {
        const isCPF = isCPFFormat(cpfOrPhone);
        const isPhone = isPhoneFormat(cpfOrPhone);
        if (!isCPF && !isPhone) {
          setError('Digite um CPF ou telefone válido');
          return [];
        }
      }

      // MT: Buscar lead pelo CPF ou telefone FILTRANDO POR TENANT
      let leadQuery = supabase
        .from('mt_leads')
        .select('id, nome, telefone, cpf')
        .eq('tenant_id', tenantId);  // MT: FILTRO OBRIGATÓRIO

      if (searchByCPF) {
        // Buscar por CPF (com ou sem formatação)
        leadQuery = leadQuery.or(`cpf.eq.${cleaned},cpf.eq.${cleanCPF(cpfOrPhone)}`);
      } else {
        // Buscar por telefone - múltiplos formatos (+55, 55, sem prefixo)
        const withCountry = `55${cleaned}`;
        const withPlus = `+55${cleaned}`;
        leadQuery = leadQuery.or(`telefone.eq.${cleaned},telefone.eq.${withCountry},telefone.eq.${withPlus},telefone.ilike.%${cleaned}`);
      }

      const { data: leads, error: leadError } = await leadQuery;

      if (leadError) {
        throw leadError;
      }

      if (!leads || leads.length === 0) {
        setError('Nenhum cadastro encontrado com este CPF/telefone');
        return [];
      }

      const leadIds = leads.map(l => l.id);

      // MT: Buscar agendamentos FILTRANDO POR TENANT
      const today = new Date().toISOString().split('T')[0];

      const { data: agendamentosData, error: agendError } = await supabase
        .from('mt_appointments')
        .select(`
          id,
          data_agendamento,
          hora_inicio,
          hora_fim,
          servico,
          status,
          lead_id,
          franchise_id,
          tenant_id
        `)
        .eq('tenant_id', tenantId)    // MT: FILTRO OBRIGATÓRIO
        .in('lead_id', leadIds)
        .eq('franchise_id', franchiseId)
        .eq('data_agendamento', today)
        .in('status', ['agendado', 'confirmado']);

      if (agendError) {
        throw agendError;
      }

      if (!agendamentosData || agendamentosData.length === 0) {
        setError('Nenhum agendamento encontrado para hoje');
        return [];
      }

      // Verificar se já fez check-in (MT: appointment_id)
      const appointmentIds = agendamentosData.map(a => a.id);
      const { data: checkins } = await supabase
        .from('mt_checkins')
        .select('appointment_id')
        .in('appointment_id', appointmentIds);

      const checkinIds = new Set(checkins?.map(c => c.appointment_id) || []);

      // Montar resultado com dados do lead
      const result: TotemAgendamento[] = agendamentosData.map(ag => {
        const lead = leads.find(l => l.id === ag.lead_id);
        return {
          id: ag.id,
          data_agendamento: ag.data_agendamento,
          hora_inicio: ag.hora_inicio,
          hora_fim: ag.hora_fim,
          servico: ag.servico,
          status: ag.status,
          lead_id: ag.lead_id,
          lead_nome: lead?.nome || 'Cliente',
          lead_telefone: lead?.telefone || '',
          franchise_id: ag.franchise_id,
          unidade_nome: unidade?.nome_fantasia || '',
          ja_fez_checkin: checkinIds.has(ag.id),
        };
      });

      setAgendamentos(result);
      return result;
    } catch (err) {
      console.error('Erro ao buscar agendamentos:', err);
      setError('Erro ao buscar agendamentos. Tente novamente.');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [unidade]);

  /**
   * Registra o check-in
   * IMPORTANTE: Usa tenant_id da unidade para garantir isolamento MT
   */
  const registrarCheckin = useCallback(async (
    appointmentId: string,
    leadId: string,
    franchiseId: string,
    checkinType: 'cpf' | 'telefone'
  ): Promise<boolean> => {
    setIsCheckinLoading(true);
    setError(null);

    try {
      // MT: Usar tenant_id da unidade (já carregado e validado)
      if (!unidade?.tenant_id) {
        setError('Unidade não carregada corretamente');
        return false;
      }

      const tenantId = unidade.tenant_id;

      // Criar registro de check-in com campos MT
      const checkinData = {
        tenant_id: tenantId,                    // MT: usar tenant da unidade (mais seguro)
        franchise_id: franchiseId,              // MT: franchise_id
        appointment_id: appointmentId,          // MT: appointment_id
        lead_id: leadId,
        checkin_type: checkinType,              // MT: checkin_type
        checkin_time: new Date().toISOString(), // MT: checkin_time
        source: 'totem',                        // MT: source
        device_info: { user_agent: navigator.userAgent },  // MT: device_info (jsonb)
      };

      const { error: checkinError } = await supabase
        .from('mt_checkins')
        .insert(checkinData);

      if (checkinError) {
        throw checkinError;
      }

      // Atualizar status do agendamento para confirmado
      const { error: updateError } = await supabase
        .from('mt_appointments')
        .update({ status: 'confirmado' })
        .eq('id', appointmentId);

      if (updateError) {
        console.error('Erro ao atualizar status do agendamento:', updateError);
        // Não falha o check-in se não conseguir atualizar status
      }

      // Atualizar lista de agendamentos localmente
      setAgendamentos(prev =>
        prev.map(ag =>
          ag.id === appointmentId
            ? { ...ag, ja_fez_checkin: true, status: 'confirmado' }
            : ag
        )
      );

      return true;
    } catch (err) {
      console.error('Erro ao registrar check-in:', err);
      setError('Erro ao confirmar check-in. Tente novamente.');
      return false;
    } finally {
      setIsCheckinLoading(false);
    }
  }, [unidade]);  // MT: dependência do unidade para tenant_id

  return {
    unidade,
    agendamentos,
    isLoading,
    isLoadingUnidade,
    isCheckinLoading,
    error,
    getUnidadeBySlug,
    buscarAgendamentos,
    registrarCheckin,
    clearError,
    clearAgendamentos,
  };
}
