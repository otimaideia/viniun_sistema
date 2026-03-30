import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MTTaskAttachment } from '@/types/tarefa';

const BUCKET = 'tarefa-anexos';
const MAX_SIZE_IMAGE = 5 * 1024 * 1024; // 5MB
const MAX_SIZE_DOC = 10 * 1024 * 1024; // 10MB

export function useTarefaAttachmentsMT(taskId: string | undefined) {
  const { tenant, user } = useTenantContext();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const query = useQuery({
    queryKey: ['mt-task-attachments', taskId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('mt_task_attachments') as any)
        .select('*, uploader:mt_users!uploaded_by(id, nome)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as MTTaskAttachment[];
    },
    enabled: !!taskId,
  });

  const upload = async (file: File, commentId?: string): Promise<string | null> => {
    if (!tenant?.id || !taskId || !user?.id) {
      toast.error('Contexto não carregado');
      return null;
    }

    const isImage = file.type.startsWith('image/');
    const maxSize = isImage ? MAX_SIZE_IMAGE : MAX_SIZE_DOC;

    if (file.size > maxSize) {
      toast.error(`Arquivo muito grande (máx ${isImage ? '5MB' : '10MB'})`);
      return null;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'bin';
      const path = `${tenant.id}/${taskId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(path);

      // Salvar registro no banco
      const { error: dbError } = await (supabase
        .from('mt_task_attachments') as any)
        .insert({
          tenant_id: tenant.id,
          task_id: taskId,
          comment_id: commentId || null,
          uploaded_by: user.id,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_type: file.type,
          file_size: file.size,
        });

      if (dbError) throw dbError;

      // Log atividade
      await (supabase.from('mt_task_activities') as any).insert({
        tenant_id: tenant.id,
        task_id: taskId,
        user_id: user.id,
        acao: 'anexou',
        descricao: `Anexou: ${file.name}`,
      });

      queryClient.invalidateQueries({ queryKey: ['mt-task-attachments', taskId] });
      queryClient.invalidateQueries({ queryKey: ['mt-task-activities', taskId] });
      toast.success('Arquivo enviado');
      return urlData.publicUrl;
    } catch (err: any) {
      toast.error(`Erro no upload: ${err.message}`);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const remove = useMutation({
    mutationFn: async (attachmentId: string) => {
      const { error } = await (supabase
        .from('mt_task_attachments') as any)
        .delete()
        .eq('id', attachmentId);

      if (error) throw error;

      // Log
      if (tenant?.id && user?.id) {
        await (supabase.from('mt_task_activities') as any).insert({
          tenant_id: tenant.id,
          task_id: taskId,
          user_id: user.id,
          acao: 'removeu_anexo',
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-task-attachments', taskId] });
      queryClient.invalidateQueries({ queryKey: ['mt-task-activities', taskId] });
      toast.success('Anexo removido');
    },
    onError: (err: Error) => {
      toast.error(`Erro: ${err.message}`);
    },
  });

  return {
    attachments: query.data || [],
    isLoading: query.isLoading,
    upload,
    uploading,
    remove,
    refetch: query.refetch,
  };
}
