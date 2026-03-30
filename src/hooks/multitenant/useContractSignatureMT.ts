import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { contractTemplateService } from '@/services/contracts/contractTemplateService';

export interface MTContractAccessLog {
  id: string;
  tenant_id: string;
  contract_id: string;
  influencer_id: string;
  acao: 'visualizacao' | 'download' | 'assinatura' | 'inicio_assinatura' | 'validacao_identidade';
  session_token: string | null;
  session_expires_at: string | null;
  cpf_informado: string | null;
  email_informado: string | null;
  nome_informado: string | null;
  validacao_sucesso: boolean | null;
  assinatura_data: string | null;
  assinatura_canvas_data: string | null;
  ip_address: string | null;
  user_agent: string | null;
  detalhes: Record<string, any>;
  created_at: string;
}

export interface SignatureSession {
  contract_id: string;
  influencer_id: string;
  session_token: string;
  link_assinatura: string;
  expires_at: Date;
}

export interface IdentityValidationData {
  cpf: string;
  email: string;
  nome: string;
}

export interface SignatureData {
  session_token: string;
  canvas_data: string; // Base64 da assinatura desenhada
  ip_address: string;
  user_agent: string;
}

export function useContractSignatureMT(contractId?: string) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // Query: Histórico de acessos de um contrato
  const query = useQuery({
    queryKey: ['mt-contract-access-log', contractId, tenant?.id],
    queryFn: async () => {
      if (!contractId) return [];

      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado');
      }

      let q = supabase
        .from('mt_influencer_contract_access_log')
        .select('*')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: false });

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('tenant_id', tenant!.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as MTContractAccessLog[];
    },
    enabled: !isTenantLoading && !!contractId && (!!tenant || accessLevel === 'platform'),
  });

  // Mutation: Iniciar processo de assinatura
  const initiateSignature = useMutation({
    mutationFn: async ({
      contract_id,
      influencer_id,
    }: {
      contract_id: string;
      influencer_id: string;
    }) => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      // VALIDAÇÃO CRÍTICA: Verificar se documento foi gerado
      const { data: existingDocument, error: docError } = await supabase
        .from('mt_influencer_contract_documents')
        .select('id, nome_arquivo')
        .eq('contract_id', contract_id)
        .eq('tipo_documento', 'contrato_principal')
        .maybeSingle();

      if (docError) {
        throw new Error(`Erro ao verificar documento: ${docError.message}`);
      }

      if (!existingDocument) {
        throw new Error('Documento do contrato precisa ser gerado antes de solicitar assinatura. Clique em "Gerar Documento" primeiro.');
      }

      // Gerar token de sessão único
      const sessionToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 30); // 30 minutos

      // Criar link de assinatura
      const baseUrl = window.location.origin;
      const linkAssinatura = `${baseUrl}/influenciadora/contrato/${contract_id}/assinar?token=${sessionToken}`;

      // Registrar início da sessão de assinatura
      const { data, error } = await supabase
        .from('mt_influencer_contract_access_log')
        .insert({
          tenant_id: tenant?.id,
          contract_id,
          influencer_id,
          acao: 'inicio_assinatura',
          session_token: sessionToken,
          session_expires_at: expiresAt.toISOString(),
          ip_address: null, // Será preenchido no frontend
          user_agent: navigator.userAgent,
          detalhes: {
            initiated_at: new Date().toISOString(),
            link_gerado: linkAssinatura,
          },
        })
        .select()
        .single();

      if (error) throw error;

      return {
        contract_id,
        influencer_id,
        session_token: sessionToken,
        link_assinatura: linkAssinatura,
        expires_at: expiresAt,
      } as SignatureSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-contract-access-log'] });
      toast.success('Sessão de assinatura criada');
    },
    onError: (error: any) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Mutation: Validar identidade do assinante
  const validateIdentity = useMutation({
    mutationFn: async ({
      contract_id,
      influencer_id,
      session_token,
      identity_data,
    }: {
      contract_id: string;
      influencer_id: string;
      session_token: string;
      identity_data: IdentityValidationData;
    }) => {
      // Buscar dados da influenciadora
      const { data: influencer, error: influencerError } = await supabase
        .from('mt_influencers')
        .select('cpf, email, nome')
        .eq('id', influencer_id)
        .single();

      if (influencerError) throw influencerError;

      // Validar CPF (remover formatação para comparar)
      const cpfMatch = influencer.cpf?.replace(/\D/g, '') === identity_data.cpf.replace(/\D/g, '');

      // Validar email (case-insensitive)
      const emailMatch = influencer.email?.toLowerCase() === identity_data.email.toLowerCase();

      // Validar nome (case-insensitive, ignora espaços extras)
      const normalizedDbName = influencer.nome?.toLowerCase().trim().replace(/\s+/g, ' ');
      const normalizedInputName = identity_data.nome.toLowerCase().trim().replace(/\s+/g, ' ');
      const nomeMatch = normalizedDbName === normalizedInputName;

      const validacaoSucesso = cpfMatch && emailMatch && nomeMatch;

      // Registrar tentativa de validação
      const { error } = await supabase
        .from('mt_influencer_contract_access_log')
        .insert({
          tenant_id: tenant?.id,
          contract_id,
          influencer_id,
          acao: 'validacao_identidade',
          session_token,
          cpf_informado: identity_data.cpf,
          email_informado: identity_data.email,
          nome_informado: identity_data.nome,
          validacao_sucesso: validacaoSucesso,
          ip_address: null,
          user_agent: navigator.userAgent,
          detalhes: {
            cpf_match: cpfMatch,
            email_match: emailMatch,
            nome_match: nomeMatch,
            validated_at: new Date().toISOString(),
          },
        });

      if (error) throw error;

      return {
        sucesso: validacaoSucesso,
        motivo: !validacaoSucesso
          ? 'Dados informados não conferem com o cadastro'
          : undefined,
        detalhes: {
          cpf_match: cpfMatch,
          email_match: emailMatch,
          nome_match: nomeMatch,
        },
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['mt-contract-access-log'] });
      if (result.sucesso) {
        toast.success('Identidade validada com sucesso');
      } else {
        toast.error(result.motivo || 'Falha na validação');
      }
    },
    onError: (error: any) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Mutation: Registrar assinatura
  const registerSignature = useMutation({
    mutationFn: async ({
      contract_id,
      influencer_id,
      signature_data,
    }: {
      contract_id: string;
      influencer_id: string;
      signature_data: SignatureData;
    }) => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      // VALIDAÇÃO CRÍTICA: Verificar se documento foi gerado antes de registrar assinatura
      const { data: existingDocument, error: docError } = await supabase
        .from('mt_influencer_contract_documents')
        .select('id, nome_arquivo, hash_arquivo')
        .eq('contract_id', contract_id)
        .eq('tipo_documento', 'contrato_principal')
        .maybeSingle();

      if (docError) {
        throw new Error(`Erro ao verificar documento: ${docError.message}`);
      }

      if (!existingDocument) {
        throw new Error('Não é possível assinar um contrato sem documento gerado. Este é um erro crítico de segurança.');
      }

      // 1. Registrar log de assinatura
      const { data: logData, error: logError } = await supabase
        .from('mt_influencer_contract_access_log')
        .insert({
          tenant_id: tenant?.id,
          contract_id,
          influencer_id,
          acao: 'assinatura',
          session_token: signature_data.session_token,
          assinatura_data: new Date().toISOString(),
          assinatura_canvas_data: signature_data.canvas_data,
          ip_address: signature_data.ip_address,
          user_agent: signature_data.user_agent,
          detalhes: {
            signed_at: new Date().toISOString(),
            canvas_data_length: signature_data.canvas_data.length,
          },
        })
        .select()
        .single();

      if (logError) throw logError;

      // 2. Atualizar status do contrato para 'assinado'
      const { error: contractError } = await supabase
        .from('mt_influencer_contracts')
        .update({
          status: 'ativo', // Contrato assinado fica ativo
          updated_at: new Date().toISOString(),
        })
        .eq('id', contract_id);

      if (contractError) throw contractError;

      // 3. Registrar histórico de mudança de status
      await supabase
        .from('mt_influencer_contract_history')
        .insert({
          tenant_id: tenant?.id,
          contract_id,
          status_anterior: 'pausado',
          status_novo: 'ativo',
          motivo: 'Assinatura digital realizada',
          usuario_id: null,
          ip_address: signature_data.ip_address,
          user_agent: signature_data.user_agent,
        });

      // 4. Gerar certificado de assinatura (documento adicional)
      const certificateData = {
        contract_id,
        influencer_id,
        signature_date: new Date().toISOString(),
        signature_hash: await contractTemplateService.generateDocumentHash(
          new TextEncoder().encode(signature_data.canvas_data)
        ),
        document_signed: {
          document_id: existingDocument.id,
          document_name: existingDocument.nome_arquivo,
          document_hash: existingDocument.hash_arquivo,
          verified: true,
        },
        ip_address: signature_data.ip_address,
        user_agent: signature_data.user_agent,
      };

      const certificateContent = JSON.stringify(certificateData, null, 2);
      const certificateBase64 = btoa(certificateContent);

      await supabase
        .from('mt_influencer_contract_documents')
        .insert({
          tenant_id: tenant?.id,
          contract_id,
          tipo_documento: 'certificado',
          nome_arquivo: `Certificado_Assinatura_${contract_id}.json`,
          conteudo_base64: certificateBase64,
          hash_arquivo: await contractTemplateService.generateDocumentHash(
            new TextEncoder().encode(certificateContent)
          ),
          tamanho: certificateContent.length,
          mime_type: 'application/json',
          metadata: certificateData,
        });

      return logData as MTContractAccessLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-contract-access-log'] });
      queryClient.invalidateQueries({ queryKey: ['mt-influencer-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['mt-contract-documents'] });
      toast.success('Assinatura registrada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao registrar assinatura:', error);
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Mutation: Registrar visualização
  const logVisualization = useMutation({
    mutationFn: async ({
      contract_id,
      influencer_id,
      session_token,
    }: {
      contract_id: string;
      influencer_id: string;
      session_token?: string;
    }) => {
      const { error } = await supabase
        .from('mt_influencer_contract_access_log')
        .insert({
          tenant_id: tenant?.id,
          contract_id,
          influencer_id,
          acao: 'visualizacao',
          session_token,
          ip_address: null,
          user_agent: navigator.userAgent,
          detalhes: {
            viewed_at: new Date().toISOString(),
          },
        });

      if (error) throw error;
    },
  });

  return {
    accessLog: query.data || [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    initiateSignature,
    validateIdentity,
    registerSignature,
    logVisualization,
  };
}
