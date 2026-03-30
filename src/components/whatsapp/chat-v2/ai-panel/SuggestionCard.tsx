import { useState } from 'react';
import { Send, Copy, Pencil, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { AIAgentSuggestion } from '@/types/ai-agent';

interface SuggestionCardProps {
  suggestion: AIAgentSuggestion;
  index: number;
  onSend: (text: string) => void;
  onEdit: (text: string) => void;
  isSending: boolean;
  agentColor: string;
}

export function SuggestionCard({
  suggestion,
  index,
  onSend,
  onEdit,
  isSending,
  agentColor,
}: SuggestionCardProps) {
  const [showReasoning, setShowReasoning] = useState(false);

  const typeLabels: Record<string, { label: string; color: string }> = {
    reply: { label: 'Resposta', color: 'bg-blue-50 text-blue-600' },
    question: { label: 'Pergunta', color: 'bg-purple-50 text-purple-600' },
    closing: { label: 'Fechamento', color: 'bg-green-50 text-green-600' },
  };

  const typeInfo = typeLabels[suggestion.type] || typeLabels.reply;

  const handleCopy = () => {
    navigator.clipboard.writeText(suggestion.text);
    toast.success('Copiado para a área de transferência');
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: agentColor }}
          >
            {index + 1}
          </span>
          <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', typeInfo.color)}>
            {typeInfo.label}
          </span>
        </div>
        {suggestion.confidence > 0 && (
          <span className="text-[10px] text-gray-400">
            {Math.round(suggestion.confidence * 100)}% confiança
          </span>
        )}
      </div>

      {/* Message text */}
      <div className="px-3 py-2.5">
        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
          {suggestion.text}
        </p>
      </div>

      {/* Reasoning (collapsible) */}
      {suggestion.reasoning && (
        <div className="border-t border-gray-100">
          <button
            onClick={() => setShowReasoning(!showReasoning)}
            className="flex items-center gap-1 w-full px-3 py-1.5 text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showReasoning ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Por que esta sugestão?
          </button>
          {showReasoning && (
            <div className="px-3 pb-2">
              <p className="text-[11px] text-gray-500 italic leading-relaxed">
                {suggestion.reasoning}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-t border-gray-100 bg-gray-50">
        <Button
          size="sm"
          className="flex-1 h-7 text-xs gap-1"
          style={{ backgroundColor: agentColor }}
          onClick={() => onSend(suggestion.text)}
          disabled={isSending}
        >
          {isSending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Send className="h-3 w-3" />
          )}
          Enviar
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={handleCopy}
          title="Copiar texto"
        >
          <Copy className="h-3 w-3" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => onEdit(suggestion.text)}
          title="Editar antes de enviar"
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
