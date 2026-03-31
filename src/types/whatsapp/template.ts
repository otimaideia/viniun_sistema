// Tipos para Templates de Mensagem

import { MediaType } from './quickReply';

export interface MessageTemplate {
  id: string;
  franqueado_id: string;

  // Content
  name: string;
  category: string;
  content: string; // com variáveis: {{nome}}, {{servico}}, etc

  // Variáveis esperadas
  variables: string[]; // ["nome", "servico", "valor"]

  // Media (opcional)
  media_type: MediaType | null;
  media_url: string | null;
  media_filename: string | null;

  // Stats
  use_count: number;
  last_used_at: string | null;

  // Status
  is_active: boolean;

  // Ordenação
  ordem: number;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateInput {
  name: string;
  category: string;
  content: string;
  variables?: string[];
  media_type?: MediaType;
  media_url?: string;
  media_filename?: string;
}

export interface UpdateTemplateInput {
  name?: string;
  category?: string;
  content?: string;
  variables?: string[];
  media_type?: MediaType | null;
  media_url?: string | null;
  media_filename?: string | null;
  is_active?: boolean;
  ordem?: number;
}

export interface TemplateFilters {
  category?: string;
  search?: string;
  isActive?: boolean;
}

// Categorias padrão para templates
export const TEMPLATE_CATEGORIES = [
  { value: 'boas-vindas', label: 'Boas-vindas' },
  { value: 'follow-up', label: 'Follow-up' },
  { value: 'agendamento', label: 'Agendamento' },
  { value: 'confirmacao', label: 'Confirmação' },
  { value: 'lembrete', label: 'Lembrete' },
  { value: 'promocao', label: 'Promoção' },
  { value: 'pos-atendimento', label: 'Pós-atendimento' },
  { value: 'cobranca', label: 'Cobrança' },
  { value: 'outros', label: 'Outros' },
];

// Variáveis padrão disponíveis
export const TEMPLATE_VARIABLES = [
  { variable: 'nome', label: 'Nome do Lead', example: 'João Silva' },
  { variable: 'primeiro_nome', label: 'Primeiro Nome', example: 'João' },
  { variable: 'telefone', label: 'Telefone', example: '(11) 99999-9999' },
  { variable: 'email', label: 'E-mail', example: 'joao@email.com' },
  { variable: 'servico', label: 'Serviço', example: 'Consultoria Imobiliária' },
  { variable: 'valor', label: 'Valor', example: 'R$ 500,00' },
  { variable: 'data', label: 'Data', example: '15/01/2025' },
  { variable: 'horario', label: 'Horário', example: '14:00' },
  { variable: 'endereco', label: 'Endereço', example: 'Rua das Flores, 123' },
  { variable: 'franquia', label: 'Nome da Franquia', example: 'Viniun Centro' },
  { variable: 'atendente', label: 'Nome do Atendente', example: 'Maria' },
];

// Função para extrair variáveis de um template
export function extractVariables(content: string): string[] {
  const regex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;
  const matches = content.match(regex);
  if (!matches) return [];

  return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
}

// Função para substituir variáveis no template
export function replaceVariables(
  content: string,
  values: Record<string, string>
): string {
  let result = content;

  for (const [key, value] of Object.entries(values)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value);
  }

  return result;
}
