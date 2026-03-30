import { Badge } from '@/components/ui/badge';
import { BrainCircuit, Target, DollarSign, Users, Megaphone, BarChart3, Settings, GraduationCap, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface YESiaAgentBadgeProps {
  agentName: string;
  className?: string;
}

const AGENT_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  orchestrator: { icon: BrainCircuit, color: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200' },
  sdr_agent: { icon: Target, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  closer_agent: { icon: Target, color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' },
  finance_agent: { icon: DollarSign, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  hr_agent: { icon: Users, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  marketing_agent: { icon: Megaphone, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  traffic_agent: { icon: Megaphone, color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  coach_agent: { icon: GraduationCap, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  report_agent: { icon: BarChart3, color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' },
  onboarding_agent: { icon: GraduationCap, color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200' },
  operations_agent: { icon: Settings, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
};

export function YESiaAgentBadge({ agentName, className }: YESiaAgentBadgeProps) {
  const config = AGENT_CONFIG[agentName] || { icon: MessageSquare, color: 'bg-gray-100 text-gray-800' };
  const Icon = config.icon;
  const displayName = agentName.replace(/_/g, ' ').replace(/agent/i, '').trim();

  return (
    <Badge variant="secondary" className={cn('h-4 text-[10px] gap-0.5 font-normal', config.color, className)}>
      <Icon className="h-2.5 w-2.5" />
      {displayName}
    </Badge>
  );
}

export default YESiaAgentBadge;
