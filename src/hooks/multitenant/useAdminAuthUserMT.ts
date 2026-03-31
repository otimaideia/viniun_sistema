import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook for admin operations on auth users via the `admin_manage_auth_user` RPC.
 * This RPC is a SECURITY DEFINER function that creates or updates Supabase Auth users
 * based on mt_users records, without requiring service_role key on the frontend.
 */

interface AdminManageAuthUserParams {
  mtUserId: string;
  password: string;
  email: string;
}

interface AdminManageAuthUserResult {
  success: boolean;
  action?: 'created' | 'updated';
  error?: string;
}

export function useAdminManageAuthUser() {
  return useMutation({
    mutationFn: async ({ mtUserId, password, email }: AdminManageAuthUserParams) => {
      const { data: result, error: rpcError } = await supabase.rpc('admin_manage_auth_user', {
        p_mt_user_id: mtUserId,
        p_password: password,
        p_email: email,
      });

      if (rpcError) throw new Error(rpcError.message);

      const typedResult = result as AdminManageAuthUserResult | null;
      if (typedResult && !typedResult.success) {
        throw new Error(typedResult.error || 'Erro ao gerenciar usuario de autenticacao');
      }

      return typedResult;
    },
  });
}
