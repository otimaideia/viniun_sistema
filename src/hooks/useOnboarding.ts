import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// =============================================================================
// HOOK: useOnboarding
// Gerencia o estado e ações do wizard de onboarding de nova empresa
// =============================================================================

export interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  isOptional?: boolean;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  { id: 1, title: 'Dados da Empresa', description: 'Informações básicas da empresa' },
  { id: 2, title: 'Endereço e Contato', description: 'Localização e comunicação' },
  { id: 3, title: 'Responsável Legal', description: 'Pessoa responsável pela empresa' },
  { id: 4, title: 'Branding', description: 'Identidade visual' },
  { id: 5, title: 'Configurações', description: 'Preferências gerais' },
  { id: 6, title: 'Plano e Limites', description: 'Recursos disponíveis' },
  { id: 7, title: 'Módulos', description: 'Funcionalidades habilitadas' },
  { id: 8, title: 'Admin Master', description: 'Primeiro usuário administrador' },
  { id: 9, title: 'Primeira Franquia', description: 'Unidade matriz', isOptional: true },
  { id: 10, title: 'Revisão e Ativação', description: 'Confirmar e ativar' },
];

// Dados de cada passo
export interface DadosEmpresa {
  nome_fantasia: string;
  razao_social: string;
  cnpj: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  slug: string;
  subdominio: string;
  dominio_customizado?: string;
}

export interface DadosEndereco {
  cep: string;
  endereco: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  pais: string;
  telefone: string;
  telefone_secundario?: string;
  whatsapp?: string;
  email: string;
  email_financeiro?: string;
  website?: string;
}

export interface DadosResponsavel {
  responsavel_nome: string;
  responsavel_cpf: string;
  responsavel_cargo: string;
  responsavel_telefone: string;
  responsavel_email: string;
}

export interface DadosBranding {
  logo_url?: string;
  logo_branco_url?: string;
  logo_icone_url?: string;
  favicon_url?: string;
  cor_primaria: string;
  cor_primaria_hover: string;
  cor_secundaria: string;
  cor_secundaria_hover: string;
  cor_sucesso?: string;
  cor_erro?: string;
  cor_aviso?: string;
  cor_info?: string;
  cor_fundo?: string;
  cor_fundo_card?: string;
  cor_texto?: string;
  cor_texto_secundario?: string;
  fonte_primaria?: string;
  fonte_secundaria?: string;
  border_radius?: string;
}

export interface DadosConfiguracoes {
  timezone: string;
  idioma: string;
  moeda: string;
}

export interface DadosPlano {
  plano: string;
  max_franquias: number;
  max_usuarios: number;
  max_leads_mes: number;
  data_ativacao?: string;
  data_expiracao?: string;
}

export interface DadosModulos {
  modulos_selecionados: string[]; // códigos dos módulos
}

export interface DadosAdminMaster {
  admin_nome: string;
  admin_email: string;
  admin_senha: string;
  admin_telefone?: string;
}

export interface DadosFranquia {
  franquia_codigo: string;
  franquia_nome: string;
  franquia_cep?: string;
  franquia_endereco?: string;
  franquia_numero?: string;
  franquia_bairro?: string;
  franquia_cidade?: string;
  franquia_estado?: string;
  franquia_telefone?: string;
  franquia_email?: string;
  pular_franquia?: boolean;
}

export interface OnboardingData {
  empresa: Partial<DadosEmpresa>;
  endereco: Partial<DadosEndereco>;
  responsavel: Partial<DadosResponsavel>;
  branding: Partial<DadosBranding>;
  configuracoes: Partial<DadosConfiguracoes>;
  plano: Partial<DadosPlano>;
  modulos: Partial<DadosModulos>;
  admin: Partial<DadosAdminMaster>;
  franquia: Partial<DadosFranquia>;
}

const INITIAL_DATA: OnboardingData = {
  empresa: {},
  endereco: { pais: 'Brasil' },
  responsavel: {},
  branding: {
    cor_primaria: '#E91E63',
    cor_primaria_hover: '#C2185B',
    cor_secundaria: '#3F51B5',
    cor_secundaria_hover: '#303F9F',
    cor_sucesso: '#4CAF50',
    cor_erro: '#F44336',
    cor_aviso: '#FF9800',
    cor_info: '#2196F3',
    cor_fundo: '#F5F5F5',
    cor_fundo_card: '#FFFFFF',
    cor_texto: '#212121',
    cor_texto_secundario: '#757575',
    fonte_primaria: 'Inter, sans-serif',
    border_radius: '8px',
  },
  configuracoes: {
    timezone: 'America/Sao_Paulo',
    idioma: 'pt-BR',
    moeda: 'BRL',
  },
  plano: {
    plano: 'starter',
    max_franquias: 5,
    max_usuarios: 20,
    max_leads_mes: 1000,
  },
  modulos: {
    modulos_selecionados: ['leads', 'usuarios', 'funil', 'agendamentos'],
  },
  admin: {},
  franquia: { pular_franquia: false },
};

export function useOnboarding() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [createdTenantId, setCreatedTenantId] = useState<string | null>(null);

  // Atualizar dados de um passo específico
  const updateStepData = useCallback(<K extends keyof OnboardingData>(
    step: K,
    stepData: Partial<OnboardingData[K]>
  ) => {
    setData(prev => ({
      ...prev,
      [step]: { ...prev[step], ...stepData },
    }));
  }, []);

  // Marcar passo como completo
  const markStepComplete = useCallback((stepId: number) => {
    setCompletedSteps(prev => {
      if (!prev.includes(stepId)) {
        return [...prev, stepId];
      }
      return prev;
    });
  }, []);

  // Ir para próximo passo
  const nextStep = useCallback(() => {
    markStepComplete(currentStep);
    if (currentStep < ONBOARDING_STEPS.length) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, markStepComplete]);

  // Ir para passo anterior
  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  // Ir para passo específico
  const goToStep = useCallback((stepId: number) => {
    if (stepId >= 1 && stepId <= ONBOARDING_STEPS.length) {
      setCurrentStep(stepId);
    }
  }, []);

  // Verificar se pode ir para próximo passo
  const canProceed = useCallback((stepId: number): boolean => {
    const step = ONBOARDING_STEPS.find(s => s.id === stepId);
    if (step?.isOptional) return true;

    switch (stepId) {
      case 1:
        return !!(data.empresa.nome_fantasia && data.empresa.cnpj && data.empresa.slug);
      case 2:
        return !!(data.endereco.cep && data.endereco.email && data.endereco.telefone);
      case 3:
        return !!(data.responsavel.responsavel_nome && data.responsavel.responsavel_cpf && data.responsavel.responsavel_email);
      case 4:
        return !!(data.branding.cor_primaria && data.branding.cor_secundaria);
      case 5:
        return !!(data.configuracoes.timezone && data.configuracoes.idioma && data.configuracoes.moeda);
      case 6:
        return !!(data.plano.plano && data.plano.max_franquias);
      case 7:
        return (data.modulos.modulos_selecionados?.length || 0) > 0;
      case 8:
        return !!(data.admin.admin_nome && data.admin.admin_email && data.admin.admin_senha);
      case 9:
        return data.franquia.pular_franquia || !!(data.franquia.franquia_nome && data.franquia.franquia_codigo);
      case 10:
        return true;
      default:
        return false;
    }
  }, [data]);

  // Verificar se passo está completo
  const isStepComplete = useCallback((stepId: number): boolean => {
    return completedSteps.includes(stepId);
  }, [completedSteps]);

  // Resetar wizard
  const reset = useCallback(() => {
    setCurrentStep(1);
    setData(INITIAL_DATA);
    setCompletedSteps([]);
    setCreatedTenantId(null);
  }, []);

  // Submeter onboarding - criar tenant, branding, admin, franquia, módulos
  const submitOnboarding = useCallback(async (): Promise<boolean> => {
    setIsSubmitting(true);

    try {
      // 1. Criar Tenant
      const tenantData = {
        slug: data.empresa.slug,
        subdominio: data.empresa.subdominio || data.empresa.slug,
        dominio_customizado: data.empresa.dominio_customizado,
        nome_fantasia: data.empresa.nome_fantasia,
        razao_social: data.empresa.razao_social,
        cnpj: data.empresa.cnpj,
        inscricao_estadual: data.empresa.inscricao_estadual,
        inscricao_municipal: data.empresa.inscricao_municipal,
        cep: data.endereco.cep,
        endereco: data.endereco.endereco,
        numero: data.endereco.numero,
        complemento: data.endereco.complemento,
        bairro: data.endereco.bairro,
        cidade: data.endereco.cidade,
        estado: data.endereco.estado,
        pais: data.endereco.pais || 'Brasil',
        telefone: data.endereco.telefone,
        telefone_secundario: data.endereco.telefone_secundario,
        whatsapp: data.endereco.whatsapp,
        email: data.endereco.email,
        email_financeiro: data.endereco.email_financeiro,
        website: data.endereco.website,
        responsavel_nome: data.responsavel.responsavel_nome,
        responsavel_cpf: data.responsavel.responsavel_cpf,
        responsavel_cargo: data.responsavel.responsavel_cargo,
        responsavel_telefone: data.responsavel.responsavel_telefone,
        responsavel_email: data.responsavel.responsavel_email,
        timezone: data.configuracoes.timezone,
        idioma: data.configuracoes.idioma,
        moeda: data.configuracoes.moeda,
        plano: data.plano.plano,
        max_franquias: data.plano.max_franquias,
        max_usuarios: data.plano.max_usuarios,
        max_leads_mes: data.plano.max_leads_mes,
        data_ativacao: data.plano.data_ativacao || new Date().toISOString().split('T')[0],
        data_expiracao: data.plano.data_expiracao,
        status: 'ativo',
        is_active: true,
      };

      const { data: tenantResult, error: tenantError } = await supabase
        .from('mt_tenants')
        .insert(tenantData)
        .select()
        .single();

      if (tenantError) throw tenantError;

      const tenantId = tenantResult.id;
      setCreatedTenantId(tenantId);

      // 2. Criar Branding
      const brandingData = {
        tenant_id: tenantId,
        ...data.branding,
      };

      const { error: brandingError } = await supabase
        .from('mt_tenant_branding')
        .insert(brandingData);

      if (brandingError) throw brandingError;

      // 3. Habilitar módulos selecionados
      const modulosToInsert = (data.modulos.modulos_selecionados || []).map(codigo => ({
        tenant_id: tenantId,
        modulo_codigo: codigo,
        is_active: true,
      }));

      if (modulosToInsert.length > 0) {
        // Buscar IDs dos módulos pelos códigos
        const { data: modulosDb } = await supabase
          .from('mt_modules')
          .select('id, codigo')
          .in('codigo', data.modulos.modulos_selecionados || []);

        if (modulosDb && modulosDb.length > 0) {
          const tenantModules = modulosDb.map(m => ({
            tenant_id: tenantId,
            module_id: m.id,
            is_active: true,
          }));

          const { error: modulesError } = await supabase
            .from('mt_tenant_modules')
            .insert(tenantModules);

          if (modulesError) throw modulesError;
        }
      }

      // 4. Criar usuário admin master via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.admin.admin_email!,
        password: data.admin.admin_senha!,
        options: {
          data: {
            nome: data.admin.admin_nome,
            tenant_id: tenantId,
            access_level: 'tenant',
          },
        },
      });

      if (authError) throw authError;

      // 5. Criar registro na mt_users
      if (authData.user) {
        const { error: userError } = await supabase
          .from('mt_users')
          .insert({
            tenant_id: tenantId,
            auth_user_id: authData.user.id,
            email: data.admin.admin_email,
            nome: data.admin.admin_nome,
            telefone: data.admin.admin_telefone,
            access_level: 'tenant',
            is_active: true,
            email_verified: false,
          });

        if (userError) throw userError;
      }

      // 6. Criar primeira franquia (se não pulou)
      if (!data.franquia.pular_franquia && data.franquia.franquia_nome) {
        const { error: franquiaError } = await supabase
          .from('mt_franchises')
          .insert({
            tenant_id: tenantId,
            codigo: data.franquia.franquia_codigo,
            nome: data.franquia.franquia_nome,
            cep: data.franquia.franquia_cep,
            endereco: data.franquia.franquia_endereco,
            numero: data.franquia.franquia_numero,
            bairro: data.franquia.franquia_bairro,
            cidade: data.franquia.franquia_cidade,
            estado: data.franquia.franquia_estado,
            telefone: data.franquia.franquia_telefone,
            email: data.franquia.franquia_email,
            status: 'ativo',
            is_active: true,
            is_matriz: true,
          });

        if (franquiaError) throw franquiaError;
      }

      toast({
        title: 'Empresa criada com sucesso!',
        description: `${data.empresa.nome_fantasia} foi configurada e está pronta para uso.`,
      });

      return true;
    } catch (error: any) {
      console.error('Erro no onboarding:', error);
      toast({
        title: 'Erro ao criar empresa',
        description: error.message || 'Ocorreu um erro durante o cadastro.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [data, toast]);

  return {
    // Estado
    currentStep,
    data,
    isSubmitting,
    completedSteps,
    createdTenantId,
    steps: ONBOARDING_STEPS,

    // Ações
    updateStepData,
    nextStep,
    prevStep,
    goToStep,
    markStepComplete,
    canProceed,
    isStepComplete,
    reset,
    submitOnboarding,
  };
}

export default useOnboarding;
