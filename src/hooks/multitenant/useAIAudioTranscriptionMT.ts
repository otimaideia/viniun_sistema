import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import type { AIAudioTranscription } from '@/types/ai-agent';

export function useAIAudioTranscriptionMT(conversationId: string | null) {
  const { tenant } = useTenantContext();
  const queryClient = useQueryClient();

  // Fetch cached transcriptions for this conversation
  const transcriptions = useQuery({
    queryKey: ['mt-ai-transcriptions', conversationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('mt_ai_audio_transcriptions')
        .select('*')
        .eq('conversation_id', conversationId!);

      if (error) throw error;
      return (data || []) as AIAudioTranscription[];
    },
    enabled: !!conversationId,
  });

  // Transcribe a single audio message
  const transcribe = useMutation({
    mutationFn: async ({ messageId, mediaUrl }: { messageId: string; mediaUrl: string }) => {
      if (!tenant) throw new Error('Tenant não carregado');

      const { data, error } = await supabase.functions.invoke('ai-transcribe-audio', {
        body: {
          message_id: messageId,
          conversation_id: conversationId,
          media_url: mediaUrl,
          tenant_id: tenant.id,
        },
      });

      if (error) throw error;

      // Invalidate cache to show new transcription
      queryClient.invalidateQueries({ queryKey: ['mt-ai-transcriptions', conversationId] });

      return data as { transcription: string; cached: boolean };
    },
  });

  // Get transcription for a specific message from cache
  const getTranscription = (messageId: string): string | null => {
    return transcriptions.data?.find(t => t.message_id === messageId)?.transcription || null;
  };

  // Check if a message has been transcribed
  const isTranscribed = (messageId: string): boolean => {
    return transcriptions.data?.some(t => t.message_id === messageId) || false;
  };

  // Get transcription map for quick lookup
  const transcriptionMap = new Map<string, string>();
  transcriptions.data?.forEach(t => {
    transcriptionMap.set(t.message_id, t.transcription);
  });

  return {
    transcriptions: transcriptions.data || [],
    transcriptionMap,
    transcribe,
    isTranscribing: transcribe.isPending,
    getTranscription,
    isTranscribed,
    isLoading: transcriptions.isLoading,
  };
}
