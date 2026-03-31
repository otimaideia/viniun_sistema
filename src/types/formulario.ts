// Tipos para o Form Builder Viniun
// Sincronizado com estrutura do banco de dados

// =============================================================
// ENUMS E TIPOS BASE
// =============================================================

export type FormularioModo = 'simples' | 'wizard';
export type FormularioAcaoPosEnvio = 'mensagem' | 'redirect' | 'whatsapp';
export type FormularioStatus = 'rascunho' | 'ativo' | 'inativo' | 'arquivado';

// Template visual do formulario
export type FormularioLayoutTemplate = 'padrao' | 'landing_page' | 'minimalista' | 'card';

export const LAYOUT_TEMPLATE_LABELS: Record<FormularioLayoutTemplate, { label: string; description: string }> = {
  padrao: {
    label: 'Padrao',
    description: 'Layout classico com card centralizado'
  },
  landing_page: {
    label: 'Landing Page',
    description: 'Visual moderno com stepper, gradientes e animacoes'
  },
  minimalista: {
    label: 'Minimalista',
    description: 'Design limpo e simples com foco no conteudo'
  },
  card: {
    label: 'Card Compacto',
    description: 'Formulario compacto ideal para popups e embeds'
  },
};

export type FormularioCampoTipo =
  | 'text'
  | 'email'
  | 'tel'
  | 'tel_intl' // Telefone internacional com seletor de país
  | 'cpf'
  | 'cep'
  | 'select'
  | 'textarea'
  | 'checkbox'
  | 'radio'
  | 'date'
  | 'number'
  | 'hidden'
  | 'servico'
  | 'file'
  | 'rating'
  | 'range'
  | 'indicados'; // Campo especial para indicar amigos (modelo Wise Up)

export type FormularioCampoLargura = 'full' | 'half' | 'third';

// Mapeamento de campo para lead (qual campo do lead este campo preenche)
export type CampoLeadMapping =
  | 'nome'
  | 'email'
  | 'whatsapp'
  | 'whatsapp_codigo_pais' // Código do país para WhatsApp
  | 'telefone'
  | 'telefone_codigo_pais' // Código do país para telefone
  | 'cpf'
  | 'cep'
  | 'rua'
  | 'numero'
  | 'complemento'
  | 'bairro'
  | 'cidade'
  | 'estado'
  | 'genero'
  | 'data_nascimento'
  | 'servico_interesse_id'
  | 'observacoes'
  | null;

// =============================================================
// WIZARD CONFIG
// =============================================================

export interface WizardEtapa {
  id: string;
  titulo: string;
  descricao?: string;
  ordem: number;
  icone?: string;
}

export interface WizardConfig {
  etapas: WizardEtapa[];
}

// =============================================================
// CONFIGURACAO CAMPO INDICADOS
// =============================================================

export interface CampoIndicadoConfig {
  min_indicados?: number; // Minimo de amigos (default: 1)
  max_indicados?: number; // Maximo de amigos (default: 5)
  campos_por_indicado: {
    nome: string;
    label: string;
    tipo: 'text' | 'tel' | 'email';
    obrigatorio: boolean;
    placeholder?: string;
    mascara?: string;
  }[];
}

// =============================================================
// CAMPO DO FORMULARIO
// =============================================================

export interface FormularioCampo {
  id: string;
  formulario_id: string;

  // Identificacao
  nome: string;
  tipo: FormularioCampoTipo;
  label: string;
  placeholder?: string;

  // Validacao
  obrigatorio: boolean;
  min_length?: number;
  max_length?: number;
  pattern?: string;
  mensagem_erro?: string;
  mascara?: string;
  validacao?: string;

  // Opcoes (para select, radio, checkbox)
  opcoes?: string[];

  // Configuracao especial para campo tipo 'indicados'
  indicados_config?: CampoIndicadoConfig;

  // Mapeamento para Lead
  campo_lead?: CampoLeadMapping;

  // Wizard
  etapa?: number;

  // Condicionalidade
  condicao_campo?: string;
  condicao_valor?: string;

  // Layout
  ordem: number;
  largura?: FormularioCampoLargura;
  ativo: boolean;

  // Timestamps
  created_at?: string;
  updated_at?: string;
}

export type FormularioCampoInsert = Omit<FormularioCampo, 'id' | 'created_at' | 'updated_at'>;
export type FormularioCampoUpdate = Partial<FormularioCampoInsert>;

// =============================================================
// FORMULARIO PRINCIPAL
// =============================================================

export interface Formulario {
  id: string;
  franqueado_id: string | null;  // null = formulário da central (global)

  // Identificacao
  nome: string;
  descricao?: string;
  slug: string;
  status: FormularioStatus;
  ativo: boolean;
  is_system?: boolean; // Formulário padrão do sistema (não editável por franqueados)

  // Textos do Formulario
  titulo?: string;
  subtitulo?: string;
  texto_botao?: string;
  mensagem_sucesso?: string;

  // Multi-Step Wizard
  modo: FormularioModo;
  wizard_config?: WizardConfig;
  mostrar_progresso: boolean;
  permitir_voltar: boolean;

  // Template e Layout
  layout_template?: FormularioLayoutTemplate;

  // ===== PERSONALIZACAO VISUAL =====

  // Cores Principais
  cor_primaria?: string;
  cor_secundaria?: string;
  cor_texto?: string;
  cor_fundo?: string;
  cor_botao?: string;
  cor_botao_texto?: string;

  // Cores dos Campos
  cor_campo_fundo?: string;
  cor_campo_texto?: string;
  cor_campo_borda?: string;
  cor_campo_foco?: string;
  cor_campo_placeholder?: string;
  cor_label?: string;

  // Cores do Header/Stepper
  cor_header_fundo?: string;
  cor_header_texto?: string;
  cor_stepper_ativo?: string;
  cor_stepper_inativo?: string;
  cor_stepper_completo?: string;

  // Cores de Destaque/Feedback
  cor_sucesso?: string;
  cor_erro?: string;
  cor_aviso?: string;

  // Gradientes
  gradiente_ativo?: boolean;
  gradiente_inicio?: string;
  gradiente_fim?: string;
  gradiente_direcao?: string;

  // Tipografia
  font_family?: string;
  font_size_base?: string;
  font_weight_label?: string;

  // Bordas e Sombras
  border_radius?: string;
  border_width?: string;
  sombra?: string;

  // Espacamento
  padding_form?: string;
  gap_campos?: string;

  // Imagens
  logo_url?: string;
  logo_tamanho?: string;
  logo_posicao?: string;
  background_image_url?: string;
  background_overlay?: boolean;
  background_overlay_cor?: string;

  // Icones/Badges no Header
  icone_header_url?: string;
  badge_texto?: string;
  badge_cor_fundo?: string;
  badge_cor_texto?: string;

  // Animacoes
  animacoes_ativas?: boolean;
  animacao_entrada?: string;

  // Estilo dos Botoes
  botao_estilo?: string;
  botao_tamanho?: string;
  botao_largura_total?: boolean;

  // Estilo dos Campos
  campo_estilo?: string;
  mostrar_icones_campos?: boolean;

  // Stepper Visual (para wizard)
  stepper_estilo?: string;
  stepper_posicao?: string;
  stepper_mostrar_numeros?: boolean;
  stepper_mostrar_titulos?: boolean;

  // Card Container
  card_max_width?: string;
  card_fundo?: string;
  card_borda?: boolean;

  // Footer
  mostrar_footer?: boolean;
  texto_footer?: string;
  cor_footer_fundo?: string;
  cor_footer_texto?: string;

  // Secoes Extras
  mostrar_depoimentos?: boolean;
  mostrar_beneficios?: boolean;
  mostrar_contadores?: boolean;

  // ===== FIM PERSONALIZACAO VISUAL =====

  // Acao Pos-Envio
  acao_pos_envio: FormularioAcaoPosEnvio;
  redirect_url?: string;
  whatsapp_numero?: string;
  whatsapp_mensagem?: string;
  whatsapp_incluir_dados: boolean;

  // Webhook
  webhook_ativo: boolean;
  webhook_url?: string;
  webhook_headers?: Record<string, string>;
  webhook_retry: boolean;

  // CEP Auto-fill
  cep_auto_fill: boolean;

  // Pixels de Rastreamento
  pixel_facebook?: string;
  pixel_facebook_evento?: string;
  pixel_ga4?: string;
  pixel_ga4_evento?: string;
  pixel_tiktok?: string;
  pixel_tiktok_evento?: string;

  // Seguranca
  recaptcha_ativo: boolean;
  recaptcha_site_key?: string;
  honeypot_ativo: boolean;
  rate_limit_por_ip?: number;

  // Captura de Dados
  capturar_utms: boolean;
  capturar_ip: boolean;
  capturar_user_agent: boolean;

  // Integracao com Campanhas
  campanha_id?: string;

  // A/B Testing
  variante_pai_id?: string;
  variante_nome?: string;
  variante_peso?: number;

  // Timestamps
  created_at?: string;
  updated_at?: string;

  // Relacoes
  campos?: FormularioCampo[];
}

export type FormularioInsert = Omit<Formulario, 'id' | 'created_at' | 'updated_at' | 'campos'>;
export type FormularioUpdate = Partial<FormularioInsert>;

// =============================================================
// SUBMISSAO DO FORMULARIO
// =============================================================

export interface FormularioSubmissao {
  id: string;
  formulario_id: string;
  lead_id?: string;

  // Dados preenchidos
  dados: Record<string, unknown>;

  // Metadados de rastreamento
  ip_address?: string;
  user_agent?: string;
  referrer?: string;

  // UTM Parameters
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;

  // Sessao e tempo
  session_id?: string;
  tempo_preenchimento_segundos?: number;

  // Indicacao
  codigo_indicacao?: string;
  indicado_por_id?: string;

  // Webhook
  webhook_enviado: boolean;
  webhook_response_code?: number;
  webhook_response_body?: string;
  webhook_tentativas: number;

  // A/B Testing
  variante_id?: string;

  // Timestamps
  created_at?: string;
}

export type FormularioSubmissaoInsert = Omit<FormularioSubmissao, 'id' | 'created_at'>;

// =============================================================
// ANALYTICS DO FORMULARIO
// =============================================================

export type FormularioEventoTipo = 'view' | 'start' | 'step' | 'submit' | 'abandon' | 'error';

export interface FormularioAnalytics {
  id: string;
  formulario_id: string;

  // Evento
  evento: FormularioEventoTipo;
  etapa_atual?: number;
  tempo_total_segundos?: number;

  // Sessao
  session_id?: string;

  // Metadados
  ip_address?: string;
  user_agent?: string;
  referrer?: string;

  // UTM Parameters
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;

  // A/B Testing
  variante_id?: string;

  // Dados extras
  dados_extra?: Record<string, unknown>;

  // Timestamps
  created_at?: string;
}

export type FormularioAnalyticsInsert = Omit<FormularioAnalytics, 'id' | 'created_at'>;

// =============================================================
// ESTATISTICAS DO FORMULARIO
// =============================================================

export interface FormularioStats {
  total_views: number;
  total_starts: number;
  total_submits: number;
  total_abandons: number;
  conversion_rate: number;
  avg_time_seconds: number;
  abandonment_by_step: Record<string, number>;
  daily_breakdown: FormularioDailyStats[];
  variantes_stats?: FormularioVarianteStats[];
}

export interface FormularioDailyStats {
  date: string;
  views: number;
  starts: number;
  submits: number;
  abandons: number;
}

export interface FormularioVarianteStats {
  variante_id: string;
  variante_nome: string;
  views: number;
  submits: number;
  conversion_rate: number;
}

// =============================================================
// TEMPLATES DE FORMULARIOS
// =============================================================

export interface FormularioTemplate {
  id: string;
  nome: string;
  descricao?: string;
  categoria: FormularioTemplateCategoria;
  thumbnail_url?: string;

  // Configuracoes do template
  config: Partial<Formulario>;
  campos: Partial<FormularioCampo>[];

  // Metadata
  uso_count: number;
  is_premium: boolean;
  is_sistema: boolean;
  franqueado_id?: string;
  created_at?: string;
  updated_at?: string;
}

export type FormularioTemplateCategoria =
  | 'lead_capture'
  | 'agendamento'
  | 'orcamento'
  | 'contato'
  | 'pesquisa'
  | 'cadastro'
  | 'evento'
  | 'avaliacao'
  | 'indicacao';

export const TEMPLATE_CATEGORIAS: Record<FormularioTemplateCategoria, { label: string; icon: string }> = {
  lead_capture: { label: 'Captura de Leads', icon: 'UserPlus' },
  agendamento: { label: 'Agendamento', icon: 'Calendar' },
  orcamento: { label: 'Orcamento', icon: 'DollarSign' },
  contato: { label: 'Contato', icon: 'MessageSquare' },
  pesquisa: { label: 'Pesquisa', icon: 'ClipboardList' },
  cadastro: { label: 'Cadastro', icon: 'UserCheck' },
  evento: { label: 'Evento', icon: 'CalendarCheck' },
  avaliacao: { label: 'Avaliacao', icon: 'Star' },
  indicacao: { label: 'Indicacao', icon: 'Users' },
};

// =============================================================
// A/B TESTING
// =============================================================

export interface FormularioABTest {
  id: string;
  formulario_original_id: string;
  franqueado_id: string;
  nome: string;
  descricao?: string;
  status: 'rascunho' | 'ativo' | 'pausado' | 'finalizado';

  // Configuracao do teste
  metrica_principal: 'conversion_rate' | 'avg_time' | 'abandonment_rate';
  duracao_dias?: number;
  min_submissoes?: number;

  // Variantes
  variantes: FormularioABVariante[];

  // Resultados
  vencedor_id?: string;
  confianca_estatistica?: number;

  // Timestamps
  inicio_at?: string;
  fim_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FormularioABVariante {
  id: string;
  ab_test_id: string;
  formulario_id: string;
  nome: string;
  peso: number;

  // Metricas
  views: number;
  submits: number;
  conversion_rate: number;
  avg_time_seconds: number;

  created_at?: string;
}

// =============================================================
// FORMULARIO COM RELACOES
// =============================================================

export interface FormularioWithRelations extends Formulario {
  franqueado?: {
    id: string;
    nome_fantasia: string;
  };
  campanha?: {
    id: string;
    nome: string;
  };
  _count?: {
    submissoes: number;
    campos: number;
  };
  stats?: FormularioStats;
  variantes?: Formulario[];
}

// =============================================================
// HELPERS E CONSTANTES
// =============================================================

export const CAMPO_TIPOS_LABELS: Record<FormularioCampoTipo, string> = {
  text: 'Texto',
  email: 'E-mail',
  tel: 'Telefone',
  cpf: 'CPF',
  cep: 'CEP',
  select: 'Selecao',
  textarea: 'Texto longo',
  checkbox: 'Caixa de selecao',
  radio: 'Opcao unica',
  date: 'Data',
  number: 'Numero',
  hidden: 'Oculto',
  servico: 'Servicos',
  file: 'Arquivo',
  rating: 'Avaliacao',
  range: 'Intervalo',
  indicados: 'Indicar Amigos',
};

export const CAMPO_TIPOS_ICONS: Record<FormularioCampoTipo, string> = {
  text: 'Type',
  email: 'Mail',
  tel: 'Phone',
  cpf: 'CreditCard',
  cep: 'MapPin',
  select: 'ChevronDown',
  textarea: 'AlignLeft',
  checkbox: 'CheckSquare',
  radio: 'Circle',
  date: 'Calendar',
  number: 'Hash',
  hidden: 'EyeOff',
  servico: 'Briefcase',
  file: 'Paperclip',
  rating: 'Star',
  range: 'Sliders',
  indicados: 'Users',
};

export const STATUS_LABELS: Record<FormularioStatus, string> = {
  rascunho: 'Rascunho',
  ativo: 'Ativo',
  inativo: 'Inativo',
  arquivado: 'Arquivado',
};

export const STATUS_COLORS: Record<FormularioStatus, string> = {
  rascunho: 'gray',
  ativo: 'green',
  inativo: 'yellow',
  arquivado: 'red',
};
