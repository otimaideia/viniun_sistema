import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SignupData {
  // Empresa
  nome_fantasia: string;
  cnpj: string;
  tipo_empresa: string;
  // Endereco
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  telefone: string;
  email_empresa: string;
  // Acesso
  nome: string;
  email: string;
  senha: string;
  telefone_admin: string;
  // Plano
  plano: 'starter' | 'professional' | 'enterprise';
  billing: 'mensal' | 'anual';
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

export function useSignupEmpresa() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const signup = async (data: SignupData): Promise<{ success: boolean; error?: string }> => {
    setIsSubmitting(true);

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.senha,
        options: {
          data: { nome: data.nome, telefone: data.telefone_admin },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Erro ao criar usuario');

      const userId = authData.user.id;

      // 1b. Confirm email via admin API (service role key from env)
      const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
      if (serviceKey) {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ email_confirm: true }),
        });
      }

      // 1c. Sign in to get authenticated session
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.senha,
      });
      if (signInError) throw signInError;
      const slug = generateSlug(data.nome_fantasia);

      // 2. Insert tenant
      const { data: tenantData, error: tenantError } = await supabase
        .from('mt_tenants')
        .insert({
          slug,
          nome_fantasia: data.nome_fantasia,
          cnpj: data.cnpj.replace(/\D/g, '') || null,
          tipo_empresa: data.tipo_empresa,
          email: data.email_empresa,
          telefone: data.telefone,
          endereco: data.endereco,
          numero: data.numero,
          complemento: data.complemento,
          bairro: data.bairro,
          cidade: data.cidade,
          estado: data.estado,
          cep: data.cep.replace(/\D/g, '') || null,
          plano: data.plano,
          billing_cycle: data.billing,
          is_active: true,
        })
        .select('id')
        .single();

      if (tenantError) throw tenantError;
      const tenantId = tenantData.id;

      // 3. Insert branding with default Viniun navy colors
      await supabase.from('mt_tenant_branding').insert({
        tenant_id: tenantId,
        cor_primaria: '#1E3A5F',
        cor_primaria_hover: '#0F2035',
        cor_secundaria: '#2E86C1',
        cor_secundaria_hover: '#1a6da0',
        cor_sucesso: '#22c55e',
        cor_erro: '#ef4444',
        cor_aviso: '#f59e0b',
        cor_info: '#5AC9EF',
        cor_fundo: '#F0F4F8',
        cor_fundo_card: '#FFFFFF',
        cor_borda: '#e2e8f0',
        cor_texto: '#0F2035',
        cor_texto_secundario: '#64748b',
        cor_texto_invertido: '#FFFFFF',
        texto_login_titulo: `Bem-vindo ao ${data.nome_fantasia}`,
        texto_login_subtitulo: 'Acesse sua conta para continuar',
        fonte_primaria: 'Inter',
        fonte_secundaria: 'Inter',
        border_radius: '0.5rem',
      });

      // 4. Insert user
      const { data: mtUser, error: userError } = await supabase.from('mt_users').insert({
        auth_user_id: userId,
        tenant_id: tenantId,
        nome: data.nome,
        email: data.email,
        telefone: data.telefone_admin,
        access_level: 'tenant',
        status: 'ativo',
      }).select('id').single();

      if (userError) throw userError;

      // 5. Insert default franchise (Matriz)
      const { data: franchise, error: franchiseError } = await supabase.from('mt_franchises').insert({
        tenant_id: tenantId,
        nome: `${data.nome_fantasia} - Matriz`,
        cidade: data.cidade,
        estado: data.estado,
        endereco: data.endereco,
        numero: data.numero,
        bairro: data.bairro,
        cep: data.cep.replace(/\D/g, '') || null,
        telefone: data.telefone,
        email: data.email_empresa,
        is_active: true,
      }).select('id').single();

      if (franchiseError) throw franchiseError;

      // 5b. Link user to franchise
      await supabase.from('mt_users')
        .update({ franchise_id: franchise.id })
        .eq('id', mtUser.id);

      // 5c. Assign tenant_admin role
      const { data: adminRole } = await supabase
        .from('mt_roles')
        .select('id')
        .eq('codigo', 'super_admin')
        .single();

      if (adminRole) {
        await supabase.from('mt_user_roles').insert({
          user_id: mtUser.id,
          role_id: adminRole.id,
          tenant_id: tenantId,
          is_active: true,
        });
      }

      // 6. Enable modules based on plan
      const coreModules = ['dashboard', 'leads', 'agendamentos', 'configuracoes', 'usuarios', 'relatorios'];
      const proModules = [...coreModules, 'whatsapp', 'funil', 'franqueados', 'servicos', 'metas'];
      const enterpriseModules = [...proModules, 'chatbot', 'api_webhooks', 'automacoes', 'campanhas'];

      let moduleCodes: string[];
      switch (data.plano) {
        case 'starter':
          moduleCodes = coreModules;
          break;
        case 'professional':
          moduleCodes = proModules;
          break;
        case 'enterprise':
          moduleCodes = enterpriseModules;
          break;
      }

      const { data: modules } = await supabase
        .from('mt_modules')
        .select('id, codigo')
        .in('codigo', moduleCodes);

      if (modules && modules.length > 0) {
        const tenantModules = modules.map((m) => ({
          tenant_id: tenantId,
          module_id: m.id,
          is_active: true,
        }));
        await supabase.from('mt_tenant_modules').insert(tenantModules);

        // Also enable modules for the franchise
        const franchiseModules = modules.map((m) => ({
          franchise_id: franchise.id,
          module_id: m.id,
          tenant_id: tenantId,
          is_active: true,
        }));
        await supabase.from('mt_franchise_modules').insert(franchiseModules);
      }

      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao criar conta';
      return { success: false, error: message };
    } finally {
      setIsSubmitting(false);
    }
  };

  return { signup, isSubmitting };
}
