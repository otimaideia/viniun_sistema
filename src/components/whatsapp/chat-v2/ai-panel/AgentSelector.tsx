import { Bot, Check } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AIAgent } from '@/types/ai-agent';
import { Skeleton } from '@/components/ui/skeleton';

interface AgentSelectorProps {
  agents: AIAgent[];
  selectedAgent: AIAgent | null;
  onSelect: (agent: AIAgent) => void;
  isLoading: boolean;
}

function getIcon(iconName: string) {
  const Icon = (LucideIcons as any)[iconName];
  return Icon || Bot;
}

export function AgentSelector({ agents, selectedAgent, onSelect, isLoading }: AgentSelectorProps) {
  if (isLoading) {
    return (
      <div className="p-3 space-y-2">
        <p className="text-xs font-medium text-gray-500 px-1">Selecione um agente</p>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-[72px] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="p-4 text-center">
        <Bot className="h-8 w-8 mx-auto text-gray-300 mb-2" />
        <p className="text-sm text-gray-500">Nenhum agente configurado</p>
        <p className="text-xs text-gray-400 mt-1">Configure agentes em Configurações</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      <p className="text-xs font-medium text-gray-500 px-1">Selecione um agente</p>
      <div className="grid grid-cols-2 gap-2">
        {agents.map(agent => {
          const Icon = getIcon(agent.icone);
          const isSelected = selectedAgent?.id === agent.id;

          return (
            <button
              key={agent.id}
              onClick={() => onSelect(agent)}
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-all",
                "hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                isSelected
                  ? "border-2 shadow-sm"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              )}
              style={isSelected ? {
                borderColor: agent.cor,
                backgroundColor: `${agent.cor}08`,
              } : undefined}
            >
              {isSelected && (
                <div
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: agent.cor }}
                >
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${agent.cor}15`, color: agent.cor }}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-medium text-gray-700 leading-tight line-clamp-2">
                {agent.nome}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
