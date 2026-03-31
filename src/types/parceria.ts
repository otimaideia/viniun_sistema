// =====================================================
// Tipos para o Módulo de Parcerias Empresariais
// =====================================================

import { FORMULARIO_INDICACAO_SLUG } from './indicacao';

// =====================================================
// Enums e Status
// =====================================================

export type ParceriaStatus = 'ativo' | 'inativo' | 'pendente' | 'suspenso';

export type PorteEmpresa = 'MEI' | 'ME' | 'EPP' | 'Médio' | 'Grande';

export type BeneficioTipo =
  | 'desconto_percentual'
  | 'desconto_valor'
  | 'sessoes_gratis'
  | 'servico_gratis'
  | 'brinde'
  | 'pacote_especial'
  | 'avaliacao_gratis'
  | 'outro';

export type IndicacaoStatus = 'pendente' | 'convertido' | 'perdido' | 'cancelado';

// Labels para exibição
export const PARCERIA_STATUS_LABELS: Record<ParceriaStatus, string> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
  pendente: 'Pendente',
  suspenso: 'Suspenso',
};

export const PORTE_EMPRESA_LABELS: Record<PorteEmpresa, string> = {
  MEI: 'MEI',
  ME: 'Microempresa',
  EPP: 'Empresa de Pequeno Porte',
  Médio: 'Médio Porte',
  Grande: 'Grande Porte',
};

export const BENEFICIO_TIPO_LABELS: Record<BeneficioTipo, string> = {
  desconto_percentual: 'Desconto Percentual',
  desconto_valor: 'Desconto em Valor',
  sessoes_gratis: 'Sessões Grátis',
  servico_gratis: 'Serviço Grátis',
  brinde: 'Brinde',
  pacote_especial: 'Pacote Especial',
  avaliacao_gratis: 'Avaliação Grátis',
  outro: 'Outro',
};

export const INDICACAO_STATUS_LABELS: Record<IndicacaoStatus, string> = {
  pendente: 'Pendente',
  convertido: 'Convertido',
  perdido: 'Perdido',
  cancelado: 'Cancelado',
};

// Cores para status (Tailwind classes)
export const PARCERIA_STATUS_COLORS: Record<ParceriaStatus, string> = {
  ativo: 'bg-green-100 text-green-800',
  inativo: 'bg-gray-100 text-gray-800',
  pendente: 'bg-yellow-100 text-yellow-800',
  suspenso: 'bg-red-100 text-red-800',
};

export const INDICACAO_STATUS_COLORS: Record<IndicacaoStatus, string> = {
  pendente: 'bg-yellow-100 text-yellow-800',
  convertido: 'bg-green-100 text-green-800',
  perdido: 'bg-red-100 text-red-800',
  cancelado: 'bg-gray-100 text-gray-800',
};

// Aliases para compatibilidade (camelCase)
export const indicacaoStatusLabels = INDICACAO_STATUS_LABELS;
export const indicacaoStatusColors = INDICACAO_STATUS_COLORS;
export const parceriaStatusLabels = PARCERIA_STATUS_LABELS;
export const parceriaStatusColors = PARCERIA_STATUS_COLORS;

// =====================================================
// Ramos de Atividade
// =====================================================

export const RAMOS_ATIVIDADE = [
  'Academia/Fitness',
  'Alimentação/Restaurante',
  'Beleza/Bem-estar',
  'Saúde/Clínica',
  'Comércio Varejista',
  'Consultoria',
  'Educação',
  'Evento/Entretenimento',
  'Imobiliária',
  'Marketing/Publicidade',
  'Moda/Vestuário',
  'Odontologia',
  'Pet Shop',
  'Saúde/Bem-estar',
  'Serviços Financeiros',
  'Tecnologia',
  'Turismo/Viagem',
  'Outro',
] as const;

export type RamoAtividade = (typeof RAMOS_ATIVIDADE)[number];

// =====================================================
// Interfaces Principais
// =====================================================

export interface RedesSociais {
  tipo: string;
  url: string;
}

export interface Parceria {
  id: string;

  // Dados da Empresa
  razao_social: string;
  nome_fantasia: string;
  cnpj?: string | null;
  inscricao_estadual?: string | null;

  // Ramo de Atividade
  ramo_atividade: string;
  segmento?: string | null;
  porte?: PorteEmpresa | null;

  // Endereço
  cep?: string | null;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;

  // Responsável Principal
  responsavel_nome: string;
  responsavel_cargo?: string | null;
  responsavel_email?: string | null;
  responsavel_telefone?: string | null;
  responsavel_telefone_codigo_pais?: string | null; // Código do país (ex: "55" para Brasil)
  responsavel_whatsapp?: string | null;
  responsavel_whatsapp_codigo_pais?: string | null; // Código do país para WhatsApp

  // Código de Indicação
  codigo_indicacao?: string;
  quantidade_indicacoes: number;

  // Branding
  logo_url?: string | null;
  logo_path?: string | null;
  descricao_curta?: string | null;
  descricao_completa?: string | null;

  // Links e Redes Sociais
  website?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  linkedin?: string | null;
  outras_redes?: RedesSociais[];

  // Vinculação (híbrido: global ou por franqueado)
  franqueado_id?: string | null;
  unidade_id?: string | null;

  // Status e Controle
  status: ParceriaStatus;
  data_inicio_parceria?: string | null;
  data_fim_parceria?: string | null;
  observacoes?: string | null;

  // Autenticação Portal
  codigo_verificacao?: string | null;
  codigo_expira_em?: string | null;
  ultimo_login?: string | null;

  // Timestamps
  created_at: string;
  updated_at?: string;
  created_by?: string | null;
  updated_by?: string | null;

  // Relacionamentos Expandidos (via JOIN)
  franqueado?: {
    id: string;
    nome_fantasia: string;
  } | null;
  unidade?: {
    id: string;
    nome: string;
  } | null;
  beneficios?: ParceriaBeneficio[];
  contatos?: ParceriaContato[];
}

// =====================================================
// Benefícios
// =====================================================

export interface ParceriaBeneficio {
  id: string;
  parceria_id: string;

  // Dados do Benefício
  titulo: string;
  descricao?: string | null;
  tipo: BeneficioTipo;
  valor?: string | null; // Ex: "10%", "R$ 50", "10 sessões"

  // Aplicabilidade
  servicos_aplicaveis?: string[] | null;
  areas_corporais?: string[] | null;

  // Validade
  validade_inicio?: string | null;
  validade_fim?: string | null;
  ativo: boolean;

  // Controle de Exibição
  ordem: number;
  destaque: boolean;

  // Timestamps
  created_at: string;
  updated_at?: string;
}

// =====================================================
// Indicações
// =====================================================

export interface ParceriaIndicacao {
  id: string;
  parceria_id: string;
  lead_id?: string | null;

  // Tracking
  codigo_usado?: string | null;
  landing_page?: string | null;
  campanha?: string | null;

  // UTM Parameters
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;

  // Status de Conversão
  status: IndicacaoStatus;
  data_indicacao: string;
  data_conversao?: string | null;

  // Financeiro
  valor_comissao?: number | null;
  comissao_paga: boolean;
  data_pagamento_comissao?: string | null;

  // Observações
  observacoes?: string | null;

  // Timestamps
  created_at: string;

  // Relacionamentos Expandidos
  lead?: {
    id: string;
    nome: string;
    email?: string | null;
    whatsapp?: string | null;
    status: string;
    created_at: string;
  } | null;
  parceria?: Pick<Parceria, 'id' | 'nome_fantasia' | 'codigo_indicacao' | 'logo_url'> | null;
}

// =====================================================
// Contatos Adicionais
// =====================================================

export interface ParceriaContato {
  id: string;
  parceria_id: string;
  nome: string;
  cargo?: string | null;
  email?: string | null;
  telefone?: string | null;
  telefone_codigo_pais?: string | null; // Código do país
  whatsapp?: string | null;
  whatsapp_codigo_pais?: string | null; // Código do país para WhatsApp
  is_principal: boolean;
  observacoes?: string | null;
  created_at: string;
}

// =====================================================
// Types para Insert/Update
// =====================================================

export type ParceriaInsert = Omit<
  Parceria,
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'franqueado'
  | 'unidade'
  | 'beneficios'
  | 'contatos'
  | 'codigo_indicacao'
  | 'quantidade_indicacoes'
>;

export type ParceriaUpdate = Partial<ParceriaInsert>;

export type ParceriaBeneficioInsert = Omit<ParceriaBeneficio, 'id' | 'created_at' | 'updated_at'>;
export type ParceriaBeneficioUpdate = Partial<ParceriaBeneficioInsert>;

export type ParceriaContatoInsert = Omit<ParceriaContato, 'id' | 'created_at'>;
export type ParceriaContatoUpdate = Partial<ParceriaContatoInsert>;

export type ParceriaIndicacaoInsert = Omit<ParceriaIndicacao, 'id' | 'created_at' | 'lead' | 'parceria'>;
export type ParceriaIndicacaoUpdate = Partial<ParceriaIndicacaoInsert>;

// =====================================================
// Filtros
// =====================================================

export interface ParceriaFilters {
  search?: string;
  status?: ParceriaStatus;
  ramo_atividade?: string;
  franqueado_id?: string;
  cidade?: string;
  estado?: string;
  ativo?: boolean;
  periodo_inicio?: string;
  periodo_fim?: string;
}

export interface ParceriaIndicacaoFilters {
  parceria_id?: string;
  lead_id?: string;
  status?: IndicacaoStatus;
  periodo_inicio?: string;
  periodo_fim?: string;
  search?: string;
}

// =====================================================
// KPIs e Métricas
// =====================================================

export interface ParceriaKPIs {
  total_parcerias: number;
  parcerias_ativas: number;
  parcerias_inativas: number;
  parcerias_pendentes: number;
  total_indicacoes: number;
  indicacoes_convertidas: number;
  indicacoes_pendentes: number;
  indicacoes_perdidas: number;
  taxa_conversao: number;
  beneficios_ativos: number;
}

export interface ParceriaRanking {
  posicao: number;
  parceria_id: string;
  nome_fantasia: string;
  codigo_indicacao?: string;
  logo_url?: string | null;
  total_indicacoes: number;
  indicacoes_convertidas: number;
  taxa_conversao: number;
  ultima_indicacao?: string;
}

export interface ParceriaIndicacaoMetrics {
  total: number;
  convertidas: number;
  pendentes: number;
  perdidas: number;
  canceladas: number;
  taxa_conversao: number;
}

// =====================================================
// Funções Utilitárias
// =====================================================

/**
 * Gera link de indicação com o código da parceria
 * Usa o formulário padrão de indicações (boas-vindas)
 * @param codigoIndicacao - Código de indicação da parceria
 * @param baseUrl - URL base (default: window.location.origin)
 */
export function gerarLinkIndicacaoParceria(codigoIndicacao: string, baseUrl?: string): string {
  const url = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://www.viniun.com.br');
  return `${url}/form/${FORMULARIO_INDICACAO_SLUG}?parceria=${codigoIndicacao}`;
}

/**
 * Gera mensagem de WhatsApp para compartilhar link de indicação
 * @param nomeParceria - Nome da parceria
 * @param codigoIndicacao - Código de indicação
 * @param linkFormulario - Link completo (opcional, usa o padrão se não informado)
 * @param beneficioPrincipal - Texto do benefício principal (opcional)
 */
export function gerarMensagemWhatsAppParceria(
  nomeParceria: string,
  codigoIndicacao: string,
  linkFormulario?: string,
  beneficioPrincipal?: string
): string {
  const link = linkFormulario || gerarLinkIndicacaoParceria(codigoIndicacao);
  let mensagem = `Olá! A *${nomeParceria}* tem uma parceria especial com a Viniun para você!\n\n`;

  if (beneficioPrincipal) {
    mensagem += `*Benefício:* ${beneficioPrincipal}\n\n`;
  }

  mensagem += `Use o código *${codigoIndicacao}* ou acesse:\n${link}\n\n`;
  mensagem += `Aproveite essa oportunidade exclusiva!`;

  return mensagem;
}

/**
 * Formata CNPJ para exibição (XX.XXX.XXX/XXXX-XX)
 */
export function formatarCNPJ(cnpj: string | null | undefined): string {
  if (!cnpj) return '';
  const numeros = cnpj.replace(/\D/g, '');
  if (numeros.length !== 14) return cnpj;
  return numeros.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

/**
 * Formata telefone para exibição
 */
export function formatarTelefone(telefone: string | null | undefined): string {
  if (!telefone) return '';
  const numeros = telefone.replace(/\D/g, '');
  if (numeros.length === 11) {
    return numeros.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  }
  if (numeros.length === 10) {
    return numeros.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  }
  return telefone;
}

/**
 * Formata CEP para exibição (XXXXX-XXX)
 */
export function formatarCEP(cep: string | null | undefined): string {
  if (!cep) return '';
  const numeros = cep.replace(/\D/g, '');
  if (numeros.length !== 8) return cep;
  return numeros.replace(/^(\d{5})(\d{3})$/, '$1-$2');
}

/**
 * Calcula a taxa de conversão
 */
export function calcularTaxaConversao(convertidas: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((convertidas / total) * 100 * 10) / 10;
}

/**
 * Verifica se um benefício está dentro da validade
 */
export function beneficioEstaValido(beneficio: ParceriaBeneficio): boolean {
  if (!beneficio.ativo) return false;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  if (beneficio.validade_inicio) {
    const inicio = new Date(beneficio.validade_inicio);
    if (inicio > hoje) return false;
  }

  if (beneficio.validade_fim) {
    const fim = new Date(beneficio.validade_fim);
    if (fim < hoje) return false;
  }

  return true;
}

/**
 * Filtra apenas benefícios válidos
 */
export function filtrarBeneficiosValidos(beneficios: ParceriaBeneficio[]): ParceriaBeneficio[] {
  return beneficios.filter(beneficioEstaValido).sort((a, b) => {
    // Destaque primeiro, depois por ordem
    if (a.destaque !== b.destaque) return a.destaque ? -1 : 1;
    return a.ordem - b.ordem;
  });
}

/**
 * Obtém o benefício principal (destaque) de uma parceria
 */
export function getBeneficioPrincipal(beneficios: ParceriaBeneficio[]): ParceriaBeneficio | null {
  const validos = filtrarBeneficiosValidos(beneficios);
  return validos.find((b) => b.destaque) || validos[0] || null;
}

/**
 * Formata o valor do benefício para exibição
 */
export function formatarValorBeneficio(beneficio: ParceriaBeneficio): string {
  if (!beneficio.valor) return beneficio.titulo;

  switch (beneficio.tipo) {
    case 'desconto_percentual':
      return `${beneficio.valor} de desconto`;
    case 'desconto_valor':
      return `R$ ${beneficio.valor} de desconto`;
    case 'sessoes_gratis':
      return `${beneficio.valor} sessões grátis`;
    case 'servico_gratis':
      return `${beneficio.valor} grátis`;
    case 'brinde':
      return `Brinde: ${beneficio.valor}`;
    case 'pacote_especial':
      return `Pacote especial: ${beneficio.valor}`;
    case 'avaliacao_gratis':
      return 'Avaliação grátis';
    default:
      return beneficio.valor;
  }
}
