// =============================================================================
// USE TEAMS ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para gestão de equipes
// SISTEMA 100% MT - Usa mt_teams diretamente via useTeams
//
// =============================================================================

// Re-exportar tipos do módulo MT
export type { Team, TeamMember, TeamMemberRole } from '@/types/multitenant';

// Re-exportar hooks MT diretamente
export {
  useTeams as useTeamsAdapter,
  useTeam as useTeamAdapter,
  useUserTeams as useUserTeamsAdapter,
} from './multitenant/useTeams';

// =============================================================================
// Helper: Verificar modo atual (sempre MT)
// =============================================================================

export function getTeamsMode(): 'mt' {
  return 'mt';
}

// Export default = hook principal
export { useTeams as default } from './multitenant/useTeams';
