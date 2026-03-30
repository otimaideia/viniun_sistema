import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { useTimeCardMT } from './useTimeCardMT';

interface PayrollEmployee {
  id: string;
  user_id: string;
  nome: string;
  tipo_contratacao: string;
  horario_entrada: string;
  horario_saida: string;
}

export function useMeuPontoMT() {
  const { user, tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const [employee, setEmployee] = useState<PayrollEmployee | null>(null);
  const [isDetecting, setIsDetecting] = useState(true);
  const [isCltEmployee, setIsCltEmployee] = useState(false);

  // Mês atual no formato YYYY-MM
  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Auto-detectar se o usuário logado é CLT
  useEffect(() => {
    async function detectEmployee() {
      if (!user?.id) {
        setIsDetecting(false);
        return;
      }

      try {
        let query = supabase
          .from('mt_payroll_employees')
          .select('id, user_id, nome, tipo_contratacao, horario_entrada, horario_saida')
          .eq('user_id', user.id)
          .eq('tipo_contratacao', 'clt')
          .eq('is_active', true)
          .is('deleted_at', null);

        if (tenant?.id) {
          query = query.eq('tenant_id', tenant.id);
        }

        const { data, error } = await query.limit(1).maybeSingle();

        if (error) {
          console.error('[MeuPonto] Erro ao detectar funcionário CLT:', error);
          setIsCltEmployee(false);
        } else if (data) {
          setEmployee(data);
          setIsCltEmployee(true);
        } else {
          setIsCltEmployee(false);
        }
      } catch (err) {
        console.error('[MeuPonto] Erro:', err);
        setIsCltEmployee(false);
      } finally {
        setIsDetecting(false);
      }
    }

    if (isTenantLoading) {
      // TenantContext still loading — keep isDetecting true
      return;
    }

    if (user?.id && (tenant?.id || accessLevel === 'platform')) {
      setIsDetecting(true);
      detectEmployee();
    } else {
      setIsDetecting(false);
    }
  }, [user?.id, tenant?.id, accessLevel, isTenantLoading]);

  // Hook do cartão de ponto para o usuário logado
  const timeCard = useTimeCardMT(
    isCltEmployee ? user?.id : undefined,
    isCltEmployee ? currentMonth : undefined,
  );

  // Entrada de hoje (resumo do dia — primeiro checkin, último checkout)
  const todayEntry = useMemo(() => {
    if (!timeCard.days.length) return null;
    const today = new Date().toISOString().split('T')[0];
    return timeCard.days.find(d => d.data === today) || null;
  }, [timeCard.days]);

  // Registros individuais de hoje (múltiplas batidas)
  const todayRecords = useMemo(() => {
    if (!todayEntry?.records) return [];
    return todayEntry.records;
  }, [todayEntry]);

  // Determinar próxima ação (igual ao Totem)
  const nextAction = useMemo((): 'entrada' | 'saida' => {
    if (!todayRecords.length) return 'entrada';
    const lastRecord = todayRecords[todayRecords.length - 1];
    // Se último registro tem checkin mas não checkout → saída
    if (lastRecord.checkin_em && !lastRecord.checkout_em) return 'saida';
    // Se último registro está completo → nova entrada
    return 'entrada';
  }, [todayRecords]);

  // Label da próxima batida
  const nextPunchLabel = useMemo(() => {
    const punchLabels = [
      'Entrada Manhã', 'Saída Almoço',
      'Retorno Almoço', 'Saída',
      'Entrada Extra', 'Saída Extra',
    ];
    let totalPunches = 0;
    todayRecords.forEach(r => {
      if (r.checkin_em) totalPunches++;
      if (r.checkout_em) totalPunches++;
    });
    return punchLabels[totalPunches] || `Batida ${totalPunches + 1}`;
  }, [todayRecords]);

  // Verifica se o dia está completamente registrado (sem entradas abertas)
  const dayComplete = useMemo(() => {
    if (!todayRecords.length) return false;
    return todayRecords.every(r => r.checkin_em && r.checkout_em);
  }, [todayRecords]);

  return {
    // Detecção
    isCltEmployee,
    isDetecting,
    employee,
    currentMonth,

    // Dados do cartão de ponto
    days: timeCard.days,
    summary: timeCard.summary,
    isLoading: isDetecting || (isCltEmployee && timeCard.isLoading),

    // Ações
    clockIn: timeCard.clockIn,
    clockOut: timeCard.clockOut,
    refetch: timeCard.refetch,

    // Estado de hoje
    todayEntry,
    todayRecords,
    nextAction,
    nextPunchLabel,
    dayComplete,
  };
}
