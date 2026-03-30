export interface LeadActivity {
  id: string;
  lead_id: string;
  tipo: ActivityTipo;
  titulo: string | null;
  descricao: string | null;
  usuario_id: string | null;
  is_pinned: boolean;
  // Campos específicos por tipo
  duracao_minutos: number | null; // ligação
  resultado_ligacao: ResultadoLigacao | null;
  data_agendamento: string | null;
  hora_agendamento: string | null;
  local_agendamento: string | null;
  data_prazo: string | null; // tarefa
  prioridade: Prioridade | null;
  is_completed: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  // Joins
  usuario_nome?: string;
}

export type ActivityTipo = 'nota' | 'ligacao' | 'email' | 'reuniao' | 'agendamento' | 'tarefa';

export type ResultadoLigacao = 'atendida' | 'nao_atendida' | 'caixa_postal' | 'ocupado' | 'erro';

export type Prioridade = 'baixa' | 'normal' | 'alta' | 'urgente';

export interface ActivityFormData {
  tipo: ActivityTipo;
  titulo?: string;
  descricao?: string;
  // Ligação
  duracao_minutos?: number;
  resultado_ligacao?: ResultadoLigacao;
  // Agendamento
  data_agendamento?: string;
  hora_agendamento?: string;
  local_agendamento?: string;
  // Tarefa
  data_prazo?: string;
  prioridade?: Prioridade;
}

export interface ActivityStats {
  total: number;
  tarefas_pendentes: number;
  ligacoes: number;
  agendamentos: number;
}

export const ACTIVITY_TIPOS: { value: ActivityTipo; label: string; icon: string; color: string }[] = [
  { value: 'nota', label: 'Nota', icon: 'StickyNote', color: 'bg-yellow-500' },
  { value: 'ligacao', label: 'Ligação', icon: 'Phone', color: 'bg-blue-500' },
  { value: 'email', label: 'Email', icon: 'Mail', color: 'bg-purple-500' },
  { value: 'reuniao', label: 'Reunião', icon: 'Users', color: 'bg-green-500' },
  { value: 'agendamento', label: 'Agendamento', icon: 'Calendar', color: 'bg-orange-500' },
  { value: 'tarefa', label: 'Tarefa', icon: 'CheckSquare', color: 'bg-red-500' },
];

export const RESULTADO_LIGACAO_OPTIONS: { value: ResultadoLigacao; label: string }[] = [
  { value: 'atendida', label: 'Atendida' },
  { value: 'nao_atendida', label: 'Não Atendida' },
  { value: 'caixa_postal', label: 'Caixa Postal' },
  { value: 'ocupado', label: 'Ocupado' },
  { value: 'erro', label: 'Erro' },
];

export const PRIORIDADE_OPTIONS: { value: Prioridade; label: string; color: string }[] = [
  { value: 'baixa', label: 'Baixa', color: 'bg-gray-400' },
  { value: 'normal', label: 'Normal', color: 'bg-blue-400' },
  { value: 'alta', label: 'Alta', color: 'bg-orange-400' },
  { value: 'urgente', label: 'Urgente', color: 'bg-red-500' },
];
