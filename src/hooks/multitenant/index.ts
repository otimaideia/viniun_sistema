// =============================================================================
// MULTI-TENANT HOOKS INDEX
// Exporta todos os hooks relacionados ao sistema multi-tenant
// =============================================================================

// Detecção de tenant via subdomínio
export {
  useTenantDetection,
  getTenantUrl,
  isCurrentTenant,
} from './useTenantDetection';

// Autenticação com tenant
export { useTenantAuth } from './useTenantAuth';

// Permissões granulares (MT)
export { useUserPermissions } from './useUserPermissions';

// Re-export dos hooks dos contextos
export {
  useTenantContext,
  useTenant,
  useFranchise,
  useModules,
  useAccessLevel,
} from '@/contexts/TenantContext';

export {
  useBrandingContext,
  useBranding,
} from '@/contexts/BrandingContext';

// Departamentos e equipes
export {
  useDepartments,
  useDepartment,
  useUserDepartments,
} from './useDepartments';

export {
  useTeams,
  useTeam,
  useUserTeams,
} from './useTeams';

// Formulários
export {
  useFormulariosMT,
  useFormularioMT,
  useFormFieldsMT,
} from './useFormulariosMT';

// Agendamentos
export {
  useAgendamentosMT,
  useAgendamentoMT,
  useDisponibilidade,
} from './useAgendamentosMT';

// Franchises (Franqueados)
export {
  useFranchisesMT,
  useFranchiseMT,
} from './useFranchisesMT';
export type {
  MTFranchise,
  MTFranchiseCreate,
  MTFranchiseUpdate,
  MTFranchiseFilters,
} from './useFranchisesMT';

// Servicos
export {
  useServicosMT,
  useServicoMT,
} from './useServicosMT';
export type {
  MTService,
  MTServiceTipo,
  MTServiceDisponibilidade,
  MTServiceCondicao,
  MTServiceCreate,
  MTServiceUpdate,
  MTServiceFilters,
  MTFranchiseService,
} from './useServicosMT';

// Pacotes (Bundles de Servicos/Produtos)
export {
  usePackagesMT,
  usePackageMT,
} from './usePackagesMT';
export type {
  MTPackage,
  MTPackageItem,
  MTPackageCreate,
  MTPackageUpdate,
  MTPackageItemCreate,
  MTPackageFilters,
} from './usePackagesMT';

// WhatsApp Multi-Tenant
export {
  useWhatsAppSessionsMT,
  useWhatsAppSessionMT,
} from './useWhatsAppSessionsMT';

export {
  useWhatsAppConversationsMT,
  useWhatsAppConversationMT,
} from './useWhatsAppConversationsMT';

export {
  useWhatsAppMessagesMT,
  useSendMessageMT,
} from './useWhatsAppMessagesMT';

export {
  useWhatsAppLabelsMT,
  useConversationLabelsMT,
  LABEL_COLORS,
} from './useWhatsAppLabelsMT';

export {
  useWhatsAppTemplatesMT,
  useWhatsAppTemplateMT,
  TEMPLATE_CATEGORIES,
} from './useWhatsAppTemplatesMT';

export {
  useWhatsAppQuickRepliesMT,
} from './useWhatsAppQuickRepliesMT';

export {
  useWhatsAppPermissionsMT,
  useMyWhatsAppSessionsMT,
} from './useWhatsAppPermissionsMT';

// WhatsApp Híbrido (WAHA + Meta Cloud API)
export {
  useWhatsAppProvidersMT,
  useWhatsAppProviderMT,
} from './useWhatsAppProvidersMT';

export {
  useWhatsAppWindowMT,
  useWhatsAppWindowsListMT,
} from './useWhatsAppWindowsMT';

export {
  useWhatsAppRoutingRulesMT,
} from './useWhatsAppRoutingRulesMT';

export {
  useWhatsAppMetaTemplatesMT,
} from './useWhatsAppMetaTemplatesMT';

export {
  useWhatsAppCostsMT,
} from './useWhatsAppCostsMT';

export {
  useWhatsAppRoutingLogsMT,
} from './useWhatsAppRoutingLogsMT';

export {
  useWhatsAppRouterMT,
} from './useWhatsAppRouterMT';

export {
  useWhatsAppHybridConfigMT,
} from './useWhatsAppHybridConfigMT';
export type {
  HybridConfig,
  HybridConfigUpdate,
} from './useWhatsAppHybridConfigMT';

// Influenciadoras
export {
  useInfluenciadorasMT,
  useInfluenciadoraMT,
} from './useInfluenciadorasMT';
export type {
  MTInfluencer,
  MTInfluencerCreate,
  MTInfluencerUpdate,
  MTInfluencerFilters,
  MTInfluencerStatus,
  MTInfluencerTipo,
  MTInfluencerTamanho,
  MTInfluencerKPIs,
  MTInfluencerRanking,
} from './useInfluenciadorasMT';

// Parcerias
export {
  useParceriasMT,
  useParceriaMT,
  useParceriaByCodigo,
} from './useParceriasMT';
export type {
  MTPartnership,
  MTPartnershipCreate,
  MTPartnershipUpdate,
  MTPartnershipFilters,
  MTPartnershipStatus,
  MTPartnershipType,
  MTPartnershipKPIs,
  MTPartnershipRanking,
} from './useParceriasMT';

// Campanhas
export {
  useCampanhasMT,
  useCampanhaMT,
} from './useCampanhasMT';
export type {
  MTCampaign,
  MTCampaignCreate,
  MTCampaignUpdate,
  MTCampaignFilters,
  MTCampaignStatus,
  MTCampaignType,
  MTCampaignStats,
} from './useCampanhasMT';

// Funil de Vendas - Acesso por Role
export {
  useFunnelRoleAccessMT,
  useFunnelUserAccessMT,
  useAccessibleFunnelsMT,
} from './useFunnelAccessMT';
export type {
  FunnelRoleAccess,
  FunnelAccessPermissions,
} from './useFunnelAccessMT';

// Funil de Vendas - Funil Padrão por Franquia
export {
  useFranchiseDefaultFunnelMT,
} from './useFranchiseDefaultFunnelMT';

// Funil de Vendas - Histórico de Tempo por Etapa
export {
  useFunnelLeadHistoryMT,
  useFunnelStageTimeMetricsMT,
  useFunnelStageHistoryMutationsMT,
  formatDuration,
  formatDurationShort,
} from './useFunnelStageHistoryMT';
export type {
  FunnelStageHistoryEntry,
  StageTimeMetric,
} from './useFunnelStageHistoryMT';
