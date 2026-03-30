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

export function useMinhaPresencaMT() {
  const { user, tenant, franchise, accessLevel } = useTenantContext();
  const [employee, setEmployee] = useState<PayrollEmployee | null>(null);
  const [isDetecting, setIsDetecting] = useState(true);
  const [isMeiEmployee, setIsMeiEmployee] = useState(false);

  // Mes atual no formato YYYY-MM
  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Auto-detectar se o usuario logado e MEI (prestador de servico)
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
          .neq('tipo_contratacao', 'clt')
          .eq('is_active', true)
          .is('deleted_at', null);

        if (tenant?.id) {
          query = query.eq('tenant_id', tenant.id);
        }

        const { data, error } = await query.limit(1).maybeSingle();

        if (error) {
          console.error('[MinhaPresenca] Erro ao detectar prestador MEI:', error);
          setIsMeiEmployee(false);
        } else if (data) {
          setEmployee(data);
          setIsMeiEmployee(true);
        } else {
          setIsMeiEmployee(false);
        }
      } catch (err) {
        console.error('[MinhaPresenca] Erro:', err);
        setIsMeiEmployee(false);
      } finally {
        setIsDetecting(false);
      }
    }

    if (user?.id && (tenant?.id || accessLevel === 'platform')) {
      detectEmployee();
    } else {
      setIsDetecting(false);
    }
  }, [user?.id, tenant?.id, accessLevel]);

  // Hook do cartao de presenca para o usuario logado
  const timeCard = useTimeCardMT(
    isMeiEmployee ? user?.id : undefined,
    isMeiEmployee ? currentMonth : undefined,
  );

  // Registro de hoje
  const todayEntry = useMemo(() => {
    if (!timeCard.days.length) return null;
    const today = new Date().toISOString().split('T')[0];
    return timeCard.days.find(d => d.data === today) || null;
  }, [timeCard.days]);

  return {
    // Deteccao
    isMeiEmployee,
    isDetecting,
    employee,
    currentMonth,

    // Dados do cartao de presenca
    days: timeCard.days,
    summary: timeCard.summary,
    isLoading: isDetecting || (isMeiEmployee && timeCard.isLoading),

    // Acoes
    clockIn: timeCard.clockIn,
    clockOut: timeCard.clockOut,
    refetch: timeCard.refetch,

    // Estado de hoje
    todayEntry,
  };
}
