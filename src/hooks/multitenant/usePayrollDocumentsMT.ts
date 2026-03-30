import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PayrollDocument {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  employee_id: string;
  categoria: string;
  nome: string;
  descricao: string | null;
  arquivo_url: string;
  arquivo_nome: string;
  arquivo_tamanho: number;
  arquivo_tipo: string | null;
  competencia: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export const DOCUMENT_CATEGORIES = [
  { value: 'contrato_trabalho', label: 'Contrato de Trabalho' },
  { value: 'holerite', label: 'Holerite' },
  { value: 'comprovante_vr', label: 'Comprovante Vale Refeição' },
  { value: 'comprovante_vt', label: 'Comprovante Vale Transporte' },
  { value: 'comprovante_va', label: 'Comprovante Vale Alimentação' },
  { value: 'atestado_medico', label: 'Atestado Médico' },
  { value: 'ferias', label: 'Aviso/Recibo de Férias' },
  { value: 'rescisao', label: 'Termo de Rescisão' },
  { value: 'advertencia', label: 'Advertência' },
  { value: 'documento_pessoal', label: 'Documento Pessoal (RG, CPF, etc)' },
  { value: 'comprovante_endereco', label: 'Comprovante de Endereço' },
  { value: 'certidao', label: 'Certidão (Nascimento, Casamento, etc)' },
  { value: 'exame_admissional', label: 'Exame Admissional' },
  { value: 'exame_periodico', label: 'Exame Periódico' },
  { value: 'exame_demissional', label: 'Exame Demissional' },
  { value: 'treinamento', label: 'Certificado de Treinamento' },
  { value: 'outro', label: 'Outro' },
] as const;

export function usePayrollDocumentsMT(employeeId?: string) {
  const { tenant, franchise, accessLevel } = useTenantContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['mt-payroll-documents', tenant?.id, employeeId],
    queryFn: async () => {
      if (!employeeId) return [];

      let q = (supabase as any)
        .from('mt_payroll_documents')
        .select('*')
        .eq('employee_id', employeeId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (accessLevel === 'tenant' && tenant) {
        q = q.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        q = q.eq('franchise_id', franchise.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as PayrollDocument[];
    },
    enabled: !!employeeId && (!!tenant || accessLevel === 'platform'),
  });

  const uploadDocument = useMutation({
    mutationFn: async ({
      file,
      categoria,
      nome,
      descricao,
      competencia
    }: {
      file: File;
      categoria: string;
      nome: string;
      descricao?: string;
      competencia?: string;
    }) => {
      if (!employeeId || !tenant) throw new Error('Dados incompletos');

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const filePath = `payroll/${tenant.id}/${employeeId}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documentos')
        .getPublicUrl(filePath);

      // Insert document record
      const { data, error } = await (supabase as any)
        .from('mt_payroll_documents')
        .insert({
          tenant_id: tenant.id,
          franchise_id: franchise?.id || null,
          employee_id: employeeId,
          categoria,
          nome,
          descricao: descricao || null,
          arquivo_url: urlData.publicUrl,
          arquivo_nome: file.name,
          arquivo_tamanho: file.size,
          arquivo_tipo: file.type,
          competencia: competencia || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-payroll-documents'] });
      toast.success('Documento enviado com sucesso');
    },
    onError: (error: any) => {
      toast.error(`Erro ao enviar: ${error.message}`);
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await (supabase as any)
        .from('mt_payroll_documents')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', docId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-payroll-documents'] });
      toast.success('Documento removido');
    },
    onError: (error: any) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  return {
    documents: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    uploadDocument,
    deleteDocument,
    refetch: query.refetch,
  };
}
