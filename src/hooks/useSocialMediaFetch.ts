import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ============================================
// Types
// ============================================

export interface SocialMediaProfile {
  platform: string;
  username: string;
  external_id: string | null;
  profile_name: string | null;
  profile_picture_url: string | null;
  followers: number;
  engagement_rate: number;
  is_verified: boolean;
  error: string | null;
  fetch_duration_ms?: number;
}

export interface SupportedPlatforms {
  fully_supported: string[];
  partially_supported: string[];
  manual_only: string[];
  notes: Record<string, string>;
}

export type FetchStatus = 'idle' | 'fetching' | 'success' | 'error';

// ============================================
// Hook
// ============================================

export function useSocialMediaFetch() {
  const [fetchStatuses, setFetchStatuses] = useState<Record<string, FetchStatus>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  /**
   * Supported platforms for auto-fetch
   */
  const supportedPlatforms: SupportedPlatforms = {
    fully_supported: ['youtube'],
    partially_supported: ['instagram', 'tiktok'],
    manual_only: ['facebook', 'twitter', 'kwai', 'linkedin', 'pinterest'],
    notes: {
      youtube: 'Requer YouTube API Key nas configurações',
      instagram: 'API pública, pode ser instável',
      tiktok: 'Extração via web, pode falhar',
    }
  };

  /**
   * Check if a platform supports auto-fetch
   */
  const isAutoFetchSupported = useCallback((platform: string): boolean => {
    const normalized = platform.toLowerCase();
    return (
      supportedPlatforms.fully_supported.includes(normalized) ||
      supportedPlatforms.partially_supported.includes(normalized)
    );
  }, []);

  /**
   * Get fetch status for a specific platform/key
   */
  const getFetchStatus = useCallback((key: string): FetchStatus => {
    return fetchStatuses[key] || 'idle';
  }, [fetchStatuses]);

  /**
   * Get error message for a specific platform/key
   */
  const getError = useCallback((key: string): string | null => {
    return errors[key] || null;
  }, [errors]);

  /**
   * Fetch social media profile data
   */
  const fetchProfile = useCallback(async (
    platform: string,
    username: string,
    key?: string
  ): Promise<SocialMediaProfile | null> => {
    const statusKey = key || `${platform}-${username}`;

    // Validate input
    if (!platform || !username) {
      const error = 'Plataforma e username são obrigatórios';
      setErrors(prev => ({ ...prev, [statusKey]: error }));
      return null;
    }

    // Check if platform is supported
    if (!isAutoFetchSupported(platform)) {
      const error = `Auto-fetch não suportado para ${platform}. Preencha manualmente.`;
      setErrors(prev => ({ ...prev, [statusKey]: error }));
      return {
        platform,
        username,
        external_id: null,
        profile_name: null,
        profile_picture_url: null,
        followers: 0,
        engagement_rate: 0,
        is_verified: false,
        error,
      };
    }

    // Set loading state
    setFetchStatuses(prev => ({ ...prev, [statusKey]: 'fetching' }));
    setErrors(prev => ({ ...prev, [statusKey]: null }));

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Get Supabase URL from environment
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      // Call Edge Function
      const response = await fetch(
        `${supabaseUrl}/functions/v1/social-media-proxy/fetch-profile`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ platform, username }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Erro ${response.status}`;
        throw new Error(errorMessage);
      }

      const profile: SocialMediaProfile = await response.json();

      if (profile.error) {
        setFetchStatuses(prev => ({ ...prev, [statusKey]: 'error' }));
        setErrors(prev => ({ ...prev, [statusKey]: profile.error }));
        toast.warning(profile.error);
        return profile;
      }

      setFetchStatuses(prev => ({ ...prev, [statusKey]: 'success' }));
      setErrors(prev => ({ ...prev, [statusKey]: null }));

      toast.success(`Dados de ${platform} carregados com sucesso!`);
      return profile;

    } catch (err: any) {
      console.error('Social media fetch error:', err);
      const errorMessage = err.message || 'Erro ao buscar dados da rede social';

      setFetchStatuses(prev => ({ ...prev, [statusKey]: 'error' }));
      setErrors(prev => ({ ...prev, [statusKey]: errorMessage }));

      toast.error(errorMessage);

      return {
        platform,
        username,
        external_id: null,
        profile_name: null,
        profile_picture_url: null,
        followers: 0,
        engagement_rate: 0,
        is_verified: false,
        error: errorMessage,
      };
    }
  }, [isAutoFetchSupported]);

  /**
   * Reset all states
   */
  const reset = useCallback(() => {
    setFetchStatuses({});
    setErrors({});
  }, []);

  /**
   * Reset state for a specific key
   */
  const resetKey = useCallback((key: string) => {
    setFetchStatuses(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setErrors(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  /**
   * Check if any fetch is in progress
   */
  const isAnyFetching = Object.values(fetchStatuses).some(s => s === 'fetching');

  return {
    // Functions
    fetchProfile,
    isAutoFetchSupported,
    getFetchStatus,
    getError,
    reset,
    resetKey,

    // State
    fetchStatuses,
    errors,
    isAnyFetching,

    // Constants
    supportedPlatforms,
  };
}

// ============================================
// Utility: Parse username from URL
// ============================================

export function parseUsernameFromUrl(url: string, platform: string): string | null {
  const normalized = platform.toLowerCase();

  try {
    switch (normalized) {
      case 'instagram': {
        const match = url.match(/instagram\.com\/([^/?]+)/);
        return match ? match[1].replace('@', '') : null;
      }
      case 'tiktok': {
        const match = url.match(/tiktok\.com\/@?([^/?]+)/);
        return match ? match[1].replace('@', '') : null;
      }
      case 'youtube': {
        const match = url.match(/youtube\.com\/(?:channel\/|c\/|@|user\/)([^/?]+)/);
        return match ? match[1] : null;
      }
      case 'twitter': {
        const match = url.match(/(?:twitter|x)\.com\/([^/?]+)/);
        return match ? match[1].replace('@', '') : null;
      }
      case 'facebook': {
        const match = url.match(/facebook\.com\/([^/?]+)/);
        return match ? match[1] : null;
      }
      case 'linkedin': {
        const match = url.match(/linkedin\.com\/(?:in|company)\/([^/?]+)/);
        return match ? match[1] : null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

// ============================================
// Utility: Format follower count
// ============================================

export function formatFollowers(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}
