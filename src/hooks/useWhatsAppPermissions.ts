import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UserPermissions {
  canSend: boolean;
  canManage: boolean;
  isLoading: boolean;
  error: string | null;
}

interface SessionPermission {
  whatsapp_session_id: string;
  can_send: boolean;
  can_manage: boolean;
}

export function useWhatsAppPermissions(sessaoId: string | null) {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissions>({
    canSend: false,
    canManage: false,
    isLoading: true,
    error: null,
  });

  const fetchPermissions = useCallback(async () => {
    if (!user?.id || !sessaoId) {
      setPermissions({
        canSend: false,
        canManage: false,
        isLoading: false,
        error: null,
      });
      return;
    }

    try {
      // First check if user is admin (admins have all permissions)
      const { data: profile } = await supabase
        .from("mt_users")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (profile?.is_admin) {
        setPermissions({
          canSend: true,
          canManage: true,
          isLoading: false,
          error: null,
        });
        return;
      }

      // Check specific session permissions
      const { data: permission, error } = await supabase
        .from("mt_whatsapp_user_sessions")
        .select("can_send, can_manage")
        .eq("user_id", user.id)
        .eq("whatsapp_session_id", sessaoId)
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar permissões:", error);
        setPermissions({
          canSend: false,
          canManage: false,
          isLoading: false,
          error: error.message,
        });
        return;
      }

      setPermissions({
        canSend: permission?.can_send ?? false,
        canManage: permission?.can_manage ?? false,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error("Erro ao verificar permissões:", err);
      setPermissions({
        canSend: false,
        canManage: false,
        isLoading: false,
        error: err instanceof Error ? err.message : "Erro ao verificar permissões",
      });
    }
  }, [user?.id, sessaoId]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // Grant permission to a user
  const grantPermission = useCallback(async (
    targetUserId: string,
    targetSessaoId: string,
    canSend: boolean,
    canManage: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from("mt_whatsapp_user_sessions")
        .upsert({
          user_id: targetUserId,
          whatsapp_session_id: targetSessaoId,
          can_send: canSend,
          can_manage: canManage,
        }, {
          onConflict: "user_id,whatsapp_session_id",
        });

      if (error) throw error;

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Erro ao conceder permissão",
      };
    }
  }, []);

  // Revoke all permissions for a user on a session
  const revokePermission = useCallback(async (
    targetUserId: string,
    targetSessaoId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from("mt_whatsapp_user_sessions")
        .delete()
        .eq("user_id", targetUserId)
        .eq("whatsapp_session_id", targetSessaoId);

      if (error) throw error;

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Erro ao revogar permissão",
      };
    }
  }, []);

  // Get all permissions for a session
  const getSessionPermissions = useCallback(async (
    targetSessaoId: string
  ): Promise<SessionPermission[]> => {
    try {
      const { data, error } = await supabase
        .from("mt_whatsapp_user_sessions")
        .select("*")
        .eq("whatsapp_session_id", targetSessaoId);

      if (error) throw error;

      return data || [];
    } catch (err) {
      console.error("Erro ao buscar permissões da sessão:", err);
      return [];
    }
  }, []);

  return {
    ...permissions,
    refetch: fetchPermissions,
    grantPermission,
    revokePermission,
    getSessionPermissions,
  };
}
