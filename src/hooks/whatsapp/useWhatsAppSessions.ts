// Hook para gerenciar sessões WhatsApp com sincronização WAHA
// Adaptado para YESlaser

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { wahaClient } from '@/services/waha/wahaDirectClient';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';

const SESSIONS_KEY = 'whatsapp-sessions';

// Tipos
export interface WhatsAppSession {
  id: string;
  franqueado_id: string;
  session_name: string;
  phone_number?: string;
  display_name?: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'qr_code' | 'failed';
  last_seen_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSessionInput {
  franqueado_id?: string;
  session_name?: string;
}

export interface UpdateSessionInput {
  phone_number?: string;
  display_name?: string;
  status?: WhatsAppSession['status'];
}

// Mapear status do WAHA para status do sistema
function mapWahaStatus(wahaStatus: string): WhatsAppSession['status'] {
  const statusMap: Record<string, WhatsAppSession['status']> = {
    'WORKING': 'connected',
    'CONNECTED': 'connected',
    'SCAN_QR_CODE': 'qr_code',
    'STARTING': 'connecting',
    'STOPPED': 'disconnected',
    'FAILED': 'failed',
  };
  return statusMap[wahaStatus] || 'disconnected';
}

/**
 * @deprecated Use useWhatsAppSessionsMT instead. This hook lacks tenant isolation.
 */
export function useWhatsAppSessions(franqueadoId?: string) {
  const queryClient = useQueryClient();
  const { tenant, franchise } = useTenantContext();

  // Listar sessões - busca do WAHA e sincroniza com banco local
  const sessionsQuery = useQuery({
    queryKey: [SESSIONS_KEY, franqueadoId],
    queryFn: async () => {
      // 1. Buscar sessões do WAHA
      const wahaResult = await wahaClient.listSessions();
      const wahaSessions = wahaResult.success ? wahaResult.data || [] : [];

      // 2. Buscar sessões do banco local
      // Validar se franqueadoId é UUID válido antes de usar no filtro
      const isValidFranqueadoUUID = franqueadoId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(franqueadoId);

      let query = supabase
        .from('mt_whatsapp_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      // Só aplica filtro se franqueadoId for UUID válido
      if (isValidFranqueadoUUID) {
        query = query.eq('franqueado_id', franqueadoId);
      }

      const { data: localSessions, error } = await query;
      if (error) {
        console.error('Erro ao buscar sessões locais:', error);
      }

      // 3. Sincronizar - criar mapa de sessões locais por session_name
      const localMap = new Map<string, WhatsAppSession>();
      (localSessions || []).forEach((s) => {
        localMap.set(s.session_name, s as WhatsAppSession);
      });

      // 4. Atualizar ou criar sessões baseado no WAHA
      const syncedSessions: WhatsAppSession[] = [];

      for (const wahaSession of wahaSessions) {
        const localSession = localMap.get(wahaSession.name);
        const newStatus = mapWahaStatus(wahaSession.status);
        const phoneNumber = wahaSession.me?.id?.replace('@c.us', '') || '';
        const displayName = wahaSession.me?.pushName || '';

        if (localSession) {
          // Atualizar sessão existente se status mudou
          if (
            localSession.status !== newStatus ||
            localSession.phone_number !== phoneNumber ||
            localSession.display_name !== displayName
          ) {
            const { error: updateError } = await supabase
              .from('mt_whatsapp_sessions')
              .update({
                status: newStatus,
                phone_number: phoneNumber,
                display_name: displayName,
                last_seen_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', localSession.id);

            if (updateError) {
              console.error('Erro ao atualizar sessão:', updateError);
            }
          }

          syncedSessions.push({
            ...localSession,
            status: newStatus,
            phone_number: phoneNumber,
            display_name: displayName,
          });
          localMap.delete(wahaSession.name);
        } else {
          // Criar nova sessão no banco (sem franqueado_id por enquanto)
          // Somente se temos um franqueadoId válido (UUID)
          const isValidUUID = franqueadoId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(franqueadoId);

          if (isValidUUID) {
            // Primeiro verificar se sessão já existe para evitar erro 409
            const { data: existingSession } = await supabase
              .from('mt_whatsapp_sessions')
              .select('*')
              .eq('session_name', wahaSession.name)
              .maybeSingle();

            if (existingSession) {
              // Sessão já existe, apenas atualizar status se necessário
              if (existingSession.status !== newStatus) {
                await supabase
                  .from('mt_whatsapp_sessions')
                  .update({
                    status: newStatus,
                    phone_number: phoneNumber,
                    display_name: displayName,
                    last_seen_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', existingSession.id);
              }
              syncedSessions.push({
                ...existingSession,
                status: newStatus,
                phone_number: phoneNumber,
                display_name: displayName,
              } as WhatsAppSession);
            } else {
              // Criar nova sessão - precisa de tenant_id
              if (!tenant?.id) {
                console.log(`[Sessões] Sessão ${wahaSession.name} não será criada (tenant não identificado)`);
                continue;
              }
              const { data: newSession, error: insertError } = await supabase
                .from('mt_whatsapp_sessions')
                .insert({
                  tenant_id: tenant.id, // OBRIGATÓRIO para MT
                  franchise_id: franchise?.id || null,
                  franqueado_id: franqueadoId,
                  session_name: wahaSession.name,
                  phone_number: phoneNumber,
                  display_name: displayName,
                  status: newStatus,
                  last_seen_at: new Date().toISOString(),
                })
                .select()
                .single();

              if (insertError) {
                console.error('Erro ao criar sessão:', insertError);
              } else if (newSession) {
                console.log(`[Sessões] ✅ Sessão ${wahaSession.name} criada com sucesso!`);
                syncedSessions.push(newSession as WhatsAppSession);
              }
            }
          } else {
            console.log(`[Sessões] Sessão ${wahaSession.name} não será criada no banco (franqueadoId inválido ou ausente)`);
          }
          // Se não tem franqueadoId válido, criar sessão virtual para exibição
          if (!isValidUUID) {
            syncedSessions.push({
              id: `waha-${wahaSession.name}`,
              franqueado_id: '',
              session_name: wahaSession.name,
              phone_number: phoneNumber,
              display_name: displayName,
              status: newStatus,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as WhatsAppSession);
          }
        }
      }

      // 5. Marcar sessões locais que não existem no WAHA como desconectadas
      for (const [, localSession] of localMap) {
        if (localSession.status !== 'disconnected') {
          await supabase
            .from('mt_whatsapp_sessions')
            .update({
              status: 'disconnected',
              updated_at: new Date().toISOString(),
            })
            .eq('id', localSession.id);
        }
        syncedSessions.push({
          ...localSession,
          status: 'disconnected',
        });
      }

      return syncedSessions;
    },
    enabled: true,
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  // Criar sessão
  const createSession = useMutation({
    mutationFn: async (input?: CreateSessionInput) => {
      const sessionName = input?.session_name || `session_${Date.now()}`;

      // 1. Criar no WAHA
      const result = await wahaClient.createSession(sessionName);
      if (!result.success) {
        throw new Error(result.error || 'Erro ao criar sessão no WAHA');
      }

      // 2. Iniciar a sessão
      await wahaClient.startSession(sessionName);

      // 3. Criar no banco local se temos franqueadoId e tenant
      if (input?.franqueado_id) {
        if (!tenant?.id) {
          throw new Error('Tenant não identificado');
        }
        const { data, error } = await supabase
          .from('mt_whatsapp_sessions')
          .insert({
            tenant_id: tenant.id, // OBRIGATÓRIO para MT
            franchise_id: franchise?.id || null,
            franqueado_id: input.franqueado_id,
            session_name: sessionName,
            status: 'connecting',
          })
          .select()
          .single();

        if (error) throw error;
        return data as WhatsAppSession;
      }

      return {
        session_name: sessionName,
        status: 'connecting',
      } as WhatsAppSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SESSIONS_KEY] });
      toast.success('Sessão criada! Escaneie o QR Code para conectar.');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar sessão: ${error.message}`);
    },
  });

  // Iniciar sessão
  const startSession = useMutation({
    mutationFn: async (sessionName: string) => {
      const result = await wahaClient.startSession(sessionName);
      if (!result.success) {
        throw new Error(result.error || 'Erro ao iniciar sessão');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SESSIONS_KEY] });
      toast.success('Sessão iniciada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao iniciar sessão: ${error.message}`);
    },
  });

  // Parar sessão
  const stopSession = useMutation({
    mutationFn: async (sessionName: string) => {
      const result = await wahaClient.stopSession(sessionName);
      if (!result.success) {
        throw new Error(result.error || 'Erro ao parar sessão');
      }

      // Atualizar status no banco
      await supabase
        .from('mt_whatsapp_sessions')
        .update({ status: 'disconnected', updated_at: new Date().toISOString() })
        .eq('session_name', sessionName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SESSIONS_KEY] });
      toast.success('Sessão parada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao parar sessão: ${error.message}`);
    },
  });

  // Deletar sessão
  const deleteSession = useMutation({
    mutationFn: async (sessionName: string) => {
      const result = await wahaClient.deleteSession(sessionName);
      if (!result.success) {
        throw new Error(result.error || 'Erro ao deletar sessão');
      }

      // Deletar do banco local
      await supabase
        .from('mt_whatsapp_sessions')
        .delete()
        .eq('session_name', sessionName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SESSIONS_KEY] });
      toast.success('Sessão deletada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao deletar sessão: ${error.message}`);
    },
  });

  // Reiniciar sessão
  const restartSession = useMutation({
    mutationFn: async (sessionName: string) => {
      const result = await wahaClient.restartSession(sessionName);
      if (!result.success) {
        throw new Error(result.error || 'Erro ao reiniciar sessão');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SESSIONS_KEY] });
      toast.success('Sessão reiniciada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao reiniciar sessão: ${error.message}`);
    },
  });

  // Buscar QR Code
  const getQRCode = useMutation({
    mutationFn: async (sessionName: string) => {
      const result = await wahaClient.getQRCode(sessionName);
      if (!result.success) {
        throw new Error(result.error || 'Erro ao buscar QR Code');
      }
      return result.data;
    },
    onError: (error: Error) => {
      toast.error(`Erro ao buscar QR Code: ${error.message}`);
    },
  });

  // Atualizar sessão localmente
  const updateSession = useMutation({
    mutationFn: async ({
      sessionId,
      input,
    }: {
      sessionId: string;
      input: UpdateSessionInput;
    }) => {
      const { data, error } = await supabase
        .from('mt_whatsapp_sessions')
        .update(input)
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data as WhatsAppSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SESSIONS_KEY] });
      toast.success('Sessão atualizada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar sessão: ${error.message}`);
    },
  });

  // Sincronizar manualmente
  const syncSessions = useMutation({
    mutationFn: async () => {
      // Força refetch das sessões
      await queryClient.invalidateQueries({ queryKey: [SESSIONS_KEY] });
    },
    onSuccess: () => {
      toast.success('Sessões sincronizadas!');
    },
  });

  return {
    sessions: sessionsQuery.data || [],
    isLoading: sessionsQuery.isLoading,
    error: sessionsQuery.error,
    refetch: sessionsQuery.refetch,

    createSession,
    startSession,
    stopSession,
    deleteSession,
    restartSession,
    getQRCode,
    updateSession,
    syncSessions,
  };
}
