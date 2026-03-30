import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bot, Clock, Zap } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AIAgentAnalysis } from '@/types/ai-agent';
import { SENTIMENT_LABELS, LEAD_TEMPERATURE_LABELS } from '@/types/ai-agent';

interface AnalysisHistoryProps {
  history: Partial<AIAgentAnalysis>[];
  onSelect: (analysisId: string) => void;
}

function getIcon(iconName: string) {
  const Icon = (LucideIcons as any)[iconName];
  return Icon || Bot;
}

export function AnalysisHistory({ history, onSelect }: AnalysisHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="p-4 text-center">
        <Clock className="h-8 w-8 mx-auto text-gray-300 mb-2" />
        <p className="text-sm text-gray-500">Nenhuma análise anterior</p>
        <p className="text-xs text-gray-400 mt-1">Selecione um agente e analise a conversa</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      <h4 className="text-xs font-semibold text-gray-600 px-1">Histórico de Análises</h4>
      <div className="space-y-1.5">
        {history.map(item => {
          const agent = item.agent as any;
          const Icon = agent ? getIcon(agent.icone) : Bot;
          const sentimentInfo = item.sentiment ? SENTIMENT_LABELS[item.sentiment] : null;
          const tempInfo = item.lead_temperature ? LEAD_TEMPERATURE_LABELS[item.lead_temperature] : null;

          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id!)}
              className="flex items-start gap-2 w-full rounded-lg border border-gray-100 p-2.5 text-left hover:border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md mt-0.5"
                style={{
                  backgroundColor: agent ? `${agent.cor}15` : '#f3f4f6',
                  color: agent?.cor || '#6b7280',
                }}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-gray-700 truncate">
                    {agent?.nome || 'Agente'}
                  </span>
                  <span className={cn(
                    'text-[9px] px-1.5 py-0.5 rounded',
                    item.status === 'completed' ? 'bg-green-50 text-green-600' :
                    item.status === 'failed' ? 'bg-red-50 text-red-600' :
                    'bg-yellow-50 text-yellow-600'
                  )}>
                    {item.status === 'completed' ? 'OK' :
                     item.status === 'failed' ? 'Erro' : 'Processando'}
                  </span>
                </div>

                {/* Badges row */}
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  {sentimentInfo && (
                    <span className={cn('text-[9px] px-1 py-0.5 rounded', sentimentInfo.color)}>
                      {sentimentInfo.label}
                    </span>
                  )}
                  {tempInfo && (
                    <span className={cn('text-[9px] px-1 py-0.5 rounded', tempInfo.color)}>
                      {tempInfo.label}
                    </span>
                  )}
                  {item.quality_score != null && (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-gray-100 text-gray-600">
                      Nota: {(item.quality_score * 10).toFixed(1)}
                    </span>
                  )}
                </div>

                {/* Time and tokens */}
                <div className="flex items-center gap-2 mt-1 text-[9px] text-gray-400">
                  <span>
                    {item.created_at && formatDistanceToNow(new Date(item.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                  {item.total_tokens && item.total_tokens > 0 && (
                    <span className="inline-flex items-center gap-0.5">
                      <Zap className="h-2.5 w-2.5" />
                      {item.total_tokens}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
