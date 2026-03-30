import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { contractTemplateService, ContractData, TemplateType } from '@/services/contracts/contractTemplateService';

export interface MTContractDocument {
  id: string;
  tenant_id: string;
  contract_id: string;
  tipo_documento: 'contrato_principal' | 'aditivo' | 'comprovante_assinatura' | 'certificado';
  nome_arquivo: string;
  url_arquivo: string | null;
  conteudo_base64: string | null;
  hash_arquivo: string | null;
  tamanho: number | null;
  mime_type: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface GenerateContractInput {
  contract_id: string;
  influencer_data: any;
  contract_data: any;
  tenant_data: any;
  franchise_data?: any;
  template_type?: TemplateType;
}

export function useContractDocumentsMT(contractId?: string) {
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // Query: Listar documentos de um contrato
  const query = useQuery({
    queryKey: ['mt-contract-documents', contractId, tenant?.id],
    queryFn: async () => {
      if (!contractId) return [];

      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não carregado');
      }

      let q = supabase
        .from('mt_influencer_contract_documents')
        .select('*')
        .eq('contract_id', contractId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('tenant_id', tenant!.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as MTContractDocument[];
    },
    enabled: !isTenantLoading && !!contractId && (!!tenant || accessLevel === 'platform'),
  });

  // Mutation: Salvar metadados do documento (HTML → PDF via print)
  const saveDocumentMetadata = useMutation({
    mutationFn: async (input: GenerateContractInput) => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      // Gerar número do contrato se não existir
      const contractNumber = input.contract_data.numero || contractTemplateService.generateContractNumber(
        tenant?.slug || 'YLS',
        input.influencer_data.id
      );

      // Gerar hash simples baseado nos dados do contrato (para tracking)
      const dataString = JSON.stringify({
        contract_id: input.contract_id,
        contract_number: contractNumber,
        influencer: input.influencer_data.nome,
        tenant: input.tenant_data.nome_fantasia,
        generated_at: new Date().toISOString(),
      });
      const hash = await contractTemplateService.generateDocumentHash(
        new TextEncoder().encode(dataString)
      );

      // Salvar metadados no banco (sem conteúdo PDF)
      const { data, error } = await supabase
        .from('mt_influencer_contract_documents')
        .insert({
          tenant_id: tenant?.id,
          contract_id: input.contract_id,
          tipo_documento: 'contrato_principal',
          nome_arquivo: `Contrato_${contractNumber}.pdf`,
          conteudo_base64: null, // PDF gerado via browser print
          hash_arquivo: hash,
          tamanho: null, // Tamanho não conhecido
          mime_type: 'application/pdf',
          metadata: {
            generation_method: 'html_print', // Marca como gerado via HTML → Print
            generated_at: new Date().toISOString(),
            contract_number: contractNumber,
            influencer_name: input.influencer_data.nome,
            contract_type: input.contract_data.tipo,
          },
        })
        .select()
        .single();

      if (error) throw error;
      return data as MTContractDocument;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-contract-documents'] });
      toast.success('Metadados do documento salvos com sucesso');
    },
    onError: (error: any) => {
      console.error('Erro ao salvar metadados:', error);
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Mutation: Gerar documento de contrato (DEPRECADO - usar saveDocumentMetadata)
  const generateDocument = useMutation({
    mutationFn: async (input: GenerateContractInput) => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      // 1. Preparar dados do contrato
      const contractData: ContractData = {
        // Influencer
        influencer_nome: input.influencer_data.nome,
        influencer_nome_artistico: input.influencer_data.nome_artistico,
        influencer_cpf: input.influencer_data.cpf,
        influencer_rg: input.influencer_data.rg,
        influencer_endereco: input.influencer_data.endereco,
        influencer_cidade: input.influencer_data.cidade,
        influencer_estado: input.influencer_data.estado,
        influencer_cep: input.influencer_data.cep,
        influencer_email: input.influencer_data.email,
        influencer_telefone: input.influencer_data.telefone,
        influencer_instagram: input.influencer_data.instagram,
        influencer_seguidores: input.influencer_data.seguidores,

        // Contract
        contract_numero: input.contract_data.numero || contractTemplateService.generateContractNumber(
          tenant?.slug || 'YLS',
          input.influencer_data.id
        ),
        contract_tipo: input.contract_data.tipo,
        contract_data_inicio: input.contract_data.data_inicio,
        contract_data_fim: input.contract_data.data_fim,
        contract_valor_mensal: input.contract_data.valor_mensal,
        contract_valor_por_post: input.contract_data.valor_por_post,
        contract_percentual_comissao: input.contract_data.percentual_comissao,
        contract_valor_comissao_fixa: input.contract_data.valor_comissao_fixa,
        contract_credito_permuta: input.contract_data.credito_permuta,
        contract_posts_mes: input.contract_data.posts_mes,
        contract_stories_mes: input.contract_data.stories_mes,
        contract_reels_mes: input.contract_data.reels_mes,

        // Tenant
        tenant_razao_social: input.tenant_data.razao_social || input.tenant_data.nome_fantasia,
        tenant_nome_fantasia: input.tenant_data.nome_fantasia,
        tenant_cnpj: input.tenant_data.cnpj || '00.000.000/0000-00',
        tenant_endereco: input.tenant_data.endereco,
        tenant_cidade: input.tenant_data.cidade,
        tenant_estado: input.tenant_data.estado,
        tenant_cep: input.tenant_data.cep,

        // Franchise (opcional)
        franchise_nome: input.franchise_data?.nome,
        franchise_cnpj: input.franchise_data?.cnpj,
        franchise_endereco: input.franchise_data?.endereco,
        franchise_cidade: input.franchise_data?.cidade,
        franchise_estado: input.franchise_data?.estado,
      };

      // 2. Determinar tipo de template
      const templateType: TemplateType = input.template_type ||
        (input.contract_data.tipo === 'permuta' ? 'contrato_permuta' : 'contrato_normal');

      // 3. Gerar documento PDF
      const pdfBuffer = await contractTemplateService.generateDOCX(templateType, contractData);

      // 4. Gerar hash do documento
      const hash = await contractTemplateService.generateDocumentHash(pdfBuffer);

      // 5. Converter para base64
      const base64Content = contractTemplateService.arrayBufferToBase64(pdfBuffer);

      // 6. Salvar no banco
      const { data, error } = await supabase
        .from('mt_influencer_contract_documents')
        .insert({
          tenant_id: tenant?.id,
          contract_id: input.contract_id,
          tipo_documento: 'contrato_principal',
          nome_arquivo: `Contrato_${contractData.contract_numero}.pdf`,
          conteudo_base64: base64Content,
          hash_arquivo: hash,
          tamanho: pdfBuffer.byteLength,
          mime_type: 'application/pdf',
          metadata: {
            template_type: templateType,
            generated_at: new Date().toISOString(),
            contract_number: contractData.contract_numero,
          },
        })
        .select()
        .single();

      if (error) throw error;
      return data as MTContractDocument;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-contract-documents'] });
      toast.success('Documento gerado com sucesso');
    },
    onError: (error: any) => {
      console.error('Erro ao gerar documento:', error);
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Mutation: Fazer upload de documento adicional
  const uploadDocument = useMutation({
    mutationFn: async ({
      contract_id,
      tipo_documento,
      file,
      metadata = {},
    }: {
      contract_id: string;
      tipo_documento: MTContractDocument['tipo_documento'];
      file: File;
      metadata?: Record<string, any>;
    }) => {
      if (!tenant && accessLevel !== 'platform') {
        throw new Error('Tenant não definido');
      }

      // Ler arquivo como ArrayBuffer
      const buffer = await file.arrayBuffer();
      const base64 = contractTemplateService.arrayBufferToBase64(buffer);
      const hash = await contractTemplateService.generateDocumentHash(buffer);

      const { data, error } = await supabase
        .from('mt_influencer_contract_documents')
        .insert({
          tenant_id: tenant?.id,
          contract_id,
          tipo_documento,
          nome_arquivo: file.name,
          conteudo_base64: base64,
          hash_arquivo: hash,
          tamanho: file.size,
          mime_type: file.type,
          metadata: {
            ...metadata,
            uploaded_at: new Date().toISOString(),
            original_name: file.name,
          },
        })
        .select()
        .single();

      if (error) throw error;
      return data as MTContractDocument;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-contract-documents'] });
      toast.success('Documento enviado com sucesso');
    },
    onError: (error: any) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Mutation: Deletar documento (soft delete)
  const deleteDocument = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mt_influencer_contract_documents')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-contract-documents'] });
      toast.success('Documento removido');
    },
  });

  // Helper: Baixar documento
  const downloadDocument = (document: MTContractDocument) => {
    if (!document.conteudo_base64) {
      toast.error('Conteúdo do documento não disponível');
      return;
    }

    try {
      const buffer = contractTemplateService.base64ToArrayBuffer(document.conteudo_base64);
      const blob = new Blob([buffer], { type: document.mime_type || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);

      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.nome_arquivo;
      a.click();

      URL.revokeObjectURL(url);
      toast.success('Download iniciado');
    } catch (error) {
      console.error('Erro ao baixar documento:', error);
      toast.error('Erro ao baixar documento');
    }
  };

  return {
    documents: query.data || [],
    isLoading: query.isLoading || isTenantLoading,
    error: query.error,
    refetch: query.refetch,
    saveDocumentMetadata, // Nova função simplificada (HTML → PDF)
    generateDocument, // DEPRECADO - usar saveDocumentMetadata
    uploadDocument,
    deleteDocument,
    downloadDocument,
  };
}
