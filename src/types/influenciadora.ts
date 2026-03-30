// Types para Sistema de Influenciadoras YESlaser

import { FORMULARIO_INDICACAO_SLUG } from './indicacao';

// ============================================
// ENUMS
// ============================================

export type InfluenciadoraTipo = 'influenciador' | 'ugc_creator' | 'ambos';

export type InfluenciadoraTamanho = 'nano' | 'micro' | 'medio' | 'macro' | 'mega';

export type InfluenciadoraStatus = 'pendente' | 'aprovado' | 'rejeitado' | 'suspenso';

export type RedeSocialPlataforma = 'instagram' | 'tiktok' | 'youtube' | 'facebook' | 'twitter' | 'kwai' | 'linkedin' | 'pinterest';

export type ContratoTipo = 'mensal' | 'por_post' | 'comissao' | 'permuta' | 'misto';

export type ContratoStatus = 'rascunho' | 'ativo' | 'pausado' | 'encerrado' | 'cancelado';

export type PagamentoTipo = 'mensal' | 'post' | 'comissao' | 'bonus' | 'ajuste';

export type PagamentoStatus = 'pendente' | 'aprovado' | 'pago' | 'cancelado';

export type PagamentoForma = 'pix' | 'transferencia' | 'permuta' | 'dinheiro';

export type PermutaStatus = 'disponivel' | 'agendado' | 'realizado' | 'cancelado' | 'expirado';

export type PostPlataforma = 'instagram' | 'tiktok' | 'youtube' | 'facebook' | 'stories' | 'reels';

export type PostTipoConteudo = 'post_feed' | 'stories' | 'reels' | 'video' | 'live' | 'carrossel' | 'ugc_video' | 'ugc_foto' | 'review' | 'unboxing';

export type PostStatus = 'pendente' | 'publicado' | 'aprovado' | 'rejeitado';

export type PromocaoStatus = 'rascunho' | 'agendada' | 'enviada' | 'cancelada';

export type MensagemStatus = 'pendente' | 'enviado' | 'entregue' | 'lido' | 'erro';

export type IndicacaoStatus = 'pendente' | 'convertido' | 'perdido' | 'cancelado';

// ============================================
// INTERFACES PRINCIPAIS
// ============================================

export interface Influenciadora {
  id: string;

  // Dados Pessoais
  nome_completo: string;
  nome_artistico?: string;
  email?: string;
  telefone?: string;
  telefone_codigo_pais?: string; // Código do país (ex: "55" para Brasil)
  whatsapp: string;
  whatsapp_codigo_pais?: string; // Código do país para WhatsApp (default: "55")
  cpf?: string;
  data_nascimento?: string;
  genero?: string | null;

  // Código de Indicação
  // NOTA: A coluna real no banco de dados (mt_influencers) se chama 'codigo'.
  // Este campo 'codigo_indicacao' é um alias de aplicação, mapeado por hooks e adapters.
  // Hooks que fazem SELECT direto no banco devem usar .eq('codigo', ...) e .select('codigo').
  codigo_indicacao?: string;
  quantidade_indicacoes: number;

  // Localização
  cidade?: string;
  estado?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;

  // Perfil
  foto_perfil?: string;
  biografia?: string;
  tipo: InfluenciadoraTipo;
  tamanho?: InfluenciadoraTamanho;

  // Métricas Consolidadas
  total_seguidores: number;
  taxa_engajamento_media: number;

  // Status
  status: InfluenciadoraStatus;
  ativo: boolean;

  // Autenticação Portal
  codigo_verificacao?: string;
  codigo_expira_em?: string;
  ultimo_login?: string;
  aceite_termos: boolean;
  aceite_termos_at?: string;
  onboarding_completed?: boolean;
  onboarding_step?: string;

  // Multi-tenant
  tenant_id?: string;
  franchise_id?: string | null;

  // Dados Pessoais Adicionais (para contrato)
  rg?: string;
  estado_civil?: string;
  profissao?: string;
  naturalidade?: string;

  // Menor de Idade / Responsável Legal
  eh_menor?: boolean;
  responsavel_legal_nome?: string;
  responsavel_legal_cpf?: string;
  responsavel_legal_rg?: string;
  responsavel_legal_email?: string;
  responsavel_legal_telefone?: string;
  responsavel_legal_parentesco?: string;

  // Relacionamentos
  franqueado_id?: string;
  unidade_id?: string;

  // Relacionamentos expandidos
  franqueado?: {
    id: string;
    nome_franquia: string;
  };
  unidade?: {
    id: string;
    nome: string;
  };
  responsavel_id?: string;
  responsavel?: {
    id: string;
    nome: string;
    cargo: string | null;
  } | null;
  redes_sociais?: InfluenciadoraRedeSocial[];
  valores?: InfluenciadoraValor[];
  contrato_ativo?: InfluenciadoraContrato;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface InfluenciadoraRedeSocial {
  id: string;
  influenciadora_id: string;
  plataforma: RedeSocialPlataforma;
  username?: string;
  url?: string;
  seguidores: number;
  taxa_engajamento: number;
  verificado: boolean;
  created_at: string;
  updated_at: string;
}

export interface InfluenciadoraValor {
  id: string;
  influenciadora_id: string;
  plataforma: PostPlataforma;
  tipo_conteudo: PostTipoConteudo;
  valor: number;
  moeda: string;
  descricao?: string;
  negociavel: boolean;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface InfluenciadoraIndicacao {
  id: string;
  influenciadora_id: string;
  lead_id?: string;
  codigo_usado?: string;
  campanha?: string;
  landing_page?: string;
  status: IndicacaoStatus;
  data_indicacao: string;
  data_conversao?: string;
  valor_comissao?: number;
  observacoes?: string;
  created_at: string;

  // Relacionamentos expandidos
  influenciadora?: Influenciadora;
  lead?: {
    id: string;
    nome?: string;
    email?: string;
    telefone?: string;
    status?: string;
  };
}

export interface InfluenciadoraContrato {
  id: string;
  influenciadora_id: string;
  numero_contrato?: string;

  // Tipo de Contrato
  tipo_contrato: ContratoTipo;

  // Valores
  valor_mensal?: number;
  valor_por_post?: number;
  percentual_comissao?: number;
  valor_fixo_comissao?: number;

  // Permuta
  credito_permuta?: number;
  credito_permuta_usado?: number;
  procedimentos_permitidos?: string[];

  // Vigência
  data_inicio: string;
  data_fim?: string;
  renovacao_automatica: boolean;

  // Status
  status: ContratoStatus;
  observacoes?: string;

  // Contrato completo
  servicos_permuta?: string[];
  template_tipo?: string;
  texto_contrato?: string;
  aditivos_count?: number;
  assinado?: boolean;

  // Metadata
  created_by?: string;
  created_at: string;
  updated_at: string;

  // Relacionamentos expandidos
  influenciadora?: Influenciadora;
  pagamentos?: InfluenciadoraPagamento[];
  permutas?: InfluenciadoraPermuta[];
  posts?: InfluenciadoraPost[];
}

export interface InfluenciadoraPagamento {
  id: string;
  influenciadora_id: string;
  contrato_id?: string;

  // Detalhes do Pagamento
  tipo: PagamentoTipo;
  descricao?: string;
  referencia_mes?: string;

  // Valores
  valor_bruto: number;
  descontos: number;
  valor_liquido: number;

  // Status
  status: PagamentoStatus;
  data_vencimento?: string;
  data_pagamento?: string;
  comprovante_url?: string;

  // Forma de Pagamento
  forma_pagamento: PagamentoForma;

  // Dados bancários (snapshot)
  dados_bancarios?: Record<string, unknown>;

  // Metadata
  aprovado_por?: string;
  aprovado_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;

  // Relacionamentos expandidos
  influenciadora?: Influenciadora;
  contrato?: InfluenciadoraContrato;
}

export interface InfluenciadoraPermuta {
  id: string;
  influenciadora_id: string;
  contrato_id?: string;

  // Procedimento
  servico_id?: string;
  servico_nome: string;
  valor_servico: number;

  // Agendamento
  agendamento_id?: string;
  data_realizacao?: string;
  unidade_id?: string;

  // Status
  status: PermutaStatus;
  observacoes?: string;

  // Metadata
  created_at: string;
  updated_at: string;

  // Relacionamentos expandidos
  influenciadora?: Influenciadora;
  contrato?: InfluenciadoraContrato;
  servico?: {
    id: string;
    nome: string;
    preco: number;
  };
  unidade?: {
    id: string;
    nome: string;
  };
}

export interface InfluenciadoraPost {
  id: string;
  influenciadora_id: string;
  contrato_id?: string;

  // Detalhes do Post
  plataforma: PostPlataforma;
  tipo_conteudo: PostTipoConteudo;
  url_post?: string;
  descricao?: string;
  screenshot_url?: string;

  // Métricas
  views: number;
  likes: number;
  comentarios: number;
  compartilhamentos: number;
  alcance: number;
  engajamento: number;

  // Valor
  valor_acordado?: number;
  pagamento_id?: string;

  // Status
  status: PostStatus;
  data_publicacao?: string;
  data_aprovacao?: string;
  motivo_rejeicao?: string;

  // Metadata
  aprovado_por?: string;
  created_at: string;
  updated_at: string;

  // Relacionamentos expandidos
  influenciadora?: Influenciadora;
  contrato?: InfluenciadoraContrato;
  pagamento?: InfluenciadoraPagamento;
}

export interface InfluenciadoraPromocao {
  id: string;
  titulo: string;
  descricao?: string;
  imagem_url?: string;
  link_promo?: string;
  data_inicio?: string;
  data_fim?: string;
  status: PromocaoStatus;
  total_destinatarios: number;
  total_enviados: number;
  total_entregues: number;
  total_lidos: number;
  created_by?: string;
  created_at: string;
  updated_at: string;

  // Relacionamentos expandidos
  mensagens?: InfluenciadoraMensagem[];
}

export interface InfluenciadoraMensagem {
  id: string;
  promocao_id?: string;
  influenciadora_id: string;
  sessao_waha?: string;
  mensagem?: string;
  status: MensagemStatus;
  erro_mensagem?: string;
  message_id_waha?: string;
  enviado_at?: string;
  entregue_at?: string;
  lido_at?: string;
  created_at: string;

  // Relacionamentos expandidos
  influenciadora?: Influenciadora;
  promocao?: InfluenciadoraPromocao;
}

// ============================================
// INTERFACES DE FORMULÁRIO
// ============================================

export interface InfluenciadoraFormData {
  nome_completo: string;
  nome_artistico?: string;
  email?: string;
  telefone?: string;
  telefone_codigo_pais?: string;
  whatsapp: string;
  whatsapp_codigo_pais?: string;
  cpf?: string;
  data_nascimento?: string;
  genero?: string;
  // Endereço completo (igual a mt_leads)
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  pais?: string;
  foto_perfil?: string;
  biografia?: string;
  tipo: InfluenciadoraTipo;
  tamanho?: InfluenciadoraTamanho;
  franchise_id?: string; // MT: campo correto
  franqueado_id?: string; // Legacy: manter para compatibilidade
  unidade_id?: string; // Legacy: manter para compatibilidade
  responsavel_id?: string; // Consultora responsável
  aceite_termos?: boolean;
  // Dados Pessoais Adicionais (para contrato)
  rg?: string;
  estado_civil?: string;
  profissao?: string;
  naturalidade?: string;
  // Menor de Idade / Responsável Legal
  eh_menor?: boolean;
  responsavel_legal_nome?: string;
  responsavel_legal_cpf?: string;
  responsavel_legal_rg?: string;
  responsavel_legal_email?: string;
  responsavel_legal_telefone?: string;
  responsavel_legal_parentesco?: string;
}

export interface RedeSocialFormData {
  plataforma: RedeSocialPlataforma;
  username?: string;
  url?: string;
  seguidores?: number;
  taxa_engajamento?: number;
}

export interface ValorFormData {
  plataforma: PostPlataforma;
  tipo_conteudo: PostTipoConteudo;
  valor: number;
  descricao?: string;
  negociavel?: boolean;
}

export interface ContratoFormData {
  influenciadora_id: string;
  tipo_contrato: ContratoTipo;
  valor_mensal?: number;
  valor_por_post?: number;
  percentual_comissao?: number;
  valor_fixo_comissao?: number;
  credito_permuta?: number;
  procedimentos_permitidos?: string[];
  data_inicio: string;
  data_fim?: string;
  renovacao_automatica?: boolean;
  observacoes?: string;
}

export interface PagamentoFormData {
  influenciadora_id: string;
  contrato_id?: string;
  tipo: PagamentoTipo;
  descricao?: string;
  referencia_mes?: string;
  valor_bruto: number;
  descontos?: number;
  forma_pagamento?: PagamentoForma;
  data_vencimento?: string;
}

export interface PermutaFormData {
  influenciadora_id: string;
  contrato_id?: string;
  servico_id: string;
  servico_nome: string;
  valor_servico: number;
  unidade_id: string;
  data_realizacao?: string;
  observacoes?: string;
}

export interface PostFormData {
  influenciadora_id: string;
  contrato_id?: string;
  plataforma: PostPlataforma;
  tipo_conteudo: PostTipoConteudo;
  url_post?: string;
  descricao?: string;
  screenshot_url?: string;
  views?: number;
  likes?: number;
  comentarios?: number;
  compartilhamentos?: number;
  alcance?: number;
  valor_acordado?: number;
  data_publicacao?: string;
}

export interface PromocaoFormData {
  titulo: string;
  descricao?: string;
  imagem_url?: string;
  link_promo?: string;
  data_inicio?: string;
  data_fim?: string;
}

// ============================================
// INTERFACES DE KPIs E ESTATÍSTICAS
// ============================================

export interface InfluenciadoraKPIs {
  total_influenciadoras: number;
  influenciadoras_ativas: number;
  influenciadoras_pendentes: number;
  total_indicacoes: number;
  indicacoes_convertidas: number;
  taxa_conversao: number;
  total_seguidores: number;
  engajamento_medio: number;
}

export interface InfluenciadoraFinanceiroKPIs {
  total_pago_mes: number;
  pagamentos_pendentes: number;
  pagamentos_pendentes_valor: number;
  credito_permutas_total: number;
  credito_permutas_usado: number;
  credito_permutas_disponivel: number;
  total_posts_mes: number;
  valor_posts_mes: number;
}

export interface InfluenciadoraRanking {
  posicao: number;
  influenciadora_id: string;
  nome_completo: string;
  nome_artistico?: string;
  foto_perfil?: string;
  codigo_indicacao?: string;
  total_indicacoes: number;
  indicacoes_convertidas: number;
  taxa_conversao: number;
  ultima_indicacao?: string;
  total_seguidores: number;
}

// ============================================
// INTERFACES DE FILTROS
// ============================================

export interface InfluenciadoraFilters {
  search?: string;
  status?: InfluenciadoraStatus;
  tipo?: InfluenciadoraTipo;
  tamanho?: InfluenciadoraTamanho;
  franqueado_id?: string;
  unidade_id?: string;
  ativo?: boolean;
  periodo_inicio?: string;
  periodo_fim?: string;
}

export interface IndicacaoFilters {
  influenciadora_id?: string;
  status?: IndicacaoStatus;
  campanha?: string;
  periodo_inicio?: string;
  periodo_fim?: string;
}

export interface PagamentoFilters {
  influenciadora_id?: string;
  contrato_id?: string;
  status?: PagamentoStatus;
  tipo?: PagamentoTipo;
  referencia_mes?: string;
  periodo_inicio?: string;
  periodo_fim?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Retorna o label amigável para o tipo de influenciadora
 */
export function getTipoLabel(tipo: InfluenciadoraTipo): string {
  const labels: Record<InfluenciadoraTipo, string> = {
    influenciador: 'Influenciador(a)',
    ugc_creator: 'UGC Creator',
    ambos: 'Influenciador + UGC',
  };
  return labels[tipo] || tipo;
}

/**
 * Retorna o label amigável para o tamanho
 */
export function getTamanhoLabel(tamanho: InfluenciadoraTamanho): string {
  const labels: Record<InfluenciadoraTamanho, string> = {
    nano: 'Nano (1k-10k)',
    micro: 'Micro (10k-50k)',
    medio: 'Médio (50k-500k)',
    macro: 'Macro (500k-1M)',
    mega: 'Mega (1M+)',
  };
  return labels[tamanho] || tamanho;
}

/**
 * Retorna o label amigável para o status
 */
export function getStatusLabel(status: InfluenciadoraStatus): string {
  const labels: Record<InfluenciadoraStatus, string> = {
    pendente: 'Pendente',
    aprovado: 'Aprovado',
    rejeitado: 'Rejeitado',
    suspenso: 'Suspenso',
  };
  return labels[status] || status;
}

/**
 * Retorna a cor para o badge de status
 */
export function getStatusColor(status: InfluenciadoraStatus): string {
  const colors: Record<InfluenciadoraStatus, string> = {
    pendente: 'bg-yellow-100 text-yellow-800',
    aprovado: 'bg-green-100 text-green-800',
    rejeitado: 'bg-red-100 text-red-800',
    suspenso: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Retorna o ícone da plataforma
 */
export function getPlataformaIcon(plataforma: RedeSocialPlataforma | PostPlataforma): string {
  const icons: Record<string, string> = {
    instagram: 'Instagram',
    tiktok: 'TikTok',
    youtube: 'YouTube',
    facebook: 'Facebook',
    twitter: 'Twitter/X',
    kwai: 'Kwai',
    linkedin: 'LinkedIn',
    pinterest: 'Pinterest',
    stories: 'Stories',
    reels: 'Reels',
  };
  return icons[plataforma] || plataforma;
}

/**
 * Retorna o label do tipo de conteúdo
 */
export function getTipoConteudoLabel(tipo: PostTipoConteudo): string {
  const labels: Record<PostTipoConteudo, string> = {
    post_feed: 'Post Feed',
    stories: 'Stories',
    reels: 'Reels',
    video: 'Vídeo',
    live: 'Live',
    carrossel: 'Carrossel',
    ugc_video: 'UGC Vídeo',
    ugc_foto: 'UGC Foto',
    review: 'Review',
    unboxing: 'Unboxing',
  };
  return labels[tipo] || tipo;
}

/**
 * Retorna o label do tipo de contrato
 */
export function getContratoTipoLabel(tipo: ContratoTipo): string {
  const labels: Record<ContratoTipo, string> = {
    mensal: 'Mensal Fixo',
    por_post: 'Por Post',
    comissao: 'Comissão',
    permuta: 'Permuta',
    misto: 'Misto',
  };
  return labels[tipo] || tipo;
}

/**
 * Retorna o label do status de pagamento
 */
export function getPagamentoStatusLabel(status: PagamentoStatus): string {
  const labels: Record<PagamentoStatus, string> = {
    pendente: 'Pendente',
    aprovado: 'Aprovado',
    pago: 'Pago',
    cancelado: 'Cancelado',
  };
  return labels[status] || status;
}

/**
 * Retorna a cor para o badge de status de pagamento
 */
export function getPagamentoStatusColor(status: PagamentoStatus): string {
  const colors: Record<PagamentoStatus, string> = {
    pendente: 'bg-yellow-100 text-yellow-800',
    aprovado: 'bg-blue-100 text-blue-800',
    pago: 'bg-green-100 text-green-800',
    cancelado: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Gera link de indicação para influenciadoras
 * Usa o formulário padrão de indicações (boas-vindas)
 * @param codigoIndicacao - Código de indicação da influenciadora
 * @param baseUrl - URL base (default: window.location.origin)
 */
export function gerarLinkIndicacao(codigoIndicacao: string, baseUrl?: string): string {
  const url = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://www.yeslaserpraiagrande.com.br');
  return `${url}/form/${FORMULARIO_INDICACAO_SLUG}?influenciadores=${codigoIndicacao}`;
}

/**
 * Gera mensagem de WhatsApp para compartilhar
 * @param nomeInfluenciadora - Nome da influenciadora
 * @param codigoIndicacao - Código de indicação
 * @param linkFormulario - Link completo (opcional, usa o padrão se não informado)
 */
export function gerarMensagemWhatsApp(
  nomeInfluenciadora: string,
  codigoIndicacao: string,
  linkFormulario?: string
): string {
  const link = linkFormulario || gerarLinkIndicacao(codigoIndicacao);
  return `Olá! A ${nomeInfluenciadora} indica a YESlaser para você!\n\n` +
    `Use o código *${codigoIndicacao}* ou acesse:\n${link}\n\n` +
    `Garanta seu desconto exclusivo!`;
}

/**
 * Formata valor monetário
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata número de seguidores
 */
export function formatSeguidores(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
}

/**
 * Calcula engajamento baseado nas métricas
 */
export function calcularEngajamento(
  likes: number,
  comentarios: number,
  compartilhamentos: number,
  alcance: number
): number {
  if (alcance === 0) return 0;
  const totalInteracoes = likes + comentarios + compartilhamentos;
  return Number(((totalInteracoes / alcance) * 100).toFixed(2));
}

/**
 * Determina o tamanho baseado no número de seguidores
 */
export function determinarTamanho(seguidores: number): InfluenciadoraTamanho {
  if (seguidores >= 1000000) return 'mega';
  if (seguidores >= 500000) return 'macro';
  if (seguidores >= 50000) return 'medio';
  if (seguidores >= 10000) return 'micro';
  return 'nano';
}

/**
 * Calcula crédito de permuta disponível
 */
export function calcularCreditoDisponivel(contrato: InfluenciadoraContrato): number {
  if (!contrato.credito_permuta) return 0;
  return contrato.credito_permuta - (contrato.credito_permuta_usado || 0);
}

// ============================================
// TIPOS INSERT/UPDATE PARA SUPABASE
// ============================================

export type InfluenciadoraInsert = Omit<Influenciadora, 'id' | 'created_at' | 'updated_at' | 'franqueado' | 'unidade' | 'redes_sociais' | 'valores' | 'contrato_ativo'>;

export type InfluenciadoraUpdate = Partial<InfluenciadoraInsert>;

export type InfluenciadoraRedeSocialInsert = Omit<InfluenciadoraRedeSocial, 'id' | 'created_at' | 'updated_at'>;

export type InfluenciadoraRedeSocialUpdate = Partial<InfluenciadoraRedeSocialInsert>;

export type InfluenciadoraValorInsert = Omit<InfluenciadoraValor, 'id' | 'created_at' | 'updated_at'>;

export type InfluenciadoraValorUpdate = Partial<InfluenciadoraValorInsert>;

export type InfluenciadoraIndicacaoInsert = Omit<InfluenciadoraIndicacao, 'id' | 'created_at' | 'influenciadora' | 'lead'>;

export type InfluenciadoraIndicacaoUpdate = Partial<InfluenciadoraIndicacaoInsert>;

export type InfluenciadoraContratoInsert = Omit<InfluenciadoraContrato, 'id' | 'created_at' | 'updated_at' | 'influenciadora' | 'pagamentos' | 'permutas' | 'posts'>;

export type InfluenciadoraContratoUpdate = Partial<InfluenciadoraContratoInsert>;

export type InfluenciadoraPagamentoInsert = Omit<InfluenciadoraPagamento, 'id' | 'created_at' | 'updated_at' | 'influenciadora' | 'contrato'>;

export type InfluenciadoraPagamentoUpdate = Partial<InfluenciadoraPagamentoInsert>;

export type InfluenciadoraPermutaInsert = Omit<InfluenciadoraPermuta, 'id' | 'created_at' | 'updated_at' | 'influenciadora' | 'contrato' | 'servico' | 'unidade'>;

export type InfluenciadoraPermutaUpdate = Partial<InfluenciadoraPermutaInsert>;

export type InfluenciadoraPostInsert = Omit<InfluenciadoraPost, 'id' | 'created_at' | 'updated_at' | 'influenciadora' | 'contrato' | 'pagamento'>;

export type InfluenciadoraPostUpdate = Partial<InfluenciadoraPostInsert>;

export type InfluenciadoraPromocaoInsert = Omit<InfluenciadoraPromocao, 'id' | 'created_at' | 'updated_at' | 'mensagens'>;

export type InfluenciadoraPromocaoUpdate = Partial<InfluenciadoraPromocaoInsert>;

export type InfluenciadoraMensagemInsert = Omit<InfluenciadoraMensagem, 'id' | 'created_at' | 'influenciadora' | 'promocao'>;

export type InfluenciadoraMensagemUpdate = Partial<InfluenciadoraMensagemInsert>;
