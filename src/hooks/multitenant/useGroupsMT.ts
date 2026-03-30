// Hook Multi-Tenant para Gerenciamento de Grupos WhatsApp via WAHA API
// Este hook NAO usa tabela direta - chama a API WAHA para listar/gerenciar grupos

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';

// =============================================================================
// TYPES
// =============================================================================

export interface WAHAGroup {
  id: string; // groupId (e.g. "123456789@g.us")
  subject: string; // Nome do grupo
  description: string | null;
  owner: string | null;
  creation: number; // timestamp
  participants: WAHAGroupParticipant[];
  size: number;
  profilePicture?: string | null;
}

export interface WAHAGroupParticipant {
  id: string; // participantId (e.g. "5511999999999@c.us" ou "123456@lid")
  phoneNumber?: string; // telefone real (e.g. "5511999999999@s.whatsapp.net") - presente em NOWEB/LID
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

export interface CreateGroupInput {
  name: string;
  participants: string[]; // Array de phone numbers no formato "5511999999999@c.us"
}

export interface WAHAConfig {
  api_url: string;
  api_key: string;
}

// =============================================================================
// HELPER: Buscar configuracao WAHA
// =============================================================================

async function getWahaConfig(tenantId?: string): Promise<WAHAConfig | null> {
  let q = supabase
    .from('mt_waha_config')
    .select('api_url, api_key');

  if (tenantId) {
    q = q.eq('tenant_id', tenantId);
  }

  const { data, error } = await q.limit(1).single();

  if (error) {
    console.error('[WAHA] Erro ao buscar config:', error);
    return null;
  }

  if (!data?.api_url || !data?.api_key) {
    console.warn('[WAHA] Configuracao incompleta em mt_waha_config');
    return null;
  }

  return {
    api_url: data.api_url,
    api_key: data.api_key,
  };
}

/**
 * Busca config WAHA da sessao especifica (waha_url e waha_api_key)
 * Fallback para mt_waha_config global do tenant
 */
async function getWahaConfigForSession(
  sessionId: string,
  tenantId?: string
): Promise<WAHAConfig | null> {
  // 1. Tentar pegar da sessao
  const { data: session } = await supabase
    .from('mt_whatsapp_sessions')
    .select('waha_url, waha_api_key')
    .eq('id', sessionId)
    .single();

  if (session?.waha_url && session?.waha_api_key) {
    return {
      api_url: session.waha_url,
      api_key: session.waha_api_key,
    };
  }

  // 2. Fallback para config global do tenant
  return getWahaConfig(tenantId);
}

/**
 * Faz uma requisicao para a WAHA API
 */
async function wahaFetch<T>(
  config: WAHAConfig,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${config.api_url}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': config.api_key,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Sem detalhes');
    throw new Error(`WAHA API erro ${response.status}: ${errorText}`);
  }

  // Alguns endpoints retornam 200 sem body
  const text = await response.text();
  if (!text) return {} as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

// =============================================================================
// HOOK: useGroupsMT
// =============================================================================

export function useGroupsMT(sessionName?: string, sessionId?: string) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // Resolver config WAHA baseado na sessao ou tenant
  const resolveConfig = useCallback(async (): Promise<WAHAConfig> => {
    let config: WAHAConfig | null = null;

    if (sessionId) {
      config = await getWahaConfigForSession(sessionId, tenant?.id);
    } else {
      config = await getWahaConfig(tenant?.id);
    }

    if (!config) {
      throw new Error('Configuracao WAHA nao encontrada. Verifique as configuracoes do WhatsApp.');
    }

    return config;
  }, [sessionId, tenant?.id]);

  // Query: Listar grupos da sessao
  const query = useQuery({
    queryKey: ['mt-waha-groups', tenant?.id, sessionName],
    queryFn: async (): Promise<WAHAGroup[]> => {
      if (!sessionName) return [];

      const config = await resolveConfig();
      const response = await wahaFetch<Record<string, WAHAGroup> | WAHAGroup[]>(
        config,
        `/api/${sessionName}/groups`
      );

      // WAHA pode retornar objeto {id: group} ou array [group]
      let groups: WAHAGroup[];
      if (Array.isArray(response)) {
        groups = response;
      } else if (response && typeof response === 'object') {
        groups = Object.values(response);
      } else {
        groups = [];
      }

      // Normalizar participantes de cada grupo
      for (const group of groups) {
        if (group.participants && Array.isArray(group.participants)) {
          group.participants = group.participants
            .map(normalizeParticipant)
            .filter((p: WAHAGroupParticipant) => p.id);
        }
      }

      return groups;
    },
    enabled: !!sessionName && !isTenantLoading && (!!tenant || accessLevel === 'platform'),
    staleTime: 2 * 60 * 1000, // 2 minutos
  });

  // Mutation: Criar grupo
  const createGroup = useMutation({
    mutationFn: async (input: CreateGroupInput): Promise<WAHAGroup> => {
      if (!sessionName) throw new Error('Session name nao definido');

      const config = await resolveConfig();
      const result = await wahaFetch<WAHAGroup>(
        config,
        `/api/${sessionName}/groups`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: input.name,
            participants: input.participants,
          }),
        }
      );

      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mt-waha-groups'] });
      toast.success(`Grupo "${data.subject || 'Novo grupo'}" criado com sucesso`);
    },
    onError: (error: Error) => {
      console.error('Erro ao criar grupo:', error);
      toast.error(`Erro ao criar grupo: ${error.message}`);
    },
  });

  // Mutation: Obter informacoes detalhadas de um grupo
  const getGroupInfo = useMutation({
    mutationFn: async (groupId: string): Promise<WAHAGroup> => {
      if (!sessionName) throw new Error('Session name nao definido');

      const config = await resolveConfig();
      const result = await wahaFetch<WAHAGroup>(
        config,
        `/api/${sessionName}/groups/${groupId}`
      );

      return result;
    },
    onError: (error: Error) => {
      console.error('Erro ao buscar info do grupo:', error);
      toast.error(`Erro ao buscar info do grupo: ${error.message}`);
    },
  });

  // Mutation: Adicionar participantes ao grupo
  const addParticipants = useMutation({
    mutationFn: async ({
      groupId,
      participants,
    }: {
      groupId: string;
      participants: string[];
    }): Promise<void> => {
      if (!sessionName) throw new Error('Session name nao definido');

      const config = await resolveConfig();
      await wahaFetch<void>(
        config,
        `/api/${sessionName}/groups/${groupId}/participants/add`,
        {
          method: 'PUT',
          body: JSON.stringify({ participants }),
        }
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mt-waha-groups'] });
      queryClient.invalidateQueries({ queryKey: ['mt-waha-group-info', variables.groupId] });
      toast.success(`${variables.participants.length} participante(s) adicionado(s) ao grupo`);
    },
    onError: (error: Error) => {
      console.error('Erro ao adicionar participantes:', error);
      toast.error(`Erro ao adicionar participantes: ${error.message}`);
    },
  });

  // Mutation: Remover participantes do grupo
  const removeParticipants = useMutation({
    mutationFn: async ({
      groupId,
      participants,
    }: {
      groupId: string;
      participants: string[];
    }): Promise<void> => {
      if (!sessionName) throw new Error('Session name nao definido');

      const config = await resolveConfig();
      await wahaFetch<void>(
        config,
        `/api/${sessionName}/groups/${groupId}/participants/remove`,
        {
          method: 'PUT',
          body: JSON.stringify({ participants }),
        }
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mt-waha-groups'] });
      queryClient.invalidateQueries({ queryKey: ['mt-waha-group-info', variables.groupId] });
      toast.success(`${variables.participants.length} participante(s) removido(s) do grupo`);
    },
    onError: (error: Error) => {
      console.error('Erro ao remover participantes:', error);
      toast.error(`Erro ao remover participantes: ${error.message}`);
    },
  });

  // Mutation: Atualizar nome/descricao do grupo
  const updateGroup = useMutation({
    mutationFn: async ({
      groupId,
      subject,
      description,
    }: {
      groupId: string;
      subject?: string;
      description?: string;
    }): Promise<void> => {
      if (!sessionName) throw new Error('Session name nao definido');

      const config = await resolveConfig();

      if (subject !== undefined) {
        await wahaFetch<void>(
          config,
          `/api/${sessionName}/groups/${groupId}/settings`,
          {
            method: 'PUT',
            body: JSON.stringify({ subject }),
          }
        );
      }

      if (description !== undefined) {
        await wahaFetch<void>(
          config,
          `/api/${sessionName}/groups/${groupId}/settings`,
          {
            method: 'PUT',
            body: JSON.stringify({ description }),
          }
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-waha-groups'] });
      toast.success('Grupo atualizado');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar grupo: ${error.message}`);
    },
  });

  // Mutation: Sair do grupo
  const leaveGroup = useMutation({
    mutationFn: async (groupId: string): Promise<void> => {
      if (!sessionName) throw new Error('Session name nao definido');

      const config = await resolveConfig();
      await wahaFetch<void>(
        config,
        `/api/${sessionName}/groups/${groupId}/leave`,
        { method: 'POST' }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-waha-groups'] });
      toast.success('Saiu do grupo');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao sair do grupo: ${error.message}`);
    },
  });

  // Mutation: Enviar convite para grupo
  const getInviteLink = useMutation({
    mutationFn: async (groupId: string): Promise<string> => {
      if (!sessionName) throw new Error('Session name nao definido');

      const config = await resolveConfig();
      const result = await wahaFetch<{ link: string }>(
        config,
        `/api/${sessionName}/groups/${groupId}/invite-code`
      );

      return result.link;
    },
    onSuccess: (link) => {
      toast.success('Link de convite gerado');
      // Copiar para clipboard
      if (navigator.clipboard) {
        navigator.clipboard.writeText(link).catch(() => {
          console.warn('Nao foi possivel copiar para clipboard');
        });
      }
    },
    onError: (error: Error) => {
      toast.error(`Erro ao gerar link de convite: ${error.message}`);
    },
  });

  // Helper: Formatar telefone para JID do WhatsApp
  const phoneToJid = useCallback((phone: string): string => {
    const clean = phone.replace(/\D/g, '');
    return `${clean}@c.us`;
  }, []);

  // Helper: Formatar lista de telefones para JIDs
  const phonesToJids = useCallback(
    (phones: string[]): string[] => {
      return phones.map(phoneToJid);
    },
    [phoneToJid]
  );

  return {
    // Query
    groups: query.data || [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,

    // Mutations
    createGroup,
    getGroupInfo,
    addParticipants,
    removeParticipants,
    updateGroup,
    leaveGroup,
    getInviteLink,

    // Helpers
    phoneToJid,
    phonesToJids,

    // Estados
    isCreating: createGroup.isPending,
    isAddingParticipants: addParticipants.isPending,
    isRemovingParticipants: removeParticipants.isPending,
  };
}

// =============================================================================
// HOOK: useGroupInfoMT (Info de grupo individual com cache)
// =============================================================================

/**
 * Normaliza participante da WAHA API.
 * A WAHA pode retornar formatos inconsistentes:
 * - Normal: { id: "123@lid", phoneNumber: "5511...@s.whatsapp.net", admin: null }
 * - Aninhado: { id: { id: "123@lid", phoneNumber: "...", admin: null }, admin: "admin" }
 */
function normalizeParticipant(p: any): WAHAGroupParticipant {
  let id: string;
  let phoneNumber: string | undefined;
  let isAdmin = false;
  let isSuperAdmin = false;

  // Se id é um objeto aninhado, extrair o id string e phoneNumber
  if (p.id && typeof p.id === 'object' && 'id' in p.id) {
    id = String(p.id.id || p.id.phoneNumber || '');
    phoneNumber = p.id.phoneNumber || p.phoneNumber;
  } else {
    id = String(p.id || '');
    phoneNumber = p.phoneNumber;
  }

  // Determinar admin status
  const adminField = p.admin;
  if (adminField === 'admin') isAdmin = true;
  if (adminField === 'superadmin') { isAdmin = true; isSuperAdmin = true; }
  if (p.isAdmin) isAdmin = true;
  if (p.isSuperAdmin) { isAdmin = true; isSuperAdmin = true; }

  return { id, phoneNumber, isAdmin, isSuperAdmin };
}

export function useGroupInfoMT(
  sessionName: string | undefined,
  groupId: string | undefined,
  sessionId?: string
) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const query = useQuery({
    queryKey: ['mt-waha-group-info', sessionName, groupId],
    queryFn: async (): Promise<WAHAGroup | null> => {
      if (!sessionName || !groupId) return null;

      let config: WAHAConfig | null = null;

      if (sessionId) {
        config = await getWahaConfigForSession(sessionId, tenant?.id);
      } else {
        config = await getWahaConfig(tenant?.id);
      }

      if (!config) {
        throw new Error('Configuracao WAHA nao encontrada');
      }

      const result = await wahaFetch<any>(
        config,
        `/api/${sessionName}/groups/${groupId}`
      );

      // Normalizar participantes (WAHA pode retornar formatos inconsistentes)
      if (result?.participants && Array.isArray(result.participants)) {
        result.participants = result.participants
          .map(normalizeParticipant)
          .filter((p: WAHAGroupParticipant) => p.id);
      }

      return result as WAHAGroup;
    },
    enabled:
      !!sessionName &&
      !!groupId &&
      !isTenantLoading &&
      (!!tenant || accessLevel === 'platform'),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  return {
    group: query.data,
    participants: query.data?.participants || [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
