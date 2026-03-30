import { SuggestionCard } from './SuggestionCard';
import type { AIAgentSuggestion } from '@/types/ai-agent';

interface SuggestionsListProps {
  suggestions: AIAgentSuggestion[];
  onSend: (text: string) => void;
  onEdit: (text: string) => void;
  isSending: boolean;
  agentColor: string;
}

export function SuggestionsList({
  suggestions,
  onSend,
  onEdit,
  isSending,
  agentColor,
}: SuggestionsListProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-2 p-3">
      <h4 className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
        <span className="h-1 w-1 rounded-full bg-indigo-500" />
        Sugestões de Resposta
      </h4>
      <div className="space-y-2">
        {suggestions.map((suggestion, index) => (
          <SuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            index={index}
            onSend={onSend}
            onEdit={onEdit}
            isSending={isSending}
            agentColor={agentColor}
          />
        ))}
      </div>
    </div>
  );
}
