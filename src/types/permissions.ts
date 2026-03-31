// Tipos para o sistema de permissões por papel (role)

// Tipos de permissão disponíveis
export type PermissionType = 'can_view' | 'can_create' | 'can_edit' | 'can_delete';

// Permissão de um módulo para um papel
export interface ModulePermission {
  id: string;
  role: string;
  module_code: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  created_at: string;
  updated_at: string;
}

// Permissões agrupadas por papel
export interface RolePermissions {
  role: string;
  permissions: Record<string, {
    can_view: boolean;
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
  }>;
}

// Objeto de atualização de permissão
export interface PermissionUpdate {
  role: string;
  module_code: string;
  permission_type: PermissionType;
  value: boolean;
}

// Papéis disponíveis no sistema Viniun
export type AppRole =
  | 'super_admin'
  | 'admin'
  | 'diretoria'
  | 'franqueado'
  | 'central'
  | 'gerente'
  | 'marketing'
  | 'sdr'
  | 'consultora_vendas'
  | 'avaliadora'
  | 'aplicadora'
  | 'esteticista'
  | 'unidade';

// Labels para papéis
export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrador',
  diretoria: 'Diretoria',
  franqueado: 'Franqueado',
  central: 'Central',
  gerente: 'Gerente',
  marketing: 'Marketing',
  sdr: 'SDR',
  consultora_vendas: 'Consultora de Vendas',
  avaliadora: 'Avaliadora',
  aplicadora: 'Aplicadora',
  esteticista: 'Esteticista',
  unidade: 'Unidade',
};

// Papéis disponíveis para seleção (excluindo super_admin que é fixo)
export const AVAILABLE_ROLES: { value: AppRole; label: string; locked?: boolean }[] = [
  { value: 'super_admin', label: 'Super Admin', locked: true },
  { value: 'admin', label: 'Administrador' },
  { value: 'diretoria', label: 'Diretoria' },
  { value: 'franqueado', label: 'Franqueado' },
  { value: 'central', label: 'Central' },
  { value: 'gerente', label: 'Gerente' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'sdr', label: 'SDR' },
  { value: 'consultora_vendas', label: 'Consultora de Vendas' },
  { value: 'avaliadora', label: 'Avaliadora' },
  { value: 'aplicadora', label: 'Aplicadora' },
  { value: 'esteticista', label: 'Esteticista' },
  { value: 'unidade', label: 'Unidade' },
];

// Módulos agrupados por categoria para exibição
export const MODULE_CATEGORIES: Record<string, { key: string; label: string }[]> = {
  'Gestão de Leads': [
    { key: 'leads', label: 'Leads' },
    { key: 'funil', label: 'Funil de Vendas' },
  ],
  'Atendimento': [
    { key: 'whatsapp', label: 'WhatsApp' },
    { key: 'agendamentos', label: 'Agendamentos' },
  ],
  'Marketing': [
    { key: 'marketing', label: 'Campanhas' },
    { key: 'formularios', label: 'Formulários' },
    { key: 'influenciadoras', label: 'Influenciadoras' },
  ],
  'Gestão': [
    { key: 'franqueados', label: 'Franqueados' },
    { key: 'servicos', label: 'Serviços' },
    { key: 'metas', label: 'Metas' },
    { key: 'ranking', label: 'Ranking' },
    { key: 'relatorios', label: 'Relatórios' },
  ],
  'Recursos Humanos': [
    { key: 'recrutamento', label: 'Recrutamento' },
  ],
  'Configurações': [
    { key: 'usuarios', label: 'Usuários' },
    { key: 'aprovacoes', label: 'Aprovações' },
    { key: 'diretorias', label: 'Diretorias' },
  ],
};
