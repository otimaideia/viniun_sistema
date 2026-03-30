import { Clock, MessageSquare, Mic, ThumbsUp, ThumbsDown, Zap } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AIAgentAnalysis } from '@/types/ai-agent';
import { SENTIMENT_LABELS, LEAD_TEMPERATURE_LABELS } from '@/types/ai-agent';

interface AnalysisResultsProps {
  analysis: AIAgentAnalysis;
  onRate: (wasHelpful: boolean) => void;
}

function getTemperatureIcon(temp: string) {
  const info = LEAD_TEMPERATURE_LABELS[temp];
  if (!info) return null;
  const Icon = (LucideIcons as any)[info.icon];
  return Icon ? <Icon className="h-3 w-3" /> : null;
}

export function AnalysisResults({ analysis, onRate }: AnalysisResultsProps) {
  const sentimentInfo = analysis.sentiment ? SENTIMENT_LABELS[analysis.sentiment] : null;
  const tempInfo = analysis.lead_temperature ? LEAD_TEMPERATURE_LABELS[analysis.lead_temperature] : null;

  return (
    <div className="space-y-3 p-3">
      {/* Metrics row */}
      <div className="flex flex-wrap gap-1.5">
        {/* Sentiment badge */}
        {sentimentInfo && (
          <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full', sentimentInfo.color)}>
            {sentimentInfo.label}
          </span>
        )}

        {/* Lead temperature badge */}
        {tempInfo && (
          <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full', tempInfo.color)}>
            {getTemperatureIcon(analysis.lead_temperature!)}
            {tempInfo.label}
          </span>
        )}

        {/* Quality score badge */}
        {analysis.quality_score != null && (
          <span className={cn(
            'inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full',
            analysis.quality_score >= 0.7 ? 'bg-green-50 text-green-600' :
            analysis.quality_score >= 0.4 ? 'bg-amber-50 text-amber-600' :
            'bg-red-50 text-red-600'
          )}>
            Nota: {(analysis.quality_score * 10).toFixed(1)}
          </span>
        )}

        {/* Lead intent */}
        {analysis.lead_intent && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full bg-indigo-50 text-indigo-600">
            {analysis.lead_intent}
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 text-[10px] text-gray-400">
        <span className="inline-flex items-center gap-1">
          <MessageSquare className="h-3 w-3" />
          {analysis.messages_analyzed} msgs
        </span>
        {analysis.audio_messages_transcribed > 0 && (
          <span className="inline-flex items-center gap-1">
            <Mic className="h-3 w-3" />
            {analysis.audio_messages_transcribed} áudios
          </span>
        )}
        {analysis.processing_time_ms && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {(analysis.processing_time_ms / 1000).toFixed(1)}s
          </span>
        )}
        {analysis.total_tokens > 0 && (
          <span className="inline-flex items-center gap-1">
            <Zap className="h-3 w-3" />
            {analysis.total_tokens} tokens
          </span>
        )}
      </div>

      {/* Analysis text */}
      {analysis.analysis_text && (
        <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
          <h4 className="text-xs font-semibold text-gray-600 mb-1.5">Análise</h4>
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap prose prose-sm max-w-none">
            {analysis.analysis_text}
          </div>
        </div>
      )}

      {/* Feedback */}
      {analysis.was_helpful == null && (
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] text-gray-400">Esta análise foi útil?</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-gray-500 hover:text-green-600 hover:bg-green-50"
              onClick={() => onRate(true)}
            >
              <ThumbsUp className="h-3 w-3" />
              Sim
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50"
              onClick={() => onRate(false)}
            >
              <ThumbsDown className="h-3 w-3" />
              Não
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
