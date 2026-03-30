// =============================================================================
// TIPOS - Módulo de Documentos Multi-Tenant
// =============================================================================

export interface MTDocumentCategory {
  id: string;
  tenant_id: string;
  nome: string;
  descricao: string | null;
  cor: string | null;
  icone: string | null;
  ordem: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MTDocument {
  id: string;
  tenant_id: string;
  franchise_id: string | null;
  category_id: string | null;
  titulo: string;
  descricao: string | null;
  arquivo_url: string;
  arquivo_nome: string;
  arquivo_tipo: string; // MIME type
  arquivo_tamanho: number; // bytes
  tags: string[] | null;
  is_active: boolean;
  created_by: string | null;
  created_by_nome: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joins
  category?: MTDocumentCategory | null;
}

export interface MTDocumentCreate {
  titulo: string;
  descricao?: string | null;
  category_id?: string | null;
  arquivo_url: string;
  arquivo_nome: string;
  arquivo_tipo: string;
  arquivo_tamanho: number;
  tags?: string[] | null;
  franchise_id?: string | null;
}

export interface MTDocumentUpdate {
  id: string;
  titulo?: string;
  descricao?: string | null;
  category_id?: string | null;
  tags?: string[] | null;
  is_active?: boolean;
}

export interface MTDocumentCategoryCreate {
  nome: string;
  descricao?: string | null;
  cor?: string | null;
  icone?: string | null;
  ordem?: number;
}

export interface MTDocumentFilters {
  search?: string;
  category_id?: string;
  arquivo_tipo?: string;
  is_active?: boolean;
}

// Categorias de tipo de arquivo para filtro
export const ARQUIVO_TIPO_LABELS: Record<string, string> = {
  'application/pdf': 'PDF',
  'image/jpeg': 'Imagem JPEG',
  'image/png': 'Imagem PNG',
  'image/webp': 'Imagem WebP',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
  'application/zip': 'ZIP',
  'text/plain': 'Texto',
  'text/csv': 'CSV',
  'video/mp4': 'Vídeo MP4',
};

export function getFileTypeLabel(mimeType: string): string {
  return ARQUIVO_TIPO_LABELS[mimeType] || mimeType.split('/').pop()?.toUpperCase() || 'Arquivo';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
