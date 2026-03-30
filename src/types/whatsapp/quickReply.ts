// Tipos para Respostas Rápidas

export type MediaType = 'image' | 'video' | 'audio' | 'document';

export interface QuickReply {
  id: string;
  franqueado_id: string;
  user_id: string | null; // NULL = global da franquia

  // Content
  shortcut: string; // ex: /saudacao, /preco
  title: string;
  content: string;
  category: string | null;

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

export interface CreateQuickReplyInput {
  shortcut: string;
  title: string;
  content: string;
  category?: string;
  media_type?: MediaType;
  media_url?: string;
  media_filename?: string;
  is_global?: boolean; // Se false, user_id será preenchido
}

export interface UpdateQuickReplyInput {
  shortcut?: string;
  title?: string;
  content?: string;
  category?: string;
  media_type?: MediaType | null;
  media_url?: string | null;
  media_filename?: string | null;
  is_active?: boolean;
  ordem?: number;
}

export interface QuickReplyFilters {
  category?: string;
  search?: string;
  isGlobal?: boolean;
  isActive?: boolean;
}

// Categorias padrão
export const QUICK_REPLY_CATEGORIES = [
  { value: 'saudacao', label: 'Saudações' },
  { value: 'atendimento', label: 'Atendimento' },
  { value: 'agendamento', label: 'Agendamento' },
  { value: 'precos', label: 'Preços' },
  { value: 'localizacao', label: 'Localização' },
  { value: 'horarios', label: 'Horários' },
  { value: 'promocao', label: 'Promoções' },
  { value: 'outros', label: 'Outros' },
];
