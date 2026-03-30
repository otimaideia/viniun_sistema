// =============================================================================
// USE LEADS MT - Hook Multi-Tenant para Gerenciamento de Leads
// =============================================================================
//
// Este hook substitui o useLeads.ts original, utilizando a tabela mt_leads
// com isolamento completo por tenant via TenantContext e RLS.
//
// REGRAS SEGUIDAS:
// - Sempre usa TenantContext para filtrar dados
// - Sempre inclui tenant_id em mutations
// - Query key inclui tenant_id para cache correto
// - Soft delete (deleted_at) em vez de DELETE
// - RLS policies no banco garantem segurança adicional
//
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { sanitizeObjectForJSON } from '@/utils/unicodeSanitizer';
import { logLeadActivity, FIELD_LABELS } from '@/utils/leadActivityLogger';
import type {
  MTLead,
  MTLeadFilters,
  MTLeadCreate,
  MTLeadUpdate,
  LeadStatus,
  UseLeadsMTReturn,
} from '@/types/lead-mt';

// -----------------------------------------------------------------------------
// Constantes
// -----------------------------------------------------------------------------

const QUERY_KEY = 'mt-leads';
const DEFAULT_PAGE_SIZE = 50;

// Campos válidos na tabela mt_leads (para filtrar campos inválidos do legacy)
// Colunas validadas contra information_schema em 2026-02-15
const MT_LEADS_VALID_COLUMNS = new Set([
  'id', 'tenant_id', 'franchise_id', 'codigo', 'nome', 'sobrenome', 'nome_social',
  'email', 'telefone', 'telefone_secundario', 'whatsapp', 'whatsapp_validado',
  'cpf', 'rg', 'data_nascimento', 'genero', 'estado_civil',
  'cep', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado', 'pais',
  'latitude', 'longitude', 'profissao', 'empresa', 'cargo', 'renda_mensal',
  'servico_interesse', 'servico_id', 'valor_estimado', 'urgencia',
  'canal_entrada', 'origem', 'campanha', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'gclid', 'fbclid', 'referrer_url', 'landing_page',
  'indicado_por_id', 'indicado_por_nome', 'codigo_indicacao',
  'influenciador_id', 'influenciador_codigo', 'parceria_id', 'parceria_codigo',
  'score', 'score_automatico', 'score_manual', 'temperatura', 'qualificado', 'qualificado_por', 'qualificado_em',
  'atribuido_para', 'atribuido_em', 'atribuido_por',
  'status', 'etapa_funil', 'funil_id', 'funnel_stage_id',
  'data_agendamento', 'confirmado', 'compareceu', 'motivo_nao_comparecimento',
  'convertido', 'data_conversao', 'valor_conversao', 'motivo_perda', 'concorrente',
  'ultimo_contato', 'proximo_contato', 'total_contatos', 'total_mensagens', 'total_emails', 'total_ligacoes',
  'whatsapp_chat_id', 'whatsapp_session_id', 'ultima_mensagem_whatsapp',
  'formulario_id', 'submissao_id', 'observacoes', 'tags', 'dados_extras',
  'status_geral', 'duplicado_de', 'mesclado_em',
  'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at',
  'responsavel_id', 'responsible_user_id',
  'meta_participant_id', 'meta_participant_username', 'meta_conversation_id',
  'foto_url', 'instagram_id',
]);

// Campos que NÃO devem ir para dados_extras (são relações, campos computados, etc.)
const SKIP_FOR_DADOS_EXTRAS = new Set([
  'tenant', 'franchise', 'responsavel', 'activities',
  'unidade', 'servico', 'referrer', 'responsible_id',
]);

/**
 * Filtra objeto para conter apenas campos válidos da tabela mt_leads.
 * Campos que não existem na tabela são redirecionados para dados_extras (JSONB),
 * preservando dados como redes sociais, saúde, preferências, etc.
 */
function filterValidColumns<T extends Record<string, any>>(data: T): Partial<T> {
  const filtered: Partial<T> = {};
  const extras: Record<string, unknown> = {};

  // Preservar dados_extras existentes
  if (data.dados_extras && typeof data.dados_extras === 'object') {
    Object.assign(extras, data.dados_extras);
  }

  for (const key of Object.keys(data)) {
    if (data[key] === undefined) continue;

    if (MT_LEADS_VALID_COLUMNS.has(key)) {
      // Campo válido do banco → vai direto
      (filtered as any)[key] = data[key];
    } else if (!SKIP_FOR_DADOS_EXTRAS.has(key)) {
      // Campo extra → redireciona para dados_extras
      extras[key] = data[key];
    }
  }

  // Só inclui dados_extras se tiver algo
  if (Object.keys(extras).length > 0) {
    (filtered as any).dados_extras = extras;
  }

  return filtered;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Mapeia códigos de erro PostgreSQL para mensagens amigáveis
 */
function getErrorMessage(error: any): string {
  if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
    return 'Erro de conexão. Verifique sua internet e tente novamente.';
  }

  const pgCode = error?.code;
  if (pgCode) {
    switch (pgCode) {
      case '23505':
        return 'Este lead já existe. Verifique se não há duplicidade.';
      case '23503':
        return 'Este lead está vinculado a outros dados.';
      case '23502':
        const column = error?.details?.match(/column "(\w+)"/)?.[1];
        return column ? `O campo "${column}" é obrigatório.` : 'Preencha todos os campos obrigatórios.';
      case '42501':
        return 'Você não tem permissão para realizar esta ação.';
      case 'PGRST301':
        return 'Sua sessão expirou. Faça login novamente.';
      default:
        break;
    }
  }

  if (error?.message) {
    if (error.message.includes('permission denied') || error.message.includes('RLS')) {
      return 'Você não tem permissão para esta ação.';
    }
    return error.message;
  }

  return 'Erro desconhecido. Tente novamente.';
}

/**
 * Valida dados obrigatórios do lead
 */
function validateLeadData(data: Partial<MTLeadCreate>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.nome?.trim()) {
    errors.push('Nome é obrigatório');
  }

  if (!data.telefone?.trim() && !data.whatsapp?.trim() && !data.email?.trim()) {
    errors.push('Informe pelo menos um contato (telefone, WhatsApp ou e-mail)');
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('E-mail inválido');
  }

  if (data.cpf) {
    const cleanCpf = data.cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      errors.push('CPF inválido');
    }
  }

  return { valid: errors.length === 0, errors };
}

// -----------------------------------------------------------------------------
// Cache Helpers
// -----------------------------------------------------------------------------

/**
 * Atualiza um lead específico dentro da cache da lista, evitando refetch completo.
 * Procura em todas as queries que começam com o QUERY_KEY e atualiza o item inline.
 */
function updateLeadInCache(queryClient: ReturnType<typeof useQueryClient>, queryKey: string, updatedLead: MTLead) {
  queryClient.setQueriesData<MTLead[]>(
    { queryKey: [queryKey], exact: false },
    (oldData) => {
      if (!oldData || !Array.isArray(oldData)) return oldData;
      return oldData.map((lead) =>
        lead.id === updatedLead.id ? { ...lead, ...updatedLead } : lead
      );
    }
  );
}

// -----------------------------------------------------------------------------
// Hook Principal
// -----------------------------------------------------------------------------

export function useLeadsMT(filters?: MTLeadFilters): UseLeadsMTReturn {
  const { tenant, franchise, accessLevel, user, isLoading: isTenantLoading } = useTenantContext();
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query Principal - Listar Leads
  // ---------------------------------------------------------------------------

  const query = useQuery({
    queryKey: [
      QUERY_KEY,
      tenant?.id,
      franchise?.id,
      filters?.status,
      filters?.search,
      filters?.atribuido_para,
      filters?.temperatura,
      filters?.created_at_inicio,
      filters?.created_at_fim,
      filters?.page,
    ],
    queryFn: async (): Promise<MTLead[]> => {
      // Validar contexto
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado. Aguarde o carregamento ou faça login novamente.');
      }

      // Construir query base - campos específicos para evitar over-fetching
      // Colunas validadas contra information_schema em 2026-02-15
      let q = supabase
        .from('mt_leads')
        .select(`
          id, tenant_id, franchise_id, codigo,
          nome, telefone, whatsapp, email, cpf,
          status, status_geral, convertido,
          origem, campanha,
          servico_interesse, valor_estimado, valor_conversao,
          score, score_automatico, score_manual, temperatura,
          atribuido_para, atribuido_em,
          indicado_por_id, indicado_por_nome, codigo_indicacao,
          observacoes, tags,
          data_nascimento, genero, profissao,
          cidade, estado, bairro, cep, endereco, numero, complemento,
          ultimo_contato, proximo_contato, data_agendamento, data_conversao,
          total_contatos, total_ligacoes, total_emails, total_mensagens,
          motivo_perda, qualificado, qualificado_por, qualificado_em,
          whatsapp_chat_id, whatsapp_session_id,
          created_at, updated_at, deleted_at,
          gclid, fbclid, landing_page, referrer_url,
          utm_source, utm_medium, utm_campaign, utm_content, utm_term,
          foto_url, dados_extras,
          tenant:mt_tenants (
            id,
            slug,
            nome_fantasia
          ),
          franchise:mt_franchises (
            id,
            codigo,
            nome
          ),
          responsavel:mt_users!mt_leads_atribuido_para_fkey (
            id,
            nome,
            email,
            avatar_url
          )
        `)
        .eq('status_geral', 'ativo') // Apenas leads ativos (não deletados)
        .is('deleted_at', null) // Garantir que não inclui soft deleted
        .order('created_at', { ascending: false });

      // ---------------------------------------------------------------------------
      // Filtros por nível de acesso (RLS já filtra, mas filtro explícito melhora performance)
      // ---------------------------------------------------------------------------

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise && tenant) {
        q = q.eq('tenant_id', tenant.id);
        q = q.eq('franchise_id', franchise.id);
      } else if (accessLevel === 'user' && tenant) {
        // Usuário comum: ver apenas leads atribuídos a ele
        q = q.eq('tenant_id', tenant.id);
        if (franchise) q = q.eq('franchise_id', franchise.id);
        if (user?.id) q = q.eq('atribuido_para', user.id);
      }

      // Filtro adicional de franchise (se especificado nos filtros)
      if (filters?.franchise_id) {
        q = q.eq('franchise_id', filters.franchise_id);
      }

      // ---------------------------------------------------------------------------
      // Filtros opcionais
      // ---------------------------------------------------------------------------

      // Status
      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          q = q.in('status', filters.status);
        } else {
          q = q.eq('status', filters.status);
        }
      }

      // Temperatura
      if (filters?.temperatura) {
        if (Array.isArray(filters.temperatura)) {
          q = q.in('temperatura', filters.temperatura);
        } else {
          q = q.eq('temperatura', filters.temperatura);
        }
      }

      // Atribuição
      if (filters?.atribuido_para) {
        q = q.eq('atribuido_para', filters.atribuido_para);
      } else if (filters?.sem_atribuicao) {
        q = q.is('atribuido_para', null);
      }

      // Qualificação e conversão
      if (filters?.qualificado !== undefined) {
        q = q.eq('qualificado', filters.qualificado);
      }
      if (filters?.convertido !== undefined) {
        q = q.eq('convertido', filters.convertido);
      }

      // Origem
      if (filters?.origem) {
        if (Array.isArray(filters.origem)) {
          q = q.in('origem', filters.origem);
        } else {
          q = q.eq('origem', filters.origem);
        }
      }

      // Campanha
      if (filters?.campanha) {
        if (Array.isArray(filters.campanha)) {
          q = q.in('campanha', filters.campanha);
        } else {
          q = q.eq('campanha', filters.campanha);
        }
      }

      // Filtros de data - created_at
      if (filters?.created_at_inicio) {
        q = q.gte('created_at', filters.created_at_inicio);
      }
      if (filters?.created_at_fim) {
        q = q.lte('created_at', filters.created_at_fim);
      }

      // Filtros de data - agendamento
      if (filters?.data_agendamento_inicio) {
        q = q.gte('data_agendamento', filters.data_agendamento_inicio);
      }
      if (filters?.data_agendamento_fim) {
        q = q.lte('data_agendamento', filters.data_agendamento_fim);
      }

      // Busca textual
      if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        q = q.or(`nome.ilike.${searchTerm},telefone.ilike.${searchTerm},email.ilike.${searchTerm},whatsapp.ilike.${searchTerm}`);
      }

      // Paginação - só aplica range se page for explicitamente fornecido
      // Sem page explícito: carrega todos (até limite do Supabase = 1000)
      if (filters?.page !== undefined) {
        const page = filters.page;
        const pageSize = filters?.pageSize || DEFAULT_PAGE_SIZE;
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        q = q.range(from, to);
      } else if (filters?.pageSize) {
        q = q.limit(filters.pageSize);
      }

      // Executar query
      const { data, error } = await q;

      if (error) {
        console.error('Erro ao buscar leads MT:', error);
        throw error;
      }

      // Sanitizar Unicode (previne surrogates inválidos vindos do WhatsApp)
      return (data || []).map(item => sanitizeObjectForJSON(item)) as MTLead[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60, // 1 minuto
    refetchOnWindowFocus: false,
  });

  // ---------------------------------------------------------------------------
  // Mutation: Criar Lead
  // ---------------------------------------------------------------------------

  const createLead = useMutation({
    mutationFn: async (newLead: Partial<MTLeadCreate>): Promise<MTLead> => {
      // Validar contexto
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido. Não é possível criar lead.');
      }

      // Validar dados
      const validation = validateLeadData(newLead);
      if (!validation.valid) {
        throw new Error(validation.errors.join('. '));
      }

      // Preparar dados com tenant_id (filtrar campos inválidos do legacy)
      const filteredLead = filterValidColumns(newLead);
      const leadData = {
        ...filteredLead,
        tenant_id: newLead.tenant_id || tenant!.id,
        franchise_id: newLead.franchise_id || franchise?.id || null,
        status: newLead.status || 'novo',
        status_geral: 'ativo',
        temperatura: newLead.temperatura || 'frio',
        score: 0,
        score_automatico: 0,
        score_manual: 0,
        qualificado: false,
        convertido: false,
        total_contatos: 0,
        total_mensagens: 0,
        total_emails: 0,
        total_ligacoes: 0,
      };

      const { data, error } = await supabase
        .from('mt_leads')
        .insert(leadData)
        .select(`
          *,
          tenant:mt_tenants (id, slug, nome_fantasia),
          franchise:mt_franchises (id, codigo, nome)
        `)
        .single();

      if (error) {
        console.error('Erro ao criar lead MT:', error);
        throw error;
      }

      return data as MTLead;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Lead "${data.nome}" criado com sucesso!`);

      // Log atividade: Lead criado
      if (data.tenant_id) {
        logLeadActivity({
          tenantId: data.tenant_id,
          leadId: data.id,
          tipo: 'sistema',
          titulo: 'Lead Criado',
          descricao: `Lead "${data.nome}" foi adicionado ao sistema via ${data.canal_entrada || data.origem || 'cadastro manual'}`,
          dados: {
            canal_entrada: data.canal_entrada,
            origem: data.origem,
            campanha: data.campanha,
            servico_interesse: data.servico_interesse,
            temperatura: data.temperatura,
          },
          userId: authUser?.id,
          userNome: authUser?.email || 'Sistema',
        });
      }
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      toast.error(message);
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar Lead
  // ---------------------------------------------------------------------------

  const updateLead = useMutation({
    mutationFn: async ({ id, ...updates }: MTLeadUpdate): Promise<MTLead> => {
      if (!id) {
        throw new Error('ID do lead é obrigatório para atualização.');
      }

      // Filtrar campos inválidos do legacy antes de atualizar
      const filteredUpdates = filterValidColumns(updates);

      const { data, error } = await supabase
        .from('mt_leads')
        .update({
          ...filteredUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
          *,
          tenant:mt_tenants (id, slug, nome_fantasia),
          franchise:mt_franchises (id, codigo, nome)
        `)
        .single();

      if (error) {
        console.error('Erro ao atualizar lead MT:', error);
        throw error;
      }

      return data as MTLead;
    },
    onMutate: async (variables) => {
      // Capturar dados anteriores do cache para detectar mudanças
      const oldLead = queryClient.getQueryData<MTLead>([QUERY_KEY, 'detail', variables.id]);
      return { oldLead };
    },
    onSuccess: (data, variables, context) => {
      // Atualizar cache local do lead na lista (evita refetch de todos os leads)
      updateLeadInCache(queryClient, QUERY_KEY, data);
      // Atualizar cache do detalhe
      queryClient.setQueryData([QUERY_KEY, 'detail', data.id], data);
      toast.success(`Lead "${data.nome}" atualizado!`);

      // Log atividade: Lead atualizado (detectar campos alterados)
      if (data.tenant_id) {
        const oldLead = context?.oldLead;
        const { id: _id, ...updates } = variables;
        const changedFields: string[] = [];
        const changes: Record<string, { de: unknown; para: unknown }> = {};

        // Comparar campos alterados
        for (const key of Object.keys(updates)) {
          if (key === 'updated_at' || key === 'dados_extras') continue;
          const oldVal = oldLead ? (oldLead as any)[key] : undefined;
          const newVal = (updates as any)[key];
          // Comparar como string para lidar com tipos mistos
          if (oldVal !== undefined && String(oldVal) !== String(newVal)) {
            const label = FIELD_LABELS[key] || key;
            changedFields.push(label);
            changes[key] = { de: oldVal, para: newVal };
          } else if (oldVal === undefined && newVal !== undefined && newVal !== null && newVal !== '') {
            const label = FIELD_LABELS[key] || key;
            changedFields.push(label);
            changes[key] = { de: null, para: newVal };
          }
        }

        if (changedFields.length > 0) {
          logLeadActivity({
            tenantId: data.tenant_id,
            leadId: data.id,
            tipo: 'sistema',
            titulo: 'Lead Atualizado',
            descricao: `Campos alterados: ${changedFields.join(', ')}`,
            dados: { campos_alterados: changedFields, alteracoes: changes },
            userId: authUser?.id,
            userNome: authUser?.email || 'Sistema',
          });
        }
      }
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      toast.error(message);
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Deletar Lead (Soft Delete)
  // ---------------------------------------------------------------------------

  const deleteLead = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!id) {
        throw new Error('ID do lead é obrigatório para exclusão.');
      }

      // Soft delete: marca como inativo/arquivado e seta deleted_at
      const { error } = await supabase
        .from('mt_leads')
        .update({
          status_geral: 'arquivado',
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar lead MT:', error);
        throw error;
      }
    },
    onMutate: async (id) => {
      const oldLead = queryClient.getQueryData<MTLead>([QUERY_KEY, 'detail', id]);
      return { oldLead };
    },
    onSuccess: (_data, id, context) => {
      // Remover lead da cache da lista localmente
      queryClient.setQueriesData<MTLead[]>(
        { queryKey: [QUERY_KEY], exact: false },
        (oldData) => {
          if (!oldData || !Array.isArray(oldData)) return oldData;
          return oldData.filter((lead) => lead.id !== id);
        }
      );
      // Limpar cache do detalhe
      queryClient.removeQueries({ queryKey: [QUERY_KEY, 'detail', id] });
      // Invalidar métricas (contagens mudam)
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'metrics'] });
      toast.success('Lead removido com sucesso!');

      // Log atividade: Lead arquivado
      const oldLead = context?.oldLead;
      if (oldLead?.tenant_id) {
        logLeadActivity({
          tenantId: oldLead.tenant_id,
          leadId: id,
          tipo: 'sistema',
          titulo: 'Lead Arquivado',
          descricao: `Lead "${oldLead.nome}" foi arquivado/removido do sistema`,
          dados: { nome: oldLead.nome, status_anterior: oldLead.status },
          userId: authUser?.id,
          userNome: authUser?.email || 'Sistema',
        });
      }
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      toast.error(message);
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Atualizar Status
  // ---------------------------------------------------------------------------

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LeadStatus }): Promise<MTLead> => {
      if (!id || !status) {
        throw new Error('ID e status são obrigatórios.');
      }

      const { data, error } = await supabase
        .from('mt_leads')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
          *,
          tenant:mt_tenants (id, slug, nome_fantasia),
          franchise:mt_franchises (id, codigo, nome)
        `)
        .single();

      if (error) {
        console.error('Erro ao atualizar status MT:', error);
        throw error;
      }

      return data as MTLead;
    },
    onMutate: async (variables) => {
      const oldLead = queryClient.getQueryData<MTLead>([QUERY_KEY, 'detail', variables.id]);
      return { oldStatus: oldLead?.status };
    },
    onSuccess: (data, variables, context) => {
      // Atualizar cache local (evita refetch de todos os leads)
      updateLeadInCache(queryClient, QUERY_KEY, data);
      queryClient.setQueryData([QUERY_KEY, 'detail', data.id], data);
      // Invalidar apenas métricas (contagens mudam com status)
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'metrics'] });
      toast.success(`Status atualizado para "${data.status}"!`);

      // Log atividade: Mudança de status
      if (data.tenant_id) {
        const statusAnterior = context?.oldStatus || 'desconhecido';
        logLeadActivity({
          tenantId: data.tenant_id,
          leadId: data.id,
          tipo: 'status_change',
          titulo: 'Mudança de Status',
          descricao: `Status alterado de "${statusAnterior}" para "${data.status}"`,
          statusAnterior,
          statusNovo: data.status,
          userId: authUser?.id,
          userNome: authUser?.email || 'Sistema',
        });
      }
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      toast.error(message);
    },
  });

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    leads: query.data ?? [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error as Error | null,
    refetch: async () => {
      await query.refetch();
    },
    createLead: {
      mutate: createLead.mutate,
      mutateAsync: createLead.mutateAsync,
      isPending: createLead.isPending,
    },
    updateLead: {
      mutate: updateLead.mutate,
      mutateAsync: updateLead.mutateAsync,
      isPending: updateLead.isPending,
    },
    deleteLead: {
      mutate: deleteLead.mutate,
      mutateAsync: deleteLead.mutateAsync,
      isPending: deleteLead.isPending,
    },
    updateStatus: {
      mutate: updateStatus.mutate,
      mutateAsync: updateStatus.mutateAsync,
      isPending: updateStatus.isPending,
    },
  };
}

// -----------------------------------------------------------------------------
// Hook: Buscar Lead por ID
// -----------------------------------------------------------------------------

export function useLeadMT(id: string | undefined) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: async (): Promise<MTLead | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('mt_leads')
        .select(`
          *,
          tenant:mt_tenants (id, slug, nome_fantasia),
          franchise:mt_franchises (id, codigo, nome),
          responsavel:mt_users!mt_leads_atribuido_para_fkey (id, nome, email, avatar_url)
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw error;
      }

      return data as MTLead;
    },
    enabled: !!id && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });
}

// -----------------------------------------------------------------------------
// Hook: Métricas de Leads
// -----------------------------------------------------------------------------

export function useLeadMetricsMT() {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  return useQuery({
    queryKey: [QUERY_KEY, 'metrics', tenant?.id, franchise?.id],
    queryFn: async () => {
      let q = supabase
        .from('mt_leads')
        .select('status, convertido, valor_estimado, valor_conversao', { count: 'exact' })
        .eq('status_geral', 'ativo')
        .is('deleted_at', null);

      // Filtros por nível de acesso
      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise && tenant) {
        q = q.eq('tenant_id', tenant.id);
        q = q.eq('franchise_id', franchise.id);
      }

      const { data, count, error } = await q;

      if (error) throw error;

      // Calcular métricas
      const leads = data || [];
      const total = count || 0;
      const novos = leads.filter(l => l.status === 'novo').length;
      const em_contato = leads.filter(l => l.status === 'contato').length;
      const agendados = leads.filter(l => ['agendado', 'confirmado'].includes(l.status || '')).length;
      const convertidos = leads.filter(l => l.convertido).length;
      const perdidos = leads.filter(l => l.status === 'perdido').length;

      const taxa_conversao = total > 0 ? (convertidos / total) * 100 : 0;

      const valor_pipeline = leads.reduce((acc, l) => {
        return acc + (l.valor_estimado || 0);
      }, 0);

      return {
        total,
        novos,
        em_contato,
        agendados,
        convertidos,
        perdidos,
        taxa_conversao: Math.round(taxa_conversao * 100) / 100,
        valor_pipeline,
      };
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

// -----------------------------------------------------------------------------
// Hook: Atribuir Lead
// -----------------------------------------------------------------------------

export function useAssignLeadMT() {
  const queryClient = useQueryClient();
  const { tenant } = useTenantContext();
  const { user: authUser } = useAuth();

  return useMutation({
    mutationFn: async ({
      leadId,
      userId,
      userName,
    }: {
      leadId: string;
      userId: string | null;
      userName?: string;
    }): Promise<MTLead> => {
      const { data, error } = await supabase
        .from('mt_leads')
        .update({
          atribuido_para: userId,
          atribuido_em: userId ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId)
        .select()
        .single();

      if (error) throw error;
      return data as MTLead;
    },
    onSuccess: async (data, variables) => {
      updateLeadInCache(queryClient, QUERY_KEY, data);
      queryClient.setQueryData([QUERY_KEY, 'detail', data.id], (old: any) => old ? { ...old, ...data } : data);

      // Sync WhatsApp conversation assignment
      if (variables.userId && tenant?.id) {
        await supabase
          .from('mt_whatsapp_conversations')
          .update({
            assigned_to: variables.userId,
            assigned_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('lead_id', variables.leadId)
          .eq('tenant_id', tenant.id);
      }

      toast.success('Lead atribuído com sucesso!');

      // Log atividade: Atribuição
      if (data.tenant_id) {
        const desc = variables.userId
          ? `Lead atribuído para ${variables.userName || variables.userId}`
          : 'Atribuição de responsável removida';
        logLeadActivity({
          tenantId: data.tenant_id,
          leadId: data.id,
          tipo: 'atribuicao',
          titulo: variables.userId ? 'Lead Atribuído' : 'Atribuição Removida',
          descricao: desc,
          dados: { responsavel_id: variables.userId, responsavel_nome: variables.userName },
          userId: authUser?.id,
          userNome: authUser?.email || 'Sistema',
        });
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

// -----------------------------------------------------------------------------
// Hook: Qualificar Lead
// -----------------------------------------------------------------------------

export function useQualifyLeadMT() {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();

  return useMutation({
    mutationFn: async ({
      leadId,
      qualificado,
      scoreManual,
    }: {
      leadId: string;
      qualificado: boolean;
      scoreManual?: number;
    }): Promise<MTLead> => {
      const updateData: any = {
        qualificado,
        qualificado_em: qualificado ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      if (scoreManual !== undefined) {
        updateData.score_manual = scoreManual;
      }

      const { data, error } = await supabase
        .from('mt_leads')
        .update(updateData)
        .eq('id', leadId)
        .select()
        .single();

      if (error) throw error;
      return data as MTLead;
    },
    onSuccess: (data) => {
      updateLeadInCache(queryClient, QUERY_KEY, data);
      queryClient.setQueryData([QUERY_KEY, 'detail', data.id], (old: any) => old ? { ...old, ...data } : data);
      toast.success(data.qualificado ? 'Lead qualificado!' : 'Qualificação removida');

      // Log atividade: Qualificação
      if (data.tenant_id) {
        logLeadActivity({
          tenantId: data.tenant_id,
          leadId: data.id,
          tipo: 'sistema',
          titulo: data.qualificado ? 'Lead Qualificado' : 'Qualificação Removida',
          descricao: data.qualificado
            ? `Lead "${data.nome}" foi qualificado${data.score_manual ? ` com score manual ${data.score_manual}` : ''}`
            : `Qualificação do lead "${data.nome}" foi removida`,
          dados: { qualificado: data.qualificado, score_manual: data.score_manual },
          userId: authUser?.id,
          userNome: authUser?.email || 'Sistema',
        });
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

// -----------------------------------------------------------------------------
// Hook: Converter Lead
// -----------------------------------------------------------------------------

export function useConvertLeadMT() {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();

  return useMutation({
    mutationFn: async ({
      leadId,
      valorConversao,
    }: {
      leadId: string;
      valorConversao?: number;
    }): Promise<MTLead> => {
      const { data, error } = await supabase
        .from('mt_leads')
        .update({
          status: 'convertido',
          convertido: true,
          data_conversao: new Date().toISOString(),
          valor_conversao: valorConversao,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId)
        .select()
        .single();

      if (error) throw error;
      return data as MTLead;
    },
    onSuccess: (data) => {
      updateLeadInCache(queryClient, QUERY_KEY, data);
      queryClient.setQueryData([QUERY_KEY, 'detail', data.id], (old: any) => old ? { ...old, ...data } : data);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'metrics'] });
      toast.success('Lead convertido com sucesso!');

      // Log atividade: Conversão
      if (data.tenant_id) {
        const valorStr = data.valor_conversao
          ? ` com valor R$ ${Number(data.valor_conversao).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          : '';
        logLeadActivity({
          tenantId: data.tenant_id,
          leadId: data.id,
          tipo: 'conversao',
          titulo: 'Lead Convertido',
          descricao: `Lead "${data.nome}" foi convertido em cliente${valorStr}`,
          dados: { valor_conversao: data.valor_conversao, data_conversao: data.data_conversao },
          statusAnterior: 'em_negociacao',
          statusNovo: 'convertido',
          userId: authUser?.id,
          userNome: authUser?.email || 'Sistema',
        });
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

// -----------------------------------------------------------------------------
// Hook: Marcar como Perdido
// -----------------------------------------------------------------------------

export function useLoseLeadMT() {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();

  return useMutation({
    mutationFn: async ({
      leadId,
      motivoPerda,
      concorrente,
    }: {
      leadId: string;
      motivoPerda?: string;
      concorrente?: string;
    }): Promise<MTLead> => {
      const { data, error } = await supabase
        .from('mt_leads')
        .update({
          status: 'perdido',
          motivo_perda: motivoPerda,
          concorrente,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId)
        .select()
        .single();

      if (error) throw error;
      return data as MTLead;
    },
    onSuccess: (data, variables) => {
      updateLeadInCache(queryClient, QUERY_KEY, data);
      queryClient.setQueryData([QUERY_KEY, 'detail', data.id], (old: any) => old ? { ...old, ...data } : data);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'metrics'] });
      toast.success('Lead marcado como perdido');

      // Log atividade: Perda
      if (data.tenant_id) {
        const motivoStr = variables.motivoPerda ? `. Motivo: ${variables.motivoPerda}` : '';
        const concorrenteStr = variables.concorrente ? `. Concorrente: ${variables.concorrente}` : '';
        logLeadActivity({
          tenantId: data.tenant_id,
          leadId: data.id,
          tipo: 'perda',
          titulo: 'Lead Perdido',
          descricao: `Lead "${data.nome}" foi marcado como perdido${motivoStr}${concorrenteStr}`,
          dados: { motivo_perda: variables.motivoPerda, concorrente: variables.concorrente },
          statusNovo: 'perdido',
          userId: authUser?.id,
          userNome: authUser?.email || 'Sistema',
        });
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export default useLeadsMT;
