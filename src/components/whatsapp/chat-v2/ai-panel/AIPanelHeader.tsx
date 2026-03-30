import { X, BrainCircuit, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AIPanelHeaderProps {
  onClose: () => void;
  onToggleHistory: () => void;
  showHistory: boolean;
}

export function AIPanelHeader({ onClose, onToggleHistory, showHistory }: AIPanelHeaderProps) {
  return (
    <div className="flex h-[60px] items-center justify-between border-b border-[#e9edef] bg-gradient-to-r from-indigo-50 to-purple-50 px-4 flex-shrink-0">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
          <BrainCircuit className="h-4 w-4 text-indigo-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Agentes IA</h3>
          <p className="text-[10px] text-gray-500">Análise de conversa</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 rounded-full ${showHistory ? 'text-indigo-600 bg-indigo-100' : 'text-gray-500 hover:bg-gray-100'}`}
                onClick={onToggleHistory}
              >
                <History className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Histórico de análises</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-500 hover:bg-gray-100 rounded-full"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
