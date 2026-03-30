import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantContext } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AIAgentAnalysis } from '@/types/ai-agent';
import type { WhatsAppMensagem } from '@/types/whatsapp-chat';

export function useAIAnalysisMT(conversationId: string | null) {
  const { tenant } = useTenantContext();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch latest completed analysis for this conversation
  const latestAnalysis = useQuery({
    queryKey: ['mt-ai-analysis-latest', conversationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('mt_ai_agent_analyses')
        .select('*, agent:mt_ai_agents(*)')
        .eq('conversation_id', conversationId!)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as AIAgentAnalysis | null;
    },
    enabled: !!conversationId,
  });

  // Fetch analysis history for this conversation
  const history = useQuery({
    queryKey: ['mt-ai-analysis-history', conversationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('mt_ai_agent_analyses')
        .select('id, agent_id, status, quality_score, sentiment, lead_temperature, suggestions, created_at, completed_at, processing_time_ms, total_tokens, agent:mt_ai_agents(nome, icone, cor)')
        .eq('conversation_id', conversationId!)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []) as Partial<AIAgentAnalysis>[];
    },
    enabled: !!conversationId,
  });

  // Main analysis mutation
  const analyze = useMutation({
    mutationFn: async ({ agentId, messages }: {
      agentId: string;
      messages: WhatsAppMensagem[];
    }) => {
      if (!tenant) throw new Error('Tenant não carregado');
      if (!user) throw new Error('Usuário não autenticado');

      // 1. Create analysis record with processing status
      const { data: analysis, error: createError } = await (supabase as any)
        .from('mt_ai_agent_analyses')
        .insert({
          tenant_id: tenant.id,
          agent_id: agentId,
          conversation_id: conversationId!,
          requested_by: user.id,
          status: 'processing',
          messages_analyzed: messages.length,
        })
        .select()
        .single();

      if (createError) throw createError;

      // 2. Call edge function to process
      const { data: result, error: fnError } = await supabase.functions.invoke('ai-agent-analyze', {
        body: {
          analysis_id: analysis.id,
          agent_id: agentId,
          conversation_id: conversationId,
          tenant_id: tenant.id,
        },
      });

      if (fnError) {
        // Update analysis status to failed
        await (supabase as any)
          .from('mt_ai_agent_analyses')
          .update({
            status: 'failed',
            error_message: fnError.message,
            updated_at: new Date().toISOString(),
          })
          .eq('id', analysis.id);

        throw fnError;
      }

      // 3. Invalidate queries to show results
      queryClient.invalidateQueries({ queryKey: ['mt-ai-analysis-latest', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['mt-ai-analysis-history', conversationId] });

      return result;
    },
    onError: (error: Error) => {
      toast.error(`Erro na análise: ${error.message}`);
    },
  });

  // Mark a suggestion as used (feedback tracking)
  const markSuggestionUsed = useMutation({
    mutationFn: async ({ analysisId, suggestionId }: { analysisId: string; suggestionId: string }) => {
      const { error } = await (supabase as any)
        .from('mt_ai_agent_analyses')
        .update({
          suggestion_used_id: suggestionId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', analysisId);

      if (error) throw error;
    },
  });

  // Rate an analysis as helpful or not
  const rateAnalysis = useMutation({
    mutationFn: async ({ analysisId, wasHelpful, feedbackText }: {
      analysisId: string;
      wasHelpful: boolean;
      feedbackText?: string;
    }) => {
      const { error } = await (supabase as any)
        .from('mt_ai_agent_analyses')
        .update({
          was_helpful: wasHelpful,
          feedback_text: feedbackText || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', analysisId);

      if (error) throw error;
    },
    onSuccess: (_, { wasHelpful }) => {
      toast.success(wasHelpful ? 'Obrigado pelo feedback positivo!' : 'Feedback registrado');
    },
  });

  return {
    latestAnalysis: latestAnalysis.data,
    history: history.data || [],
    isLoadingLatest: latestAnalysis.isLoading,
    isLoadingHistory: history.isLoading,
    analyze,
    isAnalyzing: analyze.isPending,
    markSuggestionUsed,
    rateAnalysis,
  };
}
