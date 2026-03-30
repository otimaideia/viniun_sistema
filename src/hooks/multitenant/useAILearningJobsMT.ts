import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import type { AILearningJob, AILearningSource, AILearningStatus } from '@/types/ai-sales-assistant';

interface LearningJobFilters {
  job_type?: AILearningSource;
  status?: AILearningStatus;
  limit?: number;
}

export function useAILearningJobsMT(filters?: LearningJobFilters) {
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();

  const jobs = useQuery({
    queryKey: ['mt-ai-learning-jobs', tenant?.id, filters],
    queryFn: async () => {
      if (!tenant) throw new Error('Tenant não carregado');

      let query = (supabase as any)
        .from('mt_ai_learning_jobs')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false });

      if (filters?.job_type) query = query.eq('source', filters.job_type);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.limit) query = query.limit(filters.limit);

      const { data, error } = await query;
      if (error) throw error;
      return data as AILearningJob[];
    },
    enabled: !isTenantLoading && !!tenant,
  });

  return {
    jobs: jobs.data || [],
    isLoading: jobs.isLoading || isTenantLoading,
    error: jobs.error,
    refetch: jobs.refetch,
  };
}
