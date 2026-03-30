import { useNavigate } from "react-router-dom";
import {
  MessageSquare,
  BrainCircuit,
  RefreshCw,
  Settings,
  ArrowLeft,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface IconSubmenuProps {
  onSync?: () => void;
  isSyncing?: boolean;
  onToggleAiPanel?: () => void;
  aiPanelOpen?: boolean;
}

interface NavIconProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  disabled?: boolean;
  spinning?: boolean;
  onClick?: () => void;
}

function NavIcon({
  icon: Icon,
  label,
  active = false,
  disabled = false,
  spinning = false,
  onClick,
}: NavIconProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          disabled={disabled}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00a884]/50",
            active
              ? "bg-[#00a884]/15 text-[#00a884]"
              : "text-[#aebac1] hover:bg-[#2a3942] hover:text-[#e9edef]",
            disabled && "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-[#aebac1]"
          )}
        >
          <Icon
            className={cn(
              "h-5 w-5",
              spinning && "animate-spin"
            )}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="bg-[#233138] text-[#e9edef] border-[#233138]">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function IconSubmenu({ onSync, isSyncing = false, onToggleAiPanel, aiPanelOpen = false }: IconSubmenuProps) {
  const navigate = useNavigate();

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full w-[60px] flex-col items-center bg-[#202c33] py-3">
        {/* Top section - main navigation */}
        <div className="flex flex-1 flex-col items-center gap-1">
          <NavIcon
            icon={MessageSquare}
            label="Conversas"
            active
          />
          <NavIcon
            icon={BrainCircuit}
            label="Agentes IA"
            active={aiPanelOpen}
            onClick={onToggleAiPanel}
          />
          <NavIcon
            icon={RefreshCw}
            label={isSyncing ? "Sincronizando..." : "Sincronizar"}
            spinning={isSyncing}
            onClick={onSync}
          />
        </div>

        {/* Separator */}
        <div className="mx-3 my-2 h-px w-8 bg-[#2a3942]" />

        {/* Bottom section - settings & back */}
        <div className="flex flex-col items-center gap-1">
          <NavIcon
            icon={Settings}
            label="Configurações"
            onClick={() => navigate("/whatsapp")}
          />
          <NavIcon
            icon={ArrowLeft}
            label="Voltar"
            onClick={() => navigate("/dashboard")}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
