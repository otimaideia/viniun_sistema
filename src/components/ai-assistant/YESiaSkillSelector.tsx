import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, BrainCircuit, Target, DollarSign, Users, Megaphone, BarChart3, Settings } from 'lucide-react';

interface Agent {
  id: string;
  codigo: string;
  nome: string;
  domain?: string;
  is_active?: boolean;
}

interface YESiaSkillSelectorProps {
  agents: Agent[];
  selectedAgentId?: string | null;
  onSelect: (agentId: string | null) => void;
}

const DOMAIN_ICONS: Record<string, React.ElementType> = {
  sales: Target,
  finance: DollarSign,
  hr: Users,
  marketing: Megaphone,
  general: BarChart3,
  operations: Settings,
  traffic: Megaphone,
};

const DOMAIN_COLORS: Record<string, string> = {
  sales: 'bg-blue-100 text-blue-800',
  finance: 'bg-green-100 text-green-800',
  hr: 'bg-purple-100 text-purple-800',
  marketing: 'bg-orange-100 text-orange-800',
  general: 'bg-gray-100 text-gray-800',
  operations: 'bg-yellow-100 text-yellow-800',
  traffic: 'bg-red-100 text-red-800',
};

export function YESiaSkillSelector({ agents, selectedAgentId, onSelect }: YESiaSkillSelectorProps) {
  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
          <BrainCircuit className="h-3 w-3" />
          {selectedAgent ? selectedAgent.nome : 'Auto'}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs">Selecionar Agente</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onSelect(null)} className="text-xs">
          <BrainCircuit className="h-3.5 w-3.5 mr-2" />
          Auto (YESia decide)
          {!selectedAgentId && <Badge variant="secondary" className="ml-auto h-4 text-[10px]">ativo</Badge>}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {agents.filter(a => a.is_active !== false).map(agent => {
          const Icon = DOMAIN_ICONS[agent.domain || 'general'] || BrainCircuit;
          const colorClass = DOMAIN_COLORS[agent.domain || 'general'] || DOMAIN_COLORS.general;
          return (
            <DropdownMenuItem key={agent.id} onClick={() => onSelect(agent.id)} className="text-xs">
              <Icon className="h-3.5 w-3.5 mr-2" />
              {agent.nome}
              {agent.domain && (
                <Badge className={`ml-auto h-4 text-[10px] ${colorClass}`}>{agent.domain}</Badge>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default YESiaSkillSelector;
