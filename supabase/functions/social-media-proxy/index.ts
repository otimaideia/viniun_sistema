import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// ============================================
// Interfaces
// ============================================

interface SocialMediaProfile {
  platform: string;
  username: string;
  external_id: string | null;
  profile_name: string | null;
  profile_picture_url: string | null;
  followers: number;
  engagement_rate: number;
  is_verified: boolean;
  error: string | null;
}

interface FetchProfileRequest {
  platform: string;
  username: string;
  url?: string;
}

interface SyncResult {
  rede_social_id: string;
  influenciadora_id: string;
  platform: string;
  status: 'success' | 'error' | 'skipped' | 'not_supported';
  old_followers: number | null;
  new_followers: number | null;
  old_engagement: number | null;
  new_engagement: number | null;
  profile_name: string | null;
  profile_picture_url: string | null;
  is_verified: boolean;
  external_id: string | null;
  error_message: string | null;
  sync_duration_ms: number;
}

// ============================================
// YouTube Data API v3
// ============================================

async function fetchYouTubeProfile(
  username: string,
  apiKey: string
): Promise<SocialMediaProfile> {
  const baseResult: SocialMediaProfile = {
    platform: 'youtube',
    username,
    external_id: null,
    profile_name: null,
    profile_picture_url: null,
    followers: 0,
    engagement_rate: 0,
    is_verified: false,
    error: null,
  };

  if (!apiKey) {
    return { ...baseResult, error: 'YouTube API Key não configurada' };
  }

  try {
    // Handle different input formats
    let channelId: string | null = null;
    let searchUsername = username;

    // Check if it's a URL
    if (username.includes('youtube.com') || username.includes('youtu.be')) {
      const urlMatch = username.match(/(?:youtube\.com\/(?:channel\/|c\/|@|user\/))([^/?&]+)/);
      if (urlMatch) {
        searchUsername = urlMatch[1];
        // If it starts with UC, it's a channel ID
        if (searchUsername.startsWith('UC')) {
          channelId = searchUsername;
        }
      }
    }

    // Remove @ prefix if present
    searchUsername = searchUsername.replace(/^@/, '');

    // If we have a channel ID, fetch directly
    if (channelId) {
      const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`;
      const response = await fetch(channelUrl);

      if (!response.ok) {
        const errorData = await response.json();
        return { ...baseResult, error: `YouTube API Error: ${errorData?.error?.message || response.statusText}` };
      }

      const data = await response.json();

      if (data.items && data.items.length > 0) {
        const channel = data.items[0];
        return {
          platform: 'youtube',
          username: channel.snippet.customUrl || searchUsername,
          external_id: channel.id,
          profile_name: channel.snippet.title,
          profile_picture_url: channel.snippet.thumbnails?.default?.url || null,
          followers: parseInt(channel.statistics.subscriberCount) || 0,
          engagement_rate: 0, // YouTube doesn't provide this directly
          is_verified: false, // Would need additional API call
          error: null,
        };
      }
    }

    // Search by handle/username
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(searchUsername)}&key=${apiKey}&maxResults=1`;
    const searchResponse = await fetch(searchUrl);

    if (!searchResponse.ok) {
      const errorData = await searchResponse.json();
      return { ...baseResult, error: `YouTube API Error: ${errorData?.error?.message || searchResponse.statusText}` };
    }

    const searchData = await searchResponse.json();

    if (!searchData.items || searchData.items.length === 0) {
      return { ...baseResult, error: `Canal "${searchUsername}" não encontrado no YouTube` };
    }

    channelId = searchData.items[0].snippet.channelId;

    // Fetch channel details with statistics
    const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`;
    const channelResponse = await fetch(channelUrl);

    if (!channelResponse.ok) {
      const errorData = await channelResponse.json();
      return { ...baseResult, error: `YouTube API Error: ${errorData?.error?.message || channelResponse.statusText}` };
    }

    const channelData = await channelResponse.json();

    if (!channelData.items || channelData.items.length === 0) {
      return { ...baseResult, error: 'Canal não encontrado após busca' };
    }

    const channel = channelData.items[0];

    return {
      platform: 'youtube',
      username: channel.snippet.customUrl || searchUsername,
      external_id: channel.id,
      profile_name: channel.snippet.title,
      profile_picture_url: channel.snippet.thumbnails?.default?.url || null,
      followers: parseInt(channel.statistics.subscriberCount) || 0,
      engagement_rate: 0,
      is_verified: false,
      error: null,
    };
  } catch (err) {
    console.error('YouTube fetch error:', err);
    return { ...baseResult, error: `Erro ao buscar dados do YouTube: ${err.message}` };
  }
}

// ============================================
// Instagram Public API (Unofficial)
// ============================================

async function fetchInstagramProfile(username: string): Promise<SocialMediaProfile> {
  const baseResult: SocialMediaProfile = {
    platform: 'instagram',
    username,
    external_id: null,
    profile_name: null,
    profile_picture_url: null,
    followers: 0,
    engagement_rate: 0,
    is_verified: false,
    error: null,
  };

  try {
    // Clean username
    let cleanUsername = username;

    // Handle URL format
    if (username.includes('instagram.com')) {
      const match = username.match(/instagram\.com\/([^/?]+)/);
      if (match) {
        cleanUsername = match[1];
      }
    }

    // Remove @ prefix
    cleanUsername = cleanUsername.replace(/^@/, '');

    // Try the public web profile endpoint
    // Note: This is rate-limited and may not always work
    const profileUrl = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(cleanUsername)}`;

    const response = await fetch(profileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'X-IG-App-ID': '936619743392459',
      },
    });

    if (response.status === 401 || response.status === 403) {
      // Try alternative approach using i.instagram.com
      const altUrl = `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(cleanUsername)}`;
      const altResponse = await fetch(altUrl, {
        headers: {
          'User-Agent': 'Instagram 219.0.0.12.117 Android',
        },
      });

      if (!altResponse.ok) {
        return {
          ...baseResult,
          error: 'Instagram API indisponível. Por favor, preencha manualmente.'
        };
      }

      const altData = await altResponse.json();
      if (altData.data?.user) {
        const user = altData.data.user;
        return {
          platform: 'instagram',
          username: user.username || cleanUsername,
          external_id: user.id || null,
          profile_name: user.full_name || null,
          profile_picture_url: user.profile_pic_url || null,
          followers: user.edge_followed_by?.count || 0,
          engagement_rate: 0,
          is_verified: user.is_verified || false,
          error: null,
        };
      }
    }

    if (!response.ok) {
      if (response.status === 404) {
        return { ...baseResult, error: `Perfil "@${cleanUsername}" não encontrado no Instagram` };
      }
      return { ...baseResult, error: 'Instagram API indisponível. Por favor, preencha manualmente.' };
    }

    const data = await response.json();

    if (data.data?.user) {
      const user = data.data.user;
      return {
        platform: 'instagram',
        username: user.username || cleanUsername,
        external_id: user.id || null,
        profile_name: user.full_name || null,
        profile_picture_url: user.profile_pic_url || null,
        followers: user.edge_followed_by?.count || 0,
        engagement_rate: 0,
        is_verified: user.is_verified || false,
        error: null,
      };
    }

    return { ...baseResult, error: `Perfil "@${cleanUsername}" não encontrado` };
  } catch (err) {
    console.error('Instagram fetch error:', err);
    return {
      ...baseResult,
      error: 'Erro ao buscar dados do Instagram. Por favor, preencha manualmente.'
    };
  }
}

// ============================================
// TikTok Public API (Unofficial)
// ============================================

async function fetchTikTokProfile(username: string): Promise<SocialMediaProfile> {
  const baseResult: SocialMediaProfile = {
    platform: 'tiktok',
    username,
    external_id: null,
    profile_name: null,
    profile_picture_url: null,
    followers: 0,
    engagement_rate: 0,
    is_verified: false,
    error: null,
  };

  try {
    // Clean username
    let cleanUsername = username;

    // Handle URL format
    if (username.includes('tiktok.com')) {
      const match = username.match(/tiktok\.com\/@?([^/?]+)/);
      if (match) {
        cleanUsername = match[1];
      }
    }

    // Remove @ prefix
    cleanUsername = cleanUsername.replace(/^@/, '');

    // Try to fetch profile using web scraping approach
    // TikTok doesn't have a public API, so this is best-effort
    const profileUrl = `https://www.tiktok.com/@${encodeURIComponent(cleanUsername)}`;

    const response = await fetch(profileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { ...baseResult, error: `Perfil "@${cleanUsername}" não encontrado no TikTok` };
      }
      return { ...baseResult, error: 'TikTok API indisponível. Por favor, preencha manualmente.' };
    }

    const html = await response.text();

    // Try to extract data from the page's __UNIVERSAL_DATA_FOR_REHYDRATION__ script
    const dataMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([^<]+)<\/script>/);

    if (dataMatch) {
      try {
        const jsonData = JSON.parse(dataMatch[1]);
        const userInfo = jsonData?.__DEFAULT_SCOPE__?.['webapp.user-detail']?.userInfo?.user;
        const stats = jsonData?.__DEFAULT_SCOPE__?.['webapp.user-detail']?.userInfo?.stats;

        if (userInfo) {
          return {
            platform: 'tiktok',
            username: userInfo.uniqueId || cleanUsername,
            external_id: userInfo.id || null,
            profile_name: userInfo.nickname || null,
            profile_picture_url: userInfo.avatarThumb || userInfo.avatarMedium || null,
            followers: stats?.followerCount || 0,
            engagement_rate: 0,
            is_verified: userInfo.verified || false,
            error: null,
          };
        }
      } catch (parseErr) {
        console.error('TikTok JSON parse error:', parseErr);
      }
    }

    // Fallback: Try to extract basic data from meta tags
    const followerMatch = html.match(/followerCount['"]\s*:\s*(\d+)/);
    const nameMatch = html.match(/nickname['"]\s*:\s*['"]([^'"]+)['"]/);

    if (followerMatch) {
      return {
        platform: 'tiktok',
        username: cleanUsername,
        external_id: null,
        profile_name: nameMatch ? nameMatch[1] : null,
        profile_picture_url: null,
        followers: parseInt(followerMatch[1]) || 0,
        engagement_rate: 0,
        is_verified: false,
        error: null,
      };
    }

    return {
      ...baseResult,
      error: 'Não foi possível extrair dados do TikTok. Por favor, preencha manualmente.'
    };
  } catch (err) {
    console.error('TikTok fetch error:', err);
    return {
      ...baseResult,
      error: 'Erro ao buscar dados do TikTok. Por favor, preencha manualmente.'
    };
  }
}

// ============================================
// Main fetch function
// ============================================

async function fetchProfile(
  platform: string,
  username: string,
  youtubeApiKey: string | null
): Promise<SocialMediaProfile> {
  const normalizedPlatform = platform.toLowerCase();

  switch (normalizedPlatform) {
    case 'youtube':
      if (!youtubeApiKey) {
        return {
          platform: 'youtube',
          username,
          external_id: null,
          profile_name: null,
          profile_picture_url: null,
          followers: 0,
          engagement_rate: 0,
          is_verified: false,
          error: 'YouTube API Key não configurada. Vá em Configurações para adicionar.',
        };
      }
      return fetchYouTubeProfile(username, youtubeApiKey);

    case 'instagram':
      return fetchInstagramProfile(username);

    case 'tiktok':
      return fetchTikTokProfile(username);

    case 'facebook':
    case 'twitter':
    case 'kwai':
    case 'linkedin':
    case 'pinterest':
      return {
        platform: normalizedPlatform,
        username,
        external_id: null,
        profile_name: null,
        profile_picture_url: null,
        followers: 0,
        engagement_rate: 0,
        is_verified: false,
        error: `Auto-fetch não suportado para ${platform}. Por favor, preencha manualmente.`,
      };

    default:
      return {
        platform,
        username,
        external_id: null,
        profile_name: null,
        profile_picture_url: null,
        followers: 0,
        engagement_rate: 0,
        is_verified: false,
        error: `Plataforma "${platform}" não reconhecida.`,
      };
  }
}

// ============================================
// Sync all profiles (for cron job)
// ============================================

async function syncAllProfiles(
  supabase: any,
  youtubeApiKey: string | null,
  triggeredBy: string | null
): Promise<{ total: number; success: number; errors: number; results: SyncResult[] }> {
  const results: SyncResult[] = [];
  let success = 0;
  let errors = 0;

  // Fetch all social networks with sync enabled
  const { data: redesSociais, error } = await supabase
    .from('mt_influencer_social_networks')
    .select(`
      id,
      influencer_id,
      platform,
      username,
      url,
      followers,
      engagement_rate,
      sync_enabled,
      external_id
    `)
    .eq('sync_enabled', true)
    .not('username', 'is', null);

  if (error) {
    console.error('Error fetching redes sociais:', error);
    return { total: 0, success: 0, errors: 1, results: [] };
  }

  if (!redesSociais || redesSociais.length === 0) {
    return { total: 0, success: 0, errors: 0, results: [] };
  }

  // Process each social network with a delay to avoid rate limiting
  for (const rede of redesSociais) {
    const startTime = Date.now();

    try {
      const profile = await fetchProfile(
        rede.plataforma,
        rede.username || rede.url,
        youtubeApiKey
      );

      const syncResult: SyncResult = {
        rede_social_id: rede.id,
        influenciadora_id: rede.influencer_id,
        platform: rede.platform,
        status: profile.error ? 'error' : 'success',
        old_followers: rede.followers,
        new_followers: profile.followers || rede.followers,
        old_engagement: rede.engagement_rate,
        new_engagement: profile.engagement_rate || rede.engagement_rate,
        profile_name: profile.profile_name,
        profile_picture_url: profile.profile_picture_url,
        is_verified: profile.is_verified,
        external_id: profile.external_id,
        error_message: profile.error,
        sync_duration_ms: Date.now() - startTime,
      };

      // Update the social network record if successful
      if (!profile.error && profile.followers > 0) {
        await supabase
          .from('mt_influencer_social_networks')
          .update({
            followers: profile.followers,
            engagement_rate: profile.engagement_rate,
            profile_name: profile.profile_name,
            profile_picture_url: profile.profile_picture_url,
            is_verified: profile.is_verified,
            external_id: profile.external_id,
            sync_status: 'success',
            sync_error_message: null,
            last_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', rede.id);

        // Update total_followers on influencer
        await updateInfluencerTotalFollowers(supabase, rede.influencer_id);

        success++;
      } else {
        // Update sync status with error
        await supabase
          .from('mt_influencer_social_networks')
          .update({
            sync_status: 'error',
            sync_error_message: profile.error,
            last_sync_at: new Date().toISOString(),
          })
          .eq('id', rede.id);

        errors++;
      }

      // Log the sync attempt
      await supabase
        .from('mt_influencer_sync_logs')
        .insert({
          social_network_id: rede.id,
          influencer_id: rede.influencer_id,
          platform: rede.platform,
          status: syncResult.status,
          old_followers: syncResult.old_followers,
          new_followers: syncResult.new_followers,
          old_engagement: syncResult.old_engagement,
          new_engagement: syncResult.new_engagement,
          profile_name: syncResult.profile_name,
          profile_picture_url: syncResult.profile_picture_url,
          is_verified: syncResult.is_verified,
          external_id: syncResult.external_id,
          error_message: syncResult.error_message,
          sync_duration_ms: syncResult.sync_duration_ms,
          sync_type: 'cron',
          triggered_by: triggeredBy,
        });

      results.push(syncResult);

      // Add delay between requests to avoid rate limiting (1 second)
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (err) {
      console.error(`Error syncing rede ${rede.id}:`, err);
      errors++;

      results.push({
        rede_social_id: rede.id,
        influenciadora_id: rede.influencer_id,
        platform: rede.platform,
        status: 'error',
        old_followers: rede.followers,
        new_followers: null,
        old_engagement: rede.engagement_rate,
        new_engagement: null,
        profile_name: null,
        profile_picture_url: null,
        is_verified: false,
        external_id: null,
        error_message: err.message,
        sync_duration_ms: Date.now() - startTime,
      });
    }
  }

  return {
    total: redesSociais.length,
    success,
    errors,
    results,
  };
}

// ============================================
// Helper: Update influencer total_followers
// ============================================

async function updateInfluencerTotalFollowers(
  supabase: any,
  influencerId: string
): Promise<void> {
  try {
    const { data: redes } = await supabase
      .from('mt_influencer_social_networks')
      .select('followers')
      .eq('influencer_id', influencerId);

    if (redes) {
      const total = redes.reduce((sum: number, r: any) => sum + (r.followers || 0), 0);

      await supabase
        .from('mt_influencers')
        .update({ total_followers: total })
        .eq('id', influencerId);
    }
  } catch (err) {
    console.error('Error updating total_followers:', err);
  }
}

// ============================================
// Main Handler
// ============================================

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const action = pathParts[pathParts.length - 1];

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Service role client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get YouTube API Key from config
    const { data: config } = await supabaseAdmin
      .from('mt_waha_config')
      .select('youtube_api_key')
      .single();

    const youtubeApiKey = config?.youtube_api_key || null;

    // Handle different actions
    switch (action) {
      case "fetch-profile": {
        // POST /social-media-proxy/fetch-profile
        // Body: { platform, username, url? }
        if (req.method !== "POST") {
          return new Response(
            JSON.stringify({ error: "Method not allowed" }),
            { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        let body: FetchProfileRequest;
        try {
          body = await req.json();
        } catch {
          return new Response(
            JSON.stringify({ error: "Invalid JSON body" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!body.platform || !body.username) {
          return new Response(
            JSON.stringify({ error: "platform e username são obrigatórios" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const startTime = Date.now();
        const profile = await fetchProfile(body.platform, body.username, youtubeApiKey);
        const duration = Date.now() - startTime;

        return new Response(
          JSON.stringify({
            ...profile,
            fetch_duration_ms: duration,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "sync-all": {
        // POST /social-media-proxy/sync-all
        // Used by cron job to sync all profiles

        // Validate service role key for cron job
        const authHeader = req.headers.get("Authorization");
        if (!authHeader || !authHeader.includes(supabaseServiceKey)) {
          // Allow if it's a valid user token
          if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.replace("Bearer ", "");
            const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
              global: { headers: { Authorization: `Bearer ${token}` } }
            });

            const { data: { user }, error } = await supabaseUser.auth.getUser();
            if (error || !user) {
              return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }

            // Check if user is admin
            const { data: mtUser } = await supabaseAdmin
              .from('mt_users')
              .select('role')
              .eq('auth_user_id', user.id)
              .single();

            if (mtUser?.role !== 'platform_admin' && mtUser?.role !== 'tenant_admin') {
              return new Response(
                JSON.stringify({ error: "Admin access required" }),
                { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          } else {
            return new Response(
              JSON.stringify({ error: "Unauthorized" }),
              { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        const results = await syncAllProfiles(supabaseAdmin, youtubeApiKey, null);

        return new Response(
          JSON.stringify(results),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "supported-platforms": {
        // GET /social-media-proxy/supported-platforms
        // Returns list of supported platforms for auto-fetch
        return new Response(
          JSON.stringify({
            fully_supported: ['youtube'],
            partially_supported: ['instagram', 'tiktok'],
            manual_only: ['facebook', 'twitter', 'kwai', 'linkedin', 'pinterest'],
            notes: {
              youtube: 'Requer YouTube API Key nas configurações',
              instagram: 'API pública não-oficial, pode ser instável',
              tiktok: 'Extração via web scraping, pode falhar',
            }
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Ação desconhecida: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
