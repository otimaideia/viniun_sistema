export type LeadStatus =
  | "Lead Recebido"
  | "Contato Iniciado"
  | "Contato Efetivo"
  | "Avaliação Agendada"
  | "Avaliação Realizada"
  | "Cliente Efetivo"
  | "Perdido / Sem Interesse";

export interface Lead {
  id: string;
  // Dados pessoais básicos
  nome: string;
  sobrenome?: string | null;
  telefone: string;
  telefone_codigo_pais?: string | null; // Código do país (ex: "55" para Brasil, "1" para USA)
  whatsapp?: string | null;
  whatsapp_codigo_pais?: string | null; // Código do país para WhatsApp
  email: string;
  // Documentos
  cpf?: string | null; // CPF para identificação no totem/portal
  rg?: string | null;
  // Endereço completo
  cep?: string | null;
  endereco?: string | null; // Logradouro (rua, avenida, etc)
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade: string;
  estado?: string | null;
  pais?: string | null;
  proximidade?: string | null; // Ponto de referência
  latitude?: number | null; // Coordenada GPS
  longitude?: number | null; // Coordenada GPS
  // Dados adicionais
  data_nascimento?: string | null;
  genero?: string | null;
  profissao?: string | null;
  como_conheceu?: string | null; // Como conheceu a Viniun
  estado_civil?: 'solteiro' | 'casado' | 'divorciado' | 'viuvo' | 'uniao_estavel' | null;
  nacionalidade?: string | null;
  foto_url?: string | null;
  // Contato e Redes Sociais
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  youtube?: string | null;
  linkedin?: string | null;
  twitter?: string | null; // X
  website?: string | null; // Site pessoal ou blog
  telefone_secundario?: string | null;
  telefone_secundario_codigo_pais?: string | null; // Código do país para telefone secundário
  preferencia_contato?: 'whatsapp' | 'telefone' | 'email' | 'sms' | null;
  melhor_horario_contato?: 'manha' | 'tarde' | 'noite' | 'qualquer' | null;
  dia_preferencial?: string | null;
  // Dados Financeiros (útil para reembolsos/pagamentos)
  chave_pix?: string | null;
  tipo_chave_pix?: 'cpf' | 'email' | 'telefone' | 'aleatoria' | null;
  // Notas internas (apenas para equipe)
  nota_interna?: string | null;
  // Saúde e Informações Adicionais
  tipo_pele?: 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | null; // Escala Fitzpatrick
  alergias?: string | null;
  condicoes_medicas?: string | null;
  medicamentos_uso?: string | null;
  historico_tratamentos?: string | null;
  areas_interesse?: string | null;
  fotossensibilidade?: boolean | null; // Sensibilidade à luz
  gravidez_lactacao?: boolean | null; // Contraindicação para tratamentos
  // Contato de Emergência
  contato_emergencia_nome?: string | null;
  contato_emergencia_telefone?: string | null;
  contato_emergencia_telefone_codigo_pais?: string | null; // Código do país para contato de emergência
  contato_emergencia_parentesco?: string | null;
  // Preferências de Comunicação
  aceita_marketing?: boolean | null;
  aceita_pesquisa?: boolean | null;
  data_cadastro_completo?: string | null;
  // Dados comerciais
  interesse: string | null; // Serviço de interesse (era "servico" no type antigo)
  unidade: string;
  status: LeadStatus;
  observacoes: string | null;
  consentimento?: boolean | null;
  franqueado_id?: string | null;
  franquias_vinculadas?: string[] | null; // Array de IDs das franquias vinculadas ao lead
  id_giga?: number | null; // ID do lead no sistema Giga/Viniun Office (deprecated)
  id_api?: string | null; // ID na API externa
  landing_page?: string | null;
  // UTM Parameters
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  // Click IDs de Rastreamento
  gclid?: string | null; // Google Click ID
  fbclid?: string | null; // Facebook Click ID
  ttclid?: string | null; // TikTok Click ID
  msclkid?: string | null; // Microsoft/Bing Click ID
  li_fat_id?: string | null; // LinkedIn Click ID
  // URLs de Origem
  embed_url?: string | null; // URL onde o formulário foi incorporado
  referrer_url?: string | null; // URL de referência
  // Campos para Portal do Cliente (Lead = Cliente)
  codigo_verificacao?: string | null; // Código temporário de autenticação
  codigo_expira_em?: string | null; // Expiração do código
  ultimo_login?: string | null; // Último acesso ao portal
  // Campos de Indicação (modelo Wise Up)
  indicado_por_id?: string | null; // ID do lead que fez a indicação
  quantidade_indicacoes?: number; // Quantos leads este lead indicou
  codigo_indicacao?: string | null; // Código único de 6 caracteres para compartilhar
  aceita_contato?: boolean; // Se aceita ser contatado
  campanha?: string | null; // Nome da campanha/promoção de origem (legacy field)
  campanha_id?: string | null; // ID da campanha de marketing vinculada
  // Relacionamentos carregados
  marketing_campanha?: {
    id: string;
    nome: string;
    status: string;
  } | null;
  indicado_por?: Lead | null; // Lead que fez a indicação
  indicados?: Lead[]; // Leads indicados por este lead
  created_at: string;
  updated_at: string;
}

// Interface para histórico de indicações
export interface IndicacaoHistorico {
  id: string;
  lead_indicador_id: string;
  lead_indicado_id: string;
  campanha?: string | null;
  landing_page?: string | null;
  data_indicacao: string;
  status: 'pendente' | 'convertido' | 'perdido' | 'cancelado';
  data_conversao?: string | null;
  observacoes?: string | null;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  lead_indicador?: Lead;
  lead_indicado?: Lead;
}

// Interface para estatísticas de indicação
export interface IndicacaoStats {
  total_indicacoes: number;
  indicacoes_convertidas: number;
  indicacoes_pendentes: number;
  indicacoes_perdidas: number;
  taxa_conversao: number;
  cadeia_maxima: number; // Profundidade máxima da árvore de indicações
}

// Interface para árvore de indicações
export interface IndicacaoArvore {
  lead: Lead;
  indicados: IndicacaoArvore[];
  nivel: number;
}

export const STATUS_OPTIONS: LeadStatus[] = [
  "Lead Recebido",
  "Contato Iniciado",
  "Contato Efetivo",
  "Avaliação Agendada",
  "Avaliação Realizada",
  "Cliente Efetivo",
  "Perdido / Sem Interesse",
];

export const STATUS_CONFIG: Record<LeadStatus, { color: string; bg: string; label: string }> = {
  "Lead Recebido": { color: "text-blue-700", bg: "bg-blue-50 border-blue-200", label: "Novo" },
  "Contato Iniciado": { color: "text-cyan-700", bg: "bg-cyan-50 border-cyan-200", label: "Em Contato" },
  "Contato Efetivo": { color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200", label: "Avançando" },
  "Avaliação Agendada": { color: "text-amber-700", bg: "bg-amber-50 border-amber-200", label: "Agendado" },
  "Avaliação Realizada": { color: "text-purple-700", bg: "bg-purple-50 border-purple-200", label: "Avaliado" },
  "Cliente Efetivo": { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", label: "Convertido" },
  "Perdido / Sem Interesse": { color: "text-slate-500", bg: "bg-slate-100 border-slate-200", label: "Perdido" },
};

// === ORIGEM DO LEAD ===

export type LeadOrigem =
  | "site"
  | "indicacao"
  | "telefone"
  | "presencial"
  | "whatsapp_inbound"
  | "instagram"
  | "facebook"
  | "google"
  | "google_maps"
  | "tiktok"
  | "bio_link"
  | "redes_sociais"
  | "outro";

export const ORIGEM_OPTIONS: { value: LeadOrigem; label: string; icon?: string }[] = [
  { value: "whatsapp_inbound", label: "WhatsApp", icon: "💬" },
  { value: "instagram", label: "Instagram", icon: "📸" },
  { value: "facebook", label: "Facebook", icon: "📘" },
  { value: "tiktok", label: "TikTok", icon: "🎵" },
  { value: "google", label: "Google", icon: "🔍" },
  { value: "google_maps", label: "Google Maps", icon: "📍" },
  { value: "site", label: "Site", icon: "🌐" },
  { value: "bio_link", label: "Link da Bio", icon: "🔗" },
  { value: "indicacao", label: "Indicação", icon: "👥" },
  { value: "telefone", label: "Telefone", icon: "📞" },
  { value: "presencial", label: "Presencial", icon: "🏢" },
  { value: "redes_sociais", label: "Outras Redes", icon: "📱" },
  { value: "outro", label: "Outro", icon: "❓" },
];

export const ORIGEM_CONFIG: Record<LeadOrigem, { color: string; bg: string; label: string; icon: string }> = {
  whatsapp_inbound: { color: "text-green-700", bg: "bg-green-50 border-green-200", label: "WhatsApp", icon: "💬" },
  instagram: { color: "text-pink-700", bg: "bg-pink-50 border-pink-200", label: "Instagram", icon: "📸" },
  facebook: { color: "text-blue-700", bg: "bg-blue-50 border-blue-200", label: "Facebook", icon: "📘" },
  tiktok: { color: "text-slate-700", bg: "bg-slate-50 border-slate-200", label: "TikTok", icon: "🎵" },
  google: { color: "text-amber-700", bg: "bg-amber-50 border-amber-200", label: "Google", icon: "🔍" },
  google_maps: { color: "text-red-700", bg: "bg-red-50 border-red-200", label: "Google Maps", icon: "📍" },
  site: { color: "text-cyan-700", bg: "bg-cyan-50 border-cyan-200", label: "Site", icon: "🌐" },
  bio_link: { color: "text-purple-700", bg: "bg-purple-50 border-purple-200", label: "Link da Bio", icon: "🔗" },
  indicacao: { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", label: "Indicação", icon: "👥" },
  telefone: { color: "text-orange-700", bg: "bg-orange-50 border-orange-200", label: "Telefone", icon: "📞" },
  presencial: { color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200", label: "Presencial", icon: "🏢" },
  redes_sociais: { color: "text-violet-700", bg: "bg-violet-50 border-violet-200", label: "Outras Redes", icon: "📱" },
  outro: { color: "text-gray-700", bg: "bg-gray-50 border-gray-200", label: "Outro", icon: "❓" },
};
