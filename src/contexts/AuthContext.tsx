import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { AppRole } from "@/types/user";
import { fireAndForgetUserLoginRecord } from "@/hooks/multitenant/useLoginHistoryMT";

const IS_LOCAL_AUTH = import.meta.env.VITE_LOCAL_AUTH === 'true';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name?: string, tenantId?: string, franchiseId?: string, role?: AppRole) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper: create mock User/Session for local auth
function createLocalSession(userData: { user_id: string; email: string; user_meta: any }): { user: User; session: Session } {
  const user = {
    id: userData.user_id,
    email: userData.email,
    app_metadata: {},
    user_metadata: userData.user_meta || {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    role: 'authenticated',
  } as unknown as User;

  const session = {
    access_token: `local-dev-token-${userData.user_id}`,
    refresh_token: 'local-dev-refresh',
    expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    token_type: 'bearer',
    user,
  } as unknown as Session;

  return { user, session };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (IS_LOCAL_AUTH) {
      // Local auth: restore session from localStorage
      const stored = localStorage.getItem('local_auth_session');
      if (stored) {
        try {
          const { user: storedUser, session: storedSession } = JSON.parse(stored);
          setUser(storedUser);
          setSession(storedSession);
        } catch {
          localStorage.removeItem('local_auth_session');
        }
      }
      setIsLoading(false);
      return;
    }

    // Remote auth: Supabase GoTrue
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (IS_LOCAL_AUTH) {
        // Local auth: validate via PostgREST RPC
        const { data, error } = await supabase.rpc('local_auth_login', {
          p_email: email.trim(),
        });

        if (error || !data || data.length === 0) {
          fireAndForgetUserLoginRecord({
            email: email.trim(),
            success: false,
            failure_reason: 'Email não encontrado',
            auth_method: 'local',
          });
          return { success: false, error: 'Email não encontrado' };
        }

        const userData = data[0];
        const { user: mockUser, session: mockSession } = createLocalSession(userData);

        setUser(mockUser);
        setSession(mockSession);
        localStorage.setItem('local_auth_session', JSON.stringify({ user: mockUser, session: mockSession }));

        fireAndForgetUserLoginRecord({
          email: email.trim(),
          success: true,
          auth_method: 'local',
        });

        return { success: true };
      }

      // Remote auth: Supabase GoTrue
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error("Login error:", error);
        fireAndForgetUserLoginRecord({
          email: email.trim(),
          success: false,
          failure_reason: error.message,
          auth_method: 'password',
        });
        return { success: false, error: error.message };
      }

      fireAndForgetUserLoginRecord({
        email: email.trim(),
        success: true,
        auth_method: 'password',
      });

      return { success: true };
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Login exception:", error);
      return { success: false, error: errMsg || "Erro ao fazer login" };
    }
  };

  const register = async (email: string, password: string, name?: string, tenantId?: string, franchiseId?: string, role?: AppRole): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!tenantId) {
        return { success: false, error: "Tenant não identificado. Recarregue a página." };
      }

      if (IS_LOCAL_AUTH) {
        // Local auth: create user directly in auth.users via RPC + mt_users
        // For dev, just create mt_users entry with a generated UUID
        const userId = crypto.randomUUID();

        const { error: userError } = await supabase
          .from("mt_users")
          .insert({
            auth_user_id: userId,
            tenant_id: tenantId,
            franchise_id: franchiseId || null,
            email: email.trim(),
            nome: name || email.split("@")[0],
            status: "pendente",
            access_level: "user",
          });

        if (userError) {
          return { success: false, error: userError.message };
        }

        return { success: true };
      }

      // Remote auth: Supabase GoTrue
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: name || "",
            tenant_id: tenantId,
            franchise_id: franchiseId || null,
            requested_role: role || "user",
          },
        },
      });

      if (error) {
        console.error("Register error:", error);
        return { success: false, error: error.message };
      }

      if (data.user) {
        const { error: userError } = await supabase
          .from("mt_users")
          .insert({
            auth_user_id: data.user.id,
            tenant_id: tenantId,
            franchise_id: franchiseId || null,
            email: email.trim(),
            nome: name || email.split("@")[0],
            status: "pendente",
            access_level: "user",
          });

        if (userError) {
          console.error("Error creating mt_user:", userError);
        }

        const roleCode = role || "consultora_vendas";
        const { data: roleData } = await supabase
          .from("mt_roles")
          .select("id")
          .eq("codigo", roleCode)
          .limit(1)
          .single();

        if (roleData) {
          await supabase
            .from("mt_user_roles")
            .insert({
              user_id: data.user.id,
              role_id: roleData.id,
              tenant_id: tenantId,
              franchise_id: franchiseId || null,
              is_active: true,
            });
        }
      }

      if (data.user && !data.session) {
        return { success: true, error: "Verifique seu email para confirmar o cadastro" };
      }

      return { success: true };
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Register exception:", error);
      return { success: false, error: errMsg || "Erro ao registrar" };
    }
  };

  const logout = async () => {
    try {
      if (IS_LOCAL_AUTH) {
        localStorage.removeItem('local_auth_session');
        setUser(null);
        setSession(null);
        return;
      }

      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (IS_LOCAL_AUTH) {
        return { success: true, error: "Modo local: reset de senha não disponível. Use o login direto." };
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) {
        console.error("Reset password error:", error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Reset password exception:", error);
      return { success: false, error: errMsg || "Erro ao enviar email" };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!session,
        user,
        session,
        isLoading,
        login,
        register,
        logout,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
