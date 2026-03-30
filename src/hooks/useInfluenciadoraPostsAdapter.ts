// =============================================================================
// Adapter: Posts de Influenciadoras (MT → Legacy)
// =============================================================================

import { useInfluencerPostsMT, useInfluencerPostMT } from './multitenant/useInfluencerPostsMT';
import type {
  MTInfluencerPost,
  MTPostCreate,
  MTPostUpdate,
  MTPostFilters,
  MTPostPlatform,
  MTPostType,
  MTPostStatus,
} from './multitenant/useInfluencerPostsMT';

// Re-exportar tipos para compatibilidade
export type {
  MTInfluencerPost as InfluencerPost,
  MTPostCreate as PostCreate,
  MTPostUpdate as PostUpdate,
  MTPostFilters as PostFilters,
  MTPostPlatform as PostPlatform,
  MTPostType as PostType,
  MTPostStatus as PostStatus,
};

// Adapter principal
export function useInfluenciadoraPosts(filters?: MTPostFilters) {
  return useInfluencerPostsMT(filters);
}

// Adapter individual
export function useInfluenciadoraPost(id: string | undefined) {
  return useInfluencerPostMT(id);
}

// Exportação default
export default useInfluenciadoraPosts;
