import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';

// =============================================================================
// TIPOS
// =============================================================================

export type AuditoriaTipo = 'acompanhamento' | 'upsell' | 'retencao';
export type AuditoriaStatus = 'pendente' | 'agendada' | 'realizada' | 'convertida' | 'nao_convertida' | 'cancelada';

export const AUDITORIA_TIPO_LABELS: Record<AuditoriaTipo, string> = {
  acompanhamento: 'Acompanhamento',
  upsell: 'Upsell',
  retencao: 'Retenção',
};

export const AUDITORIA_TIPO_COLORS: Record<AuditoriaTipo, string> = {
  acompanhamento: '#3B82F6',
  upsell: '#10B981',
  retencao: '#F59E0B',
};

export const AUDITORIA_STATUS_CONFIG: Record<AuditoriaStatus, { label: string; color: string; bg: string }> = {
  pendente: { label: 'Pendente', color: 'text-amber-700', bg: 'bg-amber-100' },
  agendada: { label: 'Agendada', color: 'text-blue-700', bg: 'bg-blue-100' },
  realizada: { label: 'Realizada', color: 'text-purple-700', bg: 'bg-purple-100' },
  convertida: { label: 'Convertida', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  nao_convertida: { label: 'Não Convertida', color: 'text-red-700', bg: 'bg-red-100' },
  cancelada: { label: 'Cancelada', color: 'text-gray-700', bg: 'bg-gray-100' },
};

export interface Auditoria {
  id: string;
  tenant_id: string;
  franchise_id?: string;
  lead_id?: string;
  appointment_id?: string;
  venda_id?: string;

  tipo: AuditoriaTipo;
  status: AuditoriaStatus;

  // Dados do lead/cliente
  cliente_nome: string;
  cliente_telefone?: string;
  servico_nome?: string;
  sessao_atual?: number;
  total_sessoes?: number;

  // Auditoria
  auditor_id?: string;
  auditor_nome?: string;
  consultora_id?: string;
  consultora_nome?: string;

  // Agendamento da auditoria
  data_agendada?: string;
  hora_agendada?: string;

  // Resultado
  resultado?: string;
  notas?: string;
  proposta_valor?: string;
  servico_interesse?: string;

  // Timestamps
  realizada_em?: string;
  convertida_em?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;

  // Joins
  lead?: { id: string; nome: string; telefone?: string; email?: string };
  franchise?: { id: string; codigo: string; nome: string };
  venda?: { id: string; numero_venda: string; status: string };
}

export interface AuditoriaStats {
  total: number;
  pendentes: number;
  agendadas: number;
  realizadas: number;
  convertidas: number;
  nao_convertidas: number;
  canceladas: number;
  taxa_conversao: number;
}

export interface AuditoriaConfig {
  id: string;
  tenant_id: string;
  franchise_id?: string;
  sessao_minima: number;
  auto_create: boolean;
  notificar_gerente: boolean;
  tipos_ativos: AuditoriaTipo[];
  created_at: string;
  updated_at: string;
}

// =============================================================================
// HOOK: useAuditoriasMT
// =============================================================================

interface UseAuditoriasMTFilters {
  status?: AuditoriaStatus | AuditoriaStatus[];
  tipo?: AuditoriaTipo;
  auditor_id?: string;
  lead_id?: string;
  startDate?: string;
  endDate?: string;
  franchise_id?: string;
}

export function useAuditoriasMT(filters?: UseAuditoriasMTFilters) {
  const [auditorias, setAuditorias] = useState<Auditoria[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { tenant, franchise, accessLevel } = useTenantContext();

  const fetchAuditorias = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('mt_auditorias' as any)
        .select(`
          *,
          lead:mt_leads(id, nome, telefone, email),
          franchise:mt_franchises(id, codigo, nome)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Filtro por tenant
      if (accessLevel === 'tenant' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        query = query.eq('franchise_id', franchise.id);
      }

      // Filtros opcionais
      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }
      if (filters?.tipo) {
        query = query.eq('tipo', filters.tipo);
      }
      if (filters?.auditor_id) {
        query = query.eq('auditor_id', filters.auditor_id);
      }
      if (filters?.lead_id) {
        query = query.eq('lead_id', filters.lead_id);
      }
      if (filters?.startDate) {
        query = query.gte('data_agendada', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('data_agendada', filters.endDate);
      }
      if (filters?.franchise_id) {
        query = query.eq('franchise_id', filters.franchise_id);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setAuditorias((data || []) as Auditoria[]);
    } catch (err) {
      console.error('Erro ao carregar auditorias:', err);
      setError(err instanceof Error ? err : new Error('Erro ao carregar auditorias'));
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, franchise?.id, accessLevel, filters?.status, filters?.tipo, filters?.auditor_id, filters?.lead_id, filters?.startDate, filters?.endDate, filters?.franchise_id]);

  const createAuditoria = useCallback(async (data: Partial<Auditoria>): Promise<Auditoria> => {
    const { data: created, error } = await supabase
      .from('mt_auditorias' as any)
      .insert({
        tenant_id: tenant?.id,
        franchise_id: data.franchise_id || franchise?.id || null,
        lead_id: data.lead_id || null,
        appointment_id: data.appointment_id || null,
        tipo: data.tipo || 'acompanhamento',
        status: data.status || 'pendente',
        cliente_nome: data.cliente_nome,
        cliente_telefone: data.cliente_telefone || null,
        servico_nome: data.servico_nome || null,
        sessao_atual: data.sessao_atual || null,
        total_sessoes: data.total_sessoes || null,
        auditor_id: data.auditor_id || null,
        auditor_nome: data.auditor_nome || null,
        consultora_id: data.consultora_id || null,
        consultora_nome: data.consultora_nome || null,
        data_agendada: data.data_agendada || null,
        hora_agendada: data.hora_agendada || null,
        proposta_valor: data.proposta_valor || null,
        servico_interesse: data.servico_interesse || null,
        notas: data.notas || null,
      })
      .select()
      .single();

    if (error) throw error;
    await fetchAuditorias();
    return created as Auditoria;
  }, [fetchAuditorias, tenant?.id, franchise?.id]);

  const updateAuditoria = useCallback(async (id: string, data: Partial<Auditoria>): Promise<Auditoria> => {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    const fields = [
      'tipo', 'status', 'cliente_nome', 'cliente_telefone',
      'servico_nome', 'sessao_atual', 'total_sessoes',
      'auditor_id', 'auditor_nome', 'consultora_id', 'consultora_nome',
      'data_agendada', 'hora_agendada',
      'resultado', 'notas', 'proposta_valor', 'servico_interesse',
      'venda_id', 'appointment_id',
    ] as const;

    for (const field of fields) {
      if ((data as any)[field] !== undefined) {
        updateData[field] = (data as any)[field];
      }
    }

    const { data: updated, error } = await supabase
      .from('mt_auditorias' as any)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    await fetchAuditorias();
    return updated as Auditoria;
  }, [fetchAuditorias]);

  const updateStatus = useCallback(async (id: string, status: AuditoriaStatus, extras?: {
    resultado?: string;
    notas?: string;
    venda_id?: string;
  }): Promise<Auditoria> => {
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'realizada') {
      updateData.realizada_em = new Date().toISOString();
    }
    if (status === 'convertida') {
      updateData.convertida_em = new Date().toISOString();
      updateData.realizada_em = updateData.realizada_em || new Date().toISOString();
    }
    if (extras?.resultado) {
      updateData.resultado = extras.resultado;
    }
    if (extras?.notas) {
      updateData.notas = extras.notas;
    }
    if (extras?.venda_id) {
      updateData.venda_id = extras.venda_id;
    }

    const { data: updated, error } = await supabase
      .from('mt_auditorias' as any)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    await fetchAuditorias();
    return updated as Auditoria;
  }, [fetchAuditorias]);

  const deleteAuditoria = useCallback(async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('mt_auditorias' as any)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    await fetchAuditorias();
  }, [fetchAuditorias]);

  useEffect(() => {
    if (tenant?.id) {
      fetchAuditorias();
    } else {
      setIsLoading(false);
      setAuditorias([]);
    }
  }, [fetchAuditorias, tenant?.id]);

  // Estatísticas
  const stats: AuditoriaStats = {
    total: auditorias.length,
    pendentes: auditorias.filter(a => a.status === 'pendente').length,
    agendadas: auditorias.filter(a => a.status === 'agendada').length,
    realizadas: auditorias.filter(a => a.status === 'realizada').length,
    convertidas: auditorias.filter(a => a.status === 'convertida').length,
    nao_convertidas: auditorias.filter(a => a.status === 'nao_convertida').length,
    canceladas: auditorias.filter(a => a.status === 'cancelada').length,
    taxa_conversao: (() => {
      const finalizadas = auditorias.filter(a => ['convertida', 'nao_convertida'].includes(a.status)).length;
      if (finalizadas === 0) return 0;
      return Math.round((auditorias.filter(a => a.status === 'convertida').length / finalizadas) * 100);
    })(),
  };

  return {
    auditorias,
    stats,
    isLoading,
    error,
    createAuditoria,
    updateAuditoria,
    updateStatus,
    deleteAuditoria,
    refetch: fetchAuditorias,
  };
}

// =============================================================================
// HOOK: useAuditoriaMT (singular)
// =============================================================================

export function useAuditoriaMT(auditoriaId: string | undefined) {
  const [auditoria, setAuditoria] = useState<Auditoria | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAuditoria = useCallback(async () => {
    if (!auditoriaId) {
      setAuditoria(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('mt_auditorias' as any)
        .select(`
          *,
          lead:mt_leads(id, nome, telefone, email),
          franchise:mt_franchises(id, codigo, nome)
        `)
        .eq('id', auditoriaId)
        .is('deleted_at', null)
        .single();

      if (fetchError) throw fetchError;
      setAuditoria(data as Auditoria);
    } catch (err) {
      console.error('Erro ao carregar auditoria:', err);
      setError(err instanceof Error ? err : new Error('Erro ao carregar auditoria'));
    } finally {
      setIsLoading(false);
    }
  }, [auditoriaId]);

  useEffect(() => {
    fetchAuditoria();
  }, [fetchAuditoria]);

  return { auditoria, isLoading, error, refetch: fetchAuditoria };
}

// =============================================================================
// HOOK: useAuditoriaConfigMT
// =============================================================================

export function useAuditoriaConfigMT() {
  const [config, setConfig] = useState<AuditoriaConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { tenant, franchise, accessLevel } = useTenantContext();

  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('mt_auditoria_config' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (tenant) {
        query = query.eq('tenant_id', tenant.id);
      }
      if (accessLevel === 'franchise' && franchise) {
        query = query.eq('franchise_id', franchise.id);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setConfig(data && data.length > 0 ? (data[0] as AuditoriaConfig) : null);
    } catch (err) {
      console.error('Erro ao carregar config auditoria:', err);
      setError(err instanceof Error ? err : new Error('Erro ao carregar config'));
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, franchise?.id, accessLevel]);

  const saveConfig = useCallback(async (data: Partial<AuditoriaConfig>): Promise<AuditoriaConfig> => {
    if (config?.id) {
      // Update
      const { data: updated, error } = await supabase
        .from('mt_auditoria_config' as any)
        .update({
          sessao_minima: data.sessao_minima,
          auto_create: data.auto_create,
          notificar_gerente: data.notificar_gerente,
          tipos_ativos: data.tipos_ativos,
          updated_at: new Date().toISOString(),
        })
        .eq('id', config.id)
        .select()
        .single();

      if (error) throw error;
      await fetchConfig();
      return updated as AuditoriaConfig;
    } else {
      // Insert
      const { data: created, error } = await supabase
        .from('mt_auditoria_config' as any)
        .insert({
          tenant_id: tenant?.id,
          franchise_id: franchise?.id || null,
          sessao_minima: data.sessao_minima ?? 3,
          auto_create: data.auto_create ?? false,
          notificar_gerente: data.notificar_gerente ?? true,
          tipos_ativos: data.tipos_ativos || ['acompanhamento', 'upsell', 'retencao'],
        })
        .select()
        .single();

      if (error) throw error;
      await fetchConfig();
      return created as AuditoriaConfig;
    }
  }, [config, fetchConfig, tenant?.id, franchise?.id]);

  useEffect(() => {
    if (tenant?.id) {
      fetchConfig();
    } else {
      setIsLoading(false);
    }
  }, [fetchConfig, tenant?.id]);

  return {
    config,
    isLoading,
    error,
    saveConfig,
    refetch: fetchConfig,
  };
}

export default useAuditoriasMT;
