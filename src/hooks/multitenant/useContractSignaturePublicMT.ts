/**
 * Hook PÚBLICO para assinatura de contratos de influenciadoras.
 * NÃO depende de useTenantContext() — usa edge function contract-public-access.
 * Projetado para uso na página pública de assinatura.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PublicSocialNetwork {
  id?: string;
  plataforma: string;
  usuario: string;
  url?: string | null;
  seguidores?: number | null;
  engajamento?: number | null;
  verificado?: boolean;
  username?: string | null;
}

export interface PublicContractData {
  valid: boolean;
  contrato: {
    id: string;
    tenant_id: string;
    influencer_id: string;
    tipo: string;
    status: string;
    data_inicio: string;
    data_fim: string | null;
    assinado: boolean;
    assinado_em: string | null;
    servicos_permuta: string[] | null;
    template_tipo: string | null;
    texto_contrato: string | null;
    aditivos_count: number;
    influencer: {
      id: string;
      nome: string;
      nome_completo: string | null;
      nome_artistico: string | null;
      cpf: string | null;
      rg: string | null;
      email: string | null;
      telefone: string | null;
      whatsapp: string | null;
      eh_menor: boolean;
      responsavel_legal_nome: string | null;
      responsavel_legal_cpf: string | null;
      responsavel_legal_rg: string | null;
      responsavel_legal_parentesco: string | null;
      endereco: string | null;
      numero: string | null;
      bairro: string | null;
      cidade: string | null;
      estado: string | null;
      cep: string | null;
      estado_civil: string | null;
      profissao: string | null;
      naturalidade: string | null;
      instagram: string | null;
      tiktok: string | null;
      youtube: string | null;
    };
    [key: string]: unknown;
  };
  influenciadora: PublicContractData['contrato']['influencer'];
  branding: {
    logo_url: string | null;
    logo_branco_url: string | null;
    cor_primaria: string | null;
    cor_secundaria: string | null;
    favicon_url: string | null;
  } | null;
  tenant: {
    slug: string;
    nome_fantasia: string;
    cnpj: string | null;
    cidade: string | null;
    estado: string | null;
  } | null;
  franchise: {
    id: string;
    nome: string | null;
    nome_fantasia: string | null;
    cnpj: string | null;
    endereco: string | null;
    cidade: string | null;
    estado: string | null;
    cep: string | null;
    responsavel_nome: string | null;
  } | null;
  documento: {
    id: string;
    nome_arquivo: string;
    tipo_documento: string;
    hash_arquivo: string | null;
    tamanho: number | null;
    mime_type: string | null;
    conteudo_base64: string | null;
  } | null;
  socialNetworks: PublicSocialNetwork[];
}

export interface PublicAditivo {
  id: string;
  contract_id: string;
  tipo_alteracao: string;
  aditivo_numero: number | null;
  aditivo_descricao: string | null;
  dados_anteriores: Record<string, unknown> | null;
  dados_novos: Record<string, unknown> | null;
  status_anterior: string | null;
  status_novo: string | null;
  motivo: string | null;
  created_at: string;
}

// Campos obrigatórios para assinatura do contrato
export const REQUIRED_FIELDS = [
  { key: 'nome_completo', label: 'Nome completo' },
  { key: 'cpf', label: 'CPF' },
  { key: 'rg', label: 'RG' },
  { key: 'email', label: 'E-mail' },
  { key: 'endereco', label: 'Endereço (Rua)' },
  { key: 'numero', label: 'Número' },
  { key: 'bairro', label: 'Bairro' },
  { key: 'cidade', label: 'Cidade' },
  { key: 'estado', label: 'Estado' },
  { key: 'cep', label: 'CEP' },
  { key: 'estado_civil', label: 'Estado civil' },
  { key: 'profissao', label: 'Profissão' },
  { key: 'naturalidade', label: 'Naturalidade' },
] as const;

export function getMissingFields(
  influenciadora: PublicContractData['influenciadora'] | null,
  socialNetworks: PublicSocialNetwork[]
): { missingProfile: typeof REQUIRED_FIELDS[number][]; missingSocialNetworks: boolean } {
  if (!influenciadora) {
    return { missingProfile: [...REQUIRED_FIELDS], missingSocialNetworks: true };
  }

  const missingProfile = REQUIRED_FIELDS.filter(f => {
    const val = (influenciadora as Record<string, unknown>)[f.key];
    return !val || (typeof val === 'string' && val.trim() === '');
  });

  const missingSocialNetworks = socialNetworks.length === 0;

  return { missingProfile, missingSocialNetworks };
}

async function callEdgeFunction(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('contract-public-access', {
    body,
  });

  if (error) {
    throw new Error(error.message || 'Erro ao acessar contrato');
  }

  // A edge function retorna erros com campo 'error'
  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}

export function useContractSignaturePublicMT(contractId?: string, token?: string) {
  const [identityValidated, setIdentityValidated] = useState(false);
  const queryClient = useQueryClient();

  // Query: Validar token e buscar dados do contrato
  const contractQuery = useQuery<PublicContractData>({
    queryKey: ['public-contract', contractId, token],
    queryFn: async () => {
      if (!contractId || !token) throw new Error('contractId e token são obrigatórios');

      const result = await callEdgeFunction({
        action: 'validate-token',
        contractId,
        token,
      });

      return result as PublicContractData;
    },
    enabled: !!contractId && !!token,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 min
  });

  // Query: Buscar aditivos
  const aditivosQuery = useQuery<PublicAditivo[]>({
    queryKey: ['public-contract-aditivos', contractId, token],
    queryFn: async () => {
      if (!contractId || !token) throw new Error('contractId e token são obrigatórios');

      const result = await callEdgeFunction({
        action: 'get-aditivos',
        contractId,
        token,
      });

      return (result?.aditivos || []) as PublicAditivo[];
    },
    enabled: !!contractId && !!token && identityValidated,
  });

  // Mutation: Validar identidade
  const validateIdentity = useMutation({
    mutationFn: async (identityData: { whatsapp: string; cpf?: string }) => {
      if (!contractId || !token) throw new Error('Dados da sessão inválidos');

      const result = await callEdgeFunction({
        action: 'validate-identity',
        contractId,
        token,
        whatsapp: identityData.whatsapp,
        cpf: identityData.cpf,
      });

      return result as { sucesso: boolean; motivo?: string };
    },
    onSuccess: (result) => {
      if (result.sucesso) {
        setIdentityValidated(true);
        toast.success('Identidade validada com sucesso');
      } else {
        toast.error(result.motivo || 'Dados não conferem');
      }
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Mutation: Atualizar perfil (campos faltantes + redes sociais)
  const updateProfile = useMutation({
    mutationFn: async (data: {
      profileData?: Record<string, unknown>;
      socialNetworks?: Array<{ plataforma: string; usuario: string; url?: string; seguidores?: number }>;
    }) => {
      if (!contractId || !token) throw new Error('Dados da sessão inválidos');

      const result = await callEdgeFunction({
        action: 'update-profile',
        contractId,
        token,
        profileData: data.profileData,
        socialNetworks: data.socialNetworks,
      });

      return result as {
        sucesso: boolean;
        influenciadora: PublicContractData['influenciadora'];
        socialNetworks: PublicSocialNetwork[];
      };
    },
    onSuccess: (result) => {
      if (result.sucesso) {
        // Atualizar cache do contrato com dados novos
        queryClient.setQueryData<PublicContractData>(
          ['public-contract', contractId, token],
          (old) => {
            if (!old) return old;
            return {
              ...old,
              influenciadora: result.influenciadora,
              socialNetworks: result.socialNetworks,
              contrato: {
                ...old.contrato,
                influencer: result.influenciadora,
              },
            };
          }
        );
        toast.success('Cadastro atualizado com sucesso!');
      }
    },
    onError: (error: Error) => {
      console.error('Erro ao atualizar perfil:', error);
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Mutation: Registrar assinatura
  const registerSignature = useMutation({
    mutationFn: async (signatureData: {
      canvas_data: string;
      user_agent: string;
    }) => {
      if (!contractId || !token) throw new Error('Dados da sessão inválidos');

      const result = await callEdgeFunction({
        action: 'register-signature',
        contractId,
        token,
        signatureData: {
          canvas_data: signatureData.canvas_data,
          ip_address: 'edge-function',
          user_agent: signatureData.user_agent,
        },
      });

      return result as { sucesso: boolean; signed_at: string };
    },
    onSuccess: () => {
      toast.success('Assinatura registrada com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Erro ao registrar assinatura:', error);
      toast.error(`Erro: ${error.message}`);
    },
  });

  return {
    // Dados do contrato (carregados ao validar token)
    contractData: contractQuery.data || null,
    contrato: contractQuery.data?.contrato || null,
    influenciadora: contractQuery.data?.influenciadora || null,
    branding: contractQuery.data?.branding || null,
    tenant: contractQuery.data?.tenant || null,
    franchise: contractQuery.data?.franchise || null,
    documento: contractQuery.data?.documento || null,
    socialNetworks: contractQuery.data?.socialNetworks || [],

    // Aditivos
    aditivos: aditivosQuery.data || [],
    isLoadingAditivos: aditivosQuery.isLoading,

    // Estado
    isLoading: contractQuery.isLoading,
    isError: contractQuery.isError,
    error: contractQuery.error,
    identityValidated,

    // Mutations
    validateIdentity,
    updateProfile,
    registerSignature,
  };
}
