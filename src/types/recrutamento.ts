// ============ STATUS TYPES (match DB CHECK constraints) ============

export type VagaStatus = "rascunho" | "aberta" | "pausada" | "encerrada";

export type CandidatoStatus =
  | "novo"
  | "em_analise"
  | "entrevista"
  | "aprovado"
  | "reprovado"
  | "desistiu"
  | "contratado";

export type EntrevistaStatus = "agendada" | "confirmada" | "realizada" | "cancelada" | "no_show";

export type EntrevistaTipo = "presencial" | "video" | "telefone";

export type Recomendacao = "aprovar" | "reprovar" | "proxima_etapa";

// ============ VAGA (mt_job_positions) ============

export interface Vaga {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  titulo: string;
  descricao: string | null;
  requisitos: string | null;
  beneficios: string | null;
  departamento: string | null;
  nivel: string | null;
  tipo_contrato: string | null;
  modalidade: string | null;
  faixa_salarial_min: number | null;
  faixa_salarial_max: number | null;
  exibir_salario: boolean;
  quantidade_vagas: number;
  vagas_preenchidas: number;
  status: VagaStatus;
  publicada: boolean;
  publicada_em: string | null;
  expira_em: string | null;
  total_candidatos: number;
  total_visualizacoes: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface VagaWithDetails extends Vaga {
  franchise?: {
    id: string;
    nome_fantasia: string;
    cidade: string | null;
    estado: string | null;
  } | null;
}

// ============ CANDIDATO (mt_candidates) ============

export interface Candidato {
  id: string;
  tenant_id: string;
  position_id: string | null;
  nome: string;
  email: string;
  telefone: string | null;
  whatsapp: string | null;
  cpf: string | null;
  data_nascimento: string | null;
  cidade: string | null;
  estado: string | null;
  formacao: string | null;
  experiencia: string | null;
  curriculo_url: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  pretensao_salarial: number | null;
  disponibilidade: string | null;
  rating: number | null;
  notas: string | null;
  avaliado_por: string | null;
  status: CandidatoStatus;
  created_at: string;
  updated_at: string;
}

export interface CandidatoWithDetails extends Candidato {
  position?: {
    id: string;
    titulo: string;
    departamento: string | null;
    status: VagaStatus;
  } | null;
  tenant?: {
    id: string;
    slug: string;
    nome_fantasia: string;
  } | null;
}

// ============ ENTREVISTA (mt_interviews) ============

export interface Entrevista {
  id: string;
  candidate_id: string;
  position_id: string;
  tenant_id: string;
  data_entrevista: string;
  duracao_minutos: number;
  local_ou_link: string | null;
  tipo: EntrevistaTipo | null;
  entrevistador_id: string | null;
  entrevistador_nome: string | null;
  etapa: number;
  etapa_nome: string | null;
  status: EntrevistaStatus;
  nota: number | null;
  feedback: string | null;
  recomendacao: Recomendacao | null;
  created_at: string;
  updated_at: string;
}

export interface EntrevistaWithDetails extends Entrevista {
  candidate?: {
    id: string;
    nome: string;
    email: string;
    telefone: string | null;
    whatsapp: string | null;
    status: CandidatoStatus;
  } | null;
  position?: {
    id: string;
    titulo: string;
  } | null;
  entrevistador?: {
    id: string;
    nome: string;
    email: string;
  } | null;
}

// ============ MÉTRICAS ============

export interface RecrutamentoMetrics {
  totalVagas: number;
  vagasAbertas: number;
  vagasRascunho: number;
  vagasPausadas: number;
  vagasEncerradas: number;
  totalCandidatos: number;
  candidatosNovos: number;
  candidatosEmAnalise: number;
  candidatosEntrevista: number;
  candidatosAprovados: number;
  candidatosReprovados: number;
  candidatosDesistiu: number;
  candidatosContratados: number;
  totalEntrevistas: number;
  entrevistasAgendadas: number;
  entrevistasHoje: number;
  entrevistasSemana: number;
  entrevistasRealizadas: number;
  entrevistasCanceladas: number;
  entrevistasNoShow: number;
  taxaAprovacao: number;
  taxaRealizacaoEntrevistas: number;
  mediaCandidatosPorVaga: number;
  pipeline: {
    novos: number;
    analise: number;
    entrevista: number;
    aprovados: number;
    reprovados: number;
    contratados: number;
  };
}

// ============ STATUS OPTIONS ============

export const VAGA_STATUS_OPTIONS: VagaStatus[] = ["rascunho", "aberta", "pausada", "encerrada"];

export const VAGA_STATUS_CONFIG: Record<VagaStatus, { color: string; bg: string; label: string; icon?: string }> = {
  rascunho: { color: "text-slate-600", bg: "bg-slate-50 border-slate-200", label: "Rascunho" },
  aberta: { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", label: "Aberta" },
  pausada: { color: "text-amber-700", bg: "bg-amber-50 border-amber-200", label: "Pausada" },
  encerrada: { color: "text-red-700", bg: "bg-red-50 border-red-200", label: "Encerrada" },
};

export const CANDIDATO_STATUS_OPTIONS: CandidatoStatus[] = [
  "novo",
  "em_analise",
  "entrevista",
  "aprovado",
  "reprovado",
  "desistiu",
  "contratado",
];

export const CANDIDATO_STATUS_CONFIG: Record<CandidatoStatus, { color: string; bg: string; label: string }> = {
  novo: { color: "text-blue-700", bg: "bg-blue-50 border-blue-200", label: "Novo" },
  em_analise: { color: "text-cyan-700", bg: "bg-cyan-50 border-cyan-200", label: "Em Análise" },
  entrevista: { color: "text-purple-700", bg: "bg-purple-50 border-purple-200", label: "Entrevista" },
  aprovado: { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", label: "Aprovado" },
  reprovado: { color: "text-red-700", bg: "bg-red-50 border-red-200", label: "Reprovado" },
  desistiu: { color: "text-slate-500", bg: "bg-slate-100 border-slate-200", label: "Desistiu" },
  contratado: { color: "text-teal-700", bg: "bg-teal-50 border-teal-200", label: "Contratado" },
};

export const ENTREVISTA_STATUS_OPTIONS: EntrevistaStatus[] = [
  "agendada",
  "confirmada",
  "realizada",
  "cancelada",
  "no_show",
];

export const ENTREVISTA_STATUS_CONFIG: Record<EntrevistaStatus, { color: string; bg: string; label: string }> = {
  agendada: { color: "text-blue-700", bg: "bg-blue-50 border-blue-200", label: "Agendada" },
  confirmada: { color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200", label: "Confirmada" },
  realizada: { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", label: "Realizada" },
  cancelada: { color: "text-red-700", bg: "bg-red-50 border-red-200", label: "Cancelada" },
  no_show: { color: "text-orange-700", bg: "bg-orange-50 border-orange-200", label: "Não Compareceu" },
};

export const ENTREVISTA_TIPO_CONFIG: Record<EntrevistaTipo, { label: string; icon: string }> = {
  presencial: { label: "Presencial", icon: "MapPin" },
  video: { label: "Vídeo", icon: "Video" },
  telefone: { label: "Telefone", icon: "Phone" },
};

export const RECOMENDACAO_CONFIG: Record<Recomendacao, { color: string; bg: string; label: string }> = {
  aprovar: { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", label: "Aprovar" },
  reprovar: { color: "text-red-700", bg: "bg-red-50 border-red-200", label: "Reprovar" },
  proxima_etapa: { color: "text-blue-700", bg: "bg-blue-50 border-blue-200", label: "Próxima Etapa" },
};

// ============ OPÇÕES DE SELECT ============

export const TIPO_CONTRATO_OPTIONS = [
  "CLT",
  "PJ",
  "Estágio",
  "Temporário",
  "Freelancer",
] as const;

export const DEPARTAMENTO_OPTIONS = [
  "Atendimento",
  "Recepção",
  "Técnico",
  "Administrativo",
  "Comercial",
  "Marketing",
  "TI",
  "RH",
  "Financeiro",
  "Operações",
] as const;

export const NIVEL_OPTIONS = [
  "Estagiário",
  "Júnior",
  "Pleno",
  "Sênior",
  "Gerente",
  "Diretor",
] as const;

export const MODALIDADE_OPTIONS = [
  "Presencial",
  "Remoto",
  "Híbrido",
] as const;

export const DISPONIBILIDADE_OPTIONS = [
  "Imediata",
  "15 dias",
  "30 dias",
  "60 dias",
  "90 dias",
  "A combinar",
] as const;

export const FORMACAO_OPTIONS = [
  "Ensino Fundamental",
  "Ensino Médio",
  "Ensino Superior",
  "Pós-Graduação",
  "Mestrado",
  "Doutorado",
] as const;

export const UF_OPTIONS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
  "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
  "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

// ============ HELPERS ============

export function getProfileCompleteness(candidato: Candidato): number {
  const essentialFields: (keyof Candidato)[] = [
    'nome', 'email', 'telefone', 'cidade', 'estado',
    'formacao', 'experiencia', 'pretensao_salarial',
    'disponibilidade', 'curriculo_url',
  ];
  const filled = essentialFields.filter(f => {
    const val = candidato[f];
    return val !== null && val !== undefined && val !== '';
  }).length;
  return Math.round((filled / essentialFields.length) * 100);
}

export function getCompletenessColor(percent: number): { color: string; bg: string; label: string } {
  if (percent < 50) return { color: "text-red-700", bg: "bg-red-50 border-red-200", label: "Incompleto" };
  if (percent < 80) return { color: "text-amber-700", bg: "bg-amber-50 border-amber-200", label: "Parcial" };
  if (percent < 100) return { color: "text-blue-700", bg: "bg-blue-50 border-blue-200", label: "Quase Completo" };
  return { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", label: "Completo" };
}

export function formatWhatsAppUrl(phone: string | null, message?: string): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 10) return null;
  const number = cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
  const url = `https://wa.me/${number}`;
  return message ? `${url}?text=${encodeURIComponent(message)}` : url;
}
