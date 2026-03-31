// =============================================================================
// MULTI-TENANT TYPES
// Tipos TypeScript para o sistema multi-tenant
// =============================================================================

// -----------------------------------------------------------------------------
// Enums e Tipos Base
// -----------------------------------------------------------------------------

export type AccessLevel = 'platform' | 'tenant' | 'franchise' | 'user';

export type TenantStatus = 'ativo' | 'inativo' | 'pendente' | 'suspenso';

export type ModuleCategory =
  | 'vendas'
  | 'operacao'
  | 'comunicacao'
  | 'marketing'
  | 'gestao'
  | 'sistema'
  | 'rh';

export type IntegrationType =
  | 'whatsapp'
  | 'smtp'
  | 'meta_ads'
  | 'youtube'
  | 'tiktok'
  | 'google_ads'
  | 'tiktok_ads'
  | 'google_business'
  | 'google_maps';

// -----------------------------------------------------------------------------
// Tenant
// -----------------------------------------------------------------------------

export interface Tenant {
  id: string;
  slug: string;
  nome_fantasia: string;
  razao_social?: string;
  cnpj?: string;
  email?: string;
  telefone?: string;
  website?: string;

  // Subdomínio e domínio customizado
  subdominio?: string;
  dominio_customizado?: string;

  // Endereço
  endereco_logradouro?: string;
  endereco_numero?: string;
  endereco_complemento?: string;
  endereco_bairro?: string;
  endereco_cidade?: string;
  endereco_estado?: string;
  endereco_cep?: string;
  endereco_pais?: string;

  // Configurações
  timezone: string;
  idioma: string;
  moeda: string;

  // Status
  status: TenantStatus;
  is_active: boolean;

  // Plano
  plano?: string;
  max_franquias?: number;
  max_usuarios?: number;
  max_leads_mes?: number;
  data_ativacao?: string;
  data_expiracao?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// Branding (80+ campos)
// -----------------------------------------------------------------------------

export interface Branding {
  id: string;
  tenant_id: string;

  // Logos
  logo_url?: string;
  logo_branco_url?: string;
  logo_icone_url?: string;
  favicon_url?: string;

  // Cores principais
  cor_primaria: string;
  cor_primaria_hover: string;
  cor_primaria_light?: string;
  cor_secundaria: string;
  cor_secundaria_hover: string;
  cor_secundaria_light?: string;

  // Cores de feedback
  cor_sucesso?: string;
  cor_erro?: string;
  cor_aviso?: string;
  cor_info?: string;

  // Cores de fundo
  cor_fundo?: string;
  cor_fundo_secundario?: string;
  cor_fundo_card?: string;
  cor_fundo_sidebar?: string;
  cor_fundo_header?: string;

  // Cores de texto
  cor_texto?: string;
  cor_texto_secundario?: string;
  cor_texto_invertido?: string;
  cor_texto_link?: string;

  // Bordas e sombras
  cor_borda?: string;
  cor_borda_input?: string;
  border_radius?: string;
  sombra_cards?: string;

  // Tipografia
  fonte_primaria?: string;
  fonte_secundaria?: string;
  fonte_tamanho_base?: string;

  // Textos de login
  texto_login_titulo?: string;
  texto_login_subtitulo?: string;
  texto_boas_vindas?: string;
  texto_rodape?: string;

  // Imagens de fundo
  imagem_login_fundo?: string;
  imagem_dashboard_fundo?: string;

  // Configurações visuais
  sidebar_compacta?: boolean;
  tema_escuro_disponivel?: boolean;
  tema_padrao?: 'light' | 'dark';

  // Timestamps
  created_at: string;
  updated_at: string;
}

// CSS Variables geradas a partir do branding
export interface BrandingCSSVariables {
  '--color-primary': string;
  '--color-primary-hover': string;
  '--color-secondary': string;
  '--color-secondary-hover': string;
  '--color-success': string;
  '--color-error': string;
  '--color-warning': string;
  '--color-info': string;
  '--color-background': string;
  '--color-background-card': string;
  '--color-text': string;
  '--color-text-secondary': string;
  '--color-border': string;
  '--font-primary': string;
  '--font-secondary': string;
  '--border-radius': string;
  '--shadow-card': string;
  [key: string]: string;
}

// -----------------------------------------------------------------------------
// Franchise (Franquia)
// -----------------------------------------------------------------------------

export interface Franchise {
  id: string;
  tenant_id: string;

  // Identificação
  codigo: string;
  nome: string;
  nome_fantasia?: string;
  cnpj?: string;

  // Contato
  email?: string;
  telefone?: string;
  whatsapp?: string;

  // Endereço
  endereco_logradouro?: string;
  endereco_numero?: string;
  endereco_complemento?: string;
  endereco_bairro?: string;
  endereco_cidade?: string;
  endereco_estado?: string;
  endereco_cep?: string;
  latitude?: number;
  longitude?: number;

  // Responsável
  responsavel_nome?: string;
  responsavel_email?: string;
  responsavel_telefone?: string;

  // Status
  status: TenantStatus;
  is_active: boolean;

  // Datas
  data_inauguracao?: string;
  data_contrato_inicio?: string;
  data_contrato_fim?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// Module (Módulo)
// -----------------------------------------------------------------------------

export interface Module {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  icone?: string;
  categoria: ModuleCategory;
  ordem: number;
  is_core: boolean;
  is_active: boolean;

  // Relação com tenant (quando carregado via tenant_modules)
  tenant_is_active?: boolean;
  tenant_config?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// User (Usuário Multi-Tenant)
// -----------------------------------------------------------------------------

export interface MTUser {
  id: string;
  auth_user_id?: string;
  tenant_id: string;
  franchise_id?: string;

  // Identificação
  email: string;
  nome: string;
  avatar_url?: string;
  telefone?: string;

  // Nível de acesso
  access_level: AccessLevel;

  // Status
  is_active: boolean;
  email_verified: boolean;

  // Último acesso
  last_login_at?: string;
  last_activity_at?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// Role e Permission
// -----------------------------------------------------------------------------

export interface Role {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  nivel: number;
  is_system: boolean;
}

export interface Permission {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  module_id?: string;
  categoria?: string;
}

export interface UserPermission {
  permission_id: string;
  permission_codigo: string;
  granted: boolean;
  granted_at?: string;
}

// -----------------------------------------------------------------------------
// Integration (Integração)
// -----------------------------------------------------------------------------

export interface Integration {
  id: string;
  tenant_id: string;
  franchise_id?: string;
  integration_type_id: string;

  // Identificação
  nome: string;

  // Credenciais (criptografadas)
  credentials?: Record<string, unknown>;

  // Status
  is_active: boolean;
  is_configured: boolean;
  last_sync_at?: string;
  last_error?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// Context Types
// -----------------------------------------------------------------------------

export interface TenantContextType {
  // Dados do tenant atual
  tenant: Tenant | null;
  branding: Branding | null;

  // Franquia atual (se aplicável)
  franchise: Franchise | null;
  franchises: Franchise[];

  // Usuário multi-tenant
  user: MTUser | null;
  accessLevel: AccessLevel;

  // Módulos habilitados
  modules: Module[];

  // Estado
  isLoading: boolean;
  error: Error | null;

  // Ações
  selectTenant: (tenantId: string) => Promise<void>;
  selectFranchise: (franchiseId: string | null) => void;
  refreshTenant: () => Promise<void>;
  refreshBranding: () => Promise<void>;
  refreshFranchises: () => Promise<void>;
}

export interface BrandingContextType {
  // Branding atual
  branding: Branding | null;

  // CSS Variables
  cssVariables: BrandingCSSVariables;

  // Estado
  isLoading: boolean;

  // Ações
  applyBranding: () => void;
  resetBranding: () => void;
}

// -----------------------------------------------------------------------------
// Hook Return Types
// -----------------------------------------------------------------------------

export interface UseTenantReturn {
  tenant: Tenant | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface UseFranchiseReturn {
  franchise: Franchise | null;
  franchises: Franchise[];
  isLoading: boolean;
  error: Error | null;
  selectFranchise: (id: string | null) => void;
  refetch: () => Promise<void>;
}

export interface UseBrandingReturn {
  branding: Branding | null;
  cssVariables: BrandingCSSVariables;
  isLoading: boolean;
  applyBranding: () => void;
}

export interface UseModulesReturn {
  modules: Module[];
  isLoading: boolean;
  hasModule: (codigo: string) => boolean;
  isModuleActive: (codigo: string) => boolean;
  getModule: (codigo: string) => Module | undefined;
}

export interface UsePermissionsReturn {
  permissions: UserPermission[];
  roles: Role[];
  isLoading: boolean;
  hasPermission: (codigo: string) => boolean;
  hasRole: (codigo: string) => boolean;
  canAccess: (moduleCode: string, action?: string) => boolean;
}

// -----------------------------------------------------------------------------
// API Response Types
// -----------------------------------------------------------------------------

export interface TenantWithBranding extends Tenant {
  branding?: Branding;
}

export interface TenantWithModules extends Tenant {
  modules?: Module[];
}

export interface UserWithRoles extends MTUser {
  roles?: Role[];
  permissions?: UserPermission[];
}

// -----------------------------------------------------------------------------
// Default Values
// -----------------------------------------------------------------------------

export const DEFAULT_BRANDING: Partial<Branding> = {
  cor_primaria: '#E91E63',
  cor_primaria_hover: '#C2185B',
  cor_secundaria: '#3F51B5',
  cor_secundaria_hover: '#303F9F',
  cor_sucesso: '#4CAF50',
  cor_erro: '#F44336',
  cor_aviso: '#FF9800',
  cor_info: '#2196F3',
  cor_fundo: '#F5F5F5',
  cor_fundo_card: '#FFFFFF',
  cor_texto: '#212121',
  cor_texto_secundario: '#757575',
  cor_borda: '#E0E0E0',
  fonte_primaria: 'Inter, sans-serif',
  fonte_secundaria: 'Inter, sans-serif',
  border_radius: '8px',
  sombra_cards: '0 2px 4px rgba(0,0,0,0.1)',
};

export const DEFAULT_CSS_VARIABLES: BrandingCSSVariables = {
  '--color-primary': '#E91E63',
  '--color-primary-hover': '#C2185B',
  '--color-secondary': '#3F51B5',
  '--color-secondary-hover': '#303F9F',
  '--color-success': '#4CAF50',
  '--color-error': '#F44336',
  '--color-warning': '#FF9800',
  '--color-info': '#2196F3',
  '--color-background': '#F5F5F5',
  '--color-background-card': '#FFFFFF',
  '--color-text': '#212121',
  '--color-text-secondary': '#757575',
  '--color-border': '#E0E0E0',
  '--font-primary': 'Inter, sans-serif',
  '--font-secondary': 'Inter, sans-serif',
  '--border-radius': '8px',
  '--shadow-card': '0 2px 4px rgba(0,0,0,0.1)',
};

// -----------------------------------------------------------------------------
// Department (Departamento com hierarquia)
// -----------------------------------------------------------------------------

export interface Department {
  id: string;
  tenant_id?: string;
  parent_id?: string;

  // Identificação
  codigo: string;
  nome: string;
  descricao?: string;

  // Visual
  cor: string;
  icone: string;
  ordem: number;

  // Status
  is_active: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Relações (quando carregadas)
  parent?: Department;
  children?: Department[];
  user_count?: number;
}

export interface UserDepartment {
  id: string;
  user_id: string;
  department_id: string;
  is_primary: boolean;
  is_active: boolean;
  assigned_at: string;
  assigned_by?: string;
  notes?: string;

  // Relações (quando carregadas)
  user?: MTUser;
  department?: Department;
}

// -----------------------------------------------------------------------------
// Team (Equipe)
// -----------------------------------------------------------------------------

export interface Team {
  id: string;
  tenant_id: string;
  franchise_id?: string;

  // Identificação
  codigo: string;
  nome: string;
  descricao?: string;

  // Visual
  cor: string;
  icone: string;

  // Líder
  lider_id?: string;
  lider?: MTUser;

  // Status
  is_active: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;
  created_by?: string;

  // Relações (quando carregadas)
  members?: TeamMember[];
  member_count?: number;
}

export type TeamMemberRole = 'lider' | 'sublider' | 'membro';

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role_in_team: TeamMemberRole;
  is_active: boolean;
  joined_at: string;
  left_at?: string;
  notes?: string;

  // Relações (quando carregadas)
  user?: MTUser;
  team?: Team;
}

// -----------------------------------------------------------------------------
// Hook Return Types - Departments & Teams
// -----------------------------------------------------------------------------

export interface UseDepartmentsReturn {
  departments: Department[];
  isLoading: boolean;
  error: Error | null;
  createDepartment: (data: Partial<Department>) => Promise<Department>;
  updateDepartment: (id: string, data: Partial<Department>) => Promise<Department>;
  deleteDepartment: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export interface UseTeamsReturn {
  teams: Team[];
  isLoading: boolean;
  error: Error | null;
  createTeam: (data: Partial<Team>) => Promise<Team>;
  updateTeam: (id: string, data: Partial<Team>) => Promise<Team>;
  deleteTeam: (id: string) => Promise<void>;
  addMember: (teamId: string, userId: string, role?: TeamMemberRole) => Promise<TeamMember>;
  removeMember: (teamId: string, userId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export interface UseUserDepartmentsReturn {
  userDepartments: UserDepartment[];
  isLoading: boolean;
  assignDepartment: (userId: string, departmentId: string, isPrimary?: boolean) => Promise<UserDepartment>;
  unassignDepartment: (userId: string, departmentId: string) => Promise<void>;
  refetch: () => Promise<void>;
}
