import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LeadStatus } from "@/types/lead-mt";
import { Phone, Calendar, CheckCircle, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface QuickActionButtonsProps {
  currentStatus: LeadStatus;
  onStatusChange: (status: LeadStatus) => void;
  isUpdating?: boolean;
  compact?: boolean;
}

// Mapeamento simplificado do funil (status MT)
const STATUS_FLOW: Record<string, LeadStatus> = {
  contact: "contato",
  schedule: "agendado",
  confirm: "confirmado",
  convert: "convertido",
};

// Status que desabilitam cada botão (status MT)
const DISABLED_MAP: Record<LeadStatus, string[]> = {
  novo: [],
  contato: ["contact"],
  agendado: ["contact", "schedule"],
  confirmado: ["contact", "schedule", "confirm"],
  atendido: ["contact", "schedule", "confirm"],
  convertido: ["contact", "schedule", "confirm", "convert"],
  perdido: [],
  cancelado: [],
  aguardando: [],
  recontato: [],
};

export function QuickActionButtons({ 
  currentStatus, 
  onStatusChange, 
  isUpdating,
  compact = false 
}: QuickActionButtonsProps) {
  const disabledButtons = DISABLED_MAP[currentStatus] || [];
  const isFinalStatus = currentStatus === "convertido" || currentStatus === "perdido" || currentStatus === "cancelado";

  const buttons = [
    {
      id: "contact",
      icon: Phone,
      label: "Contatar",
      status: STATUS_FLOW.contact,
      bgColor: "bg-[#5AC9EF]",
      hoverColor: "hover:bg-[#4ab9df]",
    },
    {
      id: "schedule",
      icon: Calendar,
      label: "Agendar",
      status: STATUS_FLOW.schedule,
      bgColor: "bg-[#FFA500]",
      hoverColor: "hover:bg-[#e69500]",
    },
    {
      id: "confirm",
      icon: CheckCircle,
      label: "Confirmar",
      status: STATUS_FLOW.confirm,
      bgColor: "bg-[#4CAF50]",
      hoverColor: "hover:bg-[#43a047]",
    },
    {
      id: "convert",
      icon: PartyPopper,
      label: "Converter",
      status: STATUS_FLOW.convert,
      bgColor: "bg-[#662E8E]",
      hoverColor: "hover:bg-[#5a287d]",
      requiresConfirmation: true,
    },
  ];

  const handleClick = (status: LeadStatus) => {
    onStatusChange(status);
  };

  const buttonSize = compact ? "h-7 w-7 sm:h-6 sm:w-6" : "h-9 w-9 sm:h-7 sm:w-7";
  const iconSize = compact ? "h-3.5 w-3.5 sm:h-3 sm:w-3" : "h-4 w-4 sm:h-3.5 sm:w-3.5";

  if (isFinalStatus) {
    return (
      <div className="flex items-center gap-0.5">
        {buttons.map((btn) => (
          <Button
            key={btn.id}
            size="sm"
            variant="ghost"
            className={cn(buttonSize, "p-0 opacity-30 cursor-not-allowed")}
            disabled
          >
            <btn.icon className={cn(iconSize, "text-muted-foreground")} />
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      {buttons.map((btn) => {
        const isDisabled = disabledButtons.includes(btn.id) || isUpdating;
        
        if (btn.requiresConfirmation && !isDisabled) {
          return (
            <AlertDialog key={btn.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      className={cn(
                        buttonSize,
                        "p-0 text-white transition-all",
                        btn.bgColor,
                        btn.hoverColor
                      )}
                    >
                      <btn.icon className={iconSize} />
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Mudar status para {btn.status}</p>
                </TooltipContent>
              </Tooltip>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar conversão</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja marcar este lead como "Convertido"?
                    Esta ação marca a conversão final do funil.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleClick(btn.status)}
                    className="bg-[#662E8E] hover:bg-[#5a287d]"
                  >
                    Confirmar Conversão
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          );
        }

        return (
          <Tooltip key={btn.id}>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                className={cn(
                  buttonSize,
                  "p-0 text-white transition-all",
                  isDisabled 
                    ? "opacity-30 cursor-not-allowed bg-muted hover:bg-muted" 
                    : cn(btn.bgColor, btn.hoverColor)
                )}
                disabled={isDisabled}
                onClick={() => !isDisabled && handleClick(btn.status)}
              >
                <btn.icon className={iconSize} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isDisabled ? "Já passou deste estágio" : `Mudar status para ${btn.status}`}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
