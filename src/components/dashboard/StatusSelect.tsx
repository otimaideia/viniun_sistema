import { LeadStatus, STATUS_OPTIONS, STATUS_CONFIG } from "@/types/lead-mt";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface StatusSelectProps {
  value: LeadStatus;
  onValueChange: (value: LeadStatus) => void;
}

// Fallback config para status desconhecidos ou nulos
const DEFAULT_CONFIG = {
  color: "text-gray-600",
  bg: "bg-gray-100 border-gray-200",
  label: "Desconhecido"
};

export function StatusSelect({ value, onValueChange }: StatusSelectProps) {
  // Usar fallback se o valor não existir no STATUS_CONFIG
  const config = value && STATUS_CONFIG[value] ? STATUS_CONFIG[value] : DEFAULT_CONFIG;
  const displayValue = value || "novo"; // Valor padrão para Select

  return (
    <Select value={displayValue} onValueChange={onValueChange}>
      <SelectTrigger
        className={cn(
          "w-[180px] border font-medium text-sm h-9 sm:h-8",
          config.bg,
          config.color
        )}
        aria-label="Alterar status do lead"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((status) => {
          const statusConfig = STATUS_CONFIG[status];
          return (
            <SelectItem 
              key={status} 
              value={status}
              className={cn("font-medium", statusConfig.color)}
            >
              {statusConfig.label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
