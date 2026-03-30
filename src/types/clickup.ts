// Tipos para integração com ClickUp API

// ===========================================
// API ClickUp - Respostas
// ===========================================

export interface ClickUpUser {
  id: number;
  username: string;
  email: string;
  color: string;
  profilePicture: string | null;
  initials: string;
  timezone: string;
}

export interface ClickUpTeam {
  id: string;
  name: string;
  color: string;
  avatar: string | null;
  members: ClickUpMember[];
}

export interface ClickUpMember {
  user: {
    id: number;
    username: string;
    email: string;
    color: string;
    initials: string;
    role: number;
    role_key: 'owner' | 'admin' | 'member' | 'guest';
  };
}

export interface ClickUpSpace {
  id: string;
  name: string;
  color: string;
  private: boolean;
  statuses: ClickUpStatus[];
  features: Record<string, unknown>;
  archived: boolean;
}

export interface ClickUpStatus {
  id: string;
  status: string;
  type: 'open' | 'custom' | 'closed';
  orderindex: number;
  color: string;
}

export interface ClickUpList {
  id: string;
  name: string;
  content: string;
  status: { status: string; color: string } | null;
  task_count: number;
  archived: boolean;
  space: { id: string; name: string };
  folder: { id: string; name: string };
}

export interface ClickUpTask {
  id: string;
  custom_id: string | null;
  name: string;
  text_content: string;
  description: string;
  status: ClickUpStatus;
  orderindex: string;
  date_created: string;
  date_updated: string;
  date_closed: string | null;
  date_done: string | null;
  archived: boolean;
  creator: ClickUpUser;
  assignees: ClickUpUser[];
  watchers: ClickUpUser[];
  checklists: unknown[];
  tags: { name: string; tag_fg: string; tag_bg: string }[];
  parent: string | null;
  priority: { id: string; priority: string; color: string } | null;
  due_date: string | null;
  start_date: string | null;
  points: number | null;
  time_estimate: number | null;
  time_spent: number;
  custom_fields: ClickUpCustomField[];
  list: { id: string; name: string };
  folder: { id: string; name: string };
  space: { id: string };
  url: string;
}

export interface ClickUpCustomField {
  id: string;
  name: string;
  type: ClickUpFieldType;
  type_config: ClickUpFieldTypeConfig;
  date_created: string;
  hide_from_guests: boolean;
  required: boolean | null;
  value?: string | number | boolean | string[] | null;
  value_richtext?: string;
}

export type ClickUpFieldType =
  | 'short_text'
  | 'text'
  | 'drop_down'
  | 'labels'
  | 'date'
  | 'checkbox'
  | 'currency'
  | 'emoji'
  | 'votes'
  | 'number'
  | 'email'
  | 'phone'
  | 'url'
  | 'location';

export interface ClickUpFieldTypeConfig {
  sorting?: 'manual' | 'alphabetical';
  options?: ClickUpFieldOption[];
  new_drop_down?: boolean;
  precision?: number;
  currency_type?: string;
  code_point?: string;
  count?: number;
  default?: number;
  placeholder?: string;
}

export interface ClickUpFieldOption {
  id: string;
  name?: string;
  label?: string;
  color: string | null;
  orderindex: number;
}

export interface ClickUpTasksResponse {
  tasks: ClickUpTask[];
  last_page: boolean;
}

// ===========================================
// Sistema - Configuração e Mapeamento
// ===========================================

export interface ClickUpConfig {
  id: string;
  tenant_id: string;
  api_key: string;
  workspace_id: string | null;
  workspace_name: string | null;
  space_id: string | null;
  space_name: string | null;
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClickUpListMapping {
  id: string;
  config_id: string;
  clickup_list_id: string;
  clickup_list_name: string;
  assigned_user_id: string | null;
  is_active: boolean;
  last_sync_at: string | null;
  total_tasks: number;
  synced_tasks: number;
  created_at: string;
}

export interface ClickUpFieldMapping {
  id: string;
  config_id: string;
  clickup_field_id: string;
  clickup_field_name: string;
  clickup_field_type: ClickUpFieldType;
  mt_leads_column: string;
  transformation: FieldTransformation;
  is_active: boolean;
  created_at: string;
}

export type FieldTransformation =
  | 'direct'       // Copia direto
  | 'date'         // Converte para data
  | 'dropdown'     // Mapeia valor do dropdown
  | 'labels'       // Mapeia labels
  | 'currency'     // Converte para decimal
  | 'boolean'      // Converte para boolean
  | 'phone'        // Normaliza telefone
  | 'status'       // Mapeia status do funil
  | 'json';        // Salva como JSON

export interface ClickUpValueMapping {
  id: string;
  field_mapping_id: string;
  clickup_value: string;
  clickup_label: string;
  mt_value: string;
  created_at: string;
}

export interface ClickUpMigrationLog {
  id: string;
  config_id: string;
  clickup_task_id: string;
  lead_id: string | null;
  status: MigrationStatus;
  error_message: string | null;
  raw_data: ClickUpTask | null;
  created_at: string;
}

export type MigrationStatus = 'pending' | 'success' | 'error' | 'skipped' | 'duplicate';

export type MigrationAction = 'created' | 'updated' | 'skipped';

// ===========================================
// Sistema - Sessões de Importação
// ===========================================

export interface ClickUpImportSession {
  id: string;
  config_id: string;
  status: ImportSessionStatus;
  total_tasks: number;
  processed_tasks: number;
  created_leads: number;
  updated_leads: number;
  skipped_tasks: number;
  error_count: number;
  current_list_id: string | null;
  current_page: number;
  last_processed_task_id: string | null;
  started_at: string | null;
  paused_at: string | null;
  completed_at: string | null;
  created_at: string;
  import_config: ImportConfig;
}

export type ImportSessionStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface ImportConfig {
  lists: string[];           // IDs das listas selecionadas
  dedup_by: 'phone' | 'email' | 'both';
  update_existing: boolean;
  batch_size: number;
}

// ===========================================
// Estado da UI
// ===========================================

export interface ClickUpConnectionState {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  user: ClickUpUser | null;
}

export interface ClickUpMigrationState {
  isRunning: boolean;
  isPaused: boolean;
  currentList: string | null;
  currentPage: number;
  totalPages: number;
  processed: number;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
}

export interface ClickUpMigrationStats {
  totalTasks: number;
  selectedLists: number;
  mappedFields: number;
  estimatedTime: string;
}

// ===========================================
// MAPEAMENTOS HARDCODED - MIGRAÇÃO INICIAL YESLASER
// ===========================================
// ATENÇÃO: Estes mapeamentos são específicos para a migração
// inicial do CRM ClickUp da YESlaser. Para novos tenants,
// usar o sistema dinâmico de mapeamento via interface.
// Documentação: docs/CLICKUP_MIGRACAO_CRM.md
// ===========================================

// Status do ClickUp → etapa_funil
export const YESLASER_STATUS_MAPPING: Record<string, { etapa: string; status: string }> = {
  'novo lead': { etapa: 'novo', status: 'ativo' },
  'não responsivo': { etapa: 'nao_responsivo', status: 'ativo' },
  'acompanhamento': { etapa: 'acompanhamento', status: 'ativo' },
  'agendado': { etapa: 'agendado', status: 'ativo' },
  'remarcação': { etapa: 'remarcacao', status: 'ativo' },
  'pós atendimento': { etapa: 'pos_atendimento', status: 'ativo' },
  'negociação': { etapa: 'negociacao', status: 'ativo' },
  'fechamento': { etapa: 'fechamento', status: 'ativo' },
  'comparecimento': { etapa: 'compareceu', status: 'ativo' },
  'recuperação': { etapa: 'recuperacao', status: 'ativo' },
  'fechamento claudenice': { etapa: 'fechamento', status: 'ativo' },
  'fechamento bruna m': { etapa: 'fechamento', status: 'ativo' },
  'concluído': { etapa: 'convertido', status: 'convertido' },
};

// Fonte do ClickUp → origem mt_leads
export const YESLASER_FONTE_MAPPING: Record<number, string> = {
  0: 'auditoria',
  1: 'facebook',
  2: 'instagram_organico',
  3: 'instagram_ads',
  4: 'indicacao',
  5: 'disparo_whatsapp',
  6: 'sac',
  7: 'acao_externa',
  8: 'remarketing',
  9: 'meta_ads',
  10: 'influenciador',
  11: 'evento',
  12: 'link_bio',
};

// Canal do ClickUp → utm_medium
export const YESLASER_CANAL_MAPPING: Record<number, string> = {
  0: 'sms',
  1: 'whatsapp',
  2: 'instagram_direct',
  3: 'messenger',
  4: 'google_chat',
  5: 'telefone',
  6: 'comentarios',
  7: 'site',
  8: 'tv',
};

// Sexo do ClickUp → genero
export const YESLASER_SEXO_MAPPING: Record<number, string> = {
  0: 'masculino',
  1: 'feminino',
};

// Interesse do ClickUp → servico_interesse
export const YESLASER_INTERESSE_MAPPING: Record<number, string> = {
  0: 'Geral',
  1: 'Botox',
  2: 'Depilação a Laser',
  3: 'Criolipólise',
  4: 'Massagem Relaxante',
  5: 'Massagem Modeladora',
  6: 'Corrente Russa',
  7: 'Radiofrequência',
  8: 'Ultrassom',
};

// Unidade ClickUp ID → franchise_id (mt_franchises)
export const YESLASER_UNIDADE_MAPPING: Record<string, string> = {
  'ac4011ca-5691-437b-aca1-5f119b07fede': '84432049-6788-4346-ab49-60c4ecd7c638', // ALTAMIRA - PA
  'e01628d4-7cef-4203-b646-2e409b86d7c8': '4aef2f24-2a98-41df-b43b-c7791c247dc2', // CANINDÉ
  '61650a21-afa7-453b-891e-194f86c1ae68': '223c1c86-10c8-4860-a08c-3982fc63d600', // CASTANHAL-PA
  'da0634b6-41da-4902-aaa4-39cfc7701c9d': '5feaf5c9-ac7e-4060-946c-822c3a358a26', // CASTANHEIRA - PA
  '1115c933-0c2a-4122-a6bf-768a53b8aeb8': '8949a8aa-27c5-4837-bb76-0f81dde1e525', // CENTRO BARÂO
  'b4db327e-bfcb-46c3-a13c-2f45657bab5d': 'dd0a4e22-b3a5-4c7e-afba-df9ae30c29a6', // CRATEÚS
  '146dfc38-a60b-4f97-8486-5284ebdd07a4': '7938af5c-7687-48c0-a09c-2fd1aa2507cc', // CRATO
  'a0fff512-7570-4585-9b33-a9fb3a87fc3d': '76e119b5-e371-4ebf-958f-33d38cae8f04', // DOM LUÍS
  'd63bd713-4547-4fe3-8e7e-ecf53cacc6c6': '2aeba4f7-8fd5-444e-b3ab-b95564ab946a', // ENTRONCAMENTO - PA
  '04e99097-8b82-4189-a6ef-97138c079916': '3e851a99-895f-4bdf-a679-1d86d3101e8b', // GENERAL - CENTRO
  '2f268ab8-144f-4eca-a899-866843b25ee1': '6cd8762d-b9f4-4e29-868c-556542fbe461', // GUAMA - PA
  '8be25cc6-1d94-40f1-ae60-ffecbe7b6547': '1f127f91-dd7f-4cd7-886a-ce7f783a2c51', // ITAITUBA - PA
  '94c24663-2282-4687-b7e0-e5e99ed0b087': '4862b7ec-2538-437e-8f87-7e8c76df39d6', // ITAPIPOCA
  '30fb1ea6-a60e-4094-8ec3-8a6fab7dee5f': 'dde24f58-d72d-494d-a709-c533b530113a', // JOQUEI
  '447a6da6-4bcc-4918-924b-b0cc5567e886': 'aa7c0060-164c-4ec6-b077-6547669c1a34', // JUREMA
  '525b85f9-0760-4770-ba29-aacb08ab672e': '71e021cd-7756-4201-afae-f0c526bd2d7a', // MAJOR FACUNDO
  '88f3f339-93b7-4984-82bd-048b4ce34af7': '7d208c8b-50f0-461c-8689-93d4d42ea0c2', // MARACANAÚ SHOPPING
  '06a42a3e-f8d6-4f0d-bf1d-d07efdbcef7b': 'fc2be420-5eaa-4d14-8b6a-1bf454ba8da0', // MESSEJANA
  '9af7449f-f6f4-4eb8-9590-9f563926aa4f': '9fd265e3-33bd-4ebc-9e61-cbf732ca1807', // PARANGABA
  '292fba11-5e89-4a1c-baad-955a2412fb25': 'baf5dcde-61ec-4e29-900a-f9d462a1bcc5', // PARQUE SHOPPING - PA
  'd664f22e-bd95-4bc3-b714-4a99787ccab8': 'e2a6ea54-a462-469c-8c79-37d7fd6e95e5', // PÁTIO BELÉM - PA
  '440286d1-ac9f-49d7-9a87-93eb2bf98f40': '34166bde-8bc7-4575-ace5-9ad978b5403e', // RIO MAR KENNEDY
  '948763ee-5279-4674-b333-4453e8a76e3f': 'b5d4afae-9e5d-4ed3-a6d8-3c99c8c1a425', // VER O PESO - PA
  'ab348338-08ad-476c-a1bd-54c72ac1910b': '6965fb3e-5dab-48c4-ac3c-a39ff7fe33fb', // METROPOLE - PA
  '7a4c6a1b-869a-4a8b-a802-eb01ca8eba17': '50dbfc11-dc94-476e-bc05-fb5910cf428a', // FLORIANÓPOLIS
};

// Custom Fields IDs do ClickUp da YESlaser
export const YESLASER_CLICKUP_FIELD_IDS = {
  NOME: '1385a485-2822-4d2a-b5a1-2cd6ebc475ad',
  DATA_NASCIMENTO: 'c2a89504-e0eb-408c-be8f-41b412c4d8fe',
  SEXO: '16babec5-729b-4220-b488-afd0f5e9cf68',
  UNIDADE: 'd2945de9-d05f-4dce-b8f1-6616b5a2ec17',
  MARCA: '6438c11a-c7d4-4cf9-aa90-0fbe7b3ea953',
  FONTE: 'f7e58548-6939-46e6-ada3-38667a1c158b',
  CAMPANHA: '45d2240f-40cb-4119-976e-216a4fc5d61b',
  CANAL: '6c84548a-41a8-4c6e-b5c5-d7e77252f8c3',
  ACAO: '4aaa6541-4606-4f8f-952e-dc1737583474',
  INTERESSE: '03270ea1-fef6-4d35-896e-63993ae797b0',
  DATA_AGENDAMENTO: 'b9645cb1-3e31-4f71-ae99-bbd4bc397467',
  DATA_REMARCACAO: 'c2ddbfc6-d2e2-4243-9814-1bb4bd5a5bd8',
  CONFIRMACAO_ANTECIPADA: '60a29eda-cc0e-4fb1-8432-1c54c79bc8d3',
  CONFIRMADO_1_DIA: '22267d29-9476-49b2-b91f-cdf353a03b3b',
  CONFIRMADO_NO_DIA: '474150ec-dbd4-4537-8c5e-d1e4db508f7d',
  VENDA: '0375cf95-4712-4290-b9a1-736d141684db',
  VENDA_2: 'c1e01569-b7bd-4860-9264-931a95d37772',
  SDR_VENDA: '2e272efa-50d8-4e07-8879-39139c2cd5a5',
  GUIA_ENVIADA: '2e527f43-4aa8-477d-9cf5-264ad6c45cc0',
  LIGACAO_REALIZADA: '354ff5a2-11cb-4e4d-bf84-25d1ae7ffd5a',
  NPS: '18d696f2-345d-4302-bb06-41503534b649',
  ETIQUETA: 'd73a68f7-5085-428b-becc-9139203d48bf',
};

// Colunas do mt_leads disponíveis para mapeamento
export const MT_LEADS_COLUMNS = [
  { value: 'nome', label: 'Nome', type: 'text' },
  { value: 'nome_social', label: 'Nome Social', type: 'text' },
  { value: 'email', label: 'Email', type: 'text' },
  { value: 'telefone', label: 'Telefone', type: 'phone' },
  { value: 'telefone_secundario', label: 'Telefone Secundário', type: 'phone' },
  { value: 'whatsapp', label: 'WhatsApp', type: 'phone' },
  { value: 'data_nascimento', label: 'Data de Nascimento', type: 'date' },
  { value: 'genero', label: 'Gênero', type: 'dropdown' },
  { value: 'cpf', label: 'CPF', type: 'text' },
  { value: 'cep', label: 'CEP', type: 'text' },
  { value: 'endereco', label: 'Endereço', type: 'text' },
  { value: 'bairro', label: 'Bairro', type: 'text' },
  { value: 'cidade', label: 'Cidade', type: 'text' },
  { value: 'estado', label: 'Estado', type: 'text' },
  { value: 'profissao', label: 'Profissão', type: 'text' },
  { value: 'servico_interesse', label: 'Serviço de Interesse', type: 'text' },
  { value: 'valor_estimado', label: 'Valor Estimado', type: 'currency' },
  { value: 'origem', label: 'Origem', type: 'dropdown' },
  { value: 'campanha', label: 'Campanha', type: 'text' },
  { value: 'utm_source', label: 'UTM Source', type: 'text' },
  { value: 'utm_medium', label: 'UTM Medium', type: 'text' },
  { value: 'utm_campaign', label: 'UTM Campaign', type: 'text' },
  { value: 'score_manual', label: 'Score Manual', type: 'number' },
  { value: 'temperatura', label: 'Temperatura', type: 'dropdown' },
  { value: 'status', label: 'Status', type: 'dropdown' },
  { value: 'etapa_funil', label: 'Etapa do Funil', type: 'dropdown' },
  { value: 'data_agendamento', label: 'Data Agendamento', type: 'datetime' },
  { value: 'confirmado', label: 'Confirmado', type: 'boolean' },
  { value: 'compareceu', label: 'Compareceu', type: 'boolean' },
  { value: 'convertido', label: 'Convertido', type: 'boolean' },
  { value: 'valor_conversao', label: 'Valor Conversão', type: 'currency' },
  { value: 'proximo_contato', label: 'Próximo Contato', type: 'datetime' },
  { value: 'observacoes', label: 'Observações', type: 'text' },
  { value: 'tags', label: 'Tags', type: 'array' },
  { value: 'dados_extras', label: 'Dados Extras (JSON)', type: 'json' },
] as const;

export type MTLeadsColumn = typeof MT_LEADS_COLUMNS[number]['value'];

// ===========================================
// ALIASES (Compatibilidade com código existente)
// ===========================================
// @deprecated Use YESLASER_* para novos desenvolvimentos
export const STATUS_MAPPING = YESLASER_STATUS_MAPPING;
export const FONTE_MAPPING = YESLASER_FONTE_MAPPING;
export const CANAL_MAPPING = YESLASER_CANAL_MAPPING;
export const SEXO_MAPPING = YESLASER_SEXO_MAPPING;
export const INTERESSE_MAPPING = YESLASER_INTERESSE_MAPPING;
export const UNIDADE_MAPPING = YESLASER_UNIDADE_MAPPING;
export const CLICKUP_FIELD_IDS = YESLASER_CLICKUP_FIELD_IDS;

// ===========================================
// TIPOS PARA MÓDULO DINÂMICO
// ===========================================

/** Tipo de campo detectado do ClickUp */
export interface DetectedField {
  id: string;
  name: string;
  type: ClickUpFieldType;
  options?: ClickUpFieldOption[];
  required: boolean;
  sampleValue?: string | number | boolean | null;
}

/** Sugestão de mapeamento automático */
export interface MappingSuggestion {
  clickup_field: DetectedField;
  suggested_column: MTLeadsColumn | null;
  confidence: number;  // 0-100
  transformation: FieldTransformation;
}

/** Preview de dados transformados */
export interface TransformPreview {
  clickup_value: unknown;
  transformed_value: unknown;
  target_column: string;
  is_valid: boolean;
  validation_error?: string;
}

/** Estatísticas de importação */
export interface ImportStats {
  total_tasks: number;
  unique_phones: number;
  unique_emails: number;
  estimated_new: number;
  estimated_updates: number;
  estimated_duplicates: number;
}

/** Erro de validação de mapeamento */
export interface MappingValidationError {
  field_id: string;
  field_name: string;
  error_type: 'missing_mapping' | 'invalid_transformation' | 'unmapped_values';
  message: string;
  unmapped_values?: string[];
}

/** Resultado de validação do mapeamento */
export interface MappingValidation {
  is_valid: boolean;
  errors: MappingValidationError[];
  warnings: MappingValidationError[];
}
