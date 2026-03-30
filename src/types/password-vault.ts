// =====================================================
// Tipos TypeScript - Cofre de Senhas (Password Vault)
// =====================================================

export type VaultCategory =
  | 'credencial'    // Login/password pairs
  | 'api_key'       // API keys
  | 'token'         // JWT/bearer tokens
  | 'certificado'   // SSL/client certs
  | 'env_var'       // Environment variables
  | 'conexao_db'    // Database connection strings
  | 'integracao';   // Third-party credentials

export type VaultAction =
  | 'view'
  | 'reveal'
  | 'copy'
  | 'create'
  | 'update'
  | 'delete'
  | 'export'
  | 'share'
  | 'unshare';

export type VaultSharePermission = 'view' | 'edit';

// =====================================================
// Interfaces principais
// =====================================================

export interface VaultFolder {
  id: string;
  tenant_id: string;
  franchise_id?: string | null;
  parent_id?: string | null;
  nome: string;
  descricao?: string | null;
  icone: string;
  cor: string;
  ordem: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  // Computed/Relations
  parent?: VaultFolder;
  children?: VaultFolder[];
  entry_count?: number;
}

export interface VaultEntry {
  id: string;
  tenant_id: string;
  franchise_id?: string | null;
  folder_id?: string | null;
  // Identificacao
  nome: string;
  descricao?: string | null;
  url?: string | null;
  categoria: VaultCategory;
  tags: string[];
  // Credenciais
  username?: string | null;
  encrypted_value: string;
  encryption_method: string;
  value_preview?: string | null;
  // Metadados
  notas?: string | null;
  campos_extras?: Record<string, string> | null;
  // Expiracao
  expires_at?: string | null;
  rotation_days?: number | null;
  last_rotated_at?: string | null;
  // Status
  is_active: boolean;
  is_favorite: boolean;
  strength_score?: number | null;
  // Tracking
  last_accessed_at?: string | null;
  access_count: number;
  created_by?: string | null;
  updated_by?: string | null;
  // Timestamps
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  // Relations
  folder?: VaultFolder | null;
  creator?: { id: string; nome: string; avatar_url?: string } | null;
  shares?: VaultShare[];
}

export interface VaultAccessLog {
  id: string;
  tenant_id: string;
  vault_entry_id: string;
  user_id: string;
  action: VaultAction;
  ip_address?: string | null;
  user_agent?: string | null;
  details?: Record<string, unknown> | null;
  created_at: string;
  // Relations
  user?: { id: string; nome: string; avatar_url?: string } | null;
  entry?: { id: string; nome: string; categoria: VaultCategory } | null;
}

export interface VaultShare {
  id: string;
  tenant_id: string;
  vault_entry_id: string;
  shared_with_user_id: string;
  shared_by_user_id: string;
  permission: VaultSharePermission;
  expires_at?: string | null;
  is_active: boolean;
  created_at: string;
  // Relations
  shared_with?: { id: string; nome: string; email?: string } | null;
  shared_by?: { id: string; nome: string } | null;
}

export interface VaultHistory {
  id: string;
  vault_entry_id: string;
  tenant_id: string;
  changed_by: string;
  changed_fields: string[];
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  change_reason?: string | null;
  created_at: string;
  // Relations
  user?: { id: string; nome: string } | null;
}

// =====================================================
// Form types
// =====================================================

export interface VaultEntryFormData {
  nome: string;
  descricao?: string;
  url?: string;
  categoria: VaultCategory;
  folder_id?: string;
  username?: string;
  value: string; // plaintext - will be encrypted before saving
  tags: string[];
  expires_at?: string;
  rotation_days?: number;
  notas?: string;
  campos_extras?: Record<string, string>;
}

export interface VaultFolderFormData {
  nome: string;
  descricao?: string;
  icone: string;
  cor: string;
  parent_id?: string;
  ordem?: number;
}

// =====================================================
// Filter types
// =====================================================

export interface VaultFilters {
  search?: string;
  categoria?: VaultCategory;
  folder_id?: string | null;
  tags?: string[];
  is_favorite?: boolean;
  expires_soon?: boolean; // within 30 days
}

// =====================================================
// Constants
// =====================================================

export const VAULT_CATEGORIES: Record<VaultCategory, {
  label: string;
  icon: string;
  color: string;
  description: string;
}> = {
  credencial: {
    label: 'Credenciais de Acesso',
    icon: 'KeyRound',
    color: '#E91E63',
    description: 'Login e senha de sistemas, dashboards e aplicacoes',
  },
  api_key: {
    label: 'Chaves de API',
    icon: 'Key',
    color: '#2196F3',
    description: 'API keys de servicos externos (WAHA, Supabase, Meta, etc)',
  },
  token: {
    label: 'Tokens',
    icon: 'Shield',
    color: '#9C27B0',
    description: 'JWT tokens, bearer tokens, webhook verify tokens',
  },
  certificado: {
    label: 'Certificados',
    icon: 'FileKey',
    color: '#FF9800',
    description: 'Certificados SSL, client certificates',
  },
  env_var: {
    label: 'Variaveis de Ambiente',
    icon: 'Terminal',
    color: '#4CAF50',
    description: 'Variaveis .env de servicos e deploys',
  },
  conexao_db: {
    label: 'Conexoes de Banco',
    icon: 'Database',
    color: '#795548',
    description: 'Connection strings, hosts, passwords de banco de dados',
  },
  integracao: {
    label: 'Integracoes',
    icon: 'Link2',
    color: '#00BCD4',
    description: 'Credenciais de servicos terceiros integrados',
  },
};

export const VAULT_CATEGORY_OPTIONS = Object.entries(VAULT_CATEGORIES).map(
  ([value, { label }]) => ({ value: value as VaultCategory, label })
);
